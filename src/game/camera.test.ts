import { describe, expect, it } from 'vitest';
import { DEFAULT_CAM, applyLook, computeCameraPose, smoothPose, yawBehind } from './camera';
import { wrapAngle } from './movement';
import type { CameraPose, FollowCam, Vec2 } from './types';

/** Không có vật che: trả đúng maxLen. */
const noHit = (_o: Vec2, _d: Vec2, maxLen: number): number => maxLen;
const hitAt =
  (d: number) =>
  (): number =>
    d;

const horizDist = (pose: CameraPose): number =>
  Math.hypot(pose.pos[0] - pose.lookAt[0], pose.pos[2] - pose.lookAt[2]);

const allFinite = (pose: CameraPose): boolean =>
  [...pose.pos, ...pose.lookAt].every(Number.isFinite);

const poseA: CameraPose = { pos: [0, 4, 6], lookAt: [0, 1.15, 0] };
const poseB: CameraPose = { pos: [10, 5, -3], lookAt: [8, 1.15, -5] };

describe('applyLook / yawBehind', () => {
  it('cộng yaw và wrap về (-π, π], giữ pitch và dist', () => {
    const cam: FollowCam = { yaw: 3.0, pitch: 0.4, dist: 6 };
    const out = applyLook(cam, 0.5);
    expect(out.yaw).toBeCloseTo(wrapAngle(3.5), 12);
    expect(out.yaw).toBeLessThan(0);
    expect(out.pitch).toBe(0.4);
    expect(out.dist).toBe(6);
    expect(applyLook({ ...DEFAULT_CAM, yaw: 0 }, -0.25).yaw).toBeCloseTo(-0.25, 12);
  });

  it('không đổi cam đầu vào (kể cả cam đóng băng) và bỏ qua lookDelta không hữu hạn', () => {
    const out = applyLook(DEFAULT_CAM, 1);
    expect(out).not.toBe(DEFAULT_CAM);
    expect(DEFAULT_CAM.yaw).toBe(0);
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(applyLook(DEFAULT_CAM, bad)).toEqual(DEFAULT_CAM);
    }
  });

  it('yawBehind = heading + π, wrap', () => {
    expect(yawBehind(0)).toBeCloseTo(Math.PI, 12);
    expect(yawBehind(Math.PI)).toBeCloseTo(0, 12);
    expect(yawBehind(2)).toBeCloseTo(2 + Math.PI - 2 * Math.PI, 12);
    for (let h = -7; h <= 7; h += 0.41) {
      const y = yawBehind(h);
      expect(y).toBeGreaterThan(-Math.PI);
      expect(y).toBeLessThanOrEqual(Math.PI);
    }
    expect(yawBehind(NaN)).toBeCloseTo(Math.PI, 12);
  });
});

describe('DEFAULT_CAM', () => {
  it('pitch ~0.26, dist ~5.6; mắt camera thấp hơn xà cổng làng (2.75 m)', () => {
    expect(DEFAULT_CAM.pitch).toBeCloseTo(0.26, 2);
    expect(DEFAULT_CAM.dist).toBeCloseTo(5.6, 1);
    expect(1.15 + DEFAULT_CAM.dist * Math.sin(DEFAULT_CAM.pitch)).toBeLessThan(2.7);
  });
});

