import { describe, expect, it } from 'vitest';
import {
  BIKE_HALF_LEN,
  BIKE_HALF_WIDTH,
  bikeBox,
  bikeX,
  safeSpot,
  trafficBikes,
  trafficHit,
  type TrafficCfg,
} from './traffic';

const cfg: TrafficCfg = {
  lanes: [
    { z: -0.9, dir: 1, speed: 2.6 },
    { z: -0.2, dir: 1, speed: 2.1 },
    { z: 0.6, dir: -1, speed: 2.4 },
    { z: 1.3, dir: -1, speed: 1.8 },
  ],
  count: 22,
  length: 40,
};

describe('trafficBikes', () => {
  it('đúng số xe, chia đều các làn, pha ban đầu trong [0, length)', () => {
    const bikes = trafficBikes(cfg);
    expect(bikes).toHaveLength(22);
    for (const b of bikes) {
      expect(b.offset).toBeGreaterThanOrEqual(0);
      expect(b.offset).toBeLessThan(cfg.length);
    }
    const perLane = cfg.lanes.map((l) => bikes.filter((b) => b.lane === l).length);
    expect(Math.max(...perLane) - Math.min(...perLane)).toBeLessThanOrEqual(1);
  });

  it('ổn định: cùng cấu hình cho cùng danh sách; cấu hình hỏng thì không có xe', () => {
    expect(trafficBikes(cfg)).toEqual(trafficBikes(cfg));
    expect(trafficBikes({ ...cfg, lanes: [] })).toEqual([]);
    expect(trafficBikes({ ...cfg, count: 0 })).toEqual([]);
    expect(trafficBikes({ ...cfg, length: 0 })).toEqual([]);
    expect(trafficBikes({ ...cfg, count: NaN })).toEqual([]);
  });
});

describe('bikeX', () => {
  it('chạy đúng hướng và tốc độ; vòng lại sau mỗi length', () => {
    const b = trafficBikes(cfg)[0]!; // làn dir +1, speed 2.6
    const x0 = bikeX(b, 0, cfg.length);
    const x1 = bikeX(b, 1, cfg.length);
    // Không qua mép vòng thì tăng đúng speed (dir +1).
    if (x1 > x0) expect(x1 - x0).toBeCloseTo(2.6, 9);
    // Sau length/speed giây thì về đúng chỗ cũ.
    expect(bikeX(b, cfg.length / 2.6, cfg.length)).toBeCloseTo(x0, 6);
    // Luôn nằm trong [-length/2, length/2].
    for (let t = 0; t < 100; t += 0.37) expect(Math.abs(bikeX(b, t, cfg.length))).toBeLessThanOrEqual(cfg.length / 2 + 1e-9);
  });

  it('làn ngược chiều chạy ngược; t hỏng coi như 0', () => {
    const bikes = trafficBikes(cfg);
    const east = bikes.find((b) => b.lane.dir === 1)!;
    const west = bikes.find((b) => b.lane.dir === -1)!;
    const dEast = bikeX(east, 0.5, cfg.length) - bikeX(east, 0, cfg.length);
    const dWest = bikeX(west, 0.5, cfg.length) - bikeX(west, 0, cfg.length);
    if (Math.abs(dEast) < 5 && Math.abs(dWest) < 5) {
      expect(dEast).toBeGreaterThan(0);
      expect(dWest).toBeLessThan(0);
    }
    expect(bikeX(east, NaN, cfg.length)).toBe(bikeX(east, 0, cfg.length));
  });
});

