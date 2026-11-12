import { isBlocked } from './collision';
import { nextRandom } from './npc';
import type { Bounds, Collider, Vec2 } from './types';

/**
 * Bong bóng câu hỏi (hàm thuần, không import three/react). Họ hàng "bắn" câu hỏi về phía người chơi:
 * bong bóng bay THẲNG về vị trí người chơi tại lúc bắn (không bám theo), nên đi ngang là né được.
 * - trúng (chạm người chơi): bị kéo vào hội thoại; mọi bong bóng đang bay bị xoá, NPC đó nghỉ lâu hơn.
 * - né: bong bóng ĐÃ ĐI QUA người chơi (đang bay ra xa họ) sau khi từng lướt trong tầm NEAR mà không trúng.
 *   Bong bóng bị tường/ghế chặn trước khi tới nơi thì KHÔNG tính (không có chỗ núp để né miễn phí).
 * - đang hội thoại (paused): xoá hết bong bóng đang bay (không để chúng bay tiếp và trúng ngay khi đóng hội thoại),
 *   không bắn thêm, và NPC có thời gian ân hạn trước khi bắn lại.
 */

export const BUBBLE_RADIUS = 0.2;
/**
 * Đi qua người chơi trong khoảng này (m, từ tâm người chơi) mới tính là "suýt trúng". Bong bóng nhắm vào vị trí người chơi
 * lúc bắn, nên một bước tránh sang bên 1.5-3.5 m (né sớm và xa) phải được tính là né.
 */
export const NEAR = 4;
/** Thời gian ân hạn (s) trước khi NPC được bắn lại sau một hội thoại. */
export const GRACE = 3;
/** Thời gian nghỉ (s) sau khi bắn trúng. */
export const HIT_REST = 6;
/** Số bong bóng tối đa cùng lúc (cũng là số sprite vẽ): đông hơn thì NPC chưa bắn thêm. */
export const MAX_BUBBLES = 8;
/** Báo trước tối thiểu (s) khi người chơi vừa bước vào tầm bắn: không bắn ngay khung đầu tiên (cooldown không được âm sâu). */
export const MIN_WARNING = 0.8;

const MAX_DT = 0.1;
/** Lần bắn đầu tiên sau (everySec * hệ số) giây kể từ lúc NPC bắt đầu được mô phỏng. */
export const FIRST_SHOT_FACTOR = 1.5;
/** Quãng đường bong bóng bay thêm ngoài tầm bắn (m) trước khi tắt. */
const OVERSHOOT = 2;

export interface ShooterRuntime {
  key: string;
  /** Vị trí hiện tại của NPC (có thể đổi tại chỗ mỗi khung). */
  pos: Vec2;
  everySec: number;
  range: number;
  minRange: number;
  speed: number;
  questions: readonly string[];
}

export interface Bubble {
  id: number;
  key: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  age: number;
  life: number;
  text: string;
  /** Đã từng lướt vào trong NEAR (kể cả khi chưa đi qua người chơi). */
  near: boolean;
  /** Đã tính là né (chỉ tính một lần). */
  counted: boolean;
}

export interface BubbleState {
  bubbles: Bubble[];
  nextId: number;
  /** Thời gian còn lại (s) tới lần bắn kế của từng NPC. */
  cooldown: Record<string, number>;
  rng: number;
}

export interface BubbleEvents {
  spawned: Bubble[];
  hit: Bubble[];
  dodged: Bubble[];
}

export interface BubbleArgs {
  player: Vec2;
  playerRadius: number;
  shooters: readonly ShooterRuntime[];
  /** Vật cản làm tắt bong bóng (tường, đồ vật, người ngồi). */
  obstacles: readonly Collider[];
  bounds: Bounds;
  paused: boolean;
}

export function createBubbleState(seed: number): BubbleState {
  return { bubbles: [], nextId: 1, cooldown: {}, rng: (Number.isFinite(seed) ? seed : 0) >>> 0 };
}

const NO_EVENTS = (): BubbleEvents => ({ spawned: [], hit: [], dodged: [] });

/**
 * Một bước mô phỏng. Thuần (không đổi state vào). Không sinh NaN kể cả khi vị trí hỏng:
 * vị trí người chơi/NPC không hữu hạn thì không bắn.
 */
