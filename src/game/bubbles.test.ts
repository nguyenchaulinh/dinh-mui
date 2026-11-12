import { describe, expect, it } from 'vitest';
import {
  BUBBLE_RADIUS,
  GRACE,
  HIT_REST,
  MAX_BUBBLES,
  MIN_WARNING,
  NEAR,
  createBubbleState,
  stepBubbles,
  type BubbleArgs,
  type BubbleEvents,
  type BubbleState,
  type ShooterRuntime,
} from './bubbles';
import type { Bounds, Collider, Vec2 } from './types';

const bounds: Bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
const PR = 0.35;

const shooter = (over: Partial<ShooterRuntime> = {}): ShooterRuntime => ({
  key: 'ut',
  pos: { x: 0, z: 0 },
  everySec: 2,
  range: 10,
  minRange: 2,
  speed: 3.2,
  questions: ['Bao giờ cưới?', 'Lương bao nhiêu?'],
  ...over,
});

const args = (over: Partial<BubbleArgs> = {}): BubbleArgs => ({
  player: { x: 0, z: 5 },
  playerRadius: PR,
  shooters: [shooter()],
  obstacles: [],
  bounds,
  paused: false,
  ...over,
});

interface Total {
  state: BubbleState;
  spawned: number;
  hit: number;
  dodged: number;
}

/** Chạy `seconds` giây; `playerAt(t)` cho biết vị trí người chơi theo thời gian. */
function run(
  s0: BubbleState,
  seconds: number,
  playerAt: (t: number) => Vec2,
  over: Partial<BubbleArgs> = {},
  dt = 1 / 60,
): Total {
  let state = s0;
  const total: Total = { state, spawned: 0, hit: 0, dodged: 0 };
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const r = stepBubbles(state, dt, args({ ...over, player: playerAt(i * dt) }));
    state = r.state;
    total.spawned += r.events.spawned.length;
    total.hit += r.events.hit.length;
    total.dodged += r.events.dodged.length;
  }
  total.state = state;
  return total;
}

const still = (p: Vec2) => () => p;

describe('bắn bong bóng', () => {
  it('không bắn ngay lúc vào cảnh; bắn sau một phần chu kỳ khi người chơi trong tầm', () => {
    // everySec = 2 nên lần đầu sau 3 giây: 2.5 giây đầu chắc chắn chưa có quả nào.
    const early = run(createBubbleState(1), 2.5, still({ x: 0, z: 5 }));
    expect(early.spawned).toBe(0);
    const later = run(createBubbleState(1), 4, still({ x: 0, z: 5 }), { playerRadius: 0.05 });
    expect(later.spawned).toBeGreaterThanOrEqual(1);
  });

  it('không bắn khi người chơi quá gần (< minRange) hoặc quá xa (> range)', () => {
    expect(run(createBubbleState(1), 6, still({ x: 0, z: 1 })).spawned).toBe(0);
    expect(run(createBubbleState(1), 6, still({ x: 0, z: 15 })).spawned).toBe(0);
  });

  it('bong bóng bay thẳng về phía người chơi với đúng tốc độ, xuất phát gần NPC', () => {
    let s = createBubbleState(1);
    let spawned: BubbleEvents['spawned'] = [];
    for (let i = 0; i < 600 && spawned.length === 0; i++) {
      const r = stepBubbles(s, 1 / 60, args({ player: { x: 3, z: 4 }, playerRadius: 0.05 }));
      s = r.state;
      spawned = r.events.spawned;
    }
    const b = spawned[0]!;
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(3.2, 9);
    expect(b.vx / b.vz).toBeCloseTo(3 / 4, 9); // hướng về (3, 4)
    expect(Math.hypot(b.x, b.z)).toBeCloseTo(0.7, 9);
    expect(['Bao giờ cưới?', 'Lương bao nhiêu?']).toContain(b.text);
  });

  it('chu kỳ bắn xấp xỉ everySec (±30%) và có giới hạn số bong bóng cùng lúc hợp lý', () => {
    // Có tường chắn ngay trước NPC để bong bóng không bao giờ trúng (người chơi đứng yên sẽ bị trúng và NPC nghỉ).
    const wall: Collider = { kind: 'box', x: 0, z: 2, hw: 8, hd: 0.2 };
    const r = run(createBubbleState(7), 40, still({ x: 0, z: 9 }), { obstacles: [wall] });
    // 40 s với chu kỳ 2 s (sau lần đầu 3 s): khoảng 18-19 quả.
    expect(r.spawned).toBeGreaterThan(40 / 2 / 1.4);
    expect(r.spawned).toBeLessThan(40 / 2 / 0.6);
  });

  it('cùng hạt giống cho cùng chuỗi câu hỏi; khác hạt giống thì khác', () => {
    const texts = (seed: number): string[] => {
      let s = createBubbleState(seed);
      const out: string[] = [];
      for (let i = 0; i < 60 * 30; i++) {
        const r = stepBubbles(s, 1 / 60, args({ playerRadius: 0.05 }));
        s = r.state;
        out.push(...r.events.spawned.map((b) => b.text));
      }
      return out;
    };
    expect(texts(3)).toEqual(texts(3));
    expect(texts(3)).not.toEqual(texts(4));
  });
});

