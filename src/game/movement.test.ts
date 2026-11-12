import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOVE,
  PLAYER_RADIUS,
  inputToWorld,
  shortestAngle,
  stepMover,
  wrapAngle,
} from './movement';
import type { MoveInput, MoverState, Vec2 } from './types';

const idle = (): MoverState => ({ pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, heading: 0, speed: 0 });
const none: MoveInput = { x: 0, y: 0, run: false };
const forward: MoveInput = { x: 0, y: 1, run: false };

/** Không có vật cản: đi trọn độ dời. */
const free = (from: Vec2, d: Vec2): Vec2 => ({ x: from.x + d.x, z: from.z + d.z });
/** Tường chắn mọi hướng: đứng nguyên. */
const wall = (from: Vec2): Vec2 => ({ x: from.x, z: from.z });

/** Chạy `steps` bước dt cố định, trả state cuối. */
function run(
  s0: MoverState,
  input: MoveInput,
  yaw: number,
  steps: number,
  dt: number,
  resolve: (from: Vec2, delta: Vec2) => Vec2 = free,
): MoverState {
  let s = s0;
  for (let i = 0; i < steps; i++) s = stepMover(s, input, yaw, DEFAULT_MOVE, dt, resolve);
  return s;
}

const finiteState = (s: MoverState): boolean =>
  [s.pos.x, s.pos.z, s.vel.x, s.vel.z, s.heading, s.speed].every(Number.isFinite);

describe('hằng số mặc định', () => {
  it('DEFAULT_MOVE hợp lý và PLAYER_RADIUS = 0.35', () => {
    expect(DEFAULT_MOVE.walkSpeed).toBeGreaterThan(0);
    expect(DEFAULT_MOVE.runSpeed).toBeGreaterThan(DEFAULT_MOVE.walkSpeed);
    expect(DEFAULT_MOVE.accel).toBeGreaterThan(0);
    expect(DEFAULT_MOVE.decel).toBeGreaterThan(0);
    expect(DEFAULT_MOVE.turnRate).toBeGreaterThan(0);
    expect(PLAYER_RADIUS).toBe(0.35);
  });
});

describe('wrapAngle / shortestAngle', () => {
  it('giữ nguyên góc đã trong (-π, π]', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(1.5)).toBe(1.5);
    expect(wrapAngle(-1.5)).toBe(-1.5);
    expect(wrapAngle(Math.PI)).toBe(Math.PI);
  });

  it('đưa góc ngoài khoảng về trong khoảng, -π thành π', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(2 * Math.PI)).toBeCloseTo(0, 9);
    expect(wrapAngle(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1, 9);
    expect(wrapAngle(-Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1, 9);
  });

  it('luôn trả trong (-π, π] trên một dải góc rộng, kể cả bội của π', () => {
    for (let a = -40; a <= 40; a += 0.37) {
      const w = wrapAngle(a);
      expect(w).toBeGreaterThan(-Math.PI);
      expect(w).toBeLessThanOrEqual(Math.PI);
    }
    for (let k = -8; k <= 8; k++) {
      const w = wrapAngle(k * Math.PI);
      expect(w).toBeGreaterThan(-Math.PI);
      expect(w).toBeLessThanOrEqual(Math.PI);
    }
  });

  it('góc không hữu hạn trả 0', () => {
    expect(wrapAngle(NaN)).toBe(0);
    expect(wrapAngle(Infinity)).toBe(0);
    expect(wrapAngle(-Infinity)).toBe(0);
    expect(shortestAngle(NaN, 1)).toBe(0);
    expect(shortestAngle(1, Infinity)).toBe(0);
  });

  it('shortestAngle đi đường ngắn qua ranh ±π', () => {
    expect(shortestAngle(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6, 9);
    expect(shortestAngle(-3.0, 3.0)).toBeCloseTo(6 - 2 * Math.PI, 9);
    expect(shortestAngle(1, 1)).toBe(0);
    expect(shortestAngle(0, 1)).toBeCloseTo(1, 12);
    expect(shortestAngle(1, 0)).toBeCloseTo(-1, 12);
    expect(shortestAngle(0, Math.PI)).toBeCloseTo(Math.PI, 12);
  });
});

