import { shortestAngle, wrapAngle } from './movement';
import type { Vec2 } from './types';

/**
 * Hành vi NPC (hàm thuần, không import three/react).
 * - stand: đứng yên; khi người chơi lại gần trong `aware` thì quay mặt về phía họ.
 * - wander: đi lang thang quanh `home` trong bán kính `leash`, nghỉ vài giây giữa các lần đi.
 * - approach: khi người chơi trong `aware` thì đi tới, dừng ở `stopDist` rồi đứng quay mặt về họ;
 *   người chơi ở xa thì đi lang thang như wander. Dùng cho chó chạy theo (chậm) và bé Bin đuổi theo (nhanh).
 */
export type Behavior = 'stand' | 'wander' | 'approach';

export interface NpcParams {
  behavior: Behavior;
  /** Tốc độ đi (m/s). */
  speed: number;
  /** Bán kính lang thang quanh home (m). */
  leash: number;
  /** Khoảng cách phát hiện người chơi (m). 0 = không bao giờ để ý. */
  aware: number;
  /** Dừng cách người chơi bao xa khi approach (m). */
  stopDist: number;
  /** Tốc độ xoay mặt (rad/s). */
  turnRate: number;
}

export interface NpcState {
  pos: Vec2;
  heading: number;
  moving: boolean;
  /** Điểm đang đi tới khi lang thang; null = đang nghỉ. */
  target: Vec2 | null;
  /** Thời gian nghỉ còn lại (s) trước khi chọn điểm mới. */
  wait: number;
  /** Thời gian liên tục không nhích được (s): bị chặn thì đổi điểm. */
  stuck: number;
  /** Đang "bỏ cuộc" đuổi theo (s còn lại): approach bị kẹt quá lâu thì đi lang thang một lúc rồi mới thử lại. */
  giveUp: number;
  /** Trạng thái bộ sinh số giả ngẫu nhiên (mulberry32), để cùng hạt giống cho cùng hành vi. */
  rng: number;
}

export const DEFAULT_NPC: Readonly<NpcParams> = Object.freeze({
  behavior: 'stand',
  speed: 1.2,
  leash: 3,
  aware: 4,
  stopDist: 1.4,
  turnRate: 8,
});

/** Bước tối đa mỗi lần gọi (s); khung dài hơn thì bị kẹp, NPC chỉ chậm lại chứ không xuyên tường. */
const MAX_DT = 0.1;
/** Tới gần điểm đích trong khoảng này thì coi là đã tới (m). */
const ARRIVE = 0.25;
/** Không nhích được quá lâu (s) thì bỏ điểm đích. */
const STUCK_LIMIT = 0.8;
/** approach bị kẹt quá lâu (s) thì bỏ cuộc một lúc (đi lang thang) thay vì ghim mãi sau vật cản. */
const APPROACH_GIVE_UP = 1.5;
const GIVE_UP_TIME = 3;
/** Dải trễ quanh stopDist (m): đã dừng thì phải cách xa thêm chừng này mới chạy lại, tránh chớp đi/dừng mỗi khung. */
const RESUME_MARGIN = 0.25;

export function createNpcState(pos: Vec2, heading: number, seed: number): NpcState {
  return {
    pos: { x: finiteOr(pos.x, 0), z: finiteOr(pos.z, 0) },
    heading: wrapAngle(heading),
    moving: false,
    target: null,
    wait: 0.5,
    stuck: 0,
    giveUp: 0,
    rng: (Number.isFinite(seed) ? seed : 0) >>> 0,
  };
}

function finiteOr(v: number, d: number): number {
  return Number.isFinite(v) ? v : d;
}

/** mulberry32: trả [giá trị trong [0, 1), trạng thái mới]. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function turnToward(heading: number, aim: number, rate: number, dt: number): number {
  const diff = shortestAngle(heading, aim);
  const maxTurn = Math.max(0, rate) * dt;
  return wrapAngle(heading + Math.max(-maxTurn, Math.min(maxTurn, diff)));
}

/**
 * Một bước mô phỏng NPC. Thuần (không đổi state vào). `resolve` quyết định vị trí thật sau va chạm
 * (bên gọi cung cấp, tránh tường, bàn ghế, người chơi, NPC khác). Không sinh NaN kể cả khi đầu vào hỏng.
 */
