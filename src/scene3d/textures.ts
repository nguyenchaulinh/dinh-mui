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