describe('inputToWorld', () => {
  it('yaw 0: tiến -> (0,-1), phải -> (1,0)', () => {
    const f = inputToWorld({ x: 0, y: 1, run: false }, 0);
    const r = inputToWorld({ x: 1, y: 0, run: false }, 0);
    const b = inputToWorld({ x: 0, y: -1, run: false }, 0);
    const l = inputToWorld({ x: -1, y: 0, run: false }, 0);
    expect(f.x).toBeCloseTo(0, 12);
    expect(f.z).toBeCloseTo(-1, 12);
    expect(r.x).toBeCloseTo(1, 12);
    expect(r.z).toBeCloseTo(0, 12);
    expect(b.z).toBeCloseTo(1, 12);
    expect(l.x).toBeCloseTo(-1, 12);
  });

  it('yaw π: tiến -> (0,1), phải -> (-1,0)', () => {
    const f = inputToWorld({ x: 0, y: 1, run: false }, Math.PI);
    const r = inputToWorld({ x: 1, y: 0, run: false }, Math.PI);
    expect(f.x).toBeCloseTo(0, 12);
    expect(f.z).toBeCloseTo(1, 12);
    expect(r.x).toBeCloseTo(-1, 12);
    expect(r.z).toBeCloseTo(0, 12);
  });

  it('yaw π/2: tiến -> (-1,0), phải -> (0,-1)', () => {
    const f = inputToWorld({ x: 0, y: 1, run: false }, Math.PI / 2);
    const r = inputToWorld({ x: 1, y: 0, run: false }, Math.PI / 2);
    expect(f.x).toBeCloseTo(-1, 12);
    expect(f.z).toBeCloseTo(0, 12);
    expect(r.x).toBeCloseTo(0, 12);
    expect(r.z).toBeCloseTo(-1, 12);
  });

  it('tiến luôn ngược hướng từ nhân vật tới camera (sin yaw, cos yaw)', () => {
    for (const yaw of [0.7, -2.1, 3.0, 5.5]) {
      const f = inputToWorld(forward, yaw);
      expect(f.x * Math.sin(yaw) + f.z * Math.cos(yaw)).toBeCloseTo(-1, 12);
    }
  });

  it('chéo không nhanh hơn thẳng: độ lớn kẹp 1', () => {
    const straight = inputToWorld({ x: 1, y: 0, run: false }, 0.3);
    const diag = inputToWorld({ x: 1, y: 1, run: false }, 0.3);
    const huge = inputToWorld({ x: 50, y: 50, run: false }, 0.3);
    expect(Math.hypot(straight.x, straight.z)).toBeCloseTo(1, 12);
    expect(Math.hypot(diag.x, diag.z)).toBeCloseTo(1, 12);
    expect(Math.hypot(huge.x, huge.z)).toBeCloseTo(1, 12);
  });

  it('đầu vào nhỏ hơn 1 giữ nguyên độ lớn (joystick nhẹ đi chậm)', () => {
    const half = inputToWorld({ x: 0, y: 0.5, run: false }, 1.1);
    expect(Math.hypot(half.x, half.z)).toBeCloseTo(0.5, 12);
  });

  it('đầu vào hoặc yaw không hữu hạn cho vector 0', () => {
    for (const v of [
      inputToWorld({ x: NaN, y: 1, run: false }, 0),
      inputToWorld({ x: 1, y: Infinity, run: false }, 0),
      inputToWorld({ x: 1, y: 1, run: false }, NaN),
    ]) {
      expect(v.x).toBe(0);
      expect(v.z).toBe(0);
    }
  });
});

