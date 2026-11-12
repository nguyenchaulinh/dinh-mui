import type { Vec2 } from './types';

/** Một đối tượng có thể tương tác (NPC). x, z là vị trí hiện tại (có thể thay đổi tại chỗ mỗi khung hình). */
export interface Target {
  key: string;
  x: number;
  z: number;
  /** Tầm tương tác riêng (m); thiếu thì dùng INTERACT_DIST. Chó chỉ vuốt được khi lại thật gần. */
  reach?: number;
}

/** Tầm tương tác tối đa (m), tính từ tâm người chơi tới tâm đối tượng. */
export const INTERACT_DIST = 2.1;

/** Nửa góc nón phía trước nhân vật (rad) trong đó mới tương tác được: ~80 độ, đủ rộng cho ngón tay trên điện thoại. */
export const INTERACT_HALF_ANGLE = 1.4;

/** Rất gần thì tương tác được bất kể hướng mặt (đứng sát người ta mà phải xoay đúng góc thì khó chịu). */
export const INTERACT_ANY_ANGLE_DIST = 1.0;

/**
 * Trọng số góc khi chấm điểm: điểm = khoảng cách + ANGLE_WEIGHT * góc lệch (rad), thấp hơn thì thắng.
 * Để người đang quay mặt về ai thì chọn người đó, dù có con chó đi theo sát (luôn gần nhất) đứng cạnh.
 */
export const ANGLE_WEIGHT = 1.2;

/** Hiệu góc ngắn nhất giữa hai góc, giá trị tuyệt đối trong [0, π]. */
function angleGap(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/**
 * Chọn đối tượng tương tác trong tầm `maxDist` và trong nón phía trước nhân vật (trừ khi rất gần):
 * điểm thấp nhất thắng, điểm = khoảng cách + ANGLE_WEIGHT * góc lệch so với hướng mặt. Hướng mặt `heading` theo quy ước types.ts: tiến = (sin h, cos h) trên (x, z).
 * `slack` và `angleSlack` nới tầm và nón (dùng để giữ mục tiêu cũ thêm một chút, tránh chớp tắt).
 * Đầu vào không hữu hạn thì bỏ qua đối tượng/trả null; không bao giờ ném lỗi.
 */
export function findInteractable(
  pos: Vec2,
  heading: number,
  targets: readonly Target[],
  slack = 0,
  angleSlack = 0,
): string | null {
  const halfAngle = INTERACT_HALF_ANGLE + angleSlack;
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z) || !Number.isFinite(heading)) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    const dx = t.x - pos.x;
    const dz = t.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (!Number.isFinite(d) || d > (t.reach ?? INTERACT_DIST) + slack) continue;
    const gap = d < 1e-6 ? 0 : angleGap(Math.atan2(dx, dz), heading);
    if (d > INTERACT_ANY_ANGLE_DIST && gap > halfAngle) continue;
    const score = d + ANGLE_WEIGHT * gap;
    if (score >= bestScore) continue;
    best = t.key;
    bestScore = score;
  }
  return best;
}
