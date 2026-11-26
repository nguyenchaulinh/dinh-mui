import { useEffect, useRef } from 'react';
import { createSim, stepSim, type Particle } from './fireworkSim';

/** Người dùng đã chọn giảm chuyển động (hệ điều hành): không chạy pháo hoa. */
export const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function drawParticle(g: CanvasRenderingContext2D, p: Particle): void {
  if (p.kind === 'confetti') {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.age * 3 + p.aux);
    g.fillStyle = p.color;
    g.globalAlpha = 0.95;
    g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    g.restore();
    return;
  }
  const fade = p.kind === 'rocket' ? 1 : Math.max(0, 1 - p.age / p.life) ** 1.3;
  g.globalAlpha = fade;
  g.strokeStyle = p.color;
  g.lineWidth = p.size;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(p.px, p.py);
  g.lineTo(p.x, p.y);
  g.stroke();
  if (p.kind === 'spark') {
    g.fillStyle = '#fffbea';
    g.globalAlpha = fade * 0.8;
    g.beginPath();
    g.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * Canvas pháo hoa và giấy hoa rơi phủ toàn màn hình (không bắt chuột), nằm sau thẻ kết thúc. Dừng khi tab ẩn, dọn khi gỡ.
 * Màn hình thấp (điện thoại) giới hạn số hạt và độ phân giải để không tụt FPS.
 */
export function Fireworks({ intensity, palette, confetti = true }: Readonly<{ intensity: 1 | 2 | 3; palette: readonly string[]; confetti?: boolean }>) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext('2d');
    if (!cv || !g || prefersReducedMotion()) return undefined;
    const sim = createSim();
    let small = false;
    let dpr = 1;
    let w = 0;
    let h = 0;
    // Tính lại khi đổi cỡ / xoay màn hình: độ phân giải và trần số hạt theo màn hình hiện tại.
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      small = Math.min(w, h) < 600;
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!document.hidden) {
        stepSim(sim, dt, w, h, Math.random, { intensity, palette, confetti, maxParticles: small ? 380 : 700 });
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        g.globalCompositeOperation = 'lighter';
        for (const p of sim.particles) if (p.kind !== 'confetti') drawParticle(g, p);
        g.globalCompositeOperation = 'source-over';
        for (const p of sim.particles) if (p.kind === 'confetti') drawParticle(g, p);
        g.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, palette, confetti]);
  return <canvas ref={ref} className="fireworks" aria-hidden="true" />;
}
