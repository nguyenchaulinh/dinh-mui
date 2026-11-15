/**
 * Pháo hoa và giấy hoa rơi (hàm thuần, không đụng DOM): mô phỏng hạt để màn hình chiến thắng vẽ lên canvas (Fireworks.tsx)
 * và để test được (giới hạn số hạt, hạt tàn hết, nổ đúng chỗ). Đơn vị: pixel CSS và giây; trục y hướng xuống.
 */

export type ParticleKind = 'rocket' | 'spark' | 'confetti';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  /** Vị trí khung trước, để vẽ vệt sáng. */
  px: number;
  py: number;
  vx: number;
  vy: number;
  age: number;
  /** Tuổi thọ (s). Tên lửa sống tới khi nổ. */
  life: number;
  color: string;
  size: number;
  /** Độ cao đỉnh (tên lửa nổ khi tới đây) hoặc pha lắc (giấy hoa). */
  aux: number;
}

export interface Sim {
  particles: Particle[];
  clock: number;
  nextLaunch: number;
  /** Số lần nổ từ đầu (để test). */
  bursts: number;
  nextConfetti: number;
}

export interface SimOptions {
  /** 1 nhẹ, 2 vừa, 3 hoành tráng (nhiều hạt, bắn dày hơn). */
  intensity: 1 | 2 | 3;
  palette: readonly string[];
  /** Có bắn tên lửa mới không (tắt để xem hạt tàn hết). */
  launching?: boolean;
  confetti?: boolean;
  /** Trần số hạt (điện thoại yếu). */
  maxParticles?: number;
}

export const MAX_PARTICLES = 700;
const GRAVITY = 260;
const MAX_DT = 0.05;

export const createSim = (): Sim => ({ particles: [], clock: 0, nextLaunch: 0.15, bursts: 0, nextConfetti: 0 });

type Rng = () => number;

/** Tỉ lệ theo cỡ màn hình: màn nhỏ thì tốc độ và cỡ hạt nhỏ lại. */
const unit = (w: number, h: number): number => Math.min(1.4, Math.max(0.55, Math.min(h, w * 1.4) / 700));

const pick = <T>(a: readonly T[], rng: Rng): T => a[Math.floor(rng() * a.length) % a.length]!;

function launch(sim: Sim, w: number, h: number, rng: Rng, opts: SimOptions): void {
  const u = unit(w, h);
  const x = w * (0.12 + 0.76 * rng());
  const apex = h * (0.1 + 0.32 * rng());
  const rise = Math.max(60, h + 10 - apex);
  const vy = -Math.sqrt(2 * GRAVITY * rise);
  sim.particles.push({ kind: 'rocket', x, y: h + 10, px: x, py: h + 10, vx: (rng() - 0.5) * 30 * u, vy, age: 0, life: Infinity, color: pick(opts.palette, rng), size: 2.2 * u, aux: apex });
}

/** Nổ tại (x, y): bốn kiểu (chùm đặc, vòng, liễu rủ, hai vòng). Trả số hạt thật sự thêm. */
export function explode(sim: Sim, x: number, y: number, color: string, w: number, h: number, rng: Rng, opts: SimOptions): number {
  const u = unit(w, h);
  const cap = opts.maxParticles ?? MAX_PARTICLES;
  const room = Math.max(0, cap - sim.particles.length);
  const style = Math.floor(rng() * 4);
  const base = 34 + 14 * opts.intensity;
  const count = Math.min(room, style === 3 ? base * 2 : base);
  const second = pick(opts.palette, rng);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.1;
    let speed: number;
    let life: number;
    let c = color;
    if (style === 0) {
      speed = (50 + 150 * rng()) * u; // chùm đặc
      life = 1.0 + 0.8 * rng();
    } else if (style === 1) {
      speed = 150 * u; // vòng đều
      life = 1.2 + 0.4 * rng();
    } else if (style === 2) {
      speed = (40 + 110 * rng()) * u; // liễu rủ: vàng, sống lâu, rơi chậm
      life = 2.0 + 1.0 * rng();
      c = '#f6c343';
    } else {
      speed = (i % 2 === 0 ? 150 : 85) * u; // hai vòng
      life = 1.2 + 0.5 * rng();
      if (i % 2 === 1) c = second;
    }
    sim.particles.push({ kind: 'spark', x, y, px: x, py: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, age: 0, life, color: c, size: (1.4 + 1.2 * rng()) * u, aux: style });
  }
  sim.bursts++;
  return count;
}

/** Một bước mô phỏng `dt` giây trên khung w x h. Sửa `sim` tại chỗ. */
export function stepSim(sim: Sim, dt: number, w: number, h: number, rng: Rng, opts: SimOptions): void {
  if (!(dt > 0) || !(w > 0) || !(h > 0)) return;
  const d = Math.min(dt, MAX_DT);
  const cap = opts.maxParticles ?? MAX_PARTICLES;
  sim.clock += d;
  const rate = [0, 1.15, 0.8, 0.5][opts.intensity]!;
  if (opts.launching !== false && sim.clock >= sim.nextLaunch) {
    if (sim.particles.length < cap - 80) launch(sim, w, h, rng, opts);
    sim.nextLaunch = sim.clock + rate * (0.55 + 0.9 * rng());
  }
  if (opts.confetti !== false && sim.clock >= sim.nextConfetti) {
    const u = unit(w, h);
    if (sim.particles.length < cap) {
      sim.particles.push({ kind: 'confetti', x: rng() * w, y: -10, px: 0, py: 0, vx: 0, vy: (50 + 70 * rng()) * u, age: 0, life: 12, color: pick(opts.palette, rng), size: (4 + 4 * rng()) * u, aux: rng() * 6.28 });
    }
    sim.nextConfetti = sim.clock + 0.11 / opts.intensity;
  }
  const booms: Particle[] = [];
  const alive: Particle[] = [];
  for (const p of sim.particles) {
    p.px = p.x;
    p.py = p.y;
    p.age += d;
    if (p.kind === 'rocket') {
      p.vy += GRAVITY * d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      if (p.y <= p.aux || p.vy >= -20) {
        booms.push(p);
        continue;
      }
      alive.push(p);
    } else if (p.kind === 'spark') {
      const drag = p.aux === 2 ? 1.6 : 1.1;
      p.vx *= Math.max(0, 1 - drag * d);
      p.vy = p.vy * Math.max(0, 1 - drag * d) + GRAVITY * (p.aux === 2 ? 0.28 : 0.2) * d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      if (p.age < p.life) alive.push(p);
    } else {
      p.x += Math.sin(p.age * 2 + p.aux) * 26 * d;
      p.y += p.vy * d;
      if (p.y < h + 20 && p.age < p.life) alive.push(p);
    }
  }
  sim.particles = alive;
  for (const b of booms) explode(sim, b.x, b.y, b.color, w, h, rng, opts);
}
