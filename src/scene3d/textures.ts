import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { canvasFont, fontsReady, type FontRole } from './fonts';

/**
 * Texture nhỏ vẽ bằng canvas lúc chạy (không tải file): ván gỗ, gạch lát. Mỗi loại và màu chỉ vẽ một lần (cache).
 * `size` là cạnh ô lặp theo mét; đặt `repeat` = kích thước mặt phẳng / size. Chỉ gọi trong trình duyệt.
 */

export type FloorKind = 'wood' | 'tile' | 'stone';

const cache = new Map<string, CanvasTexture>();

/** Số giả ngẫu nhiên ổn định (để texture không đổi giữa các lần vẽ). */
const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Pha trộn hai màu hex theo t (0..1). */
export function mixHex(a: string, b: string, t: number): string {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[c(r1!, r2!), c(g1!, g2!), c(b1!, b2!)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function draw(kind: FloorKind, base: string): HTMLCanvasElement {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  if (kind === 'wood') {
    // 8 tấm ván ngang, mỗi tấm một sắc độ, có thớ gỗ và khe giữa các tấm, mối nối so le.
    const plank = S / 8;
    for (let r = 0; r < 8; r++) {
      const tone = (rnd(r + 1) - 0.5) * 0.18;
      g.fillStyle = tone < 0 ? mixHex(base, '#3b2410', -tone) : mixHex(base, '#ffffff', tone * 0.7);
      g.fillRect(0, r * plank, S, plank);
      const cut = Math.floor(rnd(r + 40) * S);
      g.fillStyle = 'rgba(40,24,10,0.45)';
      g.fillRect(cut, r * plank, 2, plank);
      for (let k = 0; k < 7; k++) {
        g.fillStyle = `rgba(60,36,16,${0.05 + rnd(r * 9 + k) * 0.08})`;
        g.fillRect(0, r * plank + 2 + rnd(r * 13 + k + 7) * (plank - 4), S, 1);
      }
      g.fillStyle = 'rgba(40,24,10,0.5)';
      g.fillRect(0, r * plank, S, 2);
    }
  } else {
    // Gạch vuông 4 x 4 ô, vữa sáng, mỗi viên lệch sắc độ nhẹ.
    const n = kind === 'tile' ? 4 : 2;
    const tile = S / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const tone = (rnd(i * 7 + j * 13 + 3) - 0.5) * (kind === 'stone' ? 0.16 : 0.07);
        g.fillStyle = tone < 0 ? mixHex(base, '#000000', -tone) : mixHex(base, '#ffffff', tone);
        g.fillRect(i * tile, j * tile, tile, tile);
      }
    }
    g.fillStyle = kind === 'stone' ? 'rgba(70,60,50,0.55)' : 'rgba(255,255,255,0.55)';
    for (let i = 0; i < n; i++) {
      g.fillRect(i * tile, 0, 3, S);
      g.fillRect(0, i * tile, S, 3);
    }
  }
  return cv;
}

