import type { Bounds, Collider, WalkArea } from '../game/types';
import type { RegionStyle } from './registry';
import { box, circle, rotBox } from './walkKit';

/**
 * Vùng đi lại của trạm dừng chân quốc lộ (chặng 4 "Đường về"). Thuần: không import three/react.
 *
 * NGUỒN SỰ THẬT CỦA BỐ CỤC: file này. set-tram-dung.tsx import đúng các hằng số bên dưới để dựng hình,
 * nên hình và collider không thể lệch vị trí/kích thước. walk-tram-dung.test.ts còn đọc thẳng nguồn
 * set-tram-dung.tsx để chắc rằng cảnh vẫn dùng các hằng số này (không tự chép số).
 *
 * Nguồn hình học của từng collider (set-tram-dung.tsx dựng bằng các hằng số cùng tên):
 * - lan-can      : BARRIER, lan can ống dọc mép quốc lộ tại z = -1.4 (hộp mỏng, suốt trục x); quốc lộ z -6..-2 chỉ để nhìn.
 * - quay-banh-mi : COUNTER, quầy bánh mì 3 x 0.6 m, cao 1.0 m, tâm (-4.2, 3.0). Người bán đứng sau quầy ở (-4.2, 2.2).
 *                  Sâu 0.6 (không phải 0.8) để điểm 'quan' cách mép quầy 0.5 m >= 0.45 và người chơi đứng được ở z >= 3.65.
 * - ke-sau-quan  : SHELF, kệ bày chai lọ sau quầy 3.4 x 0.5 m, cao 1.9 m, tâm (-4.2, 1.2).
 * - cot-quan-1..4: QUAN_POSTS, bốn cột đỡ mái tôn (hộp 0.14 m => vòng tròn r 0.11).
 *                  Mái tôn ROOF cao tối thiểu ROOF_MIN_Y ~ 2.54 m (>= 2.4) nên KHÔNG là vật cản; người đi qua bên dưới.
 * - ban-nhua-*   : TABLES, ba bộ bàn nhựa 0.8 x 0.8 m (cao 0.72 m) + ghế đẩu nhựa cao 0.42 m (ghe-nhua-*, vòng tròn r 0.22).
 *                  Bộ a, b dưới mái quán (phía đông quầy); bộ c có dù che ở phía tây.
 * - ban-chu-ba, ghe-chu-ba, gay-livestream: CHU_BA, bàn nhỏ 0.7 x 0.7, ghế đẩu, và chân đế gậy điện thoại livestream (đế r 0.22).
 * - xe-khach     : BUS, thân hộp 8 x 3.2 x 3.0 m tâm (8.0, 1.4): x 4..12, z -0.1..2.9, che camera.
 *                  Lệch hợp đồng ví dụ (tâm z 1.6): mép nam z = 2.9 để điểm 'xe-khach' (7.8, 3.4) cách xe 0.5 m >= 0.45.
 * - xe-hoi-cu    : CAR, xe hơi cũ của Thái Gara 1.8 x 4.2 m xoay rotY, thấp 1.5 m.
 * - bien-ban-xe, lop-xe, thung-phuy: biển A "BÁN XE" (SIGN), chồng lốp (TIRES), thùng phuy (DRUM) quanh xe Thái Gara.
 * - xe-may-1..2  : BIKES, hai xe máy đỗ (0.44 x 1.1 m) phía tây quán.
 * - cot-den-1..2 : LAMPS, hai cột đèn sân (thân + đế, r 0.22). Đầu đèn ở độ cao 5 m.
 * - cay-hoa-1..2 : BLOSSOMS, chậu đào/mai trước quán (miệng chậu r 0.3 x scale ~ 0.42; tán hoa ở trên 1.7 m). Một vòng tròn r 0.45.
 * - cay-quat     : KUMQUAT, chậu quất ở góc đông nam bãi xe khách; tán xanh r 0.58 ở độ cao 0.7..1.8 m => vòng tròn r 0.55.
 * - xe-nuoc-mia  : CART, xe nước mía 1.1 x 0.64 m.
 *
 * Mọi điểm hợp đồng (spots của 'tram-dung' trong registry.ts) và spawn phải cách mọi collider >= 0.45 m;
 * walk-tram-dung.test.ts kiểm tra điều đó và kiểm tra không có túi kín (flood fill).
 */

