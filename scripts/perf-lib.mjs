// Hàm thuần dùng cho scripts/perf.mjs: tham số dòng lệnh, thống kê khung hình,
// kịch bản đo, chống path traversal cho server tĩnh. Không đụng mạng/tiến trình khi import.
import { resolve, sep } from 'node:path';

/** Các kịch bản đo: mỗi kịch bản là một bản đồ đi lại (`?roam=<bản đồ>`), `roam: true` để mô phỏng người chơi. */
export const SCENARIOS = [
  { name: 'roam-van-phong', query: 'roam=cuoi-nam&persona=moi-di-lam&region=ha-noi', roam: true },
  { name: 'roam-lop-hoc', query: 'roam=cuoi-nam&persona=sinh-vien&region=sai-gon', roam: true },
  { name: 'roam-san-bac', query: 'roam=san-nha&region=ha-noi', roam: true },
  { name: 'roam-san-nam', query: 'roam=san-nha&region=sai-gon', roam: true },
];

export const DEFAULTS = {
  gpu: 'hardware',
  cpu: 4,
  device: { width: 390, height: 844, dpr: 3 },
  duration: 10,
  input: 'both',
};

export const USAGE = `Dùng: node scripts/perf.mjs [tuỳ chọn]

  --scenario=<tên,tên>   Chạy một phần kịch bản (mặc định: tất cả)
  --cpu=<1..20>          Hệ số làm chậm CPU (mặc định 4; 1 = không làm chậm)
  --gpu=hardware|software  hardware: GPU thật của máy (mặc định); software: SwiftShader
  --device=WxH@dpr       Cỡ màn hình giả lập (mặc định 390x844@3)
  --input=keyboard|touch|both  Cách mô phỏng người chơi ở kịch bản roam-* (mặc định both)
  --duration=<giây>      Thời gian lấy mẫu mỗi kịch bản (mặc định 10, tối đa 120)
  --out=<thư mục>        Nơi ghi perf-<cấu hình>.json (mặc định .perf/)
  --skip-build           Dùng lại .perf-dist đã build
  --uncap                Gỡ trần 60 Hz của headless (tắt vsync + giới hạn khung) để thấy độ dư FPS
  --url=<gốc>            Đo server có sẵn (http/https), không tự build/serve
  --chrome-arg=<cờ>      Thêm cờ cho Chrome (lặp lại được), ví dụ --chrome-arg=--use-angle=d3d11
  --json                 Chỉ in JSON ra stdout (log tiến trình ra stderr)
  --help                 Hiện hướng dẫn này

Kịch bản: ${SCENARIOS.map((s) => s.name).join(', ')}
`;

/** Lỗi do người dùng nhập sai tham số (in thông báo + hướng dẫn, thoát mã 2). */
export class UsageError extends Error {}

function parseNumber(name, raw, min, max) {
  const n = Number(raw);
  if (raw === '' || !Number.isFinite(n) || n < min || n > max) {
    throw new UsageError(`--${name} phải là số trong khoảng ${min}..${max} (nhận: "${raw}")`);
  }
  return n;
}

