import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES, createSim, explode, stepSim, type SimOptions } from './fireworkSim';

/** Bộ số ngẫu nhiên có hạt (LCG) để test lặp lại được. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const PAL = ['#f6c343', '#ff4d4f', '#ffffff'];
const OPTS: SimOptions = { intensity: 3, palette: PAL };
const W = 400;
const H = 800;

function run(sim: ReturnType<typeof createSim>, seconds: number, opts: SimOptions, rng = seeded(1)) {
  for (let t = 0; t < seconds; t += 1 / 60) stepSim(sim, 1 / 60, W, H, rng, opts);
}

describe('mô phỏng pháo hoa', () => {
  it('bắn tên lửa và nổ nhiều lần; mọi giá trị hữu hạn; không bao giờ vượt trần số hạt', () => {
    const sim = createSim();
    const rng = seeded(7);
    let peak = 0;
    for (let i = 0; i < 60 * 20; i++) {
      stepSim(sim, 1 / 60, W, H, rng, OPTS);
      peak = Math.max(peak, sim.particles.length);
      for (const p of sim.particles) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy)).toBe(true);
      }
    }
    expect(sim.bursts).toBeGreaterThan(8);
    expect(peak).toBeLessThanOrEqual(MAX_PARTICLES);
  });

  it('trần số hạt riêng (điện thoại yếu) được tôn trọng', () => {
    const sim = createSim();
    const rng = seeded(3);
    for (let i = 0; i < 60 * 15; i++) {
      stepSim(sim, 1 / 60, W, H, rng, { ...OPTS, maxParticles: 150 });
      expect(sim.particles.length).toBeLessThanOrEqual(150);
    }
  });

  it('tên lửa nổ gần độ cao đỉnh đã chọn (phần trên màn hình) và bắn từ đáy', () => {
    const sim = createSim();
    const rng = seeded(11);
    const opts: SimOptions = { intensity: 1, palette: PAL, confetti: false };
    for (let i = 0; i < 20 && !sim.particles.some((p) => p.kind === 'rocket'); i++) stepSim(sim, 1 / 60, W, H, rng, opts); // bắn quả đầu
    const rocket = sim.particles.find((p) => p.kind === 'rocket');
    expect(rocket, 'có tên lửa').toBeDefined();
    expect(rocket!.y).toBeGreaterThan(H - 30);
    const apex = rocket!.aux;
    expect(apex).toBeLessThan(H * 0.45);
    while (sim.bursts === 0) stepSim(sim, 1 / 60, W, H, rng, { ...opts, launching: false });
    const spark = sim.particles.find((p) => p.kind === 'spark')!;
    expect(spark.y).toBeLessThan(apex + 40);
    expect(spark.y).toBeGreaterThan(apex - 80);
  });

  it('khi ngừng bắn và ngừng rắc giấy thì mọi hạt tàn hết', () => {
    const sim = createSim();
    run(sim, 8, OPTS);
    expect(sim.particles.length).toBeGreaterThan(0);
    run(sim, 20, { ...OPTS, launching: false, confetti: false });
    expect(sim.particles).toHaveLength(0);
  });

  it('giấy hoa rơi từ trên xuống và bị gỡ khi qua đáy', () => {
    const sim = createSim();
    const opts: SimOptions = { intensity: 2, palette: PAL, launching: false };
    run(sim, 3, opts);
    const c = sim.particles.filter((p) => p.kind === 'confetti');
    expect(c.length).toBeGreaterThan(5);
    for (const p of c) expect(p.y).toBeLessThan(H + 20);
    run(sim, 30, { ...opts, confetti: false });
    expect(sim.particles).toHaveLength(0);
  });

  it('cường độ cao thì nổ nhiều hạt hơn mỗi lần', () => {
    const count = (intensity: 1 | 3) => {
      const sim = createSim();
      return explode(sim, 200, 200, '#f6c343', W, H, () => 0.1, { intensity, palette: PAL });
    };
    expect(count(3)).toBeGreaterThan(count(1));
  });

  it('đầu vào hỏng (dt, kích thước) không làm hỏng trạng thái', () => {
    const sim = createSim();
    stepSim(sim, NaN, W, H, seeded(1), OPTS);
    stepSim(sim, -1, W, H, seeded(1), OPTS);
    stepSim(sim, 0.016, 0, H, seeded(1), OPTS);
    stepSim(sim, 0.016, W, -5, seeded(1), OPTS);
    expect(sim.clock).toBe(0);
    expect(sim.particles).toHaveLength(0);
    stepSim(sim, 5, W, H, seeded(1), OPTS); // dt lớn bị kẹp, không nhảy vọt
    expect(sim.clock).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('cùng hạt cho cùng kết quả', () => {
    const a = createSim();
    const b = createSim();
    run(a, 6, OPTS, seeded(5));
    run(b, 6, OPTS, seeded(5));
    expect(a.particles.map((p) => [p.x, p.y])).toEqual(b.particles.map((p) => [p.x, p.y]));
  });
});
