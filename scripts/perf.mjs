// Đo hiệu năng tự động, giả lập điện thoại bằng Chrome headless + CDP (không cần cầm máy thật).
// Chạy: node scripts/perf.mjs [--help]. Không thêm dependency; Node 24 (WebSocket, fetch có sẵn).
//
// Giới hạn quan trọng: chỉ giả lập được CPU (làm chậm luồng chính) và độ phân giải,
// KHÔNG giả lập được GPU điện thoại. Xem danh sách LIMITATIONS bên dưới.
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  MIME,
  SCENARIOS,
  USAGE,
  UsageError,
  computeFrameStats,
  configName,
  isSoftwareRenderer,
  joystickPoint,
  keysAt,
  lookPoint,
  parseArgs,
  resolveStaticPath,
} from './perf-lib.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DIST_NAME = '.perf-dist';
const DIST_DIR = join(ROOT, DIST_NAME);
const BUILD_ATTEMPTS = 4;
const BUILD_RETRY_WAIT_MS = 30_000;
const LOAD_TIMEOUT_MS = 30_000;
const WARMUP_MS = 3_000;
const MAX_FRAMES = 4000;
const POLL_MS = 250;

const LIMITATIONS = [
  'Chỉ giả lập được CPU (làm chậm luồng chính theo hệ số --cpu) và độ phân giải/DPR. KHÔNG giả lập được GPU điện thoại: tốc độ vẽ, băng thông bộ nhớ, tản nhiệt/giảm xung đều là của máy đang chạy.',
  'Làm chậm CPU chỉ tác động luồng chính (JS, layout); tiến trình GPU/raster không bị làm chậm.',
  'Chrome headless thường bị giới hạn 60 Hz (rAF theo nhịp 16.7 ms): nếu FPS chạm 60 thì không biết còn dư bao nhiêu (chạy thêm --uncap để gỡ trần).',
  'Không giới hạn bộ nhớ như điện thoại thật; heap JS là số đo trên Chrome desktop.',
  'Cảm ứng và bàn phím là sự kiện tổng hợp qua CDP, không phải độ trễ cảm ứng thật.',
  'Nếu renderer là SwiftShader/Software thì FPS là render bằng CPU: chỉ có ý nghĩa so sánh tương đối giữa các lần đo.',
];

// ---------------------------------------------------------------------------
// Log: tiến trình luôn ra stderr để --json giữ stdout sạch.

const log = (...args) => console.error(...args);
const errMsg = (e) => (e instanceof Error ? e.message : String(e));

// ---------------------------------------------------------------------------
// Dọn dẹp tiến trình / server / thư mục tạm. Dùng được cả từ SIGINT và 'exit' (đồng bộ).

const state = { chrome: null, server: null, userDataDir: null, build: null };