/** Texture lát sàn lặp lại; `repeatX/Z` là số lần lặp trên mặt phẳng. */
export function floorTexture(kind: FloorKind, base: string, repeatX: number, repeatZ: number): CanvasTexture {
  const key = `${kind}|${base}|${repeatX}|${repeatZ}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = new CanvasTexture(draw(kind, base));
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeatX, repeatZ);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

// ---------- Bề mặt: tường trát, cửa cuốn, nhựa đường, gạch lát vỉa hè ----------

export type SurfaceKind = 'plaster' | 'shutter' | 'asphalt' | 'pavers' | 'facade';

function drawSurface(kind: SurfaceKind, base: string): HTMLCanvasElement {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const speckle = (n: number, seed: number, lo: number, hi: number, alpha: number) => {
    for (let i = 0; i < n; i++) {
      const x = rnd(i * 3 + seed) * S;
      const y = rnd(i * 3 + seed + 1) * S;
      const s = 1 + rnd(i * 3 + seed + 2) * 2;
      g.fillStyle = rnd(i + seed * 7) < 0.5 ? mixHex(base, '#000000', lo) : mixHex(base, '#ffffff', hi);
      g.globalAlpha = alpha;
      g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
  };
  switch (kind) {
    case 'plaster': {
      speckle(900, 1, 0.1, 0.08, 0.35);
      // Vết ố nước mưa chảy dọc, đậm dần xuống chân tường.
      for (let i = 0; i < 9; i++) {
        const x = rnd(i + 200) * S;
        const gr = g.createLinearGradient(0, 0, 0, S);
        gr.addColorStop(0, 'rgba(60,50,40,0)');
        gr.addColorStop(1, `rgba(60,50,40,${0.05 + rnd(i + 300) * 0.07})`);
        g.fillStyle = gr;
        g.fillRect(x, 0, 3 + rnd(i + 400) * 8, S);
      }
      const bottom = g.createLinearGradient(0, S * 0.72, 0, S);
      bottom.addColorStop(0, 'rgba(50,40,30,0)');
      bottom.addColorStop(1, 'rgba(50,40,30,0.13)');
      g.fillStyle = bottom;
      g.fillRect(0, S * 0.72, S, S * 0.28);
      break;
    }
    case 'shutter': {
      // Cửa cuốn: gân ngang đều, mỗi gân một đường tối ở dưới và một đường sáng ở trên.
      const rib = 10;
      for (let y = 0; y < S; y += rib) {
        g.fillStyle = mixHex(base, '#000000', 0.28);
        g.fillRect(0, y + rib - 3, S, 3);
        g.fillStyle = mixHex(base, '#ffffff', 0.16);
        g.fillRect(0, y, S, 2);
      }
      speckle(260, 5, 0.12, 0.06, 0.3);
      break;
    }
    case 'asphalt': {
      speckle(2400, 9, 0.2, 0.16, 0.5);
      g.strokeStyle = 'rgba(15,15,20,0.35)';
      g.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        let x = rnd(k + 70) * S;
        let y = rnd(k + 80) * S;
        g.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          x += (rnd(k * 11 + s + 90) - 0.5) * 50;
          y += (rnd(k * 11 + s + 120) - 0.2) * 30;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      break;
    }
    case 'facade': {
      // Mặt tiền nhà cao tầng: lưới cửa sổ 8 x 8, một phần sáng đèn, các tầng ngăn bằng gờ.
      const cols = 8;
      const rows = 8;
      const cw = S / cols;
      const rh = S / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = rnd(r * 17 + c * 5 + 31) < 0.24;
          g.fillStyle = lit ? '#fde68a' : mixHex('#243447', base, 0.12 + rnd(r * 3 + c) * 0.12);
          g.fillRect(c * cw + 5, r * rh + 6, cw - 10, rh - 12);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(c * cw + 5, r * rh + 6, cw - 10, 2);
        }
        g.fillStyle = mixHex(base, '#000000', 0.12);
        g.fillRect(0, r * rh + rh - 3, S, 3);
      }
      break;
    }
    case 'pavers': {
      // Gạch chữ nhật xếp so le hai hàng một, vữa sáng.
      const rows = 8;
      const cols = 4;
      const rh = S / rows;
      const cw = S / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const tone = (rnd(r * 9 + c * 5 + 17) - 0.5) * 0.12;
          g.fillStyle = tone < 0 ? mixHex(base, '#000000', -tone) : mixHex(base, '#ffffff', tone);
          g.fillRect(c * cw + (r % 2) * (cw / 2), r * rh, cw, rh);
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let r = 0; r < rows; r++) {
        g.fillRect(0, r * rh, S, 2);
        for (let c = -1; c <= cols; c++) g.fillRect(c * cw + (r % 2) * (cw / 2), r * rh, 2, rh);
      }
      speckle(500, 13, 0.1, 0.05, 0.25);
      break;
    }
  }
  return cv;
}

/** Texture bề mặt lặp lại; `repeatX/Y` là số lần lặp trên mặt phẳng (hộp: lặp như nhau trên mọi mặt). */
export function surfaceTexture(kind: SurfaceKind, base: string, repeatX: number, repeatY: number): CanvasTexture {
  const key = `s|${kind}|${base}|${repeatX}|${repeatY}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = new CanvasTexture(drawSurface(kind, base));
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Hai màu của vòm trời chuyển sắc từ màu chân trời: đỉnh trời pha với `zenith` theo `amount`. Hàm thuần để test. */
export function skyGradient(horizon: string, zenith = '#6f9bd6', amount = 0.5): { horizon: string; top: string } {
  const ok = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);
  const h = ok(horizon) ? horizon : '#b8c2cc';
  const z = ok(zenith) ? zenith : '#6f9bd6';
  const a = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0.5));
  return { horizon: h, top: mixHex(h, z, a) };
}

