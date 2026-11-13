import { shortestAngle } from './movement';
import type { Vec2 } from './types';

/**
 * Ống kính livestream (hàm thuần): NPC cầm điện thoại quay người chơi.
 * - Người chơi nằm trong NÓN nhìn (khoảng cách <= range và lệch hướng mặt NPC <= nửa góc) đủ `holdSec` giây liên tục
 *   thì bị quay (event `recorded`), rồi được nghỉ `restSec` giây.
 * - Ra khỏi nón sau khi đã ở trong nón một lúc (>= ESCAPE_MIN) mà chưa bị quay thì tính là thoát (event `escaped`).
 * - Đang hội thoại (paused): đứng yên, đặt lại bộ đếm và cho ân hạn ngắn khi tiếp tục.
 * NPC xoay mặt chậm (turnRate thấp) nên đi vòng ra sau lưng hoặc chạy ngang là thoát được.
 */

export interface LensParams {
  range: number;
  /** Nửa góc nón (rad). */
  halfAngle: number;
  holdSec: number;
  restSec: number;
}

export interface LensState {
  /** Thời gian liên tục đã bị nhắm (s). */
  held: number;
  /** Thời gian nghỉ còn lại sau khi bị quay (s). */
  rest: number;
}

export interface LensEvents {
  recorded: boolean;
  escaped: boolean;
}

/** Phải ở trong nón ít nhất chừng này giây thì lúc ra khỏi mới tính là "thoát" (tránh tính nhầm khi chỉ lướt qua mép). */
export const ESCAPE_MIN = 0.35;
/** Ân hạn (s) sau khi đóng hội thoại. */
export const LENS_GRACE = 1.5;

const MAX_DT = 0.1;

export const createLensState = (): LensState => ({ held: 0, rest: 0 });

/** Người chơi có nằm trong nón nhìn của NPC (đặt tại npc, mặt hướng npcHeading) không. */
export function inCone(p: LensParams, npc: Vec2, npcHeading: number, player: Vec2): boolean {
  if (![npc.x, npc.z, npcHeading, player.x, player.z].every(Number.isFinite)) return false;
  const dx = player.x - npc.x;
  const dz = player.z - npc.z;
  const d = Math.hypot(dx, dz);
  if (d > p.range) return false;
  if (d < 1e-6) return true;
  return Math.abs(shortestAngle(npcHeading, Math.atan2(dx, dz))) <= p.halfAngle;
}

export function stepLens(
  s: LensState,
  dt: number,
  a: { params: LensParams; npc: Vec2; npcHeading: number; player: Vec2; paused: boolean },
): { state: LensState; events: LensEvents } {
  const none: LensEvents = { recorded: false, escaped: false };
  if (a.paused) return { state: { held: 0, rest: Math.max(s.rest, LENS_GRACE) }, events: none };
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  if (h <= 0) return { state: s, events: none };

  const rest = Math.max(0, s.rest - h);
  if (inCone(a.params, a.npc, a.npcHeading, a.player)) {
    if (rest > 0) return { state: { held: 0, rest }, events: none };
    const held = s.held + h;
    if (held >= a.params.holdSec) {
      return { state: { held: 0, rest: a.params.restSec }, events: { recorded: true, escaped: false } };
    }
    return { state: { held, rest }, events: none };
  }
  // Ngoài nón: đã bị nhắm đủ lâu thì tính là thoát; chưa đủ thì bộ đếm giảm dần.
  if (s.held >= ESCAPE_MIN) return { state: { held: 0, rest }, events: { recorded: false, escaped: true } };
  return { state: { held: Math.max(0, s.held - 2 * h), rest }, events: none };
}