describe('stepMover: tốc độ', () => {
  it('tăng tốc dần từ đứng yên rồi đạt walkSpeed và dừng tăng', () => {
    const dt = 1 / 60;
    let s = idle();
    let prev = 0;
    let reached = -1;
    for (let i = 0; i < 60; i++) {
      s = stepMover(s, forward, 0, DEFAULT_MOVE, dt, free);
      expect(s.speed).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(s.speed).toBeLessThanOrEqual(DEFAULT_MOVE.walkSpeed + 1e-9);
      if (reached < 0 && s.speed >= DEFAULT_MOVE.walkSpeed - 1e-9) reached = i;
      prev = s.speed;
    }
    // Bước đầu mới là accel * dt, chưa phải tốc độ đầy.
    const first = stepMover(idle(), forward, 0, DEFAULT_MOVE, dt, free);
    expect(first.speed).toBeCloseTo(DEFAULT_MOVE.accel * dt, 9);
    expect(first.speed).toBeLessThan(DEFAULT_MOVE.walkSpeed);
    // Đạt tốc độ đi sau ~walkSpeed / accel giây, không đạt ngay.
    expect(reached).toBeGreaterThan(2);
    expect(reached).toBeLessThan(Math.ceil((DEFAULT_MOVE.walkSpeed / DEFAULT_MOVE.accel / dt) * 1.5));
    expect(s.speed).toBeCloseTo(DEFAULT_MOVE.walkSpeed, 9);
  });

  it('giữ run thì đạt runSpeed, không vượt', () => {
    const s = run(idle(), { x: 0, y: 1, run: true }, 0, 120, 1 / 60);
    expect(s.speed).toBeCloseTo(DEFAULT_MOVE.runSpeed, 9);
  });

  it('thả run về đi bộ thì giảm tốc xuống walkSpeed', () => {
    const fast = run(idle(), { x: 0, y: 1, run: true }, 0, 120, 1 / 60);
    const s = run(fast, forward, 0, 60, 1 / 60);
    expect(s.speed).toBeCloseTo(DEFAULT_MOVE.walkSpeed, 9);
  });

  it('thả tay thì giảm tốc dần về 0 rồi đứng yên', () => {
    const dt = 1 / 60;
    let s = run(idle(), forward, 0, 60, dt);
    expect(s.speed).toBeCloseTo(DEFAULT_MOVE.walkSpeed, 9);
    let prev = s.speed;
    for (let i = 0; i < 30; i++) {
      s = stepMover(s, none, 0, DEFAULT_MOVE, dt, free);
      expect(s.speed).toBeLessThanOrEqual(prev + 1e-9);
      prev = s.speed;
    }
    expect(s.speed).toBe(0);
    const x = s.pos.x;
    const z = s.pos.z;
    s = stepMover(s, none, 0, DEFAULT_MOVE, dt, free);
    expect(s.pos.x).toBe(x);
    expect(s.pos.z).toBe(z);
  });

  it('đầu vào nửa chừng cho tốc độ nửa chừng (analog)', () => {
    const s = run(idle(), { x: 0, y: 0.5, run: false }, 0, 60, 1 / 60);
    expect(s.speed).toBeCloseTo(DEFAULT_MOVE.walkSpeed * 0.5, 9);
  });

  it('đi chéo không nhanh hơn đi thẳng', () => {
    const straight = run(idle(), { x: 0, y: 1, run: false }, 0.4, 60, 1 / 60);
    const diag = run(idle(), { x: 1, y: 1, run: false }, 0.4, 60, 1 / 60);
    expect(diag.speed).toBeLessThanOrEqual(straight.speed + 1e-9);
    expect(diag.speed).toBeCloseTo(DEFAULT_MOVE.walkSpeed, 9);
  });

  it('đi theo hướng màn hình: yaw 0 tiến thì z giảm', () => {
    const s = run(idle(), forward, 0, 30, 1 / 60);
    expect(s.pos.z).toBeLessThan(-0.5);
    expect(Math.abs(s.pos.x)).toBeLessThan(1e-9);
  });
});