describe('computeCameraPose: hình học', () => {
  it('điểm nhìn ở (x, 1.15, z); khoảng cách tới camera đúng dist; độ cao thêm = dist * sin(pitch)', () => {
    const cam: FollowCam = { yaw: 0.8, pitch: 0.55, dist: 5.2 };
    const pose = computeCameraPose({ x: 3, z: -2 }, cam, noHit);
    expect(pose.lookAt).toEqual([3, 1.15, -2]);
    expect(horizDist(pose)).toBeCloseTo(cam.dist * Math.cos(cam.pitch), 9);
    expect(pose.pos[1] - 1.15).toBeCloseTo(cam.dist * Math.sin(cam.pitch), 9);
    const full = Math.hypot(horizDist(pose), pose.pos[1] - pose.lookAt[1]);
    expect(full).toBeCloseTo(cam.dist, 9);
  });

  it('camera ở (sin yaw, cos yaw) quanh nhân vật: yaw 0 -> phía +z', () => {
    const pose = computeCameraPose({ x: 0, z: 0 }, { yaw: 0, pitch: 0.5, dist: 5 }, noHit);
    expect(pose.pos[0]).toBeCloseTo(0, 12);
    expect(pose.pos[2]).toBeGreaterThan(0);
    const side = computeCameraPose({ x: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0.5, dist: 5 }, noHit);
    expect(side.pos[0]).toBeGreaterThan(0);
    expect(side.pos[2]).toBeCloseTo(0, 12);
  });

  it('camera nằm sau lưng khi yaw = yawBehind(heading): nhìn theo hướng tiến của nhân vật', () => {
    const player: Vec2 = { x: 4, z: -7 };
    for (const heading of [0, 1, -2.4, 3.1, Math.PI]) {
      const pose = computeCameraPose(player, { ...DEFAULT_CAM, yaw: yawBehind(heading) }, noHit);
      // Vector ngang camera -> điểm nhìn, chuẩn hoá.
      const dx = pose.lookAt[0] - pose.pos[0];
      const dz = pose.lookAt[2] - pose.pos[2];
      const len = Math.hypot(dx, dz);
      // Vector tiến của nhân vật theo types.ts: (sin h, cos h).
      const dot = (dx / len) * Math.sin(heading) + (dz / len) * Math.cos(heading);
      expect(dot).toBeCloseTo(1, 9);
    }
  });

  it('truyền cho clip: origin = người chơi, dir = (sin yaw, cos yaw) đơn vị, maxLen = ngang + 0.3', () => {
    const calls: { o: Vec2; d: Vec2; m: number }[] = [];
    const cam: FollowCam = { yaw: 1.1, pitch: 0.6, dist: 4 };
    const player: Vec2 = { x: 1.5, z: 2.5 };
    computeCameraPose(player, cam, (o, d, m) => {
      calls.push({ o, d, m });
      return m;
    });
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.o).toEqual(player);
    expect(c.d.x).toBeCloseTo(Math.sin(1.1), 12);
    expect(c.d.z).toBeCloseTo(Math.cos(1.1), 12);
    expect(Math.hypot(c.d.x, c.d.z)).toBeCloseTo(1, 12);
    expect(c.m).toBeCloseTo(4 * Math.cos(0.6) + 0.3, 12);
  });
});

describe('computeCameraPose: chống xuyên tường', () => {
  const cam: FollowCam = { yaw: 0.5, pitch: 0.55, dist: 5.2 };
  const full = cam.dist * Math.cos(cam.pitch);

  it('bị che thì rút ngắn còn hit - 0.3, độ cao co theo tỷ lệ pitch', () => {
    const pose = computeCameraPose({ x: 0, z: 0 }, cam, hitAt(2.5));
    expect(horizDist(pose)).toBeCloseTo(2.2, 9);
    expect((pose.pos[1] - 1.15) / horizDist(pose)).toBeCloseTo(Math.tan(cam.pitch), 9);
    // Vẫn cùng hướng yaw.
    expect(Math.atan2(pose.pos[0], pose.pos[2])).toBeCloseTo(cam.yaw, 9);
  });

  it('không bao giờ dưới 1.2 dù tường sát người', () => {
    for (const hit of [1.4, 1.0, 0.5, 0, -3]) {
      const pose = computeCameraPose({ x: 0, z: 0 }, cam, hitAt(hit));
      expect(horizDist(pose)).toBeCloseTo(1.2, 9);
    }
  });

  it('không có vật che thì giữ đủ khoảng cách (hit >= maxLen, Infinity, NaN)', () => {
    for (const hit of [full + 0.3, full + 5, Infinity, NaN]) {
      const pose = computeCameraPose({ x: 0, z: 0 }, cam, hitAt(hit));
      expect(horizDist(pose)).toBeCloseTo(full, 9);
    }
  });

  it('tường nằm trong khoảng đệm cuối thì lùi vào vừa đủ, không dài hơn ban đầu', () => {
    const pose = computeCameraPose({ x: 0, z: 0 }, cam, hitAt(full + 0.1));
    expect(horizDist(pose)).toBeCloseTo(full - 0.2, 9);
    expect(horizDist(pose)).toBeLessThan(full);
  });

  it('dist nhỏ hơn 1.2 thì không bị kéo dài ra', () => {
    const tiny: FollowCam = { yaw: 0, pitch: 0.3, dist: 1 };
    const pose = computeCameraPose({ x: 0, z: 0 }, tiny, hitAt(0.2));
    expect(horizDist(pose)).toBeCloseTo(1 * Math.cos(0.3), 9);
  });
});