describe('trafficHit', () => {
  const bikes = trafficBikes(cfg);
  const R = 0.35;

  it('người chơi đứng ngay trên đường đi của một xe thì bị quẹt', () => {
    const b = bikes[0]!;
    const t = 3;
    const at = { x: bikeX(b, t, cfg.length), z: b.lane.z };
    expect(trafficHit(bikes, cfg, t, at, R)).toBe(true);
  });

  it('ngoài mọi làn (vỉa hè) thì không bao giờ bị quẹt', () => {
    for (let t = 0; t < 60; t += 0.5) {
      expect(trafficHit(bikes, cfg, t, { x: t - 30, z: -2.9 }, R)).toBe(false);
      expect(trafficHit(bikes, cfg, t, { x: 30 - t, z: 3.4 }, R)).toBe(false);
    }
  });

  it('sát mép xe: chạm thì bị, cách xa hơn bán kính thì không', () => {
    const b = bikes[0]!;
    const t = 1;
    const bx = bikeX(b, t, cfg.length);
    expect(trafficHit(bikes, cfg, t, { x: bx + BIKE_HALF_LEN + R - 0.05, z: b.lane.z }, R)).toBe(true);
    // Cách đầu xe 0.3 m ngoài vùng chạm và không có xe khác ở đó (kiểm tra bằng cấu hình chỉ một xe).
    const one: TrafficCfg = { lanes: [b.lane], count: 1, length: cfg.length };
    const oneBike = trafficBikes(one);
    const ox = bikeX(oneBike[0]!, t, cfg.length);
    expect(trafficHit(oneBike, one, t, { x: ox + BIKE_HALF_LEN + R + 0.3, z: b.lane.z }, R)).toBe(false);
    expect(trafficHit(oneBike, one, t, { x: ox, z: b.lane.z + BIKE_HALF_WIDTH + R + 0.3 }, R)).toBe(false);
  });

  it('hộp xe khớp vị trí bikeX và kích thước hằng số', () => {
    const b = bikes[2]!;
    const box = bikeBox(b, 5, cfg.length);
    expect(box.kind).toBe('box');
    if (box.kind === 'box') {
      expect(box.x).toBeCloseTo(bikeX(b, 5, cfg.length), 12);
      expect(box.z).toBe(b.lane.z);
      expect(box.hw).toBe(BIKE_HALF_LEN);
      expect(box.hd).toBe(BIKE_HALF_WIDTH);
    }
  });

  it('vị trí hỏng thì không bị quẹt, không ném lỗi', () => {
    expect(trafficHit(bikes, cfg, 1, { x: NaN, z: 0 }, R)).toBe(false);
    expect(trafficHit([], cfg, 1, { x: 0, z: 0 }, R)).toBe(false);
  });

  it('băng qua đường hợp lý thì có thể thoát an toàn: tồn tại thời điểm và vị trí đi hết đường không bị quẹt', () => {
    // Đi bộ ngang đường từ z = -2.5 tới 3.0 với tốc độ chạy 4.2 m/s, thử nhiều thời điểm xuất phát và vị trí x.
    let safeStarts = 0;
    let total = 0;
    for (let x = -10; x <= 10; x += 2.5) {
      for (let t0 = 0; t0 < 30; t0 += 1.5) {
        total++;
        let hit = false;
        for (let k = 0; k <= 80 && !hit; k++) {
          const z = -2.5 + (5.5 * k) / 80;
          hit = trafficHit(bikes, cfg, t0 + (k / 80) * (5.5 / 4.2), { x, z }, R);
        }
        if (!hit) safeStarts++;
      }
    }
    // Qua 4 làn mà không nhìn khoảng trống: khoảng 30% an toàn. Người chơi nhìn xe rồi chọn lúc qua thì cao hơn nhiều.
    expect(safeStarts / total).toBeGreaterThan(0.2);
    expect(safeStarts / total).toBeLessThan(1); // nhưng có nguy hiểm thật
  });
});

describe('safeSpot', () => {
  it('về vỉa hè gần hơn, giữ nguyên x', () => {
    expect(safeSpot(cfg, -2.4, 2.9, { x: 3, z: -0.5 })).toEqual({ x: 3, z: -2.4 });
    expect(safeSpot(cfg, -2.4, 2.9, { x: -7, z: 1.1 })).toEqual({ x: -7, z: 2.9 });
  });
});
