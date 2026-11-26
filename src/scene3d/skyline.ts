import { BoxGeometry, BufferAttribute, BufferGeometry, Color } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rnd } from './rand';
import { mixHex } from './textures';

/** Một toà nhà trong dãy nhà cao tầng nền: tâm x, rộng, sâu, cao, màu (đã pha sương). */
export interface Tower {
  x: number;
  w: number;
  d: number;
  h: number;
  c: string;
}

/** Số lần lặp texture mặt tiền (lưới 8 x 8 ô cửa) theo bề rộng và chiều cao toà: khoảng một lưới trên mỗi 8 m. */
export const facadeRepeat = (t: Pick<Tower, 'w' | 'h'>): [number, number] => [Math.max(1, Math.round(t.w / 8)), Math.max(1, Math.round(t.h / 8))];

/** Dãy toà nhà dọc trục x cục bộ: mỗi toà một cao độ, màu pha sương. Hàm thuần (cùng hạt ra cùng dãy). */
export function skylineTowers(span: number, seed: number, haze: string, minH: number, maxH: number): Tower[] {
  const out: Tower[] = [];
  let x = -span / 2;
  for (let i = 0; x < span / 2; i++) {
    const w = 4.5 + rnd(seed * 100 + i) * 3.5;
    const h = minH + rnd(seed * 100 + i + 40) * (maxH - minH);
    const base = ['#c7cdd6', '#b9c2cf', '#cfc5bb', '#b6bdc9', '#d2cbc2'][i % 5]!;
    out.push({ x: x + w / 2, w, d: 5 + rnd(seed * 100 + i + 70) * 2, h, c: mixHex(base, haze, 0.35) });
    x += w + 0.4 + rnd(seed * 100 + i + 90) * 1.2;
  }
  return out;
}

/**
 * Gộp cả dãy thành MỘT geometry (một draw call thay vì mỗi toà một mesh): UV nhân theo số lần lặp của từng toà để dùng chung
 * một texture mặt tiền (lặp 1 lần, nền trắng), màu từng toà đi vào màu đỉnh (nhân với texture).
 */
export function skylineGeometry(towers: readonly Tower[]): BufferGeometry {
  const col = new Color();
  const parts = towers.map((t) => {
    const g = new BoxGeometry(t.w, t.h, t.d);
    const [rx, ry] = facadeRepeat(t);
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
    g.translate(t.x, t.h / 2, 0);
    col.set(t.c);
    const n = g.attributes.position!.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new BufferAttribute(arr, 3));
    return g;
  });
  return parts.length === 0 ? new BufferGeometry() : mergeGeometries(parts, false);
}