describe('computeCameraPose: an toàn', () => {
  it('giá trị không hữu hạn không sinh NaN', () => {
    const bads = [NaN, Infinity, -Infinity];
    for (const bad of bads) {
      expect(allFinite(computeCameraPose({ x: bad, z: 1 }, DEFAULT_CAM, noHit))).toBe(true);
      expect(allFinite(computeCameraPose({ x: 1, z: bad }, DEFAULT_CAM, noHit))).toBe(true);
      expect(allFinite(computeCameraPose({ x: 0, z: 0 }, { ...DEFAULT_CAM, yaw: bad }, noHit))).toBe(true);
      expect(allFinite(computeCameraPose({ x: 0, z: 0 }, { ...DEFAULT_CAM, pitch: bad }, noHit))).toBe(true);
      expect(allFinite(computeCameraPose({ x: 0, z: 0 }, { ...DEFAULT_CAM, dist: bad }, noHit))).toBe(true);
    }
  });

  it('pitch cực đoan được kẹp, dist <= 0 dùng mặc định', () => {
    const up = computeCameraPose({ x: 0, z: 0 }, { yaw: 0, pitch: 10, dist: 5 }, noHit);
    const down = computeCameraPose({ x: 0, z: 0 }, { yaw: 0, pitch: -10, dist: 5 }, noHit);
    expect(allFinite(up)).toBe(true);
    expect(up.pos[1]).toBeGreaterThan(1.15);
    expect(down.pos[1]).toBeGreaterThan(1.15);
    const zero = computeCameraPose({ x: 0, z: 0 }, { yaw: 0, pitch: 0.55, dist: 0 }, noHit);
    expect(horizDist(zero)).toBeCloseTo(DEFAULT_CAM.dist * Math.cos(0.55), 9);
  });
});

