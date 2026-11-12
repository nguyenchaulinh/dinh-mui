import { describe, expect, it } from 'vitest';
import { GRAB_AT, REACH_TIME, standSpot, startAction, stepAction, type ActionStep, type PlayerAction } from './action';
import type { Vec2 } from './types';

/** Chạy hoạt cảnh với bước 1/30 s tới khi xong hoặc hết `maxSec`; `patch` sửa hành động theo bước đã báo. */
function play(a0: PlayerAction, from: Vec2, maxSec = 10, patch?: (a: PlayerAction, step: ActionStep) => PlayerAction, targetOf = () => null as Vec2 | null) {
  let a = a0;
  let run: ReturnType<typeof startAction> | null = startAction(a);
  let pos = from;
  let heading = 0;
  const steps: { step: ActionStep; t: number; pos: Vec2; sit: number }[] = [];
  const frames: { sit: number; anim: string; shoulder: boolean }[] = [];
  let t = 0;
  while (run && t < maxSec) {
    const r = stepAction(run, a, pos, heading, 1 / 30, targetOf);
    t += 1 / 30;
    run = r.run;
    pos = r.frame.pos;
    heading = r.frame.heading;
    frames.push({ sit: r.frame.sit, anim: r.frame.anim, shoulder: r.frame.shoulder });
    for (const s of r.emit) {
      steps.push({ step: s, t, pos, sit: r.frame.sit });
      if (patch) a = patch(a, s);
    }
  }
  return { steps, frames, pos, heading, finished: run === null };
}

const SEAT = { x: -2.2, z: 0.72, rotY: Math.PI };
const sit = (standUp = false): PlayerAction => ({ id: 1, kind: 'sit', seat: SEAT, seatY: 0.48, look: { x: -2.2, z: 0.15 }, standUp });

describe('hoạt cảnh ngồi vào máy tính', () => {
  it('đi tới ghế, ngồi hẳn rồi mới báo seated; quay mặt vào bàn; camera qua vai', () => {
    const r = play(sit(), { x: -2.2, z: 2 }, 3);
    const seated = r.steps.find((s) => s.step === 'seated')!;
    expect(seated).toBeDefined();
    expect(seated.sit).toBe(1);
    expect(seated.pos).toEqual({ x: SEAT.x, z: SEAT.z });
    expect(Math.abs(Math.sin(r.heading - SEAT.rotY))).toBeLessThan(1e-6);
    expect(r.frames.some((f) => f.shoulder)).toBe(true);
    // Chưa được đứng dậy thì vẫn ngồi gõ máy, không xong.
    expect(r.finished).toBe(false);
    expect(r.frames.at(-1)).toMatchObject({ sit: 1, anim: 'type' });
  });

  it('được phép đứng dậy thì đứng lên từ từ, lùi ra khỏi ghế rồi báo done', () => {
    const r = play(sit(), { x: -2.2, z: 2 }, 10, (a, s) => (s === 'seated' && a.kind === 'sit' ? { ...a, standUp: true } : a));
    expect(r.finished).toBe(true);
    expect(r.steps.map((s) => s.step)).toEqual(['seated', 'done']);
    expect(r.pos.x).toBeCloseTo(standSpot(SEAT).x, 6);
    expect(r.pos.z).toBeCloseTo(standSpot(SEAT).z, 6);
    // Tư thế ngồi giảm dần (không bật thẳng dậy).
    const after = r.frames.slice(r.frames.findIndex((f) => f.anim === 'type'));
    expect(after.some((f) => f.sit > 0.2 && f.sit < 0.8)).toBe(true);
    expect(standSpot(SEAT).z).toBeGreaterThan(SEAT.z + 0.5); // lùi ra sau ghế (+z khi ghế quay mặt -z), thoát khỏi bàn
  });
});

describe('hoạt cảnh với tay nhặt đồ', () => {
  it('quay mặt về món đồ, với tay; báo grab giữa chừng rồi done', () => {
    const r = play({ id: 2, kind: 'reach', key: 'obj:sac' }, { x: 0, z: 0 }, 3, undefined, () => ({ x: 1, z: 0 }));
    expect(r.steps.map((s) => s.step)).toEqual(['grab', 'done']);
    const grab = r.steps[0]!.t;
    const done = r.steps[1]!.t;
    expect(grab).toBeLessThan(done);
    expect(done - grab).toBeCloseTo(REACH_TIME - GRAB_AT, 1);
    expect(Math.sin(r.heading)).toBeGreaterThan(0.99); // quay về +x
    expect(r.frames.some((f) => f.anim === 'reach')).toBe(true);
    expect(r.pos).toEqual({ x: 0, z: 0 }); // không xê dịch
  });
});

describe('hoạt cảnh ra cửa', () => {
  it('đi tới điểm ngoài cửa rồi báo done một lần', () => {
    const r = play({ id: 3, kind: 'leave', to: { x: 2, z: 0 } }, { x: 0, z: 0 }, 5);
    expect(r.steps.map((s) => s.step)).toEqual(['done']);
    expect(r.pos).toEqual({ x: 2, z: 0 });
  });

  it('không bao giờ kẹt: hết giờ vẫn báo done', () => {
    const r = play({ id: 4, kind: 'leave', to: { x: 100, z: 0 } }, { x: 0, z: 0 }, 4);
    expect(r.steps.map((s) => s.step)).toEqual(['done']);
  });
});