// ---------- Chữ và hình dán tường vẽ bằng canvas ----------

export interface LabelLine {
  text: string;
  /**
   * Độ lớn TƯƠNG ĐỐI của dòng (không phải pixel): mỗi dòng nhận phần chiều cao tỉ lệ với số này, rồi chữ tự thu nhỏ cho
   * vừa bề ngang khung (không ép méo). Dòng một mình thì số này không có tác dụng.
   */
  size: number;
  color: string;
  /** Phông (xem fonts.ts); mặc định 'round'. */
  font?: FontRole;
  /** 'gold': vàng chuyển sắc từ sáng ở trên xuống đậm ở dưới (kiểu băng rôn Tết); thiếu thì dùng `color`. */
  fill?: 'gold';
  /** Viền chữ: `w` là tỉ lệ so với cỡ chữ (0.1 = viền dày 10% cỡ chữ). */
  stroke?: { color: string; w: number };
  /** Bóng đổ lệch (tỉ lệ so với cỡ chữ), màu đặc. */
  shadow?: { color: string; dx: number; dy: number };
}

export interface LabelOptions {
  /** Mọi dòng dùng cùng một cỡ chữ (lấy cỡ nhỏ nhất vừa khung), ví dụ câu đối dọc. */
  uniform?: boolean;
  /** Rắc hạt nhám lên nền (chỉ khi có nền), cho cảm giác in giấy. */
  grain?: boolean;
}

/** Chữ chiếm tối đa phần này của chiều cao dòng / chiều rộng khung (còn lại là lề). */
const LINE_FILL = 0.8;
const WIDTH_FILL = 0.92;
const HEIGHT_FILL = 0.88;

/**
 * Cỡ chữ (px) cho từng dòng: mỗi dòng nhận phần chiều cao `H * HEIGHT_FILL * size / tổng size`, chữ cao LINE_FILL phần đó,
 * rồi thu nhỏ nếu bề ngang đo được vượt WIDTH_FILL * `W`. `measure(line)` trả bề ngang của dòng tại cỡ 1 px (theo phông của
 * dòng; viền được tính thêm). Hàm thuần để test.
 */
export function fitLabelFonts(
  lines: readonly LabelLine[],
  W: number,
  H: number,
  measure: (line: LabelLine) => number,
  uniform = false,
): { fonts: number[]; bands: number[] } {
  const total = lines.reduce((s, l) => s + Math.max(1, l.size), 0);
  const bands = lines.map((l) => (H * HEIGHT_FILL * Math.max(1, l.size)) / total);
  const fonts = lines.map((l, i) => {
    let f = bands[i]! * LINE_FILL;
    const w = (measure(l) + (l.stroke ? l.stroke.w : 0) + (l.shadow ? Math.abs(l.shadow.dx) : 0)) * f;
    if (w > W * WIDTH_FILL && w > 0) f *= (W * WIDTH_FILL) / w;
    return f;
  });
  if (uniform && fonts.length > 0) {
    const m = Math.min(...fonts);
    fonts.fill(m);
  }
  return { fonts, bands };
}

