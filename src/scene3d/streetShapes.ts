import type { Shape } from './shapes';

/** Hình khối đồ phố gộp một mesh (hàm thuần): dây cờ Tết căng ngang đường và vạch qua đường. */

const FLAG_COLORS = ['#dc2626', '#facc15', '#f97316'] as const;

/** Dây cờ từ (x, y0, z0) tới (x, y1, z1): sợi dây và `flags` lá cờ tam giác treo dưới dây. Toạ độ thế giới. */
export function buntingShapes({ x, y0, y1, z0, z1, flags = 10 }: { x: number; y0: number; y1: number; z0: number; z1: number; flags?: number }): Shape[] {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz);
  const out: Shape[] = [{ g: 'cyl', s: [0.012, 0.012, len, 3], p: [x, (y0 + y1) / 2, (z0 + z1) / 2], r: [Math.atan2(dz, dy), 0, 0], c: '#6b7280' }];
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    out.push({ g: 'cone', s: [0.11, 0.24, 3], p: [x, y0 + dy * t - 0.14, z0 + dz * t], r: [0, 0, Math.PI], c: FLAG_COLORS[i % FLAG_COLORS.length]! });
  }
  return out;
}

/** Vạch qua đường: 7 vạch song song trục z, trên lòng đường z -1.8..2.2, đầu tiên ở x. */
export function crosswalkShapes(x: number): Shape[] {
  return Array.from({ length: 7 }, (_, i): Shape => ({ g: 'plane', s: [0.45, 3.5], p: [x + i * 0.85, 0.025, 0.2], r: [-Math.PI / 2, 0, 0], c: '#f8fafc' }));
}

/** Hai nhóm khối của một đồ dựng tay: `solid` chịu ánh sáng, `lit` phát sáng (biển, bao lì xì). */
export interface LitShapes {
  solid: Shape[];
  lit: Shape[];
}

/**
 * Sạp quà Tết (toạ độ cục bộ, gốc ở tâm quầy trên mặt vỉa hè): quầy đỏ, mái che, cột, giỏ quà, bao lì xì, biển. Quầy 2.6 x 0.8
 * khớp PHO_TET.stall (hw 1.3, hd 0.4); mái ở độ cao >= 2.3 m nên đi qua bên dưới. Đèn lồng là thành phần riêng (có chuyển động).
 */
export function stallShapes(): LitShapes {
  const solid: Shape[] = [
    { g: 'box', s: [2.6, 0.9, 0.8], p: [0, 0.45, 0], c: '#b91c1c' },
    { g: 'box', s: [2.7, 0.06, 0.9], p: [0, 0.93, 0], c: '#fde68a' },
    { g: 'box', s: [3.0, 0.08, 1.4], p: [0, 2.55, 0.1], r: [0.18, 0, 0], c: '#dc2626' },
    { g: 'box', s: [3.0, 0.14, 0.04], p: [0, 2.35, 0.78], c: '#facc15' },
  ];
  const lit: Shape[] = [
    { g: 'box', s: [1.6, 0.35, 0.05], p: [0, 2.05, 0.35], c: '#facc15' }, // biển
    { g: 'box', s: [0.16, 0.1, 0.24], p: [1.15, 1.02, 0.3], c: '#dc2626' }, // xấp bao lì xì
  ];
  for (const x of [-1.25, 1.25]) solid.push({ g: 'cyl', s: [0.05, 0.05, 2.5, 5], p: [x, 1.25, 0.3], c: '#78350f' });
  const gifts: [number, string][] = [[-0.95, '#16a34a'], [-0.35, '#2563eb'], [0.25, '#9333ea'], [0.85, '#f59e0b']];
  for (const [x, c] of gifts) {
    solid.push({ g: 'box', s: [0.42, 0.28, 0.34], p: [x, 1.1, 0.05], c }, { g: 'box', s: [0.46, 0.06, 0.06], p: [x, 1.27, 0.05], c: '#fef3c7' });
    lit.push({ g: 'ico', s: [0.07, 0], p: [x, 1.32, 0.05], c: '#dc2626' });
  }
  return { solid, lit };
}

/**
 * Trạm chờ ở cuối phố (gốc ở tâm ghế chờ): hai trụ, mái xanh, ghế gỗ, cột biển. Ghế 1.4 x 0.4 và hai trụ cách nhau 2.2 khớp
 * PHO_TET.bus. Tấm lưng kính trong suốt là một mesh riêng (vật liệu trong suốt không gộp được).
 */
export function busStopShapes(): LitShapes {
  const solid: Shape[] = [
    { g: 'box', s: [2.6, 0.1, 1.3], p: [0, 2.55, 0.15], c: '#1d4ed8' },
    { g: 'box', s: [1.4, 0.08, 0.4], p: [0, 0.45, 0], c: '#92400e' },
    { g: 'cyl', s: [0.04, 0.04, 2.8, 5], p: [-2.0, 1.4, -0.9], c: '#475569' },
    { g: 'box', s: [0.7, 0.12, 0.02], p: [-2.0, 2.6, -0.86], c: '#f8fafc' },
  ];
  for (const x of [-1.1, 1.1]) solid.push({ g: 'cyl', s: [0.07, 0.07, 2.5, 6], p: [x, 1.25, 0.15], c: '#475569' });
  for (const x of [-0.6, 0.6]) solid.push({ g: 'box', s: [0.08, 0.44, 0.36], p: [x, 0.22, 0], c: '#57361f' });
  return { solid, lit: [{ g: 'box', s: [0.9, 0.5, 0.06], p: [-2.0, 2.6, -0.9], c: '#2563eb' }] };
}