describe('stepMover: xoay mặt', () => {
  it('mặt xoay dần về hướng đi, đạt đúng hướng', () => {
    // yaw 0, tiến -> hướng thế giới (0,-1) -> heading π.
    const dt = 1 / 60;
    let s = idle();
    let moved = false;
    for (let i = 0; i < 60; i++) {
      const before = Math.abs(shortestAngle(s.heading, Math.PI));
      s = stepMover(s, forward, 0, DEFAULT_MOVE, dt, free);
      const after = Math.abs(shortestAngle(s.heading, Math.PI));
      expect(after).toBeLessThanOrEqual(before + 1e-9);
      // Không xoay quá turnRate * dt mỗi bước.
      expect(before - after).toBeLessThanOrEqual(DEFAULT_MOVE.turnRate * dt + 1e-9);
      if (after < before - 1e-9) moved = true;
    }
    expect(moved).toBe(true);
    expect(Math.abs(shortestAngle(s.heading, Math.PI))).toBeLessThan(1e-6);
    expect(s.heading).toBeGreaterThan(-Math.PI);
    expect(s.heading).toBeLessThanOrEqual(Math.PI);
  });

  it('xoay qua ranh ±π theo đường ngắn (3.0 sang -3.0 xoay ít, không gần cả vòng)', () => {
    // Hướng đích -3.0 rad: (sin, cos) = (-0.141, -0.990). Ở yaw 0 thế giới = (x, -y).
    const goal = -3.0;
    const input: MoveInput = { x: Math.sin(goal), y: -Math.cos(goal), run: false };
    const cruise = DEFAULT_MOVE.walkSpeed;
    let s: MoverState = {
      pos: { x: 0, z: 0 },
      vel: { x: Math.sin(goal) * cruise, z: Math.cos(goal) * cruise },
      heading: 3.0,
      speed: cruise,
    };
    const dt = 0.02;
    const first = stepMover(s, input, 0, DEFAULT_MOVE, dt, free);
    const firstTurn = shortestAngle(3.0, first.heading);
    expect(firstTurn).toBeGreaterThan(0);
    expect(firstTurn).toBeLessThanOrEqual(DEFAULT_MOVE.turnRate * dt + 1e-9);
    for (let i = 0; i < 10; i++) {
      const next = stepMover(s, input, 0, DEFAULT_MOVE, dt, free);
      expect(Math.abs(shortestAngle(s.heading, next.heading))).toBeLessThanOrEqual(
        DEFAULT_MOVE.turnRate * dt + 1e-9,
      );
      s = next;
    }
    expect(Math.abs(shortestAngle(s.heading, goal))).toBeLessThan(1e-6);
  });

  it('tốc độ <= 0.3 m/s mà có đầu vào thì quay mặt theo HƯỚNG ĐẦU VÀO (không theo vận tốc nhỏ)', () => {
    const slow = { ...DEFAULT_MOVE, accel: 10 };
    // Một bước 0.01 s: tốc độ = 0.1 m/s, chưa đủ để suy hướng từ vận tốc.
    const s = stepMover(idle(), forward, 0, slow, 0.01, free);
    expect(s.speed).toBeCloseTo(0.1, 9);
    // Đầu vào tiến ở yaw 0 là (0, -1) nên mặt phải quay dần về phía π, tối đa turnRate * dt = 0.12 rad.
    expect(s.heading).toBeCloseTo(DEFAULT_MOVE.turnRate * 0.01, 9);
  });

  it('không có đầu vào thì không quay mặt dù đang trôi chậm', () => {
    const drifting = { ...idle(), vel: { x: 0.1, z: 0 }, speed: 0.1 };
    const none = { x: 0, y: 0, run: false };
    const s = stepMover(drifting, none, 0, DEFAULT_MOVE, 0.01, free);
    expect(s.heading).toBe(0);
  });

  it('bị tường chặn (tốc độ 0) mà vẫn giữ phím thì quay mặt về phía muốn đi', () => {
    // Lưng quay vào tường: heading 0 (nhìn +z), tường chặn hướng -z, giữ tiến (-z).
    let s = idle();
    for (let i = 0; i < 30; i++) s = stepMover(s, forward, 0, DEFAULT_MOVE, 1 / 60, wall);
    expect(s.speed).toBeCloseTo(0, 9);
    expect(Math.abs(s.heading)).toBeGreaterThan(2.5);
  });
});