function killTree(child) {
  if (child?.pid === undefined || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      // Đường dẫn tuyệt đối để không phụ thuộc PATH.
      const taskkill = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
      spawnSync(taskkill, ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  } catch {
    // Đã thoát hoặc không còn quyền: bỏ qua.
  }
}

function cleanupSync() {
  killTree(state.chrome);
  killTree(state.build);
  if (state.server) {
    try {
      state.server.closeAllConnections();
      state.server.close();
    } catch {
      // Đã đóng.
    }
    state.server = null;
  }
  if (state.userDataDir) {
    try {
      rmSync(state.userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      state.userDataDir = null;
    } catch (e) {
      log(`Cảnh báo: chưa xoá được thư mục tạm của Chrome (${errMsg(e)})`);
    }
  }
}

/**
 * Nếu lần chạy trước bị kill cứng (Windows không cho bắt SIGINT từ ngoài) thì thư mục user-data tạm bị bỏ lại.
 * Dọn các thư mục dinhmui-perf-* cũ hơn 1 giờ trong thư mục tạm. Lỗi thì bỏ qua.
 */
function sweepStaleTempDirs() {
  const tmp = os.tmpdir();
  try {
    for (const name of readdirSync(tmp)) {
      // Chỉ thư mục profile do mkdtemp của script này tạo (tiền tố + 6 ký tự), không phải thư mục người dùng đặt tên.
      if (!/^dinhmui-perf-[A-Za-z0-9]{6}$/.test(name)) continue;
      const full = join(tmp, name);
      try {
        const st = lstatSync(full);
        if (!st.isDirectory() || st.isSymbolicLink()) continue;
        if (Date.now() - st.mtimeMs > 3_600_000) {
          rmSync(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
      } catch {
        // Đang bị khoá hoặc không đủ quyền: để lần sau.
      }
    }
  } catch {
    // Không đọc được thư mục tạm: bỏ qua.
  }
}

process.on('exit', cleanupSync);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) {
  process.on(sig, () => {
    log(`\nNhận ${sig}, đang dọn dẹp...`);
    cleanupSync();
    process.exit(130);
  });
}

// ---------------------------------------------------------------------------
// Build bản production vào .perf-dist (không đụng dist/).

function runBuildOnce() {
  const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) throw new Error('Không thấy node_modules/vite. Chạy npm install trước.');
  return new Promise((res) => {
    const child = spawn(process.execPath, [viteBin, 'build', '--outDir', DIST_NAME, '--emptyOutDir', '--logLevel', 'warn'], {
      cwd: ROOT,
      env: { ...process.env, VITE_DEBUG_JUMP: '1' },
      stdio: ['ignore', 2, 2],
      windowsHide: true,
    });
    state.build = child;
    child.on('error', () => res(1));
    child.on('exit', (code) => {
      state.build = null;
      res(code ?? 1);
    });
  });
}

async function buildPerfDist() {
  for (let attempt = 1; attempt <= BUILD_ATTEMPTS; attempt++) {
    log(`Build production vào ${DIST_NAME}/ với VITE_DEBUG_JUMP=1 (lần ${attempt}/${BUILD_ATTEMPTS})...`);
    const code = await runBuildOnce();
    if (code === 0) return { status: 'built', attempts: attempt };
    if (attempt < BUILD_ATTEMPTS) {
      log(`Build lỗi (mã ${code}). Có thể file src đang được sửa dở, chờ ${BUILD_RETRY_WAIT_MS / 1000}s rồi thử lại...`);
      await sleep(BUILD_RETRY_WAIT_MS);
    }
  }
  if (existsSync(join(DIST_DIR, 'index.html'))) {
    log(`CẢNH BÁO: build lỗi ${BUILD_ATTEMPTS} lần, dùng lại bản ${DIST_NAME}/ cũ. Số đo có thể không phản ánh code mới nhất.`);
    return { status: 'stale-reused', attempts: BUILD_ATTEMPTS };
  }
  throw new Error(`Build lỗi ${BUILD_ATTEMPTS} lần và chưa có ${DIST_NAME}/. Xem lỗi ở trên.`);
}

// ---------------------------------------------------------------------------
// Server tĩnh: chỉ 127.0.0.1, chống path traversal.

function startStaticServer(root) {
  return new Promise((res, rej) => {
    const server = createServer((req, rsp) => {
      const fail = (status, text) => {
        rsp.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        rsp.end(req.method === 'HEAD' ? undefined : text);
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        rsp.setHeader('Allow', 'GET, HEAD');
        return fail(405, 'Method Not Allowed');
      }
      let pathname;
      try {
        pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      } catch {
        return fail(400, 'Bad Request');
      }
      const r = resolveStaticPath(root, pathname);
      if (!r.ok) return fail(r.status, r.status === 403 ? 'Forbidden' : 'Bad Request');
      let file = r.path;
      let st;
      try {
        st = statSync(file);
        if (st.isDirectory()) {
          file = join(file, 'index.html');
          st = statSync(file);
        }
      } catch {
        return fail(404, 'Not Found');
      }
      if (!st.isFile()) return fail(404, 'Not Found');
      rsp.writeHead(200, {
        'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return rsp.end();
      const stream = createReadStream(file);
      stream.on('error', () => rsp.destroy());
      stream.pipe(rsp);
    });
    server.on('error', rej);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return rej(new Error('Không đọc được cổng server tĩnh'));
      state.server = server;
      res({ server, port: addr.port });
    });
  });
}

// ---------------------------------------------------------------------------
// Chrome + CDP.

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error('CHROME_PATH trỏ tới file không tồn tại.');
    return fromEnv;
  }
  const candidates =
    process.platform === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
        : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Edge. Đặt biến môi trường CHROME_PATH trỏ tới chrome.exe.');
  return found;
}

function chromeFlags(opts, userDataDir) {
  const flags = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-component-update',
    '--disable-background-networking',
    '--disable-default-apps',
    '--mute-audio',
    '--hide-scrollbars',
    // Giữ rAF chạy đủ nhịp, không bị hạ tần suất khi tab không ở foreground.
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    `--window-size=${opts.device.width},${opts.device.height}`,
  ];
  if (opts.gpu === 'software') flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  if (opts.uncap) flags.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
  flags.push(...opts.chromeArgs, 'about:blank');
  return flags;
}

async function waitForDevToolsPort(userDataDir, child, getStderr, timeoutMs = 20_000) {
  const file = join(userDataDir, 'DevToolsActivePort');
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`Chrome thoát sớm (mã ${child.exitCode}). ${getStderr()}`);
    if (existsSync(file)) {
      const port = Number((readFileSync(file, 'utf8').split(/\r?\n/)[0] ?? '').trim());
      if (Number.isInteger(port) && port > 0 && port < 65536) return port;
    }
    await sleep(100);
  }
  throw new Error(`Quá hạn chờ Chrome mở cổng DevTools. ${getStderr()}`);
}