/** Sân trạm đi lại được. Quốc lộ (z -6..-2) nằm ngoài; lan can ở z = -1.4 là mép ngoài. */
export const TRAM_BOUNDS: Readonly<Bounds> = Object.freeze({ minX: -12, maxX: 12, minZ: -1.2, maxZ: 8.5 });

/** Xuất phát: giữa sân phía nam, quay mặt về -z (hướng quán và quốc lộ). */
export const TRAM_SPAWN: Readonly<{ x: number; z: number; rotY: number }> = Object.freeze({
  x: -1,
  z: 7,
  rotY: Math.PI,
});

/** Bán kính người chơi (= PLAYER_RADIUS trong src/game/movement.ts) và NPC đứng yên (= ACTOR_RADIUS trong walk.ts). */
export const PLAYER_R = 0.35;
export const ACTOR_R = 0.42;

export type Pt = readonly [number, number];

/** Lan can ống dọc mép quốc lộ. hw: nửa chiều dài collider (phủ trọn bounds); hình dựng còn kéo dài ra xa hơn. */
export const BARRIER = { z: -1.4, hw: 13, hd: 0.12, h: 1.05 } as const;

/** Quầy bánh mì. */
export const COUNTER = { x: -4.2, z: 3.0, hw: 1.5, hd: 0.3, h: 1.0 } as const;

/** Kệ sau quầy. */
export const SHELF = { x: -4.2, z: 1.2, hw: 1.7, hd: 0.25, h: 1.9 } as const;

/** Mái tôn quán: hình chữ nhật trên mặt phẳng XZ, tâm cao y, nghiêng (rx = tilt) hạ dần về phía +z. */
export const ROOF = { minX: -6.9, maxX: -0.5, minZ: 0.5, maxZ: 4.2, y: 2.7, tilt: 0.07, thick: 0.06 } as const;

/** Điểm thấp nhất của mặt dưới mái (mép nam): phải >= 2.4 m để người cao ~1.7 m đi qua dưới. */
export const ROOF_MIN_Y: number =
  ROOF.y - (Math.sin(ROOF.tilt) * (ROOF.maxZ - ROOF.minZ)) / 2 - ROOF.thick / 2;

/** Bốn cột mái (hộp 0.14 m). */
export const QUAN_POSTS: readonly Pt[] = [
  [-6.7, 0.8],
  [-0.7, 0.8],
  [-6.7, 4.0],
  [-0.7, 4.0],
];
export const POST_R = 0.11;

/** Bàn nhựa vuông 0.8 m, ghế đẩu nhựa quanh bàn. */
export const TABLE_HALF = 0.4;
export const STOOL_R = 0.22;
const STOOL_OFFSET = 0.64;

export interface TableSet {
  id: string;
  x: number;
  z: number;
  /** Có dù che (bộ c). */
  parasol: boolean;
  stools: readonly Pt[];
}

function tableSet(id: string, x: number, z: number, parasol: boolean): TableSet {
  return {
    id,
    x,
    z,
    parasol,
    stools: [
      [x, z - STOOL_OFFSET],
      [x, z + STOOL_OFFSET],
      [x - STOOL_OFFSET, z],
      [x + STOOL_OFFSET, z],
    ],
  };
}

export const TABLES: readonly TableSet[] = [
  tableSet('a', -1.8, 1.5, false),
  tableSet('b', -1.8, 3.4, false),
  tableSet('c', -8.0, 1.6, true),
];

/** Chú Ba livestream: bàn nhỏ, ghế đẩu và chân đế gậy điện thoại đặt phía trước mặt chú (spot 'chu-ba' tại (1.6, 2.4)). */
export const CHU_BA = {
  table: { x: 2.6, z: 1.9, hw: 0.35, hd: 0.35 },
  stool: { x: 2.45, z: 2.95 },
  tripod: { x: 0.95, z: 3.2, r: 0.22 },
} as const;

/** Xe khách đậu phía đông, đầu xe hướng tây, cửa ở mặt nam gần x = 7.8. */
export const BUS = { x: 8.0, z: 1.4, hw: 4.0, hd: 1.5, h: 3.2 } as const;

/** Xe hơi cũ của Thái Gara: dài theo trục z cục bộ (hd), rộng theo x (hw); rotY ~ 77 độ nên dài gần song song trục x. */
export const CAR = { x: -9.5, z: 6.2, hw: 0.9, hd: 2.1, rotY: 1.35, h: 1.5 } as const;