describe('trúng, né, tắt', () => {
  it('đứng yên giữa đường bay thì bị trúng', () => {
    const r = run(createBubbleState(1), 6, still({ x: 0, z: 5 }));
    expect(r.hit).toBeGreaterThanOrEqual(1);
  });

  it('trúng thì xoá hết bong bóng đang bay và NPC nghỉ lâu (HIT_REST) trước khi bắn lại', () => {
    let s = createBubbleState(1);
    let hitAt = -1;
    for (let i = 0; i < 60 * 8 && hitAt < 0; i++) {
      const r = stepBubbles(s, 1 / 60, args());
      s = r.state;
      if (r.events.hit.length > 0) hitAt = i;
    }
    expect(hitAt).toBeGreaterThan(0);
    expect(s.bubbles).toHaveLength(0);
    expect(s.cooldown['ut']).toBeGreaterThanOrEqual(HIT_REST - 1e-9);
    // Trong thời gian nghỉ không có quả mới.
    const after = run(s, HIT_REST - 0.5, still({ x: 0, z: 5 }));
    expect(after.spawned).toBe(0);
  });

  it('bước sang bên sau khi bị bắn (lệch > bán kính trúng, trong NEAR) thì né được, tính đúng một lần', () => {
    let s = createBubbleState(1);
    let player: Vec2 = { x: 1.0, z: 5 };
    let spawned = 0;
    let hit = 0;
    let dodged = 0;
    let dodgedAfterSpawn = -1;
    for (let i = 0; i < 60 * 8; i++) {
      const r = stepBubbles(s, 1 / 60, args({ player }));
      s = r.state;
      if (r.events.spawned.length > 0 && spawned === 0) {
        // Vừa bị bắn về (1, 5): bước sang x = -0.5 (lệch 1.5 m khỏi đường bay, ngoài vùng trúng 0.55).
        player = { x: -0.5, z: 5 };
        dodgedAfterSpawn = 0;
      }
      spawned += r.events.spawned.length;
      hit += r.events.hit.length;
      dodged += r.events.dodged.length;
      if (spawned === 1 && r.events.spawned.length === 0) dodgedAfterSpawn = dodged;
      // Chỉ xét quả đầu tiên: sau đó người chơi đứng yên nên các quả sau sẽ trúng.
      if (dodged >= 1 || hit >= 1) break;
    }
    expect(hit).toBe(0);
    expect(dodged).toBe(1);
    expect(dodgedAfterSpawn).toBeGreaterThanOrEqual(0);
  });

  it('bong bóng chưa từng tới gần người chơi (bị tường chặn) thì không được tính là né', () => {
    const wall: Collider = { kind: 'box', x: 0, z: 1.5, hw: 5, hd: 0.2 };
    const r = run(createBubbleState(1), 10, still({ x: 0, z: 6 }), { obstacles: [wall] });
    expect(r.spawned).toBeGreaterThan(0);
    expect(r.hit).toBe(0);
    expect(r.dodged).toBe(0);
  });

  it('chạy ngang qua đường bay đúng lúc thì né được', () => {
    // Người chơi chạy ngang 4.2 m/s, bắt đầu cách đường bay 4 m; cứ chạy qua lại.
    const r = run(createBubbleState(1), 20, (t) => ({ x: 4 * Math.sin(t * 1.1), z: 5 }));
    expect(r.spawned).toBeGreaterThan(3);
    expect(r.hit + r.dodged).toBeGreaterThan(0);
  });

  it('bong bóng bị tường chặn thì tắt và không xuyên qua', () => {
    const wall: Collider = { kind: 'box', x: 0, z: 2.5, hw: 5, hd: 0.2 };
    const r = run(createBubbleState(1), 10, still({ x: 0, z: 5 }), { obstacles: [wall] });
    expect(r.spawned).toBeGreaterThan(0);
    expect(r.hit).toBe(0);
  });

  it('bong bóng ra ngoài bounds hoặc quá thời gian sống thì tắt (không tích luỹ vô hạn)', () => {
    const r = run(createBubbleState(1), 60, still({ x: 8, z: 0 }), { playerRadius: 0.05 });
    expect(r.state.bubbles.length).toBeLessThan(12);
  });

  it('hằng số hợp lý: vùng trúng nhỏ hơn NEAR', () => {
    expect(PR + BUBBLE_RADIUS).toBeLessThan(NEAR);
  });

  it('bong bóng bị tường chặn NGAY TRƯỚC người chơi (đã trong NEAR) cũng không được tính né: không có chỗ núp né miễn phí', () => {
    // Người chơi đứng ngay sau bức tường, cách tường 1.5 m (trong NEAR): bong bóng tới tường là tắt, chưa đi qua người chơi.
    const wall: Collider = { kind: 'box', x: 0, z: 2.5, hw: 6, hd: 0.2 };
    const r = run(createBubbleState(1), 30, still({ x: 0, z: 4 }), { obstacles: [wall] });
    expect(r.spawned).toBeGreaterThan(4);
    expect(r.hit).toBe(0);
    expect(r.dodged).toBe(0);
  });

  it('bong bóng trúng thì không bao giờ vừa tính né vừa tính trúng', () => {
    const r = run(createBubbleState(1), 10, still({ x: 0, z: 5 }));
    expect(r.hit).toBeGreaterThan(0);
    expect(r.dodged).toBe(0);
  });

  it('né sớm và xa (sang bên ~3 m) vẫn được tính, miễn là bong bóng đã đi qua', () => {
    let s = createBubbleState(1);
    let player: Vec2 = { x: 0, z: 5 };
    let hit = 0;
    let dodged = 0;
    let moved = false;
    for (let i = 0; i < 60 * 10 && dodged + hit === 0; i++) {
      const r = stepBubbles(s, 1 / 60, args({ player }));
      s = r.state;
      if (r.events.spawned.length > 0 && !moved) {
        moved = true;
        player = { x: 3.0, z: 5 }; // bước ngang 3 m ngay sau khi bị bắn
      }
      hit += r.events.hit.length;
      dodged += r.events.dodged.length;
    }
    expect(hit).toBe(0);
    expect(dodged).toBe(1);
  });

  it('chạy thẳng ra xa nhanh hơn bong bóng: không trúng và cũng không được tính né (chưa từng bị vượt qua)', () => {
    let s = createBubbleState(1);
    let z = 5;
    let hit = 0;
    let dodged = 0;
    for (let i = 0; i < 60 * 8; i++) {
      z += 4.2 / 60; // chạy ra xa 4.2 m/s > tốc độ bóng 3.2 m/s
      const r = stepBubbles(s, 1 / 60, args({ player: { x: 0, z: Math.min(z, 19) } }));
      s = r.state;
      hit += r.events.hit.length;
      dodged += r.events.dodged.length;
    }
    expect(hit).toBe(0);
    expect(dodged).toBe(0);
  });

  it('vừa bước vào tầm bắn thì có báo trước tối thiểu MIN_WARNING, không bắn ngay khung đầu', () => {
    let s = createBubbleState(1);
    // Ngoài tầm rất lâu: cooldown không được tụt âm sâu.
    for (let i = 0; i < 60 * 30; i++) s = stepBubbles(s, 1 / 60, args({ player: { x: 0, z: 15 } })).state;
    expect(s.cooldown['ut']).toBeGreaterThanOrEqual(MIN_WARNING - 1e-9);
    let firstShotAt = -1;
    for (let i = 0; i < 60 * 3 && firstShotAt < 0; i++) {
      const r = stepBubbles(s, 1 / 60, args({ player: { x: 0, z: 6 }, playerRadius: 0.05 }));
      s = r.state;
      if (r.events.spawned.length > 0) firstShotAt = i / 60;
    }
    expect(firstShotAt).toBeGreaterThanOrEqual(MIN_WARNING - 0.03);
  });

  it('NPC đứng sát tường bắn vào tường: không có bong bóng và cũng không báo câu hỏi', () => {
    const wall: Collider = { kind: 'box', x: 0, z: 0.9, hw: 3, hd: 0.1 };
    const r = run(createBubbleState(1), 20, still({ x: 0, z: 5 }), { obstacles: [wall] });
    expect(r.spawned).toBe(0);
  });

  it('số bong bóng cùng lúc không vượt MAX_BUBBLES dù chu kỳ bắn rất ngắn', () => {
    let s = createBubbleState(1);
    let maxSeen = 0;
    const fast = [shooter({ everySec: 0.1 })];
    // Người chơi ở xa trong tầm bắn: bóng bay lâu nên dồn lại.
    for (let i = 0; i < 60 * 6; i++) {
      s = stepBubbles(s, 1 / 60, args({ shooters: fast, player: { x: 0, z: 9.5 }, playerRadius: 0.001 })).state;
      maxSeen = Math.max(maxSeen, s.bubbles.length);
    }
    expect(maxSeen).toBeLessThanOrEqual(MAX_BUBBLES);
    expect(maxSeen).toBeGreaterThan(2);
  });
});