async function launchChrome(opts) {
  const exe = findChrome();
  const userDataDir = mkdtempSync(join(os.tmpdir(), 'dinhmui-perf-'));
  state.userDataDir = userDataDir;
  const child = spawn(exe, chromeFlags(opts, userDataDir), {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  state.chrome = child;
  let tail = '';
  child.stderr.on('data', (d) => {
    tail = (tail + d.toString()).slice(-1500);
  });
  child.on('error', (e) => {
    tail += ` [spawn error: ${errMsg(e)}]`;
  });
  const port = await waitForDevToolsPort(userDataDir, child, () => tail.trim().slice(-600));
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  return { port, exeName: basename(exe), browser: String(version.Browser ?? 'unknown') };
}

/** Client CDP tối thiểu trên WebSocket có sẵn của Node. */
class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
  #handlers = new Map();
  closed = false;

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener('message', (ev) => this.#onMessage(ev.data));
    ws.addEventListener('close', () => this.#onClose());
    ws.addEventListener('error', () => {});
  }

  static connect(url, timeoutMs = 10_000) {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        rej(new Error('Quá hạn kết nối WebSocket tới Chrome'));
        try {
          ws.close();
        } catch {
          // Bỏ qua.
        }
      }, timeoutMs);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        res(new Cdp(ws));
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        rej(new Error('Không kết nối được WebSocket tới Chrome'));
      });
    });
  }

  on(method, fn) {
    const list = this.#handlers.get(method) ?? [];
    list.push(fn);
    this.#handlers.set(method, list);
  }

  send(method, params = {}, timeoutMs = 30_000) {
    if (this.closed) return Promise.reject(new Error(`CDP đã đóng (${method})`));
    const id = ++this.#id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        rej(new Error(`CDP quá hạn: ${method}`));
      }, timeoutMs);
      this.#pending.set(id, { res, rej, timer, method });
      try {
        this.#ws.send(JSON.stringify({ id, method, params }));
      } catch (e) {
        clearTimeout(timer);
        this.#pending.delete(id);
        rej(e);
      }
    });
  }

  #onMessage(data) {
    if (typeof data !== 'string') return;
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (typeof msg.id === 'number') {
      const p = this.#pending.get(msg.id);
      if (!p) return;
      this.#pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.rej(new Error(`CDP ${p.method}: ${msg.error.message ?? 'lỗi'}`));
      else p.res(msg.result ?? {});
    } else if (typeof msg.method === 'string') {
      for (const fn of this.#handlers.get(msg.method) ?? []) {
        try {
          fn(msg.params ?? {});
        } catch {
          // Handler lỗi không được làm hỏng vòng nhận tin.
        }
      }
    }
  }

  #onClose() {
    this.closed = true;
    for (const [id, p] of this.#pending) {
      clearTimeout(p.timer);
      p.rej(new Error(`CDP đóng giữa chừng (${p.method})`));
      this.#pending.delete(id);
    }
  }

  close() {
    try {
      this.#ws.close();
    } catch {
      // Bỏ qua.
    }
  }
}

async function evaluate(cdp, expression, timeoutMs) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, timeoutMs);
  if (r.exceptionDetails) throw new Error(`Runtime.evaluate lỗi: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result?.value;
}

async function openTab(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!res.ok) throw new Error(`Không mở được tab mới (HTTP ${res.status})`);
  const tab = await res.json();
  if (typeof tab.webSocketDebuggerUrl !== 'string' || !tab.webSocketDebuggerUrl.startsWith(`ws://127.0.0.1:${port}/`)) {
    throw new Error('Chrome trả địa chỉ WebSocket lạ');
  }
  return tab;
}

async function closeTab(port, id) {
  try {
    await fetch(`http://127.0.0.1:${port}/json/close/${encodeURIComponent(id)}`);
  } catch {
    // Chrome sẽ bị tắt cả cây ở cuối nên không quan trọng.
  }
}

// ---------------------------------------------------------------------------
// Mã chạy trong trang.

