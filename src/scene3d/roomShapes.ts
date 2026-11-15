import { windowedWallBoxes } from './wallPieces';
import type { Shape } from './shapes';
import { CUOI_NAM } from './walk';

/**
 * Phần TĨNH của lớp học / văn phòng (tường, chân tường, khung cửa, cửa sổ, máy lạnh, đồng hồ, khung bảng, câu đối, khung tranh,
 * quầy) mô tả bằng dữ liệu rồi gộp thành vài mesh (xem Merged.tsx) thay vì ~90 `<mesh>` riêng. Toạ độ và kích thước y như
 * bản JSX cũ; chữ (TextPlane), bảng ghim (texture), model GLB vẫn dựng riêng.
 */

export type RoomKind = 'van-phong' | 'lop-hoc';

export interface RoomPalette {
  wall: string;
  dado: string;
  board: string;
}

export interface RoomShapes {
  /** Khối đặc (vật liệu chịu sáng, màu theo đỉnh). */
  solid: Shape[];
  /** Khối tự phát sáng (đèn báo, biển lối ra): vật liệu không chịu sáng. */
  lit: Shape[];
  /** Kính cửa sổ (trong suốt). */
  glass: Shape[];
}

/** Màu rèm theo loại phòng. */
export const CURTAIN: Readonly<Record<RoomKind, string>> = { 'van-phong': '#cbd5e1', 'lop-hoc': '#dc2626' };

type V3 = readonly [number, number, number];

