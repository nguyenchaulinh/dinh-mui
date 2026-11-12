import type { MoveInput, MoveParams, MoverState, Vec2 } from './types';

const TWO_PI = Math.PI * 2;

/** Chặn dt để một khung khựng (tab nền, GC) không làm nhân vật phóng xuyên tường. */
const MAX_DT = 0.05;

/** Dưới ngưỡng tốc độ này (m/s) không xoay mặt: tránh mặt quay giật khi gần đứng yên hoặc đang tì vào tường. */
const TURN_MIN_SPEED = 0.3;

/** Độ lớn đầu vào tối thiểu để quay mặt theo đầu vào khi vận tốc thực quá nhỏ (bị chặn, đẩy nhẹ). */
const TURN_MIN_INPUT = 0.1;

/** Bán kính thân nhân vật trên mặt đất (m), dùng cho va chạm. */
export const PLAYER_RADIUS = 0.35;

/**
 * Thông số di chuyển mặc định. Lý do chọn số:
 * - walkSpeed 2.2 m/s: đi nhanh vừa phải, sân nhà nhỏ không thấy lê thê nhưng vẫn đủ chậm để canh tới NPC.
 * - runSpeed 4.2 m/s: gần gấp đôi tốc độ đi nên chạy có cảm giác rõ rệt; vẫn kịp xoay camera theo.
 * - accel 16 m/s²: đạt tốc độ đi sau ~0.14 s, tốc độ chạy sau ~0.26 s. Có chút đà nên không cứng như robot,
 *   nhưng vẫn bám sát ngón tay trên joystick cảm ứng (thấp hơn thì thấy trễ, cao hơn thì giật cục).
 * - decel 24 m/s²: lớn hơn accel để dừng gọn (đi: ~0.1 m, chạy: ~0.37 m), dễ đứng đúng chỗ để tương tác với NPC.
 * - turnRate 12 rad/s: quay đầu 180° trong ~0.26 s, mặt theo kịp hướng đi mà không xoay tức thì.
 * Đóng băng để lỡ sửa nhầm thì lỗi ngay; cần bản sao thì dùng { ...DEFAULT_MOVE }.
 */
export const DEFAULT_MOVE: MoveParams = Object.freeze({
  walkSpeed: 2.2,
  runSpeed: 4.2,
  accel: 16,
  decel: 24,
  turnRate: 12,
});

