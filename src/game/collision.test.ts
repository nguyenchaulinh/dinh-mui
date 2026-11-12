import { describe, expect, it } from 'vitest';
import { clipRay, isBlocked, resolveMove } from './collision';
import type { Bounds, Collider, Vec2 } from './types';

const BIG: Bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
const R = 0.3;

function box(x: number, z: number, hw: number, hd: number, rotY = 0, blocksCamera = false): Collider {
  return { kind: 'box', x, z, hw, hd, rotY, blocksCamera };
}

function circle(x: number, z: number, r: number, blocksCamera = false): Collider {
  return { kind: 'circle', x, z, r, blocksCamera };
}

const v = (x: number, z: number): Vec2 => ({ x, z });

/** Bộ sinh số giả ngẫu nhiên có hạt giống, để test lặp lại được. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function expectVec(actual: Vec2, expected: Vec2, digits = 3): void {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
}

describe('resolveMove: vật cản hình hộp', () => {
  it('đi thẳng vào tường thì dừng sát, không xuyên, không lọt vào', () => {
    const wall = [box(0, 5, 2, 0.5)];
    const out = resolveMove(v(0, 0), v(0, 10), R, wall, BIG);
    // Mặt tường ở z = 4.5, tâm dừng cách R.
    expectVec(out, v(0, 4.2));
    expect(isBlocked(out, R, wall, BIG)).toBe(false);
  });

  it('đi chéo vào hộp thì trượt dọc mặt hộp, giữ nguyên thành phần dọc theo mặt', () => {
    const wall = [box(0, 5, 2, 0.5)];
    const out = resolveMove(v(0, 4.2), v(1, 1), R, wall, BIG);
    expectVec(out, v(1, 4.2));
  });

  it('trượt dọc hộp xoay 45 độ', () => {
    const rot = Math.PI / 4;
    const wall = [box(0, 0, 3, 0.5, rot)];
    // Pháp tuyến mặt +z cục bộ và trục dài (x cục bộ) theo quy ước trong types.ts.
    const n = v(Math.sin(rot), Math.cos(rot));
    const a = v(Math.cos(rot), -Math.sin(rot));
    const start = v(n.x * 1.0, n.z * 1.0);
    // Đi vào tường 1.0 (khe hở chỉ 0.2) và dọc tường 1.0.
    const delta = v(-n.x + a.x, -n.z + a.z);
    const out = resolveMove(start, delta, R, wall, BIG);
    // Kỳ vọng: cách mặt tường 0.5 + R = 0.8 theo pháp tuyến, tiến đủ 1.0 dọc trục dài.
    expectVec(out, v(a.x * 1.0 + n.x * 0.8, a.z * 1.0 + n.z * 0.8));
    expect(isBlocked(out, R, wall, BIG)).toBe(false);
  });

  it('hộp xoay 90 độ cho kết quả như hộp không xoay đổi hw và hd', () => {
    const plain = [box(3, 0, 0.5, 2)];
    const rotated = [box(3, 0, 2, 0.5, Math.PI / 2)];
    const cases: Array<[Vec2, Vec2]> = [
      [v(0, 0), v(6, 0)],
      [v(0.5, -0.5), v(4, 0.3)],
      [v(6, 1), v(-6, 0.2)],
      [v(3, -4), v(0, 8)],
      [v(2, 1.5), v(1, -2)],
    ];
    for (const [from, delta] of cases) {
      const a = resolveMove(from, delta, R, plain, BIG);
      const b = resolveMove(from, delta, R, rotated, BIG);
      expectVec(b, a, 6);
    }
  });

  it('chiều xoay đúng quy ước: trục x cục bộ là (cos θ, -sin θ), trục z cục bộ là (sin θ, cos θ)', () => {
    const rot = Math.PI / 6;
    // Hộp dài theo x cục bộ.
    const longX = [box(0, 0, 3, 0.2, rot)];
    const ax = v(Math.cos(rot), -Math.sin(rot));
    expect(isBlocked(v(ax.x * 2.5, ax.z * 2.5), 0.05, longX, BIG)).toBe(true);
    // Điểm đối xứng qua trục x thế giới nằm ngoài hộp (nếu chiều xoay bị ngược thì sẽ trúng).
    expect(isBlocked(v(ax.x * 2.5, -ax.z * 2.5), 0.05, longX, BIG)).toBe(false);

    // Hộp dài theo z cục bộ.
    const longZ = [box(0, 0, 0.2, 3, rot)];
    const az = v(Math.sin(rot), Math.cos(rot));
    expect(isBlocked(v(az.x * 2.5, az.z * 2.5), 0.05, longZ, BIG)).toBe(true);
    expect(isBlocked(v(-az.x * 2.5, az.z * 2.5), 0.05, longZ, BIG)).toBe(false);
  });

  it('góc giữa hai hộp: dừng ở góc, không xuyên, không kẹt giữa chừng', () => {
    const corner = [box(0, 5, 10, 0.5), box(5, 0, 0.5, 10)];
    const into = resolveMove(v(3, 3), v(5, 5), R, corner, BIG);
    expectVec(into, v(4.2, 4.2));
    expect(isBlocked(into, R, corner, BIG)).toBe(false);

    // Đi dọc tường này vào góc rồi dừng ở tường kia.
    const along = resolveMove(v(3, 4.2), v(5, 0), R, corner, BIG);
    expectVec(along, v(4.2, 4.2));

    // Từ góc, vẫn lùi ra được.
    const back = resolveMove(into, v(-2, -2), R, corner, BIG);
    expectVec(back, v(into.x - 2, into.z - 2));
  });

  it('delta rất lớn không xuyên tường mỏng (hd = 0.05)', () => {
    const thin = [box(0, 5, 30, 0.05)];
    const out = resolveMove(v(0, 0), v(0, 40), R, thin, BIG);
    expectVec(out, v(0, 5 - 0.05 - R));
    // Cũng đúng khi đi chéo: trượt dọc tường đủ 10 theo x, không lọt sang bên kia.
    const diag = resolveMove(v(0, 0), v(10, 30), R, thin, BIG);
    expect(diag.x).toBeCloseTo(10, 2);
    expect(diag.z).toBeCloseTo(5 - 0.05 - R, 3);
  });

  it('khe hẹp hơn đường kính thì không lọt, khe rộng hơn thì đi qua', () => {
    const narrow = [box(-1.25, 5, 1, 0.5), box(1.25, 5, 1, 0.5)]; // khe 0.5 < 2R = 0.6
    const stuck = resolveMove(v(0, 0), v(0, 10), R, narrow, BIG);
    expect(stuck.z).toBeGreaterThan(4.2);
    expect(stuck.z).toBeLessThan(4.5);
    expect(Math.abs(stuck.x)).toBeLessThan(0.1);
    expect(isBlocked(stuck, R, narrow, BIG)).toBe(false);

    const wide = [box(-1.55, 5, 1, 0.5), box(1.55, 5, 1, 0.5)]; // khe 1.1 > 2R
    const through = resolveMove(v(0, 0), v(0, 10), R, wide, BIG);
    expectVec(through, v(0, 10));
  });
});

describe('resolveMove: vật cản hình tròn', () => {
  it('đi thẳng vào tâm vòng tròn thì dừng sát', () => {
    const post = [circle(0, 5, 1)];
    const out = resolveMove(v(0, 0), v(0, 10), R, post, BIG);
    expectVec(out, v(0, 5 - 1 - R));
  });

  it('trượt quanh vòng tròn: không bao giờ lún vào (khoảng cách >= R + r) và vẫn đi qua được', () => {
    const post = [circle(0, 0, 1)];
    let p = v(-3, 0.5);
    let minDist = Infinity;
    let maxZ = -Infinity;
    for (let frame = 0; frame < 120; frame++) {
      p = resolveMove(p, v(0.05, 0), R, post, BIG);
      minDist = Math.min(minDist, Math.hypot(p.x, p.z));
      maxZ = Math.max(maxZ, p.z);
    }
    expect(minDist).toBeGreaterThan(1 + R - 1e-3);
    // Bị đẩy lệch lên trên rồi tiếp tục đi, không dính lại ở mặt trước.
    expect(maxZ).toBeGreaterThan(1);
    expect(p.x).toBeGreaterThan(2);
    expect(isBlocked(p, R, post, BIG)).toBe(false);
  });

  it('bị đẩy ra theo pháp tuyến: một bước đi chéo vào mép giữ lại thành phần tiếp tuyến', () => {
    const post = [circle(0, 0, 1)];
    // Từ điểm sát mép phải đi thẳng xuống (-z): thành phần tiếp tuyến là -z, thành phần pháp tuyến bị triệt.
    const out = resolveMove(v(1 + R, 0), v(-0.1, -0.1), R, post, BIG);
    expect(out.z).toBeLessThan(-0.05);
    expect(Math.hypot(out.x, out.z)).toBeGreaterThan(1 + R - 1e-3);
    expect(isBlocked(out, R, post, BIG)).toBe(false);
  });

  it('đi lệch tâm thì vòng qua vòng tròn được', () => {
    const post = [circle(0, 5, 1)];
    const out = resolveMove(v(0.4, 0), v(0, 10), R, post, BIG);
    expect(out.z).toBeGreaterThan(5);
    expect(isBlocked(out, R, post, BIG)).toBe(false);
  });
});

describe('resolveMove: bounds, điểm xuất phát, đầu vào xấu', () => {
  it('bounds co lại theo bán kính', () => {
    const bounds: Bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    expectVec(resolveMove(v(0, 0), v(100, 100), 0.5, [], bounds), v(9.5, 9.5), 6);
    expectVec(resolveMove(v(0, 0), v(-100, -100), 0.5, [], bounds), v(-9.5, -9.5), 6);
    // Bán kính lớn hơn thì dừng sớm hơn.
    expect(resolveMove(v(0, 0), v(100, 0), 2, [], bounds).x).toBeCloseTo(8, 6);
  });

  it('điểm xuất phát ngoài bounds được kéo vào', () => {
    const bounds: Bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    expectVec(resolveMove(v(30, -30), v(0, 0), 0.5, [], bounds), v(9.5, -9.5), 6);
  });

  it('điểm xuất phát nằm trong hộp thì bị đẩy ra mặt gần nhất', () => {
    const solid = [box(0, 0, 2, 1)];
    // Gần mặt x = +2 hơn mặt z.
    const out = resolveMove(v(1.5, 0.2), v(0, 0), R, solid, BIG);
    expectVec(out, v(2 + R, 0.2));
    // Gần mặt z = -1 hơn.
    const out2 = resolveMove(v(0.3, -0.8), v(0, 0), R, solid, BIG);
    expectVec(out2, v(0.3, -1 - R));
    expect(isBlocked(out, R, solid, BIG)).toBe(false);
  });

  it('điểm xuất phát nằm trong vòng tròn thì bị đẩy ra, rồi vẫn đi tiếp được', () => {
    const post = [circle(0, 0, 1)];
    const out = resolveMove(v(0.2, 0), v(0, 0), R, post, BIG);
    expectVec(out, v(1 + R, 0));
    const moved = resolveMove(v(0.2, 0), v(3, 0), R, post, BIG);
    expectVec(moved, v(1 + R + 3, 0));
  });

  it('điểm xuất phát sâu trong tường mỏng xoay vẫn thoát ra', () => {
    const rot = 0.7;
    const thin = [box(0, 0, 5, 0.05, rot)];
    const out = resolveMove(v(0.3, 0.1), v(0, 0), R, thin, BIG);
    expect(isBlocked(out, R, thin, BIG)).toBe(false);
  });

  it('delta bằng 0 giữ nguyên vị trí và trả object mới', () => {
    const from = v(1, 2);
    const out = resolveMove(from, v(0, 0), R, [box(10, 10, 1, 1)], BIG);
    expect(out).toEqual(from);
    expect(out).not.toBe(from);
  });

  it('NaN và Infinity không sinh NaN, không ném lỗi', () => {
    const colliders = [box(0, 5, 2, 0.5), circle(3, 3, 1)];
    // delta hỏng: trả from.
    expect(resolveMove(v(1, 2), v(NaN, 0), R, colliders, BIG)).toEqual(v(1, 2));
    expect(resolveMove(v(1, 2), v(0, Infinity), R, colliders, BIG)).toEqual(v(1, 2));
    expect(resolveMove(v(1, 2), v(-Infinity, NaN), R, colliders, BIG)).toEqual(v(1, 2));
    // from hỏng: trả tâm bounds.
    expect(resolveMove(v(NaN, 0), v(1, 1), R, colliders, BIG)).toEqual(v(0, 0));
    const bounds: Bounds = { minX: 0, maxX: 10, minZ: 20, maxZ: 40 };
    expect(resolveMove(v(0, Infinity), v(1, 1), R, [], bounds)).toEqual(v(5, 30));
    // bán kính hỏng coi như 0, kết quả vẫn hữu hạn.
    const out = resolveMove(v(0, 0), v(1, 1), NaN, colliders, BIG);
    expect(Number.isFinite(out.x) && Number.isFinite(out.z)).toBe(true);
    expectVec(out, v(1, 1));
    // bounds hỏng: trả from.
    expect(resolveMove(v(1, 2), v(1, 1), R, colliders, { minX: NaN, maxX: 1, minZ: 0, maxZ: 1 })).toEqual(v(1, 2));
    // collider hỏng bị bỏ qua, không lan NaN.
    const bad: Collider[] = [box(NaN, 0, 1, 1), box(0, 0, 1, 1, NaN), circle(0, 0, NaN), circle(0, 0, Infinity)];
    const out2 = resolveMove(v(5, 5), v(1, 1), R, bad, BIG);
    expectVec(out2, v(6, 6));
    // số cực lớn nhưng hữu hạn.
    const huge = resolveMove(v(0, 0), v(1e308, 1e308), R, colliders, BIG);
    expect(Number.isFinite(huge.x) && Number.isFinite(huge.z)).toBe(true);
  });

  it('bounds nhỏ hơn đường kính thì lấy tâm bounds', () => {
    const tiny: Bounds = { minX: 0, maxX: 0.4, minZ: 0, maxZ: 0.4 };
    expectVec(resolveMove(v(0.1, 0.1), v(1, 1), R, [], tiny), v(0.2, 0.2), 6);
  });

  it('mô phỏng nhiều khung hình: không bao giờ lún vào vật cản, không xuyên tường mỏng, không ra ngoài bounds', () => {
    const bounds: Bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
    const colliders: Collider[] = [
      box(0, 5, 10, 0.05), // tường mỏng chắn ngang toàn bộ bề rộng
      box(-4, -3, 2, 0.6, 0.6),
      circle(4, -2, 1.2),
      box(0, -6, 1, 1, Math.PI / 4),
      box(6, 2, 0.5, 3),
      box(-6, 2, 3, 0.5, -0.4),
    ];
    const rnd = lcg(12345);
    let p = v(0, 0);
    for (let frame = 0; frame < 5000; frame++) {
      const angle = rnd() * Math.PI * 2;
      // Thỉnh thoảng có cú nhảy delta rất lớn.
      const len = rnd() < 0.02 ? rnd() * 8 : rnd() * 0.3;
      p = resolveMove(p, v(Math.sin(angle) * len, Math.cos(angle) * len), R, colliders, bounds);
      expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
      if (isBlocked(p, R, colliders, bounds)) {
        throw new Error(`Khung ${frame}: vị trí (${p.x}, ${p.z}) đang chạm vật cản hoặc ngoài bounds`);
      }
      if (p.z > 5 - 0.05 - R + 1e-6) {
        throw new Error(`Khung ${frame}: xuyên tường mỏng, z = ${p.z}`);
      }
    }
  });
});

describe('isBlocked', () => {
  const colliders: Collider[] = [box(0, 5, 2, 0.5), circle(5, 0, 1)];
  const bounds: Bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

  it('true khi chồng lấn hộp hoặc vòng tròn, false khi thoáng', () => {
    expect(isBlocked(v(0, 0), R, colliders, bounds)).toBe(false);
    expect(isBlocked(v(0, 4.4), R, colliders, bounds)).toBe(true); // lún 0.2 vào hộp
    expect(isBlocked(v(0, 4.1), R, colliders, bounds)).toBe(false); // còn hở 0.1
    expect(isBlocked(v(3.8, 0), R, colliders, bounds)).toBe(true); // vòng tròn: 5 - 1 - R = 3.7
    expect(isBlocked(v(3.6, 0), R, colliders, bounds)).toBe(false);
    // Sát góc hộp: cách góc (2, 4.5) đúng 0.2 < R thì chạm, xa hơn thì thoáng.
    expect(isBlocked(v(2.15, 4.35), R, colliders, bounds)).toBe(true);
    expect(isBlocked(v(2.3, 4.2), R, colliders, bounds)).toBe(false);
  });

  it('true khi vượt bounds co theo bán kính', () => {
    expect(isBlocked(v(9.5, 0), 0.5, [], bounds)).toBe(false);
    expect(isBlocked(v(9.8, 0), 0.5, [], bounds)).toBe(true);
    expect(isBlocked(v(0, -9.8), 0.5, [], bounds)).toBe(true);
    expect(isBlocked(v(-11, 0), 0, [], bounds)).toBe(true);
  });

  it('bán kính 0 cho biết tâm có nằm trong vật cản không', () => {
    expect(isBlocked(v(0, 5), 0, colliders, bounds)).toBe(true);
    expect(isBlocked(v(0, 4.4), 0, colliders, bounds)).toBe(false);
    expect(isBlocked(v(5.5, 0), 0, colliders, bounds)).toBe(true);
  });

  it('dữ liệu hỏng thì coi là bị chặn', () => {
    expect(isBlocked(v(NaN, 0), R, colliders, bounds)).toBe(true);
    expect(isBlocked(v(0, 0), R, colliders, { minX: NaN, maxX: 1, minZ: 0, maxZ: 1 })).toBe(true);
  });

  it('hộp xoay: nhất quán với kết quả resolveMove', () => {
    const rotated = [box(0, 0, 3, 0.5, 0.9)];
    const out = resolveMove(v(0, -4), v(0.3, 8), R, rotated, bounds);
    expect(isBlocked(out, R, rotated, bounds)).toBe(false);
  });
});

describe('clipRay', () => {
  const up = v(0, 1);

  it('không vật cản thì trả maxLen', () => {
    expect(clipRay(v(0, 0), up, 6, [])).toBe(6);
  });

  it('trúng hộp: trả khoảng cách tới mặt hộp', () => {
    const wall = [box(0, 5, 1, 0.5, 0, true)];
    expect(clipRay(v(0, 0), up, 20, wall)).toBeCloseTo(4.5, 9);
    // Tia chéo (dir đơn vị) trúng mặt trước ở z = 4.5.
    const d = v(Math.SQRT1_2, Math.SQRT1_2);
    expect(clipRay(v(-2, 0), d, 20, [box(0, 5, 3, 0.5, 0, true)])).toBeCloseTo(4.5 * Math.SQRT2 - 0, 6);
  });

  it('trúng hộp xoay 45 độ (hình thoi)', () => {
    const diamond = [box(0, 5, 1, 1, Math.PI / 4, true)];
    // Hình thoi |x| + |z - 5| <= √2. Tia x = 0.5 trúng ở z = 5 - (√2 - 0.5).
    expect(clipRay(v(0.5, 0), up, 20, diamond)).toBeCloseTo(5 - (Math.SQRT2 - 0.5), 6);
    // Tia x = 0 trúng đỉnh ở 5 - √2.
    expect(clipRay(v(0, 0), up, 20, diamond)).toBeCloseTo(5 - Math.SQRT2, 6);
    // Tia x = 1.5 trượt ra ngoài.
    expect(clipRay(v(1.5, 0), up, 20, diamond)).toBe(20);
  });

  it('hộp xoay 90 độ cho cùng kết quả với hộp không xoay đổi hw và hd', () => {
    const plain = [box(2, 5, 0.5, 2, 0, true)];
    const rotated = [box(2, 5, 2, 0.5, Math.PI / 2, true)];
    for (const [ox, oz, dx, dz] of [
      [0, 0, 0.6, 0.8],
      [2, 0, 0, 1],
      [5, 5, -1, 0],
      [2, 9, 0, -1],
    ] as const) {
      const a = clipRay(v(ox, oz), v(dx, dz), 30, plain);
      const b = clipRay(v(ox, oz), v(dx, dz), 30, rotated);
      expect(b).toBeCloseTo(a, 9);
    }
  });

  it('trúng vòng tròn: trả khoảng cách tới mép gần', () => {
    expect(clipRay(v(0, 0), up, 20, [circle(0, 5, 1, true)])).toBeCloseTo(4, 9);
    // Tia lệch tâm 0.6: mép gần tại z = 5 - sqrt(1 - 0.36) = 4.2.
    expect(clipRay(v(0.6, 0), up, 20, [circle(0, 5, 1, true)])).toBeCloseTo(4.2, 9);
    // Lệch quá bán kính thì trượt.
    expect(clipRay(v(1.2, 0), up, 20, [circle(0, 5, 1, true)])).toBe(20);
  });

  it('bỏ qua collider không có blocksCamera', () => {
    const colliders: Collider[] = [
      box(0, 3, 2, 0.5, 0, false),
      { kind: 'box', x: 0, z: 4, hw: 2, hd: 0.5 }, // không khai báo blocksCamera
      circle(0, 5, 1, false),
      box(0, 8, 2, 0.5, 0, true),
    ];
    expect(clipRay(v(0, 0), up, 20, colliders)).toBeCloseTo(7.5, 9);
  });

  it('lấy vật cản ĐẦU TIÊN theo tia, bất kể thứ tự trong mảng', () => {
    const far = box(0, 12, 2, 0.5, 0, true);
    const near = circle(0, 6, 1, true);
    expect(clipRay(v(0, 0), up, 30, [far, near])).toBeCloseTo(5, 9);
    expect(clipRay(v(0, 0), up, 30, [near, far])).toBeCloseTo(5, 9);
  });

  it('gốc tia nằm trong vật cản blocksCamera thì trả 0', () => {
    expect(clipRay(v(0.2, 5.1), up, 20, [box(0, 5, 1, 1, 0, true)])).toBe(0);
    expect(clipRay(v(0.2, 5.1), up, 20, [circle(0, 5, 1, true)])).toBe(0);
    expect(clipRay(v(0.2, 5.1), up, 20, [box(0, 5, 1, 1, 0.4, true)])).toBe(0);
    // Nằm trong vật cản KHÔNG che camera thì không tính.
    expect(clipRay(v(0.2, 5.1), up, 20, [box(0, 5, 1, 1, 0, false)])).toBe(20);
  });

  it('maxLen ngắn hơn khoảng cách tới vật cản thì trả maxLen', () => {
    expect(clipRay(v(0, 0), up, 3, [box(0, 5, 1, 0.5, 0, true)])).toBe(3);
    expect(clipRay(v(0, 0), up, 3, [circle(0, 5, 1, true)])).toBe(3);
  });

  it('vật cản nằm sau lưng tia hoặc tia đi song song thì bỏ qua', () => {
    expect(clipRay(v(0, 0), v(0, -1), 20, [box(0, 5, 1, 0.5, 0, true), circle(0, 5, 1, true)])).toBe(20);
    // Tia chạy song song sát ngoài mặt hộp (x = 1.5 > hw = 1).
    expect(clipRay(v(1.5, 0), up, 20, [box(0, 5, 1, 0.5, 0, true)])).toBe(20);
  });

  it('chuẩn hoá dir lệch độ dài 1', () => {
    expect(clipRay(v(0, 0), v(0, 5), 20, [box(0, 5, 1, 0.5, 0, true)])).toBeCloseTo(4.5, 9);
  });

  it('đầu vào hỏng không sinh NaN, trả 0', () => {
    const wall = [box(0, 5, 1, 0.5, 0, true)];
    expect(clipRay(v(NaN, 0), up, 20, wall)).toBe(0);
    expect(clipRay(v(0, 0), v(NaN, 1), 20, wall)).toBe(0);
    expect(clipRay(v(0, 0), v(0, 0), 20, wall)).toBe(0);
    expect(clipRay(v(0, 0), up, NaN, wall)).toBe(0);
    expect(clipRay(v(0, 0), up, Infinity, wall)).toBe(0);
    expect(clipRay(v(0, 0), up, -1, wall)).toBe(0);
    // Collider hỏng bị bỏ qua.
    const bad: Collider[] = [
      box(NaN, 5, 1, 1, 0, true),
      box(0, 5, Infinity, 1, 0, true),
      box(0, 5, 1, 1, NaN, true),
      circle(0, NaN, 1, true),
      circle(0, 5, Infinity, true),
    ];
    expect(clipRay(v(0, 0), up, 20, bad)).toBe(20);
    expect(clipRay(v(0, 0), v(0.6, 0.8), 20, bad)).toBe(20);
  });
});
