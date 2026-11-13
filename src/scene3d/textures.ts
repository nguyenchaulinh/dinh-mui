import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

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

export type SurfaceKind = 'plaster' | 'shutter' | 'asphalt' | 'pavers';

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
