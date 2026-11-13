import type { WalkArea } from '../game/types';
import { SETS, type RegionStyle } from './registry';
import { box, circle } from './walkKit';

/**
 * Vùng đi lại của nhà trên (chặng 6, mâm cơm tất niên). Số liệu khớp NhaTren trong sets.tsx và Feast/Altar trong props.tsx:
 * - sàn 12 x 12 tâm (0, 0); tường sau tại z = -4.5, hai tường bên tại x = ±6 (dày 0.2); phía trước (z dương) để hở.
 * - cột gỗ (±3.5, -4.2) bán kính 0.16; bàn thờ (0, -3.8) rộng 2.0 x 0.8; đào (-4.4, -3.4), quất (4.4, -3.4).
 * - TV treo sát tường đông tại (5.6, -1.5), mặt xoay -PI/2 nên rộng 1.4 theo trục z.
 * - mâm: bàn thấp bán kính 1.0 ở tâm; 7 ghế đẩu quanh vòng bán kính 1.55 (xem registry `ghe-*`).
 * - quầy bếp (props-extra.tsx KitchenCounter) sát tường tây tại (-5.3, 2.0).
 * Không có vật nào quanh mâm chừa lối giữa các ghế đủ rộng cho người chơi: mọi tương tác với người ngồi làm từ bên ngoài vòng.
 */
export function buildNhaTren(_style: RegionStyle): WalkArea {
  const seats = Object.entries(SETS['nha-tren']?.spots ?? {})
    .filter(([k]) => k.startsWith('ghe-'))
    .map(([k, s]) => circle(`dau-${k}`, s.pos[0], s.pos[2], 0.2, false));
  return {
    bounds: { minX: -5.7, maxX: 5.7, minZ: -4.2, maxZ: 5.8 },
    colliders: [
      box('tuong-sau', 0, -4.5, 6, 0.1, true),
      box('tuong-tay', -6, 0, 0.1, 6, true),
      box('tuong-dong', 6, 0, 0.1, 6, true),
      circle('cot-tay', -3.5, -4.2, 0.2, false),
      circle('cot-dong', 3.5, -4.2, 0.2, false),
      box('ban-tho', 0, -3.8, 1.05, 0.45, false),
      circle('hoa-dao', -4.4, -3.4, 0.3, false),
      circle('cay-quat', 4.4, -3.4, 0.55, false),
      box('tv', 5.6, -1.5, 0.1, 0.72, false),
      circle('mam', 0, 0, 1.0, false),
      box('quay-bep', -5.3, 2.0, 0.45, 1.2, false),
      ...seats,
    ],
    // Phía trước mâm, nhìn vào trong (rotY = PI: nhìn về -z).
    spawn: { x: 0, z: 4.4, rotY: Math.PI },
  };
}