describe('stepMover: va chạm', () => {
  it('đi vào tường thì vị trí giữ nguyên và tốc độ về ~0, không giữ vận tốc ảo', () => {
    const cruising = run(idle(), forward, 0, 60, 1 / 60);
    expect(cruising.speed).toBeGreaterThan(2);
    const x = cruising.pos.x;
    const z = cruising.pos.z;
    let s = stepMover(cruising, forward, 0, DEFAULT_MOVE, 1 / 60, wall);
    expect(s.speed).toBeCloseTo(0, 9);
    expect(s.pos.x).toBe(x);
    expect(s.pos.z).toBe(z);
    // Tì vào tường nhiều khung liền: vẫn không tích luỹ vận tốc.
    for (let i = 0; i < 60; i++) s = stepMover(s, forward, 0, DEFAULT_MOVE, 1 / 60, wall);
    expect(s.speed).toBeCloseTo(0, 9);
    expect(s.pos.z).toBe(z);
  });

  it('trượt dọc tường: vận tốc theo độ dời thực tế', () => {
    // Tường chặn trục x; z vẫn đi được.
    const slideZ = (from: Vec2, d: Vec2): Vec2 => ({ x: from.x, z: from.z + d.z });
    // Đi chéo: tiến + phải ở yaw 0 -> hướng (0.707, -0.707).
    const s = run(idle(), { x: 1, y: 1, run: false }, 0, 60, 1 / 60, slideZ);
    expect(s.vel.x).toBeCloseTo(0, 9);
    expect(s.vel.z).toBeLessThan(-1);
    expect(s.speed).toBeCloseTo(Math.abs(s.vel.z), 9);
    // Mặt quay theo hướng trượt (về -z => heading π).
    expect(Math.abs(shortestAngle(s.heading, Math.PI))).toBeLessThan(1e-6);
  });

  it('cú đẩy ra khỏi vật cản không thành vận tốc khổng lồ', () => {
    const teleport = (from: Vec2): Vec2 => ({ x: from.x + 10, z: from.z });
    const s = stepMover(idle(), forward, 0, DEFAULT_MOVE, 1 / 60, teleport);
    expect(s.speed).toBeLessThanOrEqual(DEFAULT_MOVE.runSpeed + 1e-9);
    expect(finiteState(s)).toBe(true);
  });

  it('resolve trả NaN thì giữ vị trí cũ, không lan NaN', () => {
    const bad = (): Vec2 => ({ x: NaN, z: Infinity });
    const s = stepMover(idle(), forward, 0, DEFAULT_MOVE, 1 / 60, bad);
    expect(finiteState(s)).toBe(true);
    expect(s.pos).toEqual({ x: 0, z: 0 });
    expect(s.speed).toBe(0);
  });
});