/** Biển A "BÁN XE" cạnh đầu xe. */
export const SIGN = { x: -6.5, z: 5.7, hw: 0.4, hd: 0.15, rotY: 0.5 } as const;
export const TIRES = { x: -11.2, z: 4.2, r: 0.38 } as const;
export const DRUM = { x: -5.9, z: 7.5, r: 0.3 } as const;

/** Xe máy đỗ (dài theo z cục bộ). */
export const BIKES: readonly { x: number; z: number; rotY: number }[] = [
  { x: -10.4, z: 2.4, rotY: 0.15 },
  { x: -9.75, z: 2.5, rotY: -0.15 },
];
export const BIKE_HALF = { hw: 0.22, hd: 0.55 } as const;

/** Cột đèn sân (cao 5 m). */
export const LAMPS: readonly Pt[] = [
  [-10.6, 0.3],
  [11.2, 8.0],
];
export const LAMP_R = 0.22;

/** Chậu đào/mai trước quán. */
export const BLOSSOMS: readonly { x: number; z: number; scale: number }[] = [
  { x: -6.4, z: 4.8, scale: 1.4 },
  { x: -0.3, z: 4.6, scale: 1.3 },
];
export const BLOSSOM_R = 0.45;

/** Chậu quất. */
export const KUMQUAT = { x: 11.2, z: 3.9, scale: 1.2, r: 0.55 } as const;

/** Xe nước mía. */
export const CART = { x: 10.2, z: 5.4, hw: 0.55, hd: 0.32, rotY: -0.5 } as const;

export function buildTramDung(_style: RegionStyle): WalkArea {
  const colliders: Collider[] = [
    box('lan-can', 0, BARRIER.z, BARRIER.hw, BARRIER.hd, false),
    box('quay-banh-mi', COUNTER.x, COUNTER.z, COUNTER.hw, COUNTER.hd, false),
    box('ke-sau-quan', SHELF.x, SHELF.z, SHELF.hw, SHELF.hd, false),
  ];
  QUAN_POSTS.forEach(([x, z], i) => colliders.push(circle(`cot-quan-${i + 1}`, x, z, POST_R, false)));
  for (const t of TABLES) {
    colliders.push(box(`ban-nhua-${t.id}`, t.x, t.z, TABLE_HALF, TABLE_HALF, false));
    t.stools.forEach(([x, z], i) => colliders.push(circle(`ghe-nhua-${t.id}${i + 1}`, x, z, STOOL_R, false)));
  }
  colliders.push(
    box('ban-chu-ba', CHU_BA.table.x, CHU_BA.table.z, CHU_BA.table.hw, CHU_BA.table.hd, false),
    circle('ghe-chu-ba', CHU_BA.stool.x, CHU_BA.stool.z, STOOL_R, false),
    circle('gay-livestream', CHU_BA.tripod.x, CHU_BA.tripod.z, CHU_BA.tripod.r, false),
    // Xe khách: vật lớn che camera. Xe hơi thấp (1.5 m < camera) nên không che.
    box('xe-khach', BUS.x, BUS.z, BUS.hw, BUS.hd, true),
    rotBox('xe-hoi-cu', CAR.x, CAR.z, CAR.hw, CAR.hd, CAR.rotY, false),
    rotBox('bien-ban-xe', SIGN.x, SIGN.z, SIGN.hw, SIGN.hd, SIGN.rotY, false),
    circle('lop-xe', TIRES.x, TIRES.z, TIRES.r, false),
    circle('thung-phuy', DRUM.x, DRUM.z, DRUM.r, false),
  );
  BIKES.forEach((b, i) => colliders.push(rotBox(`xe-may-${i + 1}`, b.x, b.z, BIKE_HALF.hw, BIKE_HALF.hd, b.rotY, false)));
  LAMPS.forEach(([x, z], i) => colliders.push(circle(`cot-den-${i + 1}`, x, z, LAMP_R, false)));
  BLOSSOMS.forEach((p, i) => colliders.push(circle(`cay-hoa-${i + 1}`, p.x, p.z, BLOSSOM_R, false)));
  colliders.push(
    circle('cay-quat', KUMQUAT.x, KUMQUAT.z, KUMQUAT.r, false),
    rotBox('xe-nuoc-mia', CART.x, CART.z, CART.hw, CART.hd, CART.rotY, false),
  );

  return {
    bounds: { ...TRAM_BOUNDS },
    colliders,
    spawn: { ...TRAM_SPAWN },
  };
}
