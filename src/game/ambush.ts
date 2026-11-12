import { nextRandom } from './npc';
import type { Vec2 } from './types';

/**
 * "Bấm NÉ đúng lúc" (hàm thuần, không import three/react). Họ hàng/Sếp đứng trong tầm thì thỉnh thoảng lao tới hỏi:
 * 1. Báo trước: hiện câu hỏi + vòng thời gian thu nhỏ trong `warnSec` giây (NPC chạy tới chỗ người chơi).
 * 2. Người chơi bấm NÉ (nút tương tác) khi vòng đã vào vùng vàng, tức còn lại <= `windowSec` giây: NÉ ĐƯỢC.
 *    Bấm sớm hơn ("hoảng"): bị bắt. Không bấm, hết giờ: bị bắt (bị kéo vào hội thoại).
 * 3. Sau mỗi lượt có thời gian nghỉ; đang hội thoại (paused) thì huỷ lượt đang báo và gia hạn nghỉ.
 * Chỉ một lượt hỏi tại một thời điểm, kể cả khi nhiều người cùng trong tầm.
 */

export const DEFAULT_WARN_SEC = 1.6;
export const DEFAULT_WINDOW_SEC = 0.5;
/** Nghỉ (s) trước khi được hỏi lại sau một hội thoại hoặc lượt né. */
export const GRACE = 3;
/** Nghỉ (s) của người vừa bắt được người chơi. */
export const HIT_REST = 7;
/** Bước tối đa mỗi lần gọi (s): khung khựng không làm lượt hỏi trôi qua trong nháy mắt. */
const MAX_DT = 0.1;

export interface AmbusherRuntime {
  key: string;
  /** Vị trí hiện tại của NPC (có thể đổi tại chỗ mỗi khung). */
  pos: Vec2;
  /** Chu kỳ trung bình giữa hai lần hỏi (s). */
  everySec: number;
  /** Chỉ hỏi khi người chơi cách trong [minRange, range] (m). */
  range: number;
  minRange: number;
  warnSec?: number;
  windowSec?: number;
  questions: readonly string[];
}

export interface ActiveAmbush {
  key: string;
  text: string;
  /** Thời gian còn lại tới lúc "bắt" (s). */
  left: number;
  warnSec: number;
  windowSec: number;
}

export interface AmbushState {
  cooldown: Record<string, number>;
  active: ActiveAmbush | null;
  rng: number;
}

export interface AmbushArgs {
  player: Vec2;
  ambushers: readonly AmbusherRuntime[];
  paused: boolean;
  /** Người chơi vừa bấm NÉ trong khung này. */
  press: boolean;
}

export interface AmbushEvents {
  /** Vừa bắt đầu một lượt hỏi (hiện báo trước + vòng thời gian). */
  warned: ActiveAmbush | null;
  dodged: string | null;
  /** Người chơi bị bắt; `early` = bấm sớm quá. */
  hit: { key: string; early: boolean } | null;
}

export function createAmbushState(seed: number): AmbushState {
  return { cooldown: {}, active: null, rng: (Number.isFinite(seed) ? seed : 0) >>> 0 };
}

const NONE = (): AmbushEvents => ({ warned: null, dodged: null, hit: null });

/** Khung "vào vùng vàng" đã tới chưa (bấm lúc này thì né được). */
export function inWindow(a: ActiveAmbush): boolean {
  return a.left <= a.windowSec;
}

/** Một bước. Thuần (không đổi state vào); đầu vào hỏng (NaN) thì không bắt đầu lượt mới. */
export function stepAmbush(s: AmbushState, dt: number, a: AmbushArgs): { state: AmbushState; events: AmbushEvents } {
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  const events = NONE();
  const cooldown = { ...s.cooldown };
  const rest = (key: string, sec: number) => {
    cooldown[key] = Math.max(cooldown[key] ?? 0, sec);
  };

  if (a.paused) {
    for (const x of a.ambushers) rest(x.key, GRACE);
    return { state: { ...s, cooldown, active: null }, events };
  }

  let rng = s.rng;
  let active = s.active;

  if (active) {
    const left = active.left - h;
    const cur = { ...active, left };
    if (a.press) {
      if (inWindow(cur)) {
        events.dodged = cur.key;
        const [r, s1] = nextRandom(rng);
        rng = s1;
        const me = a.ambushers.find((x) => x.key === cur.key);
        cooldown[cur.key] = (me?.everySec ?? GRACE) * (0.8 + 0.4 * r);
        for (const x of a.ambushers) if (x.key !== cur.key) rest(x.key, 1.5);
      } else {
        events.hit = { key: cur.key, early: true };
      }
      active = null;
    } else if (left <= 0) {
      events.hit = { key: cur.key, early: false };
      active = null;
    } else {
      active = cur;
    }
    if (events.hit) {
      for (const x of a.ambushers) rest(x.key, GRACE);
      rest(events.hit.key, HIT_REST);
    }
    return { state: { cooldown, active, rng }, events };
  }

  if (h <= 0) return { state: s, events };
  const playerOk = Number.isFinite(a.player.x) && Number.isFinite(a.player.z);
  for (const x of a.ambushers) {
    // Lần đầu: chờ một chu kỳ để người chơi kịp nhìn quanh.
    const cd = (cooldown[x.key] ?? x.everySec) - h;
    cooldown[x.key] = cd;
    if (active || cd > 0 || !playerOk || x.questions.length === 0) continue;
    const d = Math.hypot(a.player.x - x.pos.x, a.player.z - x.pos.z);
    if (!Number.isFinite(d) || d < x.minRange || d > x.range) {
      cooldown[x.key] = Math.max(cd, 0.5); // ngoài tầm: thử lại sau ít lâu, không dồn nợ
      continue;
    }
    const [r, s1] = nextRandom(rng);
    rng = s1;
    const warnSec = x.warnSec ?? DEFAULT_WARN_SEC;
    const windowSec = Math.min(x.windowSec ?? DEFAULT_WINDOW_SEC, warnSec);
    active = {
      key: x.key,
      text: x.questions[Math.min(x.questions.length - 1, Math.floor(r * x.questions.length))] ?? '',
      left: warnSec,
      warnSec,
      windowSec,
    };
    events.warned = active;
  }
  return { state: { cooldown, active, rng }, events };
}
