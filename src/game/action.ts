import { shortestAngle, wrapAngle } from './movement';
import type { Vec2 } from './types';

/**
 * Hoạt cảnh của nhân vật chính khi tương tác (hàm thuần, không import three/react): thay vì bật bảng ngay, nhân vật
 * làm động tác thật. Trong lúc chạy, điều khiển bị khoá, nhân vật di chuyển theo kịch bản (không qua va chạm).
 * - `sit`: đi tới ghế → quay mặt → ngồi xuống (0.45 s) → báo `seated` (mở máy tính) → giữ tới khi `standUp`
 *   → đứng dậy (0.45 s) → bước lùi ra khỏi ghế → báo `done`.
 * - `reach`: quay mặt về đồ/NPC → với tay (0.9 s), giữa chừng báo `grab` (đồ bay vào người) → báo `done`.
 * - `leave`: đi thẳng tới điểm ngoài cửa → báo `done` (hết giờ 3 s cũng báo, không bao giờ kẹt).
 */

export type PlayerAction =
  | { id: number; kind: 'sit'; seat: { x: number; z: number; rotY: number }; seatY: number; look: Vec2; standUp: boolean }
  | { id: number; kind: 'reach'; key: string }
  | { id: number; kind: 'leave'; to: Vec2 };

export type ActionStep = 'seated' | 'grab' | 'done';
export type ActionAnim = 'idle' | 'walk' | 'type' | 'reach';

export interface ActionRun {
  id: number;
  phase: 'go' | 'down' | 'hold' | 'up' | 'out' | 'turn' | 'reach' | 'walk' | 'end';
  t: number;
  /** Đích đã tra (reach: vị trí đồ/NPC lúc bắt đầu). */
  target: Vec2 | null;
  emitted: ActionStep[];
}

export interface ActionFrame {
  pos: Vec2;
  heading: number;
  /** Trọng số tư thế ngồi 0..1. */
  sit: number;
  anim: ActionAnim;
  /** Camera qua vai nhìn vào màn hình (đang ngồi ở máy tính). */
  shoulder: boolean;
}

export const WALK_SPEED = 1.8;
export const SIT_TIME = 0.45;
export const REACH_TIME = 0.9;
export const GRAB_AT = 0.45;
export const LEAVE_TIMEOUT = 3;
/** Khoảng lùi ra sau ghế khi đứng dậy (m). */
export const STAND_BACK = 0.8;

const MAX_DT = 0.1;

export function startAction(a: PlayerAction): ActionRun {
  const phase = a.kind === 'sit' ? 'go' : a.kind === 'reach' ? 'turn' : 'walk';
  return { id: a.id, phase, t: 0, target: null, emitted: [] };
}

/** Vị trí đứng sau khi rời ghế: lùi khỏi bàn theo hướng ngược mặt ghế. */
export function standSpot(seat: { x: number; z: number; rotY: number }): Vec2 {
  return { x: seat.x - Math.sin(seat.rotY) * STAND_BACK, z: seat.z - Math.cos(seat.rotY) * STAND_BACK };
}

function moveToward(pos: Vec2, to: Vec2, step: number): { pos: Vec2; arrived: boolean; heading: number | null } {
  const dx = to.x - pos.x;
  const dz = to.z - pos.z;
  const d = Math.hypot(dx, dz);
  if (!(d > 1e-6) || d <= step) return { pos: { x: to.x, z: to.z }, arrived: true, heading: d > 1e-6 ? Math.atan2(dx, dz) : null };
  return { pos: { x: pos.x + (dx / d) * step, z: pos.z + (dz / d) * step }, arrived: false, heading: Math.atan2(dx, dz) };
}

function turnToward(h: number, aim: number, maxTurn: number): number {
  const d = shortestAngle(h, aim);
  return wrapAngle(h + Math.max(-maxTurn, Math.min(maxTurn, d)));
}

/**
 * Một bước. Thuần (không đổi `run` vào). `targetOf` tra vị trí hiện tại của đồ/NPC theo khoá (reach).
 * Trả `run = null` khi hoạt cảnh đã xong (sau bước báo `done`).
 */