/** Bộ đo khung độc lập với game: ghi khoảng cách giữa các rAF vào window.__frames (tối đa MAX_FRAMES). */
const FRAME_RECORDER = `(() => {
  const MAX = ${MAX_FRAMES};
  window.__frames = [];
  window.__framesDropped = 0;
  let last = 0;
  const tick = (t) => {
    if (last > 0) {
      if (window.__frames.length < MAX) window.__frames.push(t - last);
      else window.__framesDropped++;
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

const PROBE_EXPR = `(() => {
  const d = window.__dinhmui;
  return {
    ready: document.readyState,
    canvas: !!document.querySelector('canvas'),
    fps: d && typeof d.fps === 'number' ? d.fps : null,
    mode: d && typeof d.mode === 'string' ? d.mode : null,
  };
})()`;

const SNAPSHOT_EXPR = `(() => {
  const d = window.__dinhmui;
  if (!d) return null;
  const p = d.player;
  return {
    fps: typeof d.fps === 'number' ? d.fps : null,
    calls: typeof d.calls === 'number' ? d.calls : null,
    triangles: typeof d.triangles === 'number' ? d.triangles : null,
    player: p ? { x: p.x, z: p.z, speed: p.speed, inside: !!p.insideCollider } : null,
  };
})()`;

const CANVAS_EXPR = `(() => {
  const c = document.querySelector('canvas');
  return {
    dpr: window.devicePixelRatio,
    viewport: [window.innerWidth, window.innerHeight],
    canvas: c ? [c.width, c.height, c.clientWidth, c.clientHeight] : null,
  };
})()`;

const RENDERER_EXPR = `(() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { error: 'Không tạo được ngữ cảnh WebGL' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const out = {
      renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
      vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      version: String(gl.getParameter(gl.VERSION)),
    };
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return out;
  } catch (e) {
    return { error: String(e) };
  }
})()`;

const TOUCH_TARGETS_EXPR = `(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  };
  return { joy: rect('[data-testid="roam-joystick"]'), look: rect('[data-testid="roam-look"]') };
})()`;

// ---------------------------------------------------------------------------
// Chuẩn bị tab giả lập điện thoại.

async function setupTab(cdp, ctx, diag) {
  const { opts, browser } = ctx;
  cdp.on('Runtime.exceptionThrown', (p) => diag.pushError(`exception: ${p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? '?'}`));
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') diag.pushError(`console.error: ${(p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ')}`);
  });
  cdp.on('Log.entryAdded', (p) => {
    // Bỏ qua favicon.ico (trình duyệt tự xin, không phải lỗi của game).
    const url = typeof p.entry?.url === 'string' ? p.entry.url : '';
    if (p.entry?.level === 'error' && !/\/favicon\.ico(\?|$)/.test(url)) {
      const path = url.replace(/^https?:\/\/[^/]+/, '');
      diag.pushError(`log: ${p.entry.text ?? ''}${path ? ` (${path})` : ''}`);
    }
  });
  cdp.on('Inspector.targetCrashed', () => {
    diag.crashed = true;
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Inspector.enable');
  await cdp.send('Performance.enable');
  const { width, height, dpr } = opts.device;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'pointer', value: 'coarse' },
        { name: 'hover', value: 'none' },
      ],
    });
  } catch {
    // Bản Chrome cũ không hỗ trợ: bỏ qua, vẫn đo được.
  }
  const chromeVer = /Chrome\/([\d.]+)/.exec(browser)?.[1] ?? '120.0.0.0';
  await cdp.send('Emulation.setUserAgentOverride', {
    userAgent: `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Mobile Safari/537.36`,
    platform: 'Linux armv8l',
  });
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu });
  await cdp.send('Page.bringToFront');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FRAME_RECORDER });
}

function newDiag() {
  const diag = {
    crashed: false,
    errors: [],
    pushError(text) {
      if (diag.errors.length < 5) diag.errors.push(String(text).slice(0, 240));
    },
  };
  return diag;
}

// ---------------------------------------------------------------------------
// Mô phỏng người chơi.

const KEY_INFO = {
  KeyW: { key: 'w', vk: 87 },
  KeyA: { key: 'a', vk: 65 },
  KeyS: { key: 's', vk: 83 },
  KeyD: { key: 'd', vk: 68 },
  ShiftLeft: { key: 'Shift', vk: 16, location: 1 },
};

function createKeyboardDriver(cdp) {
  const pressed = new Set();
  const modifiers = () => (pressed.has('ShiftLeft') ? 8 : 0);
  const dispatch = (type, code) => {
    const info = KEY_INFO[code];
    const shifted = pressed.has('ShiftLeft') && info.key.length === 1;
    return cdp.send('Input.dispatchKeyEvent', {
      type,
      modifiers: modifiers(),
      key: shifted ? info.key.toUpperCase() : info.key,
      code,
      windowsVirtualKeyCode: info.vk,
      nativeVirtualKeyCode: info.vk,
      ...(info.location ? { location: info.location } : {}),
    });
  };
  return {
    async update(tMs) {
      const want = keysAt(tMs);
      for (const code of [...pressed]) {
        if (!want.includes(code) && code !== 'ShiftLeft') {
          await dispatch('keyUp', code);
          pressed.delete(code);
        }
      }
      // Shift nhấn trước cùng, nhả sau cùng để các phím kèm theo mang đúng modifier.
      if (want.includes('ShiftLeft') && !pressed.has('ShiftLeft')) {
        pressed.add('ShiftLeft');
        await dispatch('keyDown', 'ShiftLeft');
      }
      for (const code of want) {
        if (!pressed.has(code)) {
          pressed.add(code);
          await dispatch('keyDown', code);
        }
      }
      if (pressed.has('ShiftLeft') && !want.includes('ShiftLeft')) {
        await dispatch('keyUp', 'ShiftLeft');
        pressed.delete('ShiftLeft');
      }
    },
    async releaseAll() {
      for (const code of [...pressed]) {
        try {
          await dispatch('keyUp', code);
        } catch {
          // Trang có thể đã đóng.
        }
        pressed.delete(code);
      }
    },
  };
}

const touchPoint = (id, p) => ({ id, x: p.x, y: p.y, radiusX: 12, radiusY: 12, force: 1 });

