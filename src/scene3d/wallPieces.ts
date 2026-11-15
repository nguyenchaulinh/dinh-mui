/**
 * Chia một bức tường chạy dọc trục z thành các đoạn quanh các ô cửa sổ (hàm thuần, có test).
 * Mỗi ô mở là [z - w/2, z + w/2]; các đoạn trụ nằm giữa các ô và hai đầu tường. Ô nằm ngoài tường bị cắt cho vừa, ô trùng
 * nhau được gộp, ô rộng bằng 0 hoặc hỏng bị bỏ.
 */

export interface WallOpening {
  z: number;
  w: number;
}

/** Các khoảng mở đã chuẩn hoá: sắp tăng dần, cắt vào [z0, z1], gộp ô chồng nhau. */
export function normalizeOpenings(z0: number, z1: number, openings: readonly WallOpening[]): [number, number][] {
  const spans = openings
    .filter((o) => Number.isFinite(o.z) && Number.isFinite(o.w) && o.w > 0)
    .map((o): [number, number] => [Math.max(z0, o.z - o.w / 2), Math.min(z1, o.z + o.w / 2)])
    .filter(([a, b]) => b - a > 1e-9)
    .sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  for (const [a, b] of spans) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Các đoạn trụ liền (đặc) của tường, tức phần còn lại sau khi trừ các ô mở; bỏ đoạn dài dưới 1 cm. */
export function wallPiers(z0: number, z1: number, openings: readonly WallOpening[]): [number, number][] {
  const piers: [number, number][] = [];
  let cur = z0;
  for (const [a, b] of normalizeOpenings(z0, z1, openings)) {
    if (a - cur > 0.01) piers.push([cur, a]);
    cur = b;
  }
  if (z1 - cur > 0.01) piers.push([cur, z1]);
  return piers;
}

export interface WindowedWallSpec {
  x: number;
  thick: number;
  z0: number;
  z1: number;
  h: number;
  sill: number;
  head: number;
  openings: readonly WallOpening[];
}

/**
 * Các khối của tường có ô cửa sổ thật: dải dưới (dưới bậu), dải trên (trên đầu cửa) và các trụ giữa ô. Hàm thuần để test
 * và để gộp hình (roomShapes.ts). Vật cản của tường không đổi: vẫn là một khối liền trong walk.ts.
 */
export function windowedWallBoxes(w: WindowedWallSpec): { p: [number, number, number]; s: [number, number, number] }[] {
  const mid = (w.z0 + w.z1) / 2;
  const out: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [w.x, w.sill / 2, mid], s: [w.thick, w.sill, w.z1 - w.z0] },
    { p: [w.x, w.head + (w.h - w.head) / 2, mid], s: [w.thick, w.h - w.head, w.z1 - w.z0] },
  ];
  for (const [a, b] of wallPiers(w.z0, w.z1, w.openings)) {
    out.push({ p: [w.x, w.sill + (w.head - w.sill) / 2, (a + b) / 2], s: [w.thick, w.head - w.sill, b - a] });
  }
  return out;
}