export function stepAction(
  run: ActionRun,
  a: PlayerAction,
  pos: Vec2,
  heading: number,
  dt: number,
  targetOf: (key: string) => Vec2 | null,
): { run: ActionRun | null; frame: ActionFrame; emit: ActionStep[] } {
  const h = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_DT) : 0;
  const r: ActionRun = { ...run, t: run.t + h, emitted: [...run.emitted] };
  const emit: ActionStep[] = [];
  const once = (s: ActionStep) => {
    if (!r.emitted.includes(s)) {
      r.emitted.push(s);
      emit.push(s);
    }
  };
  const frame: ActionFrame = { pos, heading, sit: 0, anim: 'idle', shoulder: false };

  if (a.kind === 'sit') {
    const seat = { x: a.seat.x, z: a.seat.z };
    switch (r.phase) {
      case 'go': {
        const mv = moveToward(pos, seat, WALK_SPEED * h);
        frame.pos = mv.pos;
        if (mv.heading !== null) frame.heading = turnToward(heading, mv.heading, 12 * h);
        frame.anim = 'walk';
        if (mv.arrived) Object.assign(r, { phase: 'down', t: 0 });
        break;
      }
      case 'down':
        frame.pos = seat;
        frame.heading = turnToward(heading, a.seat.rotY, 14 * h);
        frame.sit = Math.min(1, r.t / SIT_TIME);
        frame.shoulder = true;
        if (r.t >= SIT_TIME) {
          Object.assign(r, { phase: 'hold', t: 0 });
          frame.heading = a.seat.rotY;
          once('seated');
        }
        break;
      case 'hold':
        frame.pos = seat;
        frame.heading = a.seat.rotY;
        frame.sit = 1;
        frame.anim = 'type';
        frame.shoulder = true;
        if (a.standUp) Object.assign(r, { phase: 'up', t: 0 });
        break;
      case 'up':
        frame.pos = seat;
        frame.heading = a.seat.rotY;
        frame.sit = Math.max(0, 1 - r.t / SIT_TIME);
        if (r.t >= SIT_TIME) Object.assign(r, { phase: 'out', t: 0 });
        break;
      default: {
        // 'out': lùi khỏi ghế, vẫn quay mặt vào bàn.
        const mv = moveToward(pos, standSpot(a.seat), WALK_SPEED * h);
        frame.pos = mv.pos;
        frame.heading = a.seat.rotY;
        frame.anim = 'walk';
        if (mv.arrived) {
          once('done');
          return { run: null, frame: { ...frame, anim: 'idle' }, emit };
        }
      }
    }
    return { run: r, frame, emit };
  }

  if (a.kind === 'reach') {
    if (r.target === null) r.target = targetOf(a.key) ?? { x: pos.x + Math.sin(heading), z: pos.z + Math.cos(heading) };
    const aim = Math.atan2(r.target.x - pos.x, r.target.z - pos.z);
    frame.heading = turnToward(heading, aim, 14 * h);
    if (r.phase === 'turn') {
      if (r.t >= 0.15) Object.assign(r, { phase: 'reach', t: 0 });
      return { run: r, frame, emit };
    }
    frame.anim = 'reach';
    if (r.t >= GRAB_AT) once('grab');
    if (r.t >= REACH_TIME) {
      once('done');
      return { run: null, frame: { ...frame, anim: 'idle' }, emit };
    }
    return { run: r, frame, emit };
  }

  // leave
  const mv = moveToward(pos, a.to, 1.6 * h);
  frame.pos = mv.pos;
  if (mv.heading !== null) frame.heading = turnToward(heading, mv.heading, 12 * h);
  frame.anim = mv.arrived ? 'idle' : 'walk';
  if (mv.arrived || r.t >= LEAVE_TIMEOUT) once('done');
  return { run: r.emitted.includes('done') && mv.arrived ? null : r, frame, emit };
}