describe('stepMover: độc lập tốc độ khung hình', () => {
  it('một bước 0.05 so với 5 bước 0.01 cho kết quả gần nhau', () => {
    const a = run(idle(), forward, 0, 1, 0.05);
    const b = run(idle(), forward, 0, 5, 0.01);
    expect(a.speed).toBeCloseTo(b.speed, 9);
    expect(Math.abs(a.pos.z - b.pos.z)).toBeLessThan(0.03);
    expect(Math.abs(a.pos.x - b.pos.x)).toBeLessThan(1e-9);
    expect(Math.abs(shortestAngle(a.heading, b.heading))).toBeLessThan(0.2);
  });

  it('đi 1 giây ở 60 fps so với 144 fps: vị trí lệch dưới 2 cm', () => {
    const a = run(idle(), forward, 0, 60, 1 / 60);
    const b = run(idle(), forward, 0, 144, 1 / 144);
    expect(a.speed).toBeCloseTo(b.speed, 9);
    expect(Math.abs(a.pos.z - b.pos.z)).toBeLessThan(0.02);
  });

  it('dt lớn bị kẹp ở 0.05; dt âm hoặc 0 thì đứng nguyên', () => {
    const big = stepMover(idle(), forward, 0, DEFAULT_MOVE, 5, free);
    const capped = stepMover(idle(), forward, 0, DEFAULT_MOVE, 0.05, free);
    expect(big).toEqual(capped);
    const moving = run(idle(), forward, 0, 20, 1 / 60);
    for (const dt of [0, -1]) {
      const s = stepMover(moving, forward, 0, DEFAULT_MOVE, dt, free);
      expect(s.pos).toEqual(moving.pos);
      expect(s.vel).toEqual(moving.vel);
      expect(s.heading).toBeCloseTo(moving.heading, 12);
    }
  });
});

describe('stepMover: an toàn', () => {
  it('đầu vào, yaw, dt không hữu hạn không sinh NaN', () => {
    const bads = [NaN, Infinity, -Infinity];
    for (const bad of bads) {
      const cases: MoverState[] = [
        stepMover(idle(), { x: bad, y: 1, run: false }, 0, DEFAULT_MOVE, 1 / 60, free),
        stepMover(idle(), { x: 1, y: bad, run: true }, 0, DEFAULT_MOVE, 1 / 60, free),
        stepMover(idle(), forward, bad, DEFAULT_MOVE, 1 / 60, free),
        stepMover(idle(), forward, 0, DEFAULT_MOVE, bad, free),
      ];
      for (const s of cases) expect(finiteState(s)).toBe(true);
    }
  });

  it('NaN ở input/yaw coi như không có đầu vào: đứng yên từ trạng thái nghỉ', () => {
    const s1 = stepMover(idle(), { x: NaN, y: NaN, run: false }, 0, DEFAULT_MOVE, 1 / 60, free);
    const s2 = stepMover(idle(), forward, NaN, DEFAULT_MOVE, 1 / 60, free);
    for (const s of [s1, s2]) {
      expect(s.pos).toEqual({ x: 0, z: 0 });
      expect(s.speed).toBe(0);
    }
  });

  it('state đầu vào hỏng (vel/heading NaN) không lan NaN', () => {
    const broken: MoverState = { pos: { x: 1, z: 2 }, vel: { x: NaN, z: Infinity }, heading: NaN, speed: NaN };
    const s = stepMover(broken, forward, 0, DEFAULT_MOVE, 1 / 60, free);
    expect(finiteState(s)).toBe(true);
  });

  it('thông số hỏng không sinh NaN', () => {
    const badParams = { walkSpeed: NaN, runSpeed: Infinity, accel: NaN, decel: -5, turnRate: NaN };
    const s = run(idle(), forward, 0, 10, 1 / 60, free);
    const t = stepMover(s, forward, 0, badParams, 1 / 60, free);
    expect(finiteState(t)).toBe(true);
  });

  it('thuần: không đổi state, input và vector đầu vào', () => {
    const state = Object.freeze({
      pos: Object.freeze({ x: 1, z: 2 }),
      vel: Object.freeze({ x: 0.5, z: -0.5 }),
      heading: 0.3,
      speed: Math.hypot(0.5, 0.5),
    });
    const input = Object.freeze({ x: 0.2, y: 0.9, run: true });
    const snapshot = JSON.stringify(state);
    const next = stepMover(state, input, 0.6, DEFAULT_MOVE, 1 / 60, free);
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(next).not.toBe(state);
    expect(next.pos).not.toBe(state.pos);
    expect(next.vel).not.toBe(state.vel);
  });
});