describe('hội thoại (paused) và an toàn', () => {
  it('paused: xoá hết bong bóng đang bay, không bắn, không sự kiện; ân hạn GRACE sau khi đóng', () => {
    let s = createBubbleState(1);
    for (let i = 0; i < 60 * 4; i++) s = stepBubbles(s, 1 / 60, args({ playerRadius: 0.05 })).state;
    expect(s.bubbles.length).toBeGreaterThan(0);
    let spawned = 0;
    for (let i = 0; i < 60 * 5; i++) {
      const r = stepBubbles(s, 1 / 60, args({ paused: true }));
      s = r.state;
      spawned += r.events.spawned.length + r.events.hit.length + r.events.dodged.length;
    }
    expect(spawned).toBe(0);
    // Xoá để chúng không bay tiếp và trúng ngay khi đóng hội thoại.
    expect(s.bubbles).toEqual([]);
    expect(s.cooldown['ut']).toBeGreaterThanOrEqual(GRACE - 1e-9);
    // Vừa đóng hội thoại: chưa bắn ngay.
    const r = run(s, GRACE - 0.5, still({ x: 0, z: 5 }), { playerRadius: 0.05 });
    expect(r.spawned).toBe(0);
  });

  it('không đổi state đầu vào', () => {
    const s = createBubbleState(1);
    const snapshot = structuredClone(s);
    stepBubbles(s, 1 / 60, args());
    expect(s).toEqual(snapshot);
  });

  it('vị trí hỏng hoặc dt hỏng không sinh NaN và không bắn', () => {
    const bad = run(createBubbleState(1), 5, still({ x: NaN, z: Infinity }));
    expect(bad.spawned).toBe(0);
    for (const b of bad.state.bubbles) expect(Number.isFinite(b.x) && Number.isFinite(b.z)).toBe(true);
    const s0 = createBubbleState(1);
    expect(stepBubbles(s0, NaN, args()).state).toBe(s0);
    const badShooter = run(createBubbleState(1), 5, still({ x: 0, z: 5 }), { shooters: [shooter({ pos: { x: NaN, z: 0 } })] });
    expect(badShooter.spawned).toBe(0);
  });

  it('nhiều NPC bắn độc lập; mỗi NPC có chu kỳ riêng', () => {
    const shooters = [shooter({ key: 'a', pos: { x: -3, z: 0 } }), shooter({ key: 'b', pos: { x: 3, z: 0 }, everySec: 5 })];
    let s = createBubbleState(2);
    const keys = new Set<string>();
    for (let i = 0; i < 60 * 20; i++) {
      const r = stepBubbles(s, 1 / 60, args({ shooters, playerRadius: 0.05 }));
      s = r.state;
      r.events.spawned.forEach((b) => keys.add(b.key));
    }
    expect([...keys].sort()).toEqual(['a', 'b']);
  });
});
