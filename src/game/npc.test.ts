import { describe, expect, it } from 'vitest';
import { DEFAULT_NPC, createNpcState, nextRandom, stepNpc, type NpcParams, type NpcState } from './npc';
import type { Vec2 } from './types';

const free = (from: Vec2, delta: Vec2): Vec2 => ({ x: from.x + delta.x, z: from.z + delta.z });
const blocked = (from: Vec2): Vec2 => ({ x: from.x, z: from.z });

const params = (over: Partial<NpcParams> = {}): NpcParams => ({ ...DEFAULT_NPC, ...over });
const home: Vec2 = { x: 0, z: 0 };
const far: Vec2 = { x: 100, z: 100 };

function run(
  p: NpcParams,
  s0: NpcState,
  player: Vec2,
  seconds: number,
  resolve: (a: Vec2, b: Vec2) => Vec2 = free,
  dt = 1 / 60,
): NpcState {
  let s = s0;
  for (let i = 0; i < Math.round(seconds / dt); i++) s = stepNpc(p, home, s, player, dt, resolve);
  return s;
}

describe('nextRandom', () => {
  it('cùng hạt giống cho cùng dãy, giá trị trong [0, 1)', () => {
    let a = 12345;
    let b = 12345;
    for (let i = 0; i < 50; i++) {
      const [va, na] = nextRandom(a);
      const [vb, nb] = nextRandom(b);
      expect(va).toBe(vb);
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
      a = na;
      b = nb;
    }
  });
});

describe('createNpcState', () => {
  it('chuẩn hoá đầu vào hỏng', () => {
    const s = createNpcState({ x: NaN, z: Infinity }, 7, NaN);
    expect(s.pos).toEqual({ x: 0, z: 0 });
    expect(Math.abs(s.heading)).toBeLessThanOrEqual(Math.PI);
    expect(s.rng).toBe(0);
  });
});

describe('stand', () => {
  it('đứng yên, không di chuyển dù người chơi ở sát', () => {
    const p = params({ behavior: 'stand', aware: 4 });
    const s = run(p, createNpcState(home, 0, 1), { x: 1, z: 1 }, 2);
    expect(s.pos).toEqual({ x: 0, z: 0 });
    expect(s.moving).toBe(false);
  });

  it('quay mặt về phía người chơi khi họ trong tầm, không quay khi ở xa', () => {
    const p = params({ behavior: 'stand', aware: 4 });
    const near = run(p, createNpcState(home, 0, 1), { x: 2, z: 0 }, 2);
    expect(near.heading).toBeCloseTo(Math.PI / 2, 2); // nhìn về +x
    const away = run(p, createNpcState(home, 0, 1), far, 2);
    expect(away.heading).toBe(0);
  });

  it('aware = 0 thì không bao giờ quay (người ngồi)', () => {
    const p = params({ behavior: 'stand', aware: 0 });
    const s = run(p, createNpcState(home, 1, 1), { x: 1, z: 0 }, 2);
    expect(s.heading).toBeCloseTo(1, 9);
  });
});

