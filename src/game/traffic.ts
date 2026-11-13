import { isBlocked } from './collision';
import type { Collider, Vec2 } from './types';

/**
 * Dòng xe máy (hàm thuần): vị trí mọi xe là HÀM của thời gian, nên bộ dựng hình 3D (props.tsx Traffic) và kiểm tra va chạm
 * dùng chung một công thức, không bao giờ lệch nhau. Xe chạy dọc trục x, vòng lại sau mỗi `length` mét.
 */

export interface TrafficLaneCfg {
  z: number;
  dir: 1 | -1;
  speed: number;
}

export interface TrafficCfg {
  lanes: readonly TrafficLaneCfg[];
  count: number;
  length: number;
}

export interface BikeSpec {
  index: number;
  lane: TrafficLaneCfg;
  /** Dịch pha ban đầu (m) để các xe không chạy thẳng hàng. */
  offset: number;
}

/** Nửa chiều dài (theo hướng chạy) và nửa chiều rộng của vùng va chạm một xe máy (kể cả người lái và hàng chở). */
export const BIKE_HALF_LEN = 0.8;
export const BIKE_HALF_WIDTH = 0.32;

/** Số giả ngẫu nhiên ổn định theo chỉ số (cùng công thức với props.tsx `rnd`). */
function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Danh sách xe (cố định theo cấu hình). Cấu hình hỏng (không làn, count <= 0, length <= 0) thì không có xe. */
export function trafficBikes(cfg: TrafficCfg): BikeSpec[] {
  if (cfg.lanes.length === 0 || !(cfg.count > 0) || !(cfg.length > 0)) return [];
  return Array.from({ length: Math.floor(cfg.count) }, (_, i) => ({
    index: i,
    lane: cfg.lanes[i % cfg.lanes.length]!,
    offset: hash01(i) * cfg.length,
  }));
}

/** Vị trí x của một xe tại thời điểm t (giây). */
export function bikeX(b: BikeSpec, t: number, length: number): number {
  const d = (b.offset + (Number.isFinite(t) ? t : 0) * b.lane.speed) % length;
  return b.lane.dir * (d - length / 2);
}

/** Vùng va chạm của một xe tại thời điểm t: hộp theo trục (dài theo x). */
export function bikeBox(b: BikeSpec, t: number, length: number): Collider {
  return { kind: 'box', x: bikeX(b, t, length), z: b.lane.z, hw: BIKE_HALF_LEN, hd: BIKE_HALF_WIDTH };
}

const HUGE = { minX: -1e9, maxX: 1e9, minZ: -1e9, maxZ: 1e9 };

/** Người chơi (vòng tròn bán kính `radius`) có chạm xe nào tại thời điểm t không. */
export function trafficHit(bikes: readonly BikeSpec[], cfg: TrafficCfg, t: number, player: Vec2, radius: number): boolean {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.z)) return false;
  // Chỉ xét các làn gần người chơi: lọc theo z trước cho nhẹ (hàm chạy mỗi khung hình).
  for (const b of bikes) {
    if (Math.abs(b.lane.z - player.z) > BIKE_HALF_WIDTH + radius + 0.01) continue;
    if (isBlocked(player, radius, [bikeBox(b, t, cfg.length)], HUGE)) return true;
  }
  return false;
}

/**
 * Bị quẹt thì dịch về vỉa hè gần hơn: bắc (z nhỏ) hoặc nam (z lớn) so với giữa lòng đường (trung bình các làn).
 * Giữ nguyên x để người chơi không bị nhảy ngang.
 */
export function safeSpot(cfg: TrafficCfg, safeNorthZ: number, safeSouthZ: number, player: Vec2): Vec2 {
  const mid = cfg.lanes.reduce((s, l) => s + l.z, 0) / Math.max(1, cfg.lanes.length);
  return { x: player.x, z: player.z < mid ? safeNorthZ : safeSouthZ };
}
