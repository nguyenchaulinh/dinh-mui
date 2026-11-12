import { describe, expect, it } from 'vitest';
import { GRACE, HIT_REST, createAmbushState, stepAmbush, type AmbushArgs, type AmbusherRuntime } from './ambush';

const DIUT: AmbusherRuntime = { key: 'di-ut', pos: { x: 0, z: 0 }, everySec: 2, range: 8, minRange: 2, warnSec: 1.5, windowSec: 0.5, questions: ['Bao giờ cưới?'] };
const args = (over: Partial<AmbushArgs> = {}): AmbushArgs => ({ player: { x: 0, z: 4 }, ambushers: [DIUT], paused: false, press: false, ...over });

/** Chạy n bước 0.1 s, trả state cuối và mọi sự kiện. */
function run(n: number, a: AmbushArgs, s0 = createAmbushState(1)) {
  let s = s0;
  const ev = { warned: 0, dodged: 0, hit: [] as { early: boolean }[] };
  for (let i = 0; i < n; i++) {
    const r = stepAmbush(s, 0.1, a);
    s = r.state;
    if (r.events.warned) ev.warned++;
    if (r.events.dodged) ev.dodged++;
    if (r.events.hit) ev.hit.push(r.events.hit);
  }
  return { s, ev };
}

/** Đi tới đúng lúc vừa bắt đầu báo trước. */
function untilWarn() {
  let s = createAmbushState(1);
  for (let i = 0; i < 100; i++) {
    const r = stepAmbush(s, 0.1, args());
    s = r.state;
    if (r.events.warned) return s;
  }
  throw new Error('không thấy báo trước');
}

describe('bấm NÉ đúng lúc', () => {
  it('chờ một chu kỳ rồi mới báo trước; báo trước có câu hỏi và vòng thời gian đầy', () => {
    const early = run(15, args());
    expect(early.ev.warned).toBe(0);
    const s = untilWarn();
    expect(s.active).toMatchObject({ key: 'di-ut', text: 'Bao giờ cưới?', warnSec: 1.5, windowSec: 0.5 });
  });

  it('bấm trong vùng vàng (còn <= windowSec) thì né được', () => {
    let s = untilWarn();
    s = run(10, args(), s).s; // còn ~0.5 s
    const r = stepAmbush(s, 0.05, args({ press: true }));
    expect(r.events.dodged).toBe('di-ut');
    expect(r.state.active).toBeNull();
  });

  it('bấm sớm quá thì bị bắt (early)', () => {
    const r = stepAmbush(untilWarn(), 0.1, args({ press: true }));
    expect(r.events.hit).toEqual({ key: 'di-ut', early: true });
  });

  it('không bấm thì hết giờ bị bắt, và người bắt nghỉ lâu', () => {
    const { s, ev } = run(16, args(), untilWarn());
    expect(ev.hit).toEqual([{ key: 'di-ut', early: false }]);
    expect(s.cooldown['di-ut']).toBeGreaterThanOrEqual(HIT_REST - 1.6);
  });

  it('ngoài tầm (quá gần hoặc quá xa) thì không hỏi', () => {
    expect(run(60, args({ player: { x: 0, z: 1 } })).ev.warned).toBe(0);
    expect(run(60, args({ player: { x: 0, z: 20 } })).ev.warned).toBe(0);
  });

  it('đang hội thoại thì huỷ lượt đang báo và gia hạn nghỉ', () => {
    const r = stepAmbush(untilWarn(), 0.1, args({ paused: true }));
    expect(r.state.active).toBeNull();
    expect(r.events.hit).toBeNull();
    expect(r.state.cooldown['di-ut']).toBeGreaterThanOrEqual(GRACE);
  });

  it('chỉ một lượt hỏi một lúc dù hai người cùng trong tầm', () => {
    const sep = { ...DIUT, key: 'sep', pos: { x: 1, z: 0 } };
    const r = run(30, args({ ambushers: [DIUT, sep] }));
    expect(r.ev.warned).toBe(1);
  });

  it('đầu vào hỏng không sinh lượt hỏi', () => {
    expect(run(60, args({ player: { x: Number.NaN, z: 0 } })).ev.warned).toBe(0);
    expect(stepAmbush(createAmbushState(1), Number.NaN, args()).events.warned).toBeNull();
  });
});

describe('vòng thời gian NÉ', () => {
  it('vòng và vạch vàng luôn lớn hơn nút (không bị nút che), vòng co dần', async () => {
    const { ringDiameter } = await import('./DodgeQte');
    expect(ringDiameter(1)).toBe(150);
    expect(ringDiameter(0)).toBe(64);
    expect(ringDiameter(0.5 / 1.6)).toBeGreaterThan(64 + 20); // vạch vàng cách mép nút rõ ràng
    expect(ringDiameter(0.8)).toBeGreaterThan(ringDiameter(0.4));
  });
});
