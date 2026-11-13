import type { Collider } from '../game/types';

/**
 * Bộ dụng cụ dùng chung để dựng vùng đi lại cho từng bộ cảnh (mỗi cảnh một file walk-*.ts).
 * Thuần: chỉ import type, không đụng three/react.
 */

/** Chiều cao người chơi (m), khớp Figure: đầu ở y ~1.42 + bán kính đầu. Vật thấp hơn thì chặn, cao hơn thì đi qua bên dưới. */
export const BODY_HEIGHT = 1.7;

/** Vòng tròn va chạm. `blocksCamera`: vật lớn che camera (nhà, tường), vật mảnh/thấp thì không. */
export function circle(id: string, x: number, z: number, r: number, blocksCamera: boolean): Collider {
  return { kind: 'circle', id, x, z, r, blocksCamera };
}

/** Hộp va chạm theo trục (hw: nửa bề rộng theo x, hd: nửa bề sâu theo z). */
export function box(id: string, x: number, z: number, hw: number, hd: number, blocksCamera: boolean): Collider {
  return { kind: 'box', id, x, z, hw, hd, blocksCamera };
}

/** Hộp xoay quanh trục y (rotY: radian). */
export function rotBox(
  id: string,
  x: number,
  z: number,
  hw: number,
  hd: number,
  rotY: number,
  blocksCamera: boolean,
): Collider {
  return { kind: 'box', id, x, z, hw, hd, rotY, blocksCamera };
}
