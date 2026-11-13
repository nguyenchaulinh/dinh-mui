import { describe, expect, it } from 'vitest';
import { ESCAPE_MIN, LENS_GRACE, createLensState, inCone, stepLens, type LensParams, type LensState } from './lens';
import type { Vec2 } from './types';

const params: LensParams = { range: 4, halfAngle: (35 * Math.PI) / 180, holdSec: 2, restSec: 3 };
const npc: Vec2 = { x: 0, z: 0 };
const dt = 1 / 60;

interface Totals {
  state: LensState;
  recorded: number;
  escaped: number;
}

function run(
  s0: LensState,
  seconds: number,
  at: (t: number) => { player: Vec2; heading: number },
  over: { paused?: boolean } = {},
): Totals {
  let state = s0;
  const out: Totals = { state, recorded: 0, escaped: 0 };
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const { player, heading } = at(i * dt);
    const r = stepLens(state, dt, { params, npc, npcHeading: heading, player, paused: over.paused ?? false });
    state = r.state;
    if (r.events.recorded) out.recorded++;
    if (r.events.escaped) out.escaped++;
  }
  out.state = state;
  return out;
}

// heading 0 = nhìn về +z
const front = (d: number) => ({ x: 0, z: d });

describe('inCone', () => {
  it('trong nón: phía trước, trong tầm, lệch nhỏ', () => {
    expect(inCone(params, npc, 0, front(2))).toBe(true);
    expect(inCone(params, npc, 0, { x: 1, z: 2 })).toBe(true); // lệch ~27°
  });

  it('ngoài nón: quá xa, lệch góc lớn, sau lưng', () => {
    expect(inCone(params, npc, 0, front(4.5))).toBe(false);
    expect(inCone(params, npc, 0, { x: 2, z: 1 })).toBe(false); // lệch ~63°
    expect(inCone(params, npc, 0, front(-2))).toBe(false);
  });

  it('xử lý quanh ranh ±π', () => {
    // NPC nhìn về -z (heading π), người chơi ở -z hơi lệch.
    expect(inCone(params, npc, Math.PI, { x: 0.3, z: -2 })).toBe(true);
    expect(inCone(params, npc, -Math.PI, { x: -0.3, z: -2 })).toBe(true);
  });

  it('đầu vào hỏng thì không nằm trong nón', () => {
    expect(inCone(params, { x: NaN, z: 0 }, 0, front(2))).toBe(false);
    expect(inCone(params, npc, Infinity, front(2))).toBe(false);
    expect(inCone(params, npc, 0, { x: NaN, z: 1 })).toBe(false);
  });
});

describe('stepLens', () => {
  it('đứng yên trong nón đủ holdSec thì bị quay một lần, rồi nghỉ restSec', () => {
    const r = run(createLensState(), 2.2, () => ({ player: front(2), heading: 0 }));
    expect(r.recorded).toBe(1);
    expect(r.state.rest).toBeGreaterThan(0);
    // Trong thời gian nghỉ không bị quay lại dù vẫn đứng trong nón.
    const during = run(r.state, 2.5, () => ({ player: front(2), heading: 0 }));
    expect(during.recorded).toBe(0);
    // Hết nghỉ thì lại bị quay.
    const later = run(r.state, 6, () => ({ player: front(2), heading: 0 }));
    expect(later.recorded).toBeGreaterThanOrEqual(1);
  });

  it('chưa đủ holdSec thì không bị quay', () => {
    const r = run(createLensState(), 1.5, () => ({ player: front(2), heading: 0 }));
    expect(r.recorded).toBe(0);
    expect(r.state.held).toBeGreaterThan(1);
  });

  it('ra khỏi nón sau khi bị nhắm đủ lâu thì tính là thoát một lần, không bị quay', () => {
    // Đứng trong nón 1 s rồi bước ra ngoài (lệch 90°).
    const r = run(createLensState(), 3, (t) => ({ player: t < 1 ? front(2) : { x: 2, z: 0 }, heading: 0 }));
    expect(r.recorded).toBe(0);
    expect(r.escaped).toBe(1);
    expect(r.state.held).toBe(0);
  });

  it('chỉ lướt qua mép nón (ngắn hơn ESCAPE_MIN) thì không tính là thoát', () => {
    const r = run(createLensState(), 2, (t) => ({ player: t < ESCAPE_MIN * 0.5 ? front(2) : { x: 2, z: 0 }, heading: 0 }));
    expect(r.escaped).toBe(0);
    expect(r.recorded).toBe(0);
  });

  it('NPC xoay chậm: người chơi chạy ngang là thoát được, NPC xoay nhanh thì không', () => {
    // Người chơi đứng yên ở (2, 0) (hướng +x = bearing PI/2). NPC bắt đầu nhìn về +z (lệch 90°) rồi xoay dần về phía người chơi.
    const slow = run(createLensState(), 8, (t) => ({ player: { x: 2, z: 0 }, heading: Math.min(Math.PI / 2, 0.1 * t) }));
    // Xoay 0.1 rad/s: sau 8 s mới xoay được 0.8 rad, còn lệch ~46° (> 35°), chưa vào nón.
    expect(slow.recorded).toBe(0);
    const fast = run(createLensState(), 8, (t) => ({ player: { x: 2, z: 0 }, heading: Math.min(Math.PI / 2, 3 * t) }));
    expect(fast.recorded).toBeGreaterThanOrEqual(1);
  });

  it('paused: đặt lại bộ đếm, không sự kiện, có ân hạn khi tiếp tục', () => {
    const held = run(createLensState(), 1.5, () => ({ player: front(2), heading: 0 })).state;
    expect(held.held).toBeGreaterThan(1);
    const paused = stepLens(held, dt, { params, npc, npcHeading: 0, player: front(2), paused: true });
    expect(paused.state.held).toBe(0);
    expect(paused.state.rest).toBeGreaterThanOrEqual(LENS_GRACE);
    expect(paused.events).toEqual({ recorded: false, escaped: false });
    // Vừa tiếp tục thì chưa bị quay trong thời gian ân hạn + holdSec... chỉ cần chưa bị quay ngay.
    const after = run(paused.state, LENS_GRACE, () => ({ player: front(2), heading: 0 }));
    expect(after.recorded).toBe(0);
  });

  it('dt hỏng thì trả nguyên state; không đổi state đầu vào; không NaN', () => {
    const s = createLensState();
    const snapshot = structuredClone(s);
    expect(stepLens(s, NaN, { params, npc, npcHeading: 0, player: front(2), paused: false }).state).toBe(s);
    stepLens(s, dt, { params, npc, npcHeading: 0, player: front(2), paused: false });
    expect(s).toEqual(snapshot);
    const bad = run(createLensState(), 3, () => ({ player: { x: NaN, z: Infinity }, heading: NaN }));
    expect(Number.isFinite(bad.state.held) && Number.isFinite(bad.state.rest)).toBe(true);
    expect(bad.recorded).toBe(0);
  });
});
