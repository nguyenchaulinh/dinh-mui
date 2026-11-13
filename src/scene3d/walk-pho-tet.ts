import type { WalkArea } from '../game/types';
import type { RegionStyle } from './registry';
import { box, circle } from './walkKit';

/**
 * Vùng đi lại của phố ngày 28 tháng Chạp (chặng 3). Số liệu khớp PhoTet trong sets.tsx:
 * - nhà phố sát z = -5.8 (sâu 4 => mặt tiền z = -3.8); vỉa hè bắc z từ -3.8 tới -2.0; lòng đường z từ -1.8 tới 2.2
 *   (4 làn xe máy chạy dọc trục x, xem traffic.ts); vỉa hè nam z từ 2.5 tới 4.3.
 * - hàng chậu hoa/quất trên vỉa hè bắc (z = -3.2), bỏ hai chậu ở chỗ sạp quà.
 * - sạp quà (props-extra.tsx GiftStall) sát nhà phố tại (-3.0, -3.4); bến xe (BusStop) trên vỉa hè nam, mé đông.
 * - cột đèn giao thông (4.6, 2.6).
 * Lòng đường KHÔNG có vật cản: băng qua đường là cơ chế chơi (xe máy là mối nguy, xem traffic.ts).
 */

export interface PhoPot {
  x: number;
  z: number;
  kind: 'hoa' | 'quat';
}

/** Hàng chậu hoa trên vỉa hè bắc (cũng dùng để dựng hình trong sets.tsx để khỏi lệch). */
export function phoPots(): PhoPot[] {
  const out: PhoPot[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -9 + i * 2.2;
    if (Math.abs(x - -3.0) < 1.9) continue; // chỗ sạp quà
    out.push({ x, z: -3.2, kind: i % 3 === 2 ? 'quat' : 'hoa' });
  }
  return out;
}

export function buildPhoTet(_style: RegionStyle): WalkArea {
  return {
    bounds: { minX: -12.5, maxX: 12.5, minZ: -3.7, maxZ: 4.2 },
    colliders: [
      ...phoPots().map((p, i) => circle(`chau-${i}`, p.x, p.z, p.kind === 'quat' ? 0.4 : 0.2, false)),
      box('sap-qua', -3.0, -3.4, 1.3, 0.4, false),
      circle('cot-den', 4.6, 2.6, 0.15, false),
      box('ghe-ben', 7.0, 3.95, 0.7, 0.2, false),
      circle('tru-ben-1', 5.9, 4.1, 0.1, false),
      circle('tru-ben-2', 8.1, 4.1, 0.1, false),
    ],
    spawn: { x: -8, z: -2.9, rotY: Math.PI / 2 },
  };
}