describe('wander', () => {
  const p = params({ behavior: 'wander', speed: 1.2, leash: 3 });

  it('đi lang thang và luôn ở trong bán kính leash quanh home', () => {
    let s = createNpcState(home, 0, 42);
    let maxD = 0;
    let everMoved = false;
    for (let i = 0; i < 60 * 60; i++) {
      s = stepNpc(p, home, s, far, 1 / 60, free);
      maxD = Math.max(maxD, Math.hypot(s.pos.x, s.pos.z));
      everMoved ||= s.moving;
    }
    expect(everMoved).toBe(true);
    expect(maxD).toBeGreaterThan(0.5);
    expect(maxD).toBeLessThanOrEqual(3 + 0.3);
  });

  it('không nhanh hơn speed', () => {
    let s = createNpcState(home, 0, 7);
    for (let i = 0; i < 600; i++) {
      const before = s.pos;
      s = stepNpc(p, home, s, far, 1 / 60, free);
      expect(Math.hypot(s.pos.x - before.x, s.pos.z - before.z)).toBeLessThanOrEqual(p.speed / 60 + 1e-9);
    }
  });

  it('có nghỉ giữa các lần đi (không đi liên tục)', () => {
    let s = createNpcState(home, 0, 3);
    let idleFrames = 0;
    for (let i = 0; i < 60 * 30; i++) {
      s = stepNpc(p, home, s, far, 1 / 60, free);
      if (!s.moving) idleFrames++;
    }
    expect(idleFrames).toBeGreaterThan(60);
  });

  it('cùng hạt giống thì cùng quỹ đạo; khác hạt giống thì khác', () => {
    const a = run(p, createNpcState(home, 0, 5), far, 20);
    const b = run(p, createNpcState(home, 0, 5), far, 20);
    const c = run(p, createNpcState(home, 0, 6), far, 20);
    expect(a.pos).toEqual(b.pos);
    expect(a.pos).not.toEqual(c.pos);
  });

  it('bị chặn hoàn toàn thì không nhích và không kẹt mãi (đổi điểm đích, không sinh NaN)', () => {
    let s = createNpcState(home, 0, 9);
    for (let i = 0; i < 60 * 20; i++) {
      s = stepNpc(p, home, s, far, 1 / 60, blocked);
      expect(Number.isFinite(s.pos.x) && Number.isFinite(s.pos.z) && Number.isFinite(s.heading)).toBe(true);
    }
    expect(s.pos).toEqual({ x: 0, z: 0 });
    expect(s.moving).toBe(false);
  });
});

describe('approach', () => {
  const p = params({ behavior: 'approach', speed: 2.4, aware: 8, stopDist: 1.3, leash: 4 });

  it('người chơi trong tầm: đi tới rồi dừng cách stopDist và quay mặt về họ', () => {
    const player = { x: 5, z: 0 };
    const s = run(p, createNpcState(home, 0, 1), player, 6);
    const d = Math.hypot(player.x - s.pos.x, player.z - s.pos.z);
    expect(d).toBeGreaterThan(1.3 - 0.1);
    expect(d).toBeLessThan(1.3 + 0.15);
    expect(s.heading).toBeCloseTo(Math.PI / 2, 1);
    expect(s.moving).toBe(false);
  });

  it('đuổi theo khi người chơi chạy đi, rồi lại dừng sát', () => {
    let s = createNpcState(home, 0, 1);
    let player = { x: 3, z: 0 };
    for (let i = 0; i < 60 * 3; i++) s = stepNpc(p, home, s, player, 1 / 60, free);
    player = { x: 3, z: 6 };
    for (let i = 0; i < 60 * 6; i++) s = stepNpc(p, home, s, player, 1 / 60, free);
    expect(Math.hypot(player.x - s.pos.x, player.z - s.pos.z)).toBeLessThan(1.5);
  });

  it('người chơi ngoài tầm thì lang thang quanh home như wander', () => {
    let s = createNpcState(home, 0, 11);
    let maxD = 0;
    for (let i = 0; i < 60 * 40; i++) {
      s = stepNpc(p, home, s, far, 1 / 60, free);
      maxD = Math.max(maxD, Math.hypot(s.pos.x, s.pos.z));
    }
    expect(maxD).toBeLessThanOrEqual(4 + 0.3);
  });

  it('bị chặn thì đứng yên nhưng vẫn quay mặt về hướng muốn tới, không NaN', () => {
    const s = run(p, createNpcState(home, 0, 1), { x: 5, z: 0 }, 3, blocked);
    expect(s.pos).toEqual({ x: 0, z: 0 });
    expect(s.heading).toBeCloseTo(Math.PI / 2, 1);
  });
});