describe('smoothPose', () => {
  it('prev null thì nhảy thẳng tới next', () => {
    expect(smoothPose(null, poseB, 1 / 60)).toEqual(poseB);
  });

  it('mỗi bước tiến gần next hơn, không vượt, và hội tụ', () => {
    let cur: CameraPose = poseA;
    let prevDist = Infinity;
    for (let i = 0; i < 120; i++) {
      cur = smoothPose(cur, poseB, 1 / 60);
      const d = Math.hypot(cur.pos[0] - poseB.pos[0], cur.pos[1] - poseB.pos[1], cur.pos[2] - poseB.pos[2]);
      expect(d).toBeLessThanOrEqual(prevDist + 1e-12);
      prevDist = d;
      // Không vượt qua đích trên từng trục.
      expect(cur.pos[0]).toBeLessThanOrEqual(poseB.pos[0] + 1e-12);
      expect(cur.pos[2]).toBeGreaterThanOrEqual(poseB.pos[2] - 1e-12);
    }
    for (let i = 0; i < 3; i++) {
      expect(cur.pos[i]).toBeCloseTo(poseB.pos[i]!, 3);
      expect(cur.lookAt[i]).toBeCloseTo(poseB.lookAt[i]!, 3);
    }
  });

  it('bước đầu tiến đúng phần 1 - exp(-rate * dt)', () => {
    const dt = 1 / 60;
    const out = smoothPose(poseA, poseB, dt, 8);
    const a = 1 - Math.exp(-8 * dt);
    expect(out.pos[0]).toBeCloseTo(poseA.pos[0] + (poseB.pos[0] - poseA.pos[0]) * a, 12);
    expect(out.lookAt[2]).toBeCloseTo(poseA.lookAt[2] + (poseB.lookAt[2] - poseA.lookAt[2]) * a, 12);
  });

  it('độc lập tốc độ khung hình: một bước 0.1 s = 10 bước 0.01 s = 6 bước 1/60 s', () => {
    const one = smoothPose(poseA, poseB, 0.1);
    let ten = poseA;
    for (let i = 0; i < 10; i++) ten = smoothPose(ten, poseB, 0.01);
    let six = poseA;
    for (let i = 0; i < 6; i++) six = smoothPose(six, poseB, 0.1 / 6);
    for (let i = 0; i < 3; i++) {
      expect(ten.pos[i]).toBeCloseTo(one.pos[i]!, 9);
      expect(six.pos[i]).toBeCloseTo(one.pos[i]!, 9);
      expect(ten.lookAt[i]).toBeCloseTo(one.lookAt[i]!, 9);
    }
  });

  it('60 fps so với 144 fps sau 0.5 s cho cùng kết quả', () => {
    let a = poseA;
    for (let i = 0; i < 30; i++) a = smoothPose(a, poseB, 1 / 60);
    let b = poseA;
    for (let i = 0; i < 72; i++) b = smoothPose(b, poseB, 1 / 144);
    for (let i = 0; i < 3; i++) expect(a.pos[i]).toBeCloseTo(b.pos[i]!, 9);
  });

  it('rate lớn hơn thì bám nhanh hơn', () => {
    const slow = smoothPose(poseA, poseB, 1 / 60, 4);
    const fast = smoothPose(poseA, poseB, 1 / 60, 20);
    expect(fast.pos[0]).toBeGreaterThan(slow.pos[0]);
  });

  it('dt rất lớn thì gần như nhảy thẳng tới next', () => {
    const out = smoothPose(poseA, poseB, 100);
    for (let i = 0; i < 3; i++) expect(out.pos[i]).toBeCloseTo(poseB.pos[i]!, 9);
  });

  it('dt <= 0 hoặc NaN thì giữ prev; rate hỏng dùng mặc định', () => {
    for (const dt of [0, -1, NaN]) expect(smoothPose(poseA, poseB, dt)).toEqual(poseA);
    const withBadRate = smoothPose(poseA, poseB, 1 / 60, NaN);
    const withDefault = smoothPose(poseA, poseB, 1 / 60);
    expect(withBadRate).toEqual(withDefault);
    expect(smoothPose(poseA, poseB, 1 / 60, -3)).toEqual(withDefault);
  });

  it('pose hỏng: prev không hữu hạn thì snap tới next; next không hữu hạn thì giữ prev', () => {
    const badPrev: CameraPose = { pos: [NaN, 0, 0], lookAt: [0, 0, 0] };
    const badNext: CameraPose = { pos: [0, Infinity, 0], lookAt: [0, 0, 0] };
    expect(smoothPose(badPrev, poseB, 1 / 60)).toEqual(poseB);
    expect(smoothPose(poseA, badNext, 1 / 60)).toEqual(poseA);
  });

  it('không đổi prev và next (kể cả khi đóng băng)', () => {
    const prev: CameraPose = Object.freeze({
      pos: Object.freeze([0, 4, 6]) as unknown as [number, number, number],
      lookAt: Object.freeze([0, 1.15, 0]) as unknown as [number, number, number],
    });
    const next: CameraPose = Object.freeze({
      pos: Object.freeze([10, 5, -3]) as unknown as [number, number, number],
      lookAt: Object.freeze([8, 1.15, -5]) as unknown as [number, number, number],
    });
    const out = smoothPose(prev, next, 1 / 60);
    expect(out).not.toBe(prev);
    expect(out.pos).not.toBe(prev.pos);
    expect(prev.pos).toEqual([0, 4, 6]);
    expect(next.pos).toEqual([10, 5, -3]);
  });
});