/** Phân tích tham số dòng lệnh. Ném UsageError nếu sai. */
export function parseArgs(argv) {
  const opts = {
    scenarios: SCENARIOS.map((s) => s.name),
    scenarioFiltered: false,
    cpu: DEFAULTS.cpu,
    gpu: DEFAULTS.gpu,
    device: { ...DEFAULTS.device },
    input: DEFAULTS.input,
    duration: DEFAULTS.duration,
    out: null,
    skipBuild: false,
    uncap: false,
    url: null,
    chromeArgs: [],
    json: false,
    help: false,
  };
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) throw new UsageError(`Tham số không hợp lệ: "${arg}"`);
    const key = m[1];
    const val = m[2];
    const needValue = () => {
      if (val === undefined || val === '') throw new UsageError(`--${key} cần giá trị (--${key}=...)`);
      return val;
    };
    switch (key) {
      case 'scenario': {
        const names = needValue().split(',').map((s) => s.trim()).filter(Boolean);
        const known = new Set(SCENARIOS.map((s) => s.name));
        for (const n of names) {
          if (!known.has(n)) throw new UsageError(`Kịch bản không có: "${n}"`);
        }
        if (names.length === 0) throw new UsageError('--scenario rỗng');
        opts.scenarios = [...new Set(names)];
        opts.scenarioFiltered = true;
        break;
      }
      case 'cpu':
        opts.cpu = parseNumber('cpu', needValue(), 1, 20);
        break;
      case 'gpu': {
        const v = needValue();
        if (v !== 'hardware' && v !== 'software') throw new UsageError('--gpu phải là hardware hoặc software');
        opts.gpu = v;
        break;
      }
      case 'device': {
        const d = /^(\d{3,4})x(\d{3,4})@(\d+(?:\.\d+)?)$/.exec(needValue());
        if (!d) throw new UsageError('--device phải có dạng WxH@dpr, ví dụ 390x844@3');
        opts.device = {
          width: parseNumber('device (rộng)', d[1], 200, 4000),
          height: parseNumber('device (cao)', d[2], 200, 4000),
          dpr: parseNumber('device (dpr)', d[3], 1, 5),
        };
        break;
      }
      case 'input': {
        const v = needValue();
        if (v !== 'keyboard' && v !== 'touch' && v !== 'both') {
          throw new UsageError('--input phải là keyboard, touch hoặc both');
        }
        opts.input = v;
        break;
      }
      case 'duration':
        opts.duration = parseNumber('duration', needValue(), 1, 120);
        break;
      case 'out':
        opts.out = needValue();
        break;
      case 'url': {
        let u;
        try {
          u = new URL(needValue());
        } catch {
          throw new UsageError('--url không phải URL hợp lệ');
        }
        if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password) {
          throw new UsageError('--url chỉ nhận http/https và không chứa tài khoản/mật khẩu');
        }
        opts.url = `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
        break;
      }
      case 'chrome-arg': {
        const arg = needValue();
        // Chỉ nhận dạng --co hoặc --co=gia-tri không khoảng trắng; từ chối giá trị có tài khoản (user:pass@host)
        // vì cờ được ghi nguyên văn vào báo cáo JSON.
        if (!/^--[A-Za-z0-9-]+(=\S*)?$/.test(arg) || arg.includes('@')) {
          throw new UsageError('--chrome-arg phải có dạng --co hoặc --co=gia-tri, không chứa khoảng trắng hay @');
        }
        opts.chromeArgs.push(arg);
        break;
      }
      case 'skip-build':
      case 'uncap':
      case 'json':
      case 'help':
        if (val !== undefined) throw new UsageError(`--${key} không nhận giá trị`);
        if (key === 'skip-build') opts.skipBuild = true;
        else if (key === 'uncap') opts.uncap = true;
        else if (key === 'json') opts.json = true;
        else opts.help = true;
        break;
      default:
        throw new UsageError(`Tuỳ chọn không có: --${key}`);
    }
  }
  return opts;
}

/** Tên cấu hình dùng cho tên file kết quả. Chỉ gồm ký tự an toàn. */
export function configName(opts) {
  const { width, height, dpr } = opts.device;
  let name = `${opts.gpu}-cpu${opts.cpu}-${width}x${height}@${dpr}`;
  if (opts.uncap) name += '-uncap';
  if (opts.scenarioFiltered) name += `-${opts.scenarios.join('+')}`;
  return name.replace(/[^a-zA-Z0-9@.+x_-]/g, '_');
}

/** Phần trăm theo nearest-rank trên mảng ĐÃ SẮP XẾP tăng dần. */
export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

const round = (n, d = 2) => (n === null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Thống kê từ danh sách khoảng thời gian giữa các khung (ms).
 * Bỏ giá trị không hợp lệ (NaN, <= 0, vô cực).
 */
export function computeFrameStats(rawFrames) {
  const frames = [];
  if (Array.isArray(rawFrames)) {
    for (const f of rawFrames) {
      if (typeof f === 'number' && Number.isFinite(f) && f > 0) frames.push(f);
    }
  }
  const n = frames.length;
  if (n === 0) return { frames: 0 };

  let totalMs = 0;
  let over33 = 0;
  let over50 = 0;
  let max = 0;
  for (const f of frames) {
    totalMs += f;
    if (f > 33.3) over33++;
    if (f > 50) over50++;
    if (f > max) max = f;
  }
  const sorted = [...frames].sort((a, b) => a - b);

  // FPS theo từng giây (chỉ tính các giây tròn để giây cuối dở dang không kéo số liệu xuống).
  const fullSeconds = Math.floor(totalMs / 1000);
  let perSecond = [];
  if (fullSeconds >= 1) {
    perSecond = new Array(fullSeconds).fill(0);
    let t = 0;
    for (const f of frames) {
      t += f;
      const b = Math.floor(t / 1000);
      if (b < fullSeconds) perSecond[b] += 1;
    }
  } else {
    perSecond = [Math.round((n * 1000) / totalMs)];
  }

  const p50 = percentile(sorted, 50);
  const fpsAvg = (n * 1000) / totalMs;
  return {
    frames: n,
    sampledSeconds: round(totalMs / 1000, 2),
    fpsAvg: round(fpsAvg, 1),
    fpsMinPerSecond: Math.min(...perSecond),
    fpsPerSecond: perSecond,
    frameMs: {
      avg: round(totalMs / n),
      p50: round(p50),
      p95: round(percentile(sorted, 95)),
      p99: round(percentile(sorted, 99)),
      max: round(max),
    },
    pctOver33ms: round((over33 / n) * 100, 1),
    pctOver50ms: round((over50 / n) * 100, 1),
    // Trần 60 Hz: khung trung vị ~16.7 ms và trung bình sát 60 => không biết còn dư bao nhiêu.
    atRefreshCap: p50 !== null && p50 >= 15.5 && p50 <= 17.5 && fpsAvg >= 55,
  };
}

/** Chuỗi renderer là bộ vẽ bằng CPU (không phải GPU thật). */
export function isSoftwareRenderer(renderer) {
  return typeof renderer === 'string' && /swiftshader|software|llvmpipe|\bwarp\b|basic render/i.test(renderer);
}

/**
 * Đổi đường dẫn URL thành đường dẫn tệp tuyệt đối nằm dưới `root`.
 * Trả về { ok: true, path } hoặc { ok: false, status } (400 sai mã hoá, 403 thoát khỏi root).
 */
export function resolveStaticPath(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return { ok: false, status: 400 };
  }
  if (decoded.includes('\0')) return { ok: false, status: 400 };
  const rootAbs = resolve(root);
  // Bỏ dấu / đầu để resolve không nhảy về gốc ổ đĩa; sau đó kiểm tra vẫn nằm dưới root.
  const full = resolve(rootAbs, decoded.replace(/^[/\\]+/, ''));
  if (full !== rootAbs && !full.startsWith(rootAbs + sep)) return { ok: false, status: 403 };
  return { ok: true, path: full };
}

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// ---------------------------------------------------------------------------
// Kế hoạch mô phỏng người chơi (hàm thuần theo thời gian để dễ đọc/kiểm tra).

/** Bát giác khép kín, mỗi đoạn SEG_MS: giữ W/A/S/D đổi hướng, Shift ở một số đoạn. */
const KEY_SEGMENTS = [
  ['KeyW'],
  ['KeyW', 'KeyD', 'ShiftLeft'],
  ['KeyD', 'ShiftLeft'],
  ['KeyS', 'KeyD'],
  ['KeyS'],
  ['KeyS', 'KeyA', 'ShiftLeft'],
  ['KeyA', 'ShiftLeft'],
  ['KeyW', 'KeyA'],
];
export const KEY_SEGMENT_MS = 1500;

/** Danh sách phím cần giữ tại thời điểm tMs (ms từ lúc bắt đầu lấy mẫu). */
export function keysAt(tMs) {
  const i = Math.floor(Math.max(0, tMs) / KEY_SEGMENT_MS) % KEY_SEGMENTS.length;
  return KEY_SEGMENTS[i] ?? KEY_SEGMENTS[0];
}

/** Chu kỳ quay vòng của joystick (ms) và của kéo xoay camera (ms). */
export const JOYSTICK_PERIOD_MS = 8000;
export const LOOK_PERIOD_MS = 6000;

/** Vị trí ngón cái joystick: đi vòng tròn bán kính `radius` quanh (cx, cy). */
export function joystickPoint(tMs, cx, cy, radius) {
  const a = (2 * Math.PI * tMs) / JOYSTICK_PERIOD_MS;
  return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
}

/** Vị trí ngón kéo xoay: lắc ngang quanh (cx, cy) biên độ `amp`. */
export function lookPoint(tMs, cx, cy, amp) {
  return { x: cx + Math.sin((2 * Math.PI * tMs) / LOOK_PERIOD_MS) * amp, y: cy };
}