export function stepBubbles(s: BubbleState, dt: number, a: BubbleArgs): { state: BubbleState; events: BubbleEvents } {
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  const events = NO_EVENTS();

  if (a.paused) {
    // Xoá hết bong bóng đang bay và gia hạn ân hạn: không để chúng bay tiếp và trúng ngay khi đóng hội thoại.
    const cooldown = { ...s.cooldown };
    for (const sh of a.shooters) cooldown[sh.key] = Math.max(cooldown[sh.key] ?? 0, GRACE);
    return { state: s.bubbles.length === 0 ? { ...s, cooldown } : { ...s, bubbles: [], cooldown }, events };
  }
  if (h <= 0) return { state: s, events };

  const playerOk = Number.isFinite(a.player.x) && Number.isFinite(a.player.z);
  let rng = s.rng;
  let nextId = s.nextId;
  const cooldown = { ...s.cooldown };
  const spawnedNow: Bubble[] = [];

  // Bắn.
  for (const sh of a.shooters) {
    let cd = cooldown[sh.key];
    // Lần đầu: đợi hơn một chu kỳ để người chơi kịp nhìn quanh trước khi bị bắn (không bị kéo vào hội thoại ngay lúc vào cảnh).
    if (cd === undefined) cd = sh.everySec * FIRST_SHOT_FACTOR;
    cd -= h;
    const dx = a.player.x - sh.pos.x;
    const dz = a.player.z - sh.pos.z;
    const d = Math.hypot(dx, dz);
    const inRange =
      playerOk && Number.isFinite(sh.pos.x) && Number.isFinite(sh.pos.z) && d >= sh.minRange && d <= sh.range && d > 1e-6;
    // Ngoài tầm bắn: cooldown không được tụt âm sâu, để lúc vừa bước vào tầm vẫn có chút thời gian báo trước.
    if (!inRange) cd = Math.max(cd, MIN_WARNING);
    if (cd <= 0 && inRange && sh.questions.length > 0 && sh.speed > 0 && s.bubbles.length + spawnedNow.length < MAX_BUBBLES) {
      const [r1, s1] = nextRandom(rng);
      const [r2, s2] = nextRandom(s1);
      rng = s2;
      const ux = dx / d;
      const uz = dz / d;
      const sx = sh.pos.x + ux * 0.7;
      const sz = sh.pos.z + uz * 0.7;
      if (isBlocked({ x: sx, z: sz }, BUBBLE_RADIUS, a.obstacles, a.bounds)) {
        // NPC đứng sát tường/bụi tre, bắn thẳng vào vật cản: không có bong bóng nào nên cũng không báo câu hỏi. Thử lại sớm.
        cd = sh.everySec * 0.4;
      } else {
        spawnedNow.push({
          id: nextId++,
          key: sh.key,
          x: sx,
          z: sz,
          vx: ux * sh.speed,
          vz: uz * sh.speed,
          age: 0,
          life: (sh.range + OVERSHOOT) / sh.speed,
          text: sh.questions[Math.min(sh.questions.length - 1, Math.floor(r1 * sh.questions.length))] ?? '',
          near: false,
          counted: false,
        });
        cd = sh.everySec * (0.8 + 0.4 * r2);
      }
    }
    cooldown[sh.key] = cd;
  }

  // Bay, kiểm tra trúng / né / tắt.
  const kept: Bubble[] = [];
  const hit: Bubble[] = [];
  const dodged: Bubble[] = [];
  for (const b0 of [...s.bubbles, ...spawnedNow]) {
    const isNew = b0.age === 0 && spawnedNow.includes(b0);
    const b: Bubble = isNew ? { ...b0 } : { ...b0, x: b0.x + b0.vx * h, z: b0.z + b0.vz * h, age: b0.age + h };

    const d = playerOk ? Math.hypot(b.x - a.player.x, b.z - a.player.z) : Infinity;
    if (d <= a.playerRadius + BUBBLE_RADIUS) {
      hit.push(b);
      continue;
    }
    if (d <= NEAR) b.near = true;
    // "Đã đi qua": bong bóng đang bay ra xa người chơi (tích vô hướng của vector từ bóng tới người chơi với vận tốc < 0).
    const passed = playerOk && (a.player.x - b.x) * b.vx + (a.player.z - b.z) * b.vz < 0;
    if (b.near && !b.counted && passed) {
      b.counted = true;
      dodged.push(b);
    }
    const gone =
      b.age > b.life ||
      !Number.isFinite(b.x) ||
      !Number.isFinite(b.z) ||
      isBlocked({ x: b.x, z: b.z }, BUBBLE_RADIUS, a.obstacles, a.bounds);
    // Tắt giữa đường (tường, ghế, hết giờ) khi chưa đi qua người chơi: KHÔNG tính né, kẻo đứng núp sau vật cản
    // cũng tích điểm né không rủi ro.
    if (gone) continue;
    kept.push(b);
  }

  events.spawned = spawnedNow;
  events.dodged = dodged;
  if (hit.length > 0) {
    // Trúng: xoá hết bong bóng đang bay, NPC bắn trúng nghỉ lâu hơn; các NPC khác cũng được ân hạn.
    events.hit = hit;
    for (const sh of a.shooters) cooldown[sh.key] = Math.max(cooldown[sh.key] ?? 0, GRACE);
    for (const b of hit) cooldown[b.key] = Math.max(cooldown[b.key] ?? 0, HIT_REST);
    return { state: { bubbles: [], nextId, cooldown, rng }, events };
  }
  return { state: { bubbles: kept, nextId, cooldown, rng }, events };
}