/** Số hữu hạn thì giữ nguyên, ngược lại (NaN, ±Infinity) coi như 0. */
function finiteOr0(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/** Tham số không âm hữu hạn; giá trị hỏng coi như 0 (đứng yên) thay vì sinh NaN. */
function nonNeg(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Hệ số co (<= 1) để vector (x, z) có độ dài không quá `max`. */
function fitScale(x: number, z: number, max: number): number {
  const len = Math.hypot(x, z);
  return len > max ? max / len : 1;
}

/** Đưa góc về (-π, π]. Giá trị không hữu hạn trả 0. */
export function wrapAngle(a: number): number {
  if (!Number.isFinite(a)) return 0;
  if (a > -Math.PI && a <= Math.PI) return a;
  let r = a - TWO_PI * Math.ceil((a - Math.PI) / TWO_PI);
  // Sai số làm tròn có thể rơi đúng vào -π: đẩy sang π cho khớp nửa khoảng (-π, π].
  if (r <= -Math.PI) r += TWO_PI;
  return r > -Math.PI && r <= Math.PI ? r : 0;
}

/** Hiệu góc ngắn nhất `to - from`, trong (-π, π]. Dương nghĩa là xoay theo chiều tăng góc. */
export function shortestAngle(from: number, to: number): number {
  return wrapAngle(to - from);
}

/**
 * Đổi đầu vào theo màn hình (x = phải, y = tiến) thành hướng đi trong thế giới, theo yaw camera.
 * Quy ước ở src/game/types.ts: tiến = (-sin yaw, -cos yaw), phải = (cos yaw, -sin yaw).
 * Độ lớn kẹp tối đa 1 (đi chéo trên bàn phím không nhanh hơn đi thẳng), nhỏ hơn 1 thì giữ nguyên (joystick nhẹ = đi chậm).
 * Đầu vào không hữu hạn coi như không có đầu vào.
 */
export function inputToWorld(input: MoveInput, camYaw: number): Vec2 {
  const ix = input.x;
  const iy = input.y;
  if (!Number.isFinite(ix) || !Number.isFinite(iy) || !Number.isFinite(camYaw)) {
    return { x: 0, z: 0 };
  }
  const len = Math.hypot(ix, iy);
  const k = len > 1 ? 1 / len : 1;
  const sx = ix * k;
  const sy = iy * k;
  const s = Math.sin(camYaw);
  const c = Math.cos(camYaw);
  return { x: c * sx - s * sy, z: -s * sx - c * sy };
}

/**
 * Một bước di chuyển. Hàm thuần: không đổi `state`, trả state mới.
 *
 * - dt kẹp trong [0, 0.05]; dt không hữu hạn hoặc <= 0 thì đứng nguyên (không gọi `resolve`).
 * - Vận tốc tiến dần về vận tốc mục tiêu (walkSpeed hoặc runSpeed, nhân độ lớn đầu vào) bằng accel/decel.
 *   Dùng accel khi mục tiêu không chậm hơn vận tốc hiện tại, ngược lại dùng decel (thả tay, đổi chiều, hạ từ chạy xuống đi).
 * - Vị trí mới = resolve(pos, vel * dt), tức tích phân Euler nửa ẩn (dùng vận tốc đã cập nhật).
 *   Ở 60 fps so với 144 fps lệch dưới 1 cm; một bước 0.05 so với 5 bước 0.01 lệch ~1.6 cm khi tăng tốc từ đứng yên.
 * - Vận tốc kết quả suy từ độ dời thực tế / dt, nên đi vào tường thì tốc độ về ~0 (không giữ vận tốc ảo)
 *   và trượt dọc tường thì vận tốc đổi hướng theo. Kẹp ở max(walkSpeed, runSpeed) để cú đẩy ra khỏi vật cản
 *   của `resolve` không biến thành vận tốc khổng lồ.
 * - Mặt (heading) xoay theo đường ngắn nhất về hướng vận tốc với turnRate, chỉ khi speed > 0.3 m/s.
 * - Nếu `resolve` trả toạ độ không hữu hạn thì coi như bị chặn (giữ vị trí cũ).
 * - Mọi đầu vào không hữu hạn (input, camYaw, dt, và vel/heading/pos trong state) được coi như 0, không sinh NaN.
 *
 * Mỗi lần gọi cấp phát vài object nhỏ (state mới, pos, vel, các đối số của resolve); không có mảng.
 */
export function stepMover(
  state: MoverState,
  input: MoveInput,
  camYaw: number,
  p: MoveParams,
  dt: number,
  resolve: (from: Vec2, delta: Vec2) => Vec2,
): MoverState {
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  const walk = nonNeg(p.walkSpeed);
  const run = nonNeg(p.runSpeed);
  const top = Math.max(walk, run);

  const sx = finiteOr0(state.pos.x);
  const sz = finiteOr0(state.pos.z);
  let vx = finiteOr0(state.vel.x);
  let vz = finiteOr0(state.vel.z);
  const k0 = fitScale(vx, vz, top);
  vx *= k0;
  vz *= k0;
  const heading0 = wrapAngle(state.heading);

  if (h <= 0) {
    return { pos: { x: sx, z: sz }, vel: { x: vx, z: vz }, heading: heading0, speed: Math.hypot(vx, vz) };
  }

  // Vận tốc mục tiêu: hướng theo màn hình quy ra thế giới, nhân tốc độ đi/chạy.
  const dir = inputToWorld(input, camYaw);
  const targetSpeed = input.run ? run : walk;
  const tx = dir.x * targetSpeed;
  const tz = dir.z * targetSpeed;
  const tLen = Math.hypot(tx, tz);

  // Tiến dần vận tốc về mục tiêu, mỗi bước đổi tối đa rate * dt.
  const rate = tLen > 0 && tLen >= Math.hypot(vx, vz) ? nonNeg(p.accel) : nonNeg(p.decel);
  const dvx = tx - vx;
  const dvz = tz - vz;
  const dvLen = Math.hypot(dvx, dvz);
  const maxDv = rate * h;
  let nvx = tx;
  let nvz = tz;
  if (dvLen > maxDv) {
    const k = maxDv / dvLen;
    nvx = vx + dvx * k;
    nvz = vz + dvz * k;
  }

  // Di chuyển có va chạm; độ dời thực tế quyết định vận tốc mới.
  const moved = resolve({ x: sx, z: sz }, { x: nvx * h, z: nvz * h });
  const movedOk = Number.isFinite(moved.x) && Number.isFinite(moved.z);
  const rx = movedOk ? moved.x : sx;
  const rz = movedOk ? moved.z : sz;
  let avx = (rx - sx) / h;
  let avz = (rz - sz) / h;
  const k1 = fitScale(avx, avz, top);
  avx *= k1;
  avz *= k1;
  const speed = Math.hypot(avx, avz);

  // Xoay mặt theo hướng vận tốc bằng đường ngắn nhất, không quá turnRate * dt mỗi bước.
  // Chậm hơn ngưỡng (bị tường/NPC chặn, đẩy nhẹ joystick) thì quay theo hướng đầu vào để nhân vật vẫn quay mặt
  // được về phía muốn tới (cần cho tương tác ở bước sau).
  let heading = heading0;
  let aim: number | null = null;
  if (speed > TURN_MIN_SPEED) aim = Math.atan2(avx, avz);
  else if (Math.hypot(dir.x, dir.z) > TURN_MIN_INPUT) aim = Math.atan2(dir.x, dir.z);
  if (aim !== null) {
    const diff = shortestAngle(heading0, aim);
    const maxTurn = nonNeg(p.turnRate) * h;
    heading = wrapAngle(heading0 + Math.max(-maxTurn, Math.min(maxTurn, diff)));
  }

  return { pos: { x: rx, z: rz }, vel: { x: avx, z: avz }, heading, speed };
}