export function roomShapes(kind: RoomKind, room: RoomPalette): RoomShapes {
  const L = CUOI_NAM;
  const solid: Shape[] = [];
  const lit: Shape[] = [];
  const glass: Shape[] = [];
  const box = (p: V3, s: V3, c: string, e = 0, group?: Shape['group']): void => {
    (e >= 0.5 ? lit : solid).push({ g: 'box', s, p, c, ...(group ? { group } : {}) });
  };
  const h = L.wallHeight;
  const depth = L.frontZ - L.wallBackZ;
  const midZ = (L.wallBackZ + L.frontZ) / 2;
  const wallW = L.wallSideX * 2 + L.wallThick * 2;
  const bz = L.wallBackZ;
  const doorLow = L.door.z0 - (bz - L.wallThick);
  const doorHigh = L.frontZ + L.wallThick - L.door.z1;
  const doorX = L.wallSideX + L.wallThick / 2;
  const doorMid = (L.door.z0 + L.door.z1) / 2;

  // Tường sau, chân tường (ốp dado), len tường dọc tường sau và tường trái.
  box([0, h / 2, bz - L.wallThick / 2], [wallW, h, L.wallThick], room.wall);
  box([0, 0.45, bz + 0.01], [wallW - 0.6, 0.9, 0.02], room.dado);
  box([0, 0.06, bz + 0.02], [wallW - 0.6, 0.12, 0.04], '#5b4636');
  box([-L.wallSideX + 0.02, 0.06, midZ + L.ext / 2], [0.04, 0.12, depth + L.ext], '#5b4636');

  // Tường trái có cửa sổ (trụ giữa các ô) và khung cửa sổ.
  for (const b of windowedWallBoxes({ x: -L.wallSideX - L.wallThick / 2, thick: L.wallThick, z0: bz - L.wallThick / 2, z1: L.frontZ + L.wallThick / 2 + L.ext, h, sill: L.windows.sill, head: L.windows.head, openings: L.windows.zs.map((z) => ({ z, w: L.windows.w })) })) {
    box(b.p, b.s, room.wall);
  }
  const { w: ww, sill, head } = L.windows;
  const wh = head - sill;
  const wy = (sill + head) / 2;
  for (const z of L.windows.zs) {
    const x = -L.wallSideX;
    glass.push({ g: 'box', s: [0.02, wh, ww], p: [x + 0.01, wy, z], c: '#cfe8ff' });
    for (const s of [-1, 1]) box([x + 0.03, wy, z + s * (ww / 2)], [0.06, wh + 0.08, 0.07], '#f8fafc');
    for (const s of [-1, 1]) box([x + 0.03, wy + s * (wh / 2), z], [0.06, 0.07, ww + 0.07], '#f8fafc');
    box([x + 0.03, wy, z], [0.04, 0.04, ww], '#f8fafc');
    box([x + 0.03, wy, z], [0.04, wh, 0.04], '#f8fafc');
    box([x + 0.1, wy - wh / 2 - 0.06, z], [0.22, 0.05, ww + 0.2], '#e5e7eb');
    for (const s of [-1, 1]) box([x + 0.08, wy + 0.08, z + s * (ww / 2 + 0.18)], [0.06, wh + 0.5, 0.3], CURTAIN[kind]);
  }

  // Máy lạnh trên đầu cửa sổ (hai trụ rộng nhất).
  for (const z of [-1.6, 3.6]) {
    const o: V3 = [-L.wallSideX + 0.15, 2.62, z];
    const at = (p: V3): V3 => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
    box(at([0, 0, 0]), [0.26, 0.3, 1.0], '#f8fafc');
    box(at([0.09, -0.12, 0]), [0.1, 0.05, 0.92], '#e2e8f0');
    box(at([0.131, -0.02, 0]), [0.02, 0.012, 0.8], '#cbd5e1');
    box(at([0.131, 0.08, 0.38]), [0.02, 0.025, 0.05], '#22c55e', 0.8);
    box(at([0, -0.18, 0.2]), [0.04, 0.08, 0.04], '#e2e8f0');
  }

  // Tường phải chừa khe cửa, khung cửa và biển "Lối ra".
  box([doorX, h / 2, L.door.z0 - doorLow / 2], [L.wallThick, h, doorLow], room.wall);
  box([doorX, h / 2, L.door.z1 + (doorHigh + L.ext) / 2], [L.wallThick, h, doorHigh + L.ext], room.wall);
  box([doorX, 2.35, doorMid], [L.wallThick, 1.3, L.door.z1 - L.door.z0], room.wall);
  for (const z of [L.door.z0, L.door.z1]) box([doorX - 0.16, 0.85, z], [0.06, 1.7, 0.08], '#7c4a2a');
  box([doorX - 0.17, 1.95, doorMid], [0.04, 0.22, 0.7], '#16a34a', 0.6);

  // Tường sau: bảng, băng rôn đỏ vàng, khung gỗ, máng phấn, phấn và bút.
  const bx = L.wall.board.x;
  box([bx, 1.55, bz + 0.03], [2.6, 1.1, 0.04], room.board);
  box([bx, 2.55, bz + 0.03], [3.6, 0.36, 0.03], '#c0262d');
  box([bx, 2.55, bz + 0.05], [3.3, 0.06, 0.01], '#f5b82e');
  for (const s of [-1, 1]) box([bx + s * 1.33, 1.55, bz + 0.04], [0.07, 1.2, 0.05], '#5b3720');
  for (const s of [-1, 1]) box([bx, 1.55 + s * 0.58, bz + 0.04], [2.73, 0.07, 0.05], '#5b3720');
  box([bx, 0.94, bz + 0.1], [2.4, 0.04, 0.12], '#5b3720');
  box([-1.1, 0.985, bz + 0.1], [0.12, 0.04, 0.05], '#f5f5f4');
  box([-0.5, 0.985, bz + 0.1], [0.07, 0.05, 0.03], kind === 'lop-hoc' ? '#fde68a' : '#2563eb');
  box([-0.35, 0.985, bz + 0.1], [0.07, 0.05, 0.03], '#dc2626');

  // Câu đối: nền đỏ, viền vàng, nền đỏ trong (chữ vẽ riêng bằng TextPlane).
  for (const c of [L.wall.coupletL, L.wall.coupletR]) {
    box([c.x, 1.7, bz + 0.03], [0.62, 1.56, 0.03], '#c0262d');
    box([c.x, 1.7, bz + 0.047], [0.56, 1.5, 0.01], '#f5b82e');
    box([c.x, 1.7, bz + 0.054], [0.5, 1.44, 0.01], '#c0262d');
  }
  box([L.wall.plaque.x, 2.05, bz + 0.03], [L.wall.plaque.w, 0.3, 0.03], kind === 'lop-hoc' ? '#f5deb3' : '#dbeafe');

  // Đồng hồ treo tường: viền gỗ, mặt trắng, hai kim.
  const cx = L.wall.clock.x;
  const cz = bz + 0.05;
  solid.push({ g: 'cyl', s: [0.24, 0.24, 0.05, 20], p: [cx, 2.3, cz], r: [Math.PI / 2, 0, 0], c: '#3b2a1d' });
  solid.push({ g: 'cyl', s: [0.2, 0.2, 0.02, 20], p: [cx, 2.3, cz + 0.03], r: [Math.PI / 2, 0, 0], c: '#fafaf9' });
  box([cx, 2.3 + 0.06, cz + 0.05], [0.018, 0.13, 0.01], '#111827');
  box([cx + 0.05, 2.3, cz + 0.05], [0.1, 0.018, 0.01], '#111827');

  // Tờ lịch (nền đỏ; chữ vẽ riêng) và khung bảng ghim (mặt cork là texture riêng).
  box([L.wall.calendar.x, 1.85, bz + 0.03], [L.wall.calendar.w, 0.92, 0.02], '#c0262d');
  box([L.wall.cork.x, 1.85, bz + 0.04], [0.9 + 0.1, 0.7 + 0.1, 0.03], '#7c4a2a');

  // Tường trái giữa các cửa sổ: khung thời khóa biểu (lớp học) hoặc tranh khung (văn phòng).
  const pic = { p: [-L.wallSideX + 0.03, 1.7, -1.6] as V3, r: [0, Math.PI / 2, 0] as V3 };
  if (kind === 'lop-hoc') {
    box([0, 0, 0], [0.8, 1.0, 0.03], '#7c4a2a', 0, pic);
  } else {
    box([0, 0, 0], [0.8, 0.6, 0.03], '#3b2a1d', 0, pic);
    box([0, 0, 0.02], [0.7, 0.5, 0.01], '#9ec5e8', 0, pic);
    box([0, -0.12, 0.028], [0.7, 0.22, 0.01], '#4b7f52', 0, pic);
    box([0.18, 0.08, 0.03], [0.12, 0.12, 0.01], '#fde68a', 0, pic);
  }

  // Áp phích ưu đãi trên tường phải: khung gỗ (chữ vẽ riêng).
  box([L.wallSideX - 0.03, L.poster.y, L.poster.z], [0.04, L.poster.h + 0.1, L.poster.w + 0.1], '#5b3720');

  // Quầy pha cà phê / bàn liên hoan: vật đặt trên quầy.
  const q = (p: V3): V3 => [L.counter.x + p[0], p[1], L.counter.z + p[2]];
  if (kind === 'van-phong') {
    box(q([0, 0.88, -0.2]), [0.22, 0.26, 0.22], '#bae6fd');
  } else {
    ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'].forEach((c, i) => box(q([0, 0.88, -0.7 + i * 0.32]), [0.12, 0.26, 0.12], c));
  }

  return { solid, lit, glass };
}