/** Texture chữ: nền `bg` (null = trong suốt), các dòng xếp từ trên xuống theo tỉ lệ. `px` = số px cho mỗi mét. Cache theo nội dung. */
export function labelTexture(lines: readonly LabelLine[], w: number, h: number, bg: string | null, px = 384, opts: LabelOptions = {}): CanvasTexture {
  // `fontsReady()` nằm trong khoá: vẽ lại khi phông vừa nạp xong thay vì giữ bản vẽ bằng phông dự phòng.
  const key = `l|${w}|${h}|${bg}|${px}|${opts.uniform ?? false}|${opts.grain ?? false}|${fontsReady()}|${JSON.stringify(lines)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.max(32, Math.round(w * px));
  cv.height = Math.max(32, Math.round(h * px));
  const g = cv.getContext('2d')!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, cv.width, cv.height);
    if (opts.grain) {
      for (let i = 0; i < Math.round((cv.width * cv.height) / 90); i++) {
        g.fillStyle = rnd(i) < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
        g.fillRect(rnd(i + 1) * cv.width, rnd(i + 2) * cv.height, 1.5, 1.5);
      }
    }
  }
  const measure = (ln: LabelLine): number => {
    g.font = canvasFont(ln.font ?? 'round', 100);
    return g.measureText(ln.text).width / 100;
  };
  const { fonts, bands } = fitLabelFonts(lines, cv.width, cv.height, measure, opts.uniform);
  let y = (cv.height * (1 - HEIGHT_FILL)) / 2;
  lines.forEach((ln, i) => {
    const f = fonts[i]!;
    const cy = y + bands[i]! / 2;
    g.font = canvasFont(ln.font ?? 'round', f);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.miterLimit = 2;
    if (ln.shadow) {
      g.fillStyle = ln.shadow.color;
      g.fillText(ln.text, cv.width / 2 + ln.shadow.dx * f, cy + ln.shadow.dy * f);
    }
    if (ln.stroke) {
      g.lineWidth = ln.stroke.w * f;
      g.strokeStyle = ln.stroke.color;
      g.strokeText(ln.text, cv.width / 2, cy);
    }
    if (ln.fill === 'gold') {
      const gr = g.createLinearGradient(0, cy - f * 0.5, 0, cy + f * 0.5);
      gr.addColorStop(0, '#fff4b8');
      gr.addColorStop(0.45, '#f6c343');
      gr.addColorStop(1, '#c2790c');
      g.fillStyle = gr;
    } else g.fillStyle = ln.color;
    g.fillText(ln.text, cv.width / 2, cy);
    y += bands[i]!;
  });
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Tờ ghi chú dán trên bảng ghim: nền cork, các giấy màu lệch nhau, vài nét bút. */
export function corkboardTexture(): CanvasTexture {
  const key = 'cork';
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#b98a58';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rnd(i) < 0.5 ? 'rgba(90,60,30,0.35)' : 'rgba(230,190,140,0.35)';
    g.fillRect(rnd(i + 1) * S, rnd(i + 2) * S, 1 + rnd(i + 3) * 2, 1 + rnd(i + 4) * 2);
  }
  const notes = ['#fde68a', '#fca5a5', '#bfdbfe', '#bbf7d0', '#fed7aa', '#e9d5ff'];
  for (let i = 0; i < 9; i++) {
    const x = 14 + (i % 3) * 80 + rnd(i + 9) * 14;
    const y = 14 + Math.floor(i / 3) * 80 + rnd(i + 19) * 14;
    g.save();
    g.translate(x + 32, y + 32);
    g.rotate((rnd(i + 29) - 0.5) * 0.3);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(-30, -28, 64, 64);
    g.fillStyle = notes[i % notes.length]!;
    g.fillRect(-32, -32, 64, 64);
    g.fillStyle = 'rgba(60,60,80,0.55)';
    for (let l = 0; l < 4; l++) g.fillRect(-24, -18 + l * 11, 36 + rnd(i * 7 + l) * 12, 2);
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.arc(0, -28, 4, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}