/** Trả về null nếu không thấy joystick (lý do ghi vào note.value). */
async function createTouchDriver(cdp, viewport, note) {
  let targets = await evaluate(cdp, TOUCH_TARGETS_EXPR);
  if (!targets?.joy) {
    // Joystick có thể chỉ hiện sau lần chạm đầu tiên: chạm thử một cái rồi tìm lại.
    const tap = { x: viewport.width / 2, y: viewport.height * 0.4 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(1, tap)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
    targets = await evaluate(cdp, TOUCH_TARGETS_EXPR);
  }
  const joy = targets?.joy;
  if (!joy) {
    note.value = 'Không thấy [data-testid="roam-joystick"] nên không mô phỏng được cảm ứng.';
    return null;
  }
  const joyC = { x: joy.x + joy.w / 2, y: joy.y + joy.h / 2 };
  // Bán kính tối đa = nửa đế joystick (vượt bán kính nhận của game thì bị kẹp = đẩy hết cỡ).
  const joyR = Math.max(8, Math.min(joy.w, joy.h) / 2);
  let lookC = null;
  let lookAmp = 0;
  const look = targets.look;
  if (look) {
    const containsJoy = joyC.x >= look.x && joyC.x <= look.x + look.w && joyC.y >= look.y && joyC.y <= look.y + look.h;
    lookC = containsJoy ? { x: look.x + look.w * 0.72, y: look.y + look.h * 0.5 } : { x: look.x + look.w / 2, y: look.y + look.h / 2 };
    lookAmp = Math.min(120, look.w * 0.2);
  } else {
    note.value = 'Không thấy [data-testid="roam-look"]: chỉ mô phỏng joystick.';
  }

  let started = false;
  let lastSend = -1e9;
  const points = (tMs) => {
    // Xen kẽ 2 s đẩy hết cỡ (chạy) và 2 s đẩy nửa chừng (đi bộ).
    const radius = Math.floor(tMs / 2000) % 2 === 0 ? joyR : joyR * 0.5;
    const pts = [touchPoint(1, joystickPoint(tMs, joyC.x, joyC.y, radius))];
    if (lookC) pts.push(touchPoint(2, lookPoint(tMs, lookC.x, lookC.y, lookAmp)));
    return pts;
  };
  return {
    async update(tMs) {
      if (!started) {
        started = true;
        // Chạm joystick tại tâm, rồi mới kéo đi vòng tròn.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(1, joyC)] });
        if (lookC) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(1, joyC), touchPoint(2, lookC)] });
        lastSend = tMs;
        return;
      }
      if (tMs - lastSend < 40) return;
      lastSend = tMs;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(tMs) });
    },
    async releaseAll() {
      if (!started) return;
      try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } catch {
        // Trang có thể đã đóng.
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Một lần đo.

async function heapUsedMB(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = (metrics ?? []).find((x) => x.name === 'JSHeapUsedSize');
  return m && Number.isFinite(m.value) ? Math.round((m.value / 1048576) * 10) / 10 : null;
}

function summarizePlayer(samples) {
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  let path = 0;
  let maxSpeed = 0;
  let jumps = 0;
  let insideSamples = 0;
  let prev = null;
  for (const s of samples) {
    if (s.inside) insideSamples++;
    if (Number.isFinite(s.speed) && s.speed > maxSpeed) maxSpeed = s.speed;
    if (prev) {
      const step = Math.hypot(s.x - prev.x, s.z - prev.z);
      if (step > 8) jumps++;
      else path += step;
    }
    prev = s;
  }
  const r = (n) => Math.round(n * 100) / 100;
  return {
    start: { x: r(first.x), z: r(first.z) },
    end: { x: r(last.x), z: r(last.z) },
    pathMeters: r(path),
    displacementMeters: r(Math.hypot(last.x - first.x, last.z - first.z)),
    maxSpeed: r(maxSpeed),
    insideColliderSamples: insideSamples,
    samples: samples.length,
    jumps,
    moved: path > 3,
  };
}

/**
 * Điều hướng và chờ canvas + game công bố fps (tối đa LOAD_TIMEOUT_MS).
 * Trả về { outcome: 'ready' | 'no-canvas' | 'timeout', probe, loadMs }.
 */
async function loadAndWait(cdp, diag, sc, url) {
  const loadStart = performance.now();
  const nav = await cdp.send('Page.navigate', { url });
  if (nav.errorText) throw new Error(`Điều hướng lỗi: ${nav.errorText}`);
  let probe = null;
  let outcome = 'timeout';
  while (performance.now() - loadStart < LOAD_TIMEOUT_MS) {
    if (diag.crashed || cdp.closed) throw new Error('Tab Chrome bị crash khi tải');
    probe = await evaluate(cdp, PROBE_EXPR).catch(() => null);
    if (probe?.canvas && probe.fps !== null) {
      outcome = 'ready';
      break;
    }
    // Kịch bản roam trên bản build chưa có chế độ đi lại: trang rơi về màn hình chọn, không có canvas.
    if (sc.roam && probe?.ready === 'complete' && !probe.canvas && performance.now() - loadStart > 8000) {
      outcome = 'no-canvas';
      break;
    }
    await sleep(250);
  }
  return { outcome, probe, loadMs: Math.round(performance.now() - loadStart) };
}

/** Vòng lấy mẫu: điều khiển người chơi, thu snapshot game mỗi giây và vị trí người chơi mỗi POLL_MS. */
async function sampleLoop(cdp, diag, driver, sc, durationMs) {
  const players = [];
  const snaps = [];
  const t0 = performance.now();
  let nextSnap = 0;
  let nextPlayer = 0;
  for (;;) {
    const t = performance.now() - t0;
    if (t >= durationMs) break;
    if (diag.crashed || cdp.closed) throw new Error('Tab Chrome bị crash khi lấy mẫu');
    if (driver) await driver.update(t);
    if (t >= nextSnap || (sc.roam && t >= nextPlayer)) {
      const snap = await evaluate(cdp, SNAPSHOT_EXPR).catch(() => null);
      if (snap) {
        if (t >= nextSnap) {
          snaps.push(snap);
          nextSnap = t + 1000;
        }
        if (snap.player && Number.isFinite(snap.player.x) && Number.isFinite(snap.player.z)) {
          players.push({ ...snap.player });
        }
      }
      nextPlayer = t + POLL_MS;
    }
    await sleep(driver ? 20 : 100);
  }
  return { snaps, players };
}

const numbersOf = (arr, key) => arr.map((s) => s[key]).filter((v) => typeof v === 'number' && Number.isFinite(v));

/** { last, max } của một chuỗi số, hoặc null nếu rỗng. */
function lastAndMax(values) {
  return values.length ? { last: values[values.length - 1], max: Math.max(...values) } : null;
}

/** Đọc mảng khung, heap, kích thước canvas, renderer rồi gộp vào `result`. */
async function collectResult(cdp, result, sc, { snaps, players, heapStart }) {
  const frames = await evaluate(cdp, 'window.__frames.slice()');
  const dropped = (await evaluate(cdp, 'window.__framesDropped')) ?? 0;
  const heapEnd = await heapUsedMB(cdp);
  const view = await evaluate(cdp, CANVAS_EXPR).catch(() => null);
  const gl = await evaluate(cdp, RENDERER_EXPR).catch((e) => ({ error: errMsg(e) }));

  Object.assign(result, computeFrameStats(frames));
  result.framesTruncated = dropped > 0;
  const fpsG = numbersOf(snaps, 'fps');
  result.gameFps = fpsG.length ? { min: Math.min(...fpsG), max: Math.max(...fpsG), last: fpsG[fpsG.length - 1] } : null;
  result.drawCalls = lastAndMax(numbersOf(snaps, 'calls'));
  result.triangles = lastAndMax(numbersOf(snaps, 'triangles'));
  result.heapMB = { start: heapStart, end: heapEnd };
  if (view) {
    result.dpr = view.dpr;
    result.viewport = view.viewport;
    result.canvas = view.canvas
      ? { pxWidth: view.canvas[0], pxHeight: view.canvas[1], cssWidth: view.canvas[2], cssHeight: view.canvas[3] }
      : null;
  }
  result.renderer = gl?.renderer ?? null;
  if (gl?.error) result.rendererError = gl.error;
  if (sc.roam) result.player = summarizePlayer(players);
  if (!result.frames) {
    result.status = 'error';
    result.error = 'Không ghi được khung hình nào trong lúc lấy mẫu.';
  }
}

async function measureScenario(ctx, sc, input) {
  const { opts, port } = ctx;
  const url = `${ctx.base}/?${sc.query}&fps`;
  const result = { scenario: sc.name, input: sc.roam ? input : 'none', url: url.replace(/^https?:\/\/[^/]+/, ''), status: 'ok' };
  const diag = newDiag();
  let tab = null;
  let cdp = null;
  let driver = null;
  try {
    tab = await openTab(port);
    cdp = await Cdp.connect(tab.webSocketDebuggerUrl);
    await setupTab(cdp, ctx, diag);

    // 1) Tải trang.
    const { outcome, probe, loadMs } = await loadAndWait(cdp, diag, sc, url);
    result.loadMs = loadMs;
    if (outcome === 'timeout') {
      const hasCanvas = probe?.canvas ? 'có' : 'không';
      result.status = 'load-error';
      result.error = `Không thấy canvas và window.__dinhmui.fps sau ${LOAD_TIMEOUT_MS / 1000} s (canvas=${hasCanvas}, fps=${probe?.fps ?? 'chưa có'})`;
      result.consoleErrors = diag.errors;
      return result;
    }
    if (outcome === 'no-canvas' || (sc.roam && probe?.mode !== 'roam')) {
      result.status = 'unsupported';
      result.error = `Chế độ đi lại chưa có trong bản build (mode=${probe?.mode ?? 'không có'}, canvas=${probe?.canvas ?? false}).`;
      return result;
    }
    result.mode = probe?.mode ?? null;

    // 2) Khởi động nóng.
    await sleep(WARMUP_MS);
    if (diag.crashed || cdp.closed) throw new Error('Tab Chrome bị crash khi khởi động nóng');

    // 3) Lấy mẫu.
    if (sc.roam) {
      const note = { value: null };
      driver = input === 'keyboard' ? createKeyboardDriver(cdp) : await createTouchDriver(cdp, opts.device, note);
      if (note.value) result.inputNote = note.value;
    }
    await evaluate(cdp, 'window.__frames.length = 0; window.__framesDropped = 0; true');
    const heapStart = await heapUsedMB(cdp);
    const sampled = await sampleLoop(cdp, diag, driver, sc, opts.duration * 1000);
    if (driver) {
      await driver.releaseAll();
      driver = null;
    }

    // 4) Đọc kết quả.
    await collectResult(cdp, result, sc, { ...sampled, heapStart });
    if (diag.errors.length) result.consoleErrors = diag.errors;
    return result;
  } catch (e) {
    result.status = result.status === 'ok' ? 'error' : result.status;
    result.error = errMsg(e);
    if (diag.errors.length) result.consoleErrors = diag.errors;
    return result;
  } finally {
    if (driver) await driver.releaseAll();
    if (cdp) cdp.close();
    if (tab) await closeTab(port, tab.id);
  }
}

/** Đọc renderer WebGL trên tab trống trước khi đo, để cảnh báo sớm. */
async function probeRenderer(ctx) {
  const tab = await openTab(ctx.port);
  const cdp = await Cdp.connect(tab.webSocketDebuggerUrl);
  try {
    await cdp.send('Runtime.enable');
    return await evaluate(cdp, RENDERER_EXPR);
  } finally {
    cdp.close();
    await closeTab(ctx.port, tab.id);
  }
}

// ---------------------------------------------------------------------------
// In kết quả.

const cell = (v, d = 1) => (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v)) ? '-' : typeof v === 'number' ? v.toFixed(d) : String(v));