export function stepNpc(
  p: NpcParams,
  home: Vec2,
  s: NpcState,
  player: Vec2,
  dt: number,
  resolve: (from: Vec2, delta: Vec2) => Vec2,
): NpcState {
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  if (h <= 0) return s;

  const playerOk = Number.isFinite(player.x) && Number.isFinite(player.z);
  const toPlayerX = playerOk ? player.x - s.pos.x : 0;
  const toPlayerZ = playerOk ? player.z - s.pos.z : 0;
  const distPlayer = playerOk ? Math.hypot(toPlayerX, toPlayerZ) : Infinity;
  const noticed = playerOk && p.aware > 0 && distPlayer <= p.aware && s.giveUp <= 0;
  const faceAim = Math.atan2(toPlayerX, toPlayerZ);

  let { target, wait, stuck, rng, giveUp } = s;
  giveUp = Math.max(0, giveUp - h);
  let heading = s.heading;
  let goal: Vec2 | null = null;

  if (p.behavior === 'stand') {
    if (noticed && distPlayer > 0.01) heading = turnToward(heading, faceAim, p.turnRate, h);
    return { ...s, heading, moving: false };
  }

  if (p.behavior === 'approach' && noticed) {
    target = null;
    // Đang đi thì tiếp tục tới stopDist; đã dừng thì chỉ chạy lại khi người chơi xa thêm RESUME_MARGIN.
    if (distPlayer > (s.moving ? p.stopDist : p.stopDist + RESUME_MARGIN)) goal = { x: player.x, z: player.z };
    else if (distPlayer > 0.01) heading = turnToward(heading, faceAim, p.turnRate, h);
  } else {
    // Lang thang: nghỉ rồi chọn điểm mới trong bán kính leash quanh home.
    if (target === null) {
      wait -= h;
      if (wait <= 0) {
        const [r1, s1] = nextRandom(rng);
        const [r2, s2] = nextRandom(s1);
        rng = s2;
        const ang = r1 * 2 * Math.PI;
        const rad = Math.sqrt(r2) * Math.max(0, p.leash);
        target = { x: home.x + Math.sin(ang) * rad, z: home.z + Math.cos(ang) * rad };
      }
    }
    goal = target;
  }

  let moved = false;
  let pos = s.pos;
  if (goal !== null) {
    const dx = goal.x - pos.x;
    const dz = goal.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= ARRIVE && target !== null) {
      // Tới nơi: nghỉ 1.5 - 4.5 giây.
      const [r, s1] = nextRandom(rng);
      rng = s1;
      target = null;
      wait = 1.5 + r * 3;
      stuck = 0;
    } else if (d > 0.01) {
      const step = Math.min(d, Math.max(0, p.speed) * h);
      const delta = { x: (dx / d) * step, z: (dz / d) * step };
      const to = resolve(pos, delta);
      if (Number.isFinite(to.x) && Number.isFinite(to.z)) {
        const gained = Math.hypot(to.x - pos.x, to.z - pos.z);
        pos = { x: to.x, z: to.z };
        moved = gained > step * 0.3;
        stuck = moved ? 0 : stuck + h;
      } else {
        stuck += h;
      }
      heading = turnToward(heading, Math.atan2(dx, dz), p.turnRate, h);
      // Kẹt quá lâu khi đang lang thang thì bỏ điểm đích để chọn điểm khác (approach thì cứ thử tiếp).
      if (stuck > STUCK_LIMIT && target !== null) {
        target = null;
        wait = 0.5;
        stuck = 0;
      } else if (stuck > APPROACH_GIVE_UP && p.behavior === 'approach' && target === null) {
        // Đuổi theo mà kẹt (ví dụ người chơi ở bên kia nhà): bỏ cuộc một lúc, đi lang thang rồi thử lại.
        giveUp = GIVE_UP_TIME;
        wait = 0;
        stuck = 0;
      }
    }
  }

  return { pos, heading, moving: moved, target, wait, stuck, giveUp, rng };
}
