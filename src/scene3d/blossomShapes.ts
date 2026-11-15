import { rnd } from './rand';
import type { Shape } from './shapes';

/**
 * Hình khối của chậu đào / mai / quất (hàm thuần): chậu có viền và ruy băng, thân, cành, hoa hoặc quả. Gộp thành MỘT
 * geometry (mergeShapes) nên mỗi cây là một draw call thay vì ~40. Toạ độ cục bộ, chân chậu ở y = 0.
 */

export type Blossom = 'dao' | 'mai' | 'quat';

export const BLOSSOM_COLOR: Readonly<Record<Blossom, string>> = { dao: '#f472b6', mai: '#facc15', quat: '#f97316' };

/** Bán kính miệng chậu (m): vòng va chạm của cây trong sân nhà phải phủ ít nhất cỡ này (test walk.test.ts). */
export const BLOSSOM_POT_R = 0.18;
/** Quả cầu tán đặc của quất: tâm y và bán kính (m); vòng va chạm phủ nó vì chạm độ cao người (test walk.test.ts). */
export const QUAT_BALL = { y: 1.0, r: 0.42 } as const;

type V3 = [number, number, number];

export function blossomShapes(kind: Blossom): Shape[] {
  const out: Shape[] = [
    { g: 'cyl', s: [BLOSSOM_POT_R, 0.14, 0.24, 8], p: [0, 0.12, 0], c: '#92400e' }, // chậu
    { g: 'cyl', s: [0.025, 0.04, 0.6, 5], p: [0, 0.5, 0], c: '#57361f' }, // thân
    { g: 'cyl', s: [0.17, 0.17, 0.02, 8], p: [0, 0.235, 0], c: '#3b2a1d' }, // đất
    { g: 'torus', s: [0.178, 0.02, 4, 10], p: [0, 0.235, 0], r: [Math.PI / 2, 0, 0], c: '#7c2d12' }, // viền miệng chậu
    { g: 'torus', s: [0.165, 0.014, 4, 10], p: [0, 0.12, 0], r: [Math.PI / 2, 0, 0], c: '#dc2626' }, // ruy băng đỏ
  ];
  if (kind === 'quat') {
    out.push({ g: 'ico', s: [QUAT_BALL.r, 0], p: [0, QUAT_BALL.y, 0], c: '#15803d' });
    // Quả quất rải trên mặt quả cầu tán, đẩy ra 0.02 để nằm trên lá.
    for (let i = 0; i < 18; i++) {
      const th = Math.acos(1 - 2 * rnd(i + 200)) * 0.85;
      const ph = rnd(i + 260) * Math.PI * 2;
      const r = QUAT_BALL.r + 0.02;
      out.push({ g: 'ico', s: [0.045, 0], p: [Math.sin(th) * Math.cos(ph) * r, QUAT_BALL.y + Math.cos(th) * r, Math.sin(th) * Math.sin(ph) * r], c: '#f97316' });
    }
    // Mảng lá sáng hơn phá hình cầu.
    const leaves: V3[] = [[0.26, 1.12, 0.1], [-0.2, 0.88, 0.2], [0.05, 1.28, -0.18], [-0.22, 1.12, -0.18]];
    leaves.forEach((p, i) => out.push({ g: 'ico', s: [0.17, 0], p, c: i % 2 ? '#2f9e44' : '#22863a' }));
  } else {
    // Đào / mai: năm cành mảnh toả ra từ thân, lộc non ở đầu cành.
    for (let i = 0; i < 5; i++) {
      const yaw = (i / 5) * Math.PI * 2 + rnd(i + 5);
      const tilt = 0.55 + rnd(i + 17) * 0.45;
      const len = 0.32 + rnd(i + 31) * 0.2;
      const group = { p: [0, 0.62, 0] as V3, r: [0, yaw, tilt] as V3 };
      out.push({ g: 'cyl', s: [0.008, 0.016, len, 4], p: [0, len / 2, 0], c: '#4a2e1a', group });
      out.push({ g: 'ico', s: [0.03, 0], p: [0.012, len, 0], k: [1, 0.6, 1], c: '#4d9a3d', group });
    }
  }
  // Hoa (đào, mai) hoặc nụ (quất) rải quanh thân.
  const n = kind === 'quat' ? 14 : 22;
  for (let i = 0; i < n; i++) {
    const a = rnd(i) * Math.PI * 2;
    const r = 0.15 + rnd(i + 50) * 0.35;
    out.push({ g: 'ico', s: [kind === 'quat' ? 0.06 : 0.055, 0], p: [Math.cos(a) * r, 0.75 + rnd(i + 99) * 0.55, Math.sin(a) * r], c: BLOSSOM_COLOR[kind] });
  }
  return out;
}