function statusLabel(r) {
  if (r.status === 'ok') return r.atRefreshCap ? 'ok (trần 60Hz)' : 'ok';
  if (r.status === 'unsupported') return 'chưa hỗ trợ';
  if (r.status === 'load-error') return 'lỗi tải';
  return 'lỗi';
}

function printTable(results) {
  const header = ['Kịch bản', 'Input', 'FPS tb', 'FPS min/s', 'p50', 'p95', 'p99', '>33ms%', '>50ms%', 'Draw', 'Tam giác', 'Heap MB', 'Khung', 'Trạng thái'];
  const rows = results.map((r) => {
    if (r.status !== 'ok') return [r.scenario, r.input, ...new Array(11).fill('-'), statusLabel(r)];
    return [
      r.scenario,
      r.input,
      cell(r.fpsAvg),
      cell(r.fpsMinPerSecond, 0),
      cell(r.frameMs?.p50),
      cell(r.frameMs?.p95),
      cell(r.frameMs?.p99),
      cell(r.pctOver33ms),
      cell(r.pctOver50ms),
      cell(r.drawCalls?.last, 0),
      cell(r.triangles?.last, 0),
      cell(r.heapMB?.end),
      cell(r.frames, 0),
      statusLabel(r),
    ];
  });
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(line(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of rows) console.log(line(row));
}

function printReport(report) {
  const { environment: env, results } = report;
  console.log('');
  console.log(
    `Cấu hình: gpu=${report.config.gpu}  cpu x${report.config.cpu}  màn hình ${report.config.device.width}x${report.config.device.height}@${report.config.device.dpr}  lấy mẫu ${report.config.durationSec}s (+${report.config.warmupSec}s khởi động)`,
  );
  console.log(`Chrome: ${env.browser}   Renderer WebGL: ${env.webglRenderer ?? 'không đọc được'}`);
  if (env.softwareRenderer) {
    console.log('');
    console.log('!!! CẢNH BÁO: WEBGL ĐANG RENDER BẰNG CPU (SwiftShader/Software) !!!');
    console.log('!!! Số FPS là của bộ vẽ phần mềm, chỉ có ý nghĩa so sánh tương đối. !!!');
    console.log('!!! KHÔNG đại diện điện thoại thật.                                 !!!');
  }
  console.log('');
  printTable(results);
  for (const r of results) {
    const tag = `[${r.scenario}/${r.input}]`;
    if (r.error) console.log(`  ${tag} ${r.error}`);
    if (r.inputNote) console.log(`  ${tag} ${r.inputNote}`);
    if (r.player) {
      const p = r.player;
      console.log(
        `  ${tag} người chơi: đi ${p.pathMeters} m (đầu ${p.start.x},${p.start.z} -> cuối ${p.end.x},${p.end.z}), tốc độ tối đa ${p.maxSpeed} m/s, ${p.moved ? 'CÓ di chuyển' : 'KHÔNG di chuyển đủ (kẹt?)'}${p.insideColliderSamples ? `, ${p.insideColliderSamples} mẫu nằm trong vật cản` : ''}`,
      );
    }
    if (r.framesTruncated) console.log(`  ${tag} mảng khung đầy ${MAX_FRAMES}, các khung sau bị bỏ (số liệu tính trên ${r.sampledSeconds}s đầu).`);
    if (r.consoleErrors?.length) console.log(`  ${tag} lỗi console: ${r.consoleErrors.join(' | ')}`);
  }
  console.log('');
  console.log('Giới hạn của phép đo:');
  for (const l of report.limitations) console.log(`  - ${l}`);
}

// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const buildInfo = { mode: opts.url ? 'external-url' : opts.skipBuild ? 'skipped' : 'built' };
  let base = opts.url;
  if (!opts.url) {
    if (opts.skipBuild) {
      if (!existsSync(join(DIST_DIR, 'index.html'))) throw new Error(`Không có ${DIST_NAME}/index.html. Bỏ --skip-build để build.`);
      log(`Dùng lại ${DIST_NAME}/ đã build.`);
    } else {
      Object.assign(buildInfo, await buildPerfDist());
    }
    const { port } = await startStaticServer(DIST_DIR);
    base = `http://127.0.0.1:${port}`;
    log(`Server tĩnh: ${base} (chỉ 127.0.0.1)`);
  } else {
    log(`Đo server có sẵn: ${base} (cần bật nhảy cảnh bằng URL: build với VITE_DEBUG_JUMP=1 hoặc chạy dev).`);
  }

  sweepStaleTempDirs();
  const chrome = await launchChrome(opts);
  log(`Đã mở ${chrome.exeName} (${chrome.browser}), headless=new, gpu=${opts.gpu}.`);
  const ctx = { opts, port: chrome.port, base, browser: chrome.browser };

  const gl = await probeRenderer(ctx);
  const webglRenderer = gl?.renderer ?? null;
  const softwareRenderer = isSoftwareRenderer(webglRenderer);
  log(`Renderer WebGL: ${webglRenderer ?? `không có (${gl?.error ?? '?'})`}`);
  if (softwareRenderer) log('CẢNH BÁO: renderer là bộ vẽ bằng CPU, số FPS không đại diện điện thoại thật.');
  if (!webglRenderer) log('CẢNH BÁO: Chrome headless không tạo được WebGL, kịch bản 3D sẽ lỗi tải. Thử --chrome-arg=--use-angle=d3d11 hoặc --gpu=software.');

  const plan = [];
  for (const name of opts.scenarios) {
    const sc = SCENARIOS.find((s) => s.name === name);
    if (!sc) continue;
    if (sc.roam) {
      for (const input of opts.input === 'both' ? ['keyboard', 'touch'] : [opts.input]) plan.push({ sc, input });
    } else {
      plan.push({ sc, input: 'none' });
    }
  }

  const results = [];
  // Khoá `name:<kịch bản>`: bỏ các lần chạy input còn lại. Khoá `roam:<id>`: bản build chưa có bản đồ này,
  // các kịch bản roam khác cùng ?roam= khỏi phải chờ thêm.
  const skip = new Set();
  for (const [i, { sc, input }] of plan.entries()) {
    if (skip.has(`name:${sc.name}`)) continue;
    const roamId = sc.roam ? new URLSearchParams(sc.query).get('roam') : null;
    if (roamId && skip.has(`roam:${roamId}`)) {
      skip.add(`name:${sc.name}`);
      results.push({ scenario: sc.name, input, status: 'unsupported', error: `Bỏ qua: roam=${roamId} đã báo chưa hỗ trợ ở kịch bản trước.` });
      continue;
    }
    if (state.chrome?.exitCode !== null) {
      results.push({ scenario: sc.name, input, status: 'error', error: 'Chrome đã thoát giữa chừng.' });
      continue;
    }
    log(`[${i + 1}/${plan.length}] ${sc.name}${sc.roam ? ` (${input})` : ''}: tải, khởi động ${WARMUP_MS / 1000}s, lấy mẫu ${opts.duration}s...`);
    const r = await measureScenario(ctx, sc, input);
    results.push(r);
    if (r.status === 'unsupported') {
      skip.add(`name:${sc.name}`);
      if (roamId) skip.add(`roam:${roamId}`);
    }
    log(`    -> ${r.status}${r.fpsAvg ? `, ${r.fpsAvg} FPS tb` : ''}${r.error ? `: ${r.error}` : ''}`);
  }

  const report = {
    schema: 1,
    startedAt: new Date().toISOString(),
    config: {
      gpu: opts.gpu,
      cpu: opts.cpu,
      device: opts.device,
      durationSec: opts.duration,
      warmupSec: WARMUP_MS / 1000,
      input: opts.input,
      scenarios: opts.scenarios,
      uncap: opts.uncap,
      chromeArgsExtra: opts.chromeArgs,
      build: buildInfo,
    },
    environment: {
      browser: chrome.browser,
      browserExe: chrome.exeName,
      node: process.version,
      os: `${os.platform()} ${os.release()}`,
      cpuModel: os.cpus()[0]?.model ?? null,
      cpuCores: os.cpus().length,
      webglRenderer,
      webglVendor: gl?.vendor ?? null,
      webglVersion: gl?.version ?? null,
      softwareRenderer,
    },
    limitations: LIMITATIONS,
    results,
  };

  const outDir = resolve(opts.out ?? join(ROOT, '.perf'));
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `perf-${configName(opts)}.json`);
  writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else {
    printReport(report);
    console.log('');
    console.log(`Đã ghi: ${outFile}`);
  }
  return results.some((r) => r.status === 'load-error' || r.status === 'error') ? 1 : 0;
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (e) {
  if (e instanceof UsageError) {
    console.error(`${e.message}\n\n${USAGE}`);
    exitCode = 2;
  } else {
    console.error(`Lỗi: ${errMsg(e)}`);
    exitCode = 1;
  }
} finally {
  cleanupSync();
}
process.exit(exitCode);