describe('an toàn đầu vào', () => {
  it('dt không hợp lệ thì trả nguyên state; dt lớn bị kẹp', () => {
    const p = params({ behavior: 'approach', speed: 2, aware: 20, stopDist: 1 });
    const s0 = createNpcState(home, 0, 1);
    expect(stepNpc(p, home, s0, { x: 5, z: 0 }, NaN, free)).toBe(s0);
    expect(stepNpc(p, home, s0, { x: 5, z: 0 }, -1, free)).toBe(s0);
    const s1 = stepNpc(p, home, s0, { x: 5, z: 0 }, 10, free);
    expect(s1.pos.x).toBeLessThanOrEqual(2 * 0.1 + 1e-9);
  });

  it('vị trí người chơi hỏng không sinh NaN', () => {
    const p = params({ behavior: 'approach', aware: 20 });
    const s = run(p, createNpcState(home, 0, 1), { x: NaN, z: Infinity }, 2);
    expect(Number.isFinite(s.pos.x) && Number.isFinite(s.pos.z) && Number.isFinite(s.heading)).toBe(true);
  });

  it('resolve trả toạ độ hỏng thì giữ vị trí cũ', () => {
    const p = params({ behavior: 'approach', aware: 20, speed: 2 });
    const bad = (): Vec2 => ({ x: NaN, z: NaN });
    const s = run(p, createNpcState(home, 0, 1), { x: 5, z: 0 }, 1, bad);
    expect(s.pos).toEqual({ x: 0, z: 0 });
  });

  it('không đổi state đầu vào', () => {
    const p = params({ behavior: 'wander' });
    const s0 = createNpcState(home, 0, 1);
    const snapshot = structuredClone(s0);
    stepNpc(p, home, s0, far, 1 / 60, free);
    expect(s0).toEqual(snapshot);
  });
});

describe('approach: dải trễ, bỏ cuộc khi kẹt', () => {
  const p = params({ behavior: 'approach', speed: 2.6, aware: 9, stopDist: 1.0, leash: 3 });

  it('đã dừng thì không chớp đi/dừng mỗi 1-2 khung khi người chơi nhích nhẹ quanh stopDist', () => {
    // NPC tới sát người chơi (dừng), rồi người chơi lùi dần 0.3 m/s: NPC vẫn phải đi theo từng đợt,
    // nhưng hai lần đổi trạng thái liên tiếp phải cách nhau đủ xa (dải trễ), không chớp theo từng khung.
    let s = run(p, createNpcState(home, 0, 1), { x: 3, z: 0 }, 4);
    expect(s.moving).toBe(false);
    let last = s.moving;
    let lastFlip = -1000;
    let minGap = Infinity;
    let flips = 0;
    let player = { x: 3, z: 0 };
    for (let i = 0; i < 60 * 8; i++) {
      player = { x: player.x + 0.3 / 60, z: 0 };
      s = stepNpc(p, home, s, player, 1 / 60, free);
      if (s.moving !== last) {
        minGap = Math.min(minGap, i - lastFlip);
        lastFlip = i;
        last = s.moving;
        flips++;
      }
    }
    expect(flips).toBeGreaterThan(0);
    // Đợt chạy ngắn nhất cũng phải kéo dài vài khung (trước khi có dải trễ là 1-2 khung).
    expect(minGap).toBeGreaterThanOrEqual(5);
  });

  it('kẹt quá 1.5 giây thì bỏ cuộc (giveUp > 0) rồi đi lang thang thay vì ghim mãi', () => {
    let s = createNpcState(home, 0, 3);
    const player = { x: 5, z: 0 };
    let gaveUp = false;
    for (let i = 0; i < 60 * 3; i++) {
      s = stepNpc(p, home, s, player, 1 / 60, blocked);
      gaveUp ||= s.giveUp > 0;
    }
    expect(gaveUp).toBe(true);
    // Hết kẹt (đường thông) và đang bỏ cuộc: không lao thẳng về người chơi ngay.
    let after = s;
    after = { ...after, giveUp: 3 };
    const before = Math.hypot(player.x - after.pos.x, player.z - after.pos.z);
    after = stepNpc(p, home, after, player, 1 / 60, free);
    expect(Math.hypot(player.x - after.pos.x, player.z - after.pos.z)).toBeGreaterThanOrEqual(before - 0.05);
  });

  it('hết thời gian bỏ cuộc thì lại đuổi theo', () => {
    const s0 = { ...createNpcState(home, 0, 3), giveUp: 0.05 };
    const s = run(p, s0, { x: 4, z: 0 }, 5);
    expect(Math.hypot(4 - s.pos.x, 0 - s.pos.z)).toBeLessThan(1.3);
  });
});
