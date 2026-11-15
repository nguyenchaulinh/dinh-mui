import { Euler, Quaternion, Vector3 } from 'three';
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

// ---------- Cột điện và dây điện chằng chịt ----------

type V3 = readonly [number, number, number];

/** Một đoạn dây (hình trụ mảnh) từ a tới b, toạ độ thế giới. */
export function wireSegment(a: V3, b: V3, c = '#1f2937', r = 0.012): Shape {
  const d = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), len > 1e-9 ? d.clone().divideScalar(len) : new Vector3(0, 1, 0));
  const e = new Euler().setFromQuaternion(q, 'XYZ');
  return { g: 'cyl', s: [r, r, len, 3], p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: [e.x, e.y, e.z], c };
}

/** Dây võng giữa a và b (đường cong parabol, độ võng `sag` ở giữa), chia `n` đoạn. */
export function sagWire(a: V3, b: V3, sag: number, n = 6, c = '#1f2937', r = 0.012): Shape[] {
  const at = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  return Array.from({ length: n }, (_, i) => wireSegment(at(i / n), at((i + 1) / n), c, r));
}

/** Cột điện trên vỉa hè xa (người chơi không tới): vị trí x, z, độ cao đỉnh cột và độ cao hai xà ngang. */
export const UTILITY_POLES = { xs: [-15, -5.1, 5.7, 15], z: 4.7, top: 6.4, arms: [6.1, 5.6] } as const;
/** Mặt nhà phố phía bắc nơi dây neo vào: z của mặt tiền và độ cao các sợi (trên đầu camera ~4.4 m). */
export const WIRE_FACADE = { z: -3.7, ys: [5.5, 5.75, 6.0] } as const;

/**
 * Cột điện bê tông có hai xà ngang, hộp biến áp, và các bó dây: dây dọc phố nối cột này sang cột khác (ba sợi, võng nhẹ),
 * dây ngang đường neo vào mặt tiền nhà phía bắc (thấp hơn nếu nhà thấp, `houseTop` cho độ cao đỉnh nhà tại x). Dây ngang đường cao hơn 5.3 m nên nằm trên tầm camera phố (mắt ~4.4 m) và đầu người.
 */
export function powerLineShapes(houseTop: (x: number) => number = () => Infinity): Shape[] {
  const P = UTILITY_POLES;
  const out: Shape[] = [];
  P.xs.forEach((x, i) => {
    out.push({ g: 'cyl', s: [0.08, 0.12, P.top, 6], p: [x, P.top / 2, P.z], c: '#a8a29e' });
    for (const y of P.arms) out.push({ g: 'box', s: [0.06, 0.06, 1.5], p: [x, y, P.z], c: '#57534e' });
    if (i % 2 === 1) out.push({ g: 'cyl', s: [0.22, 0.22, 0.6, 8], p: [x, P.arms[1] - 0.55, P.z - 0.28], c: '#6b7280' }); // biến áp
    // dây ngang đường: ba sợi từ đầu xà ngang sang ba độ cao trên mặt tiền
    [-0.7, 0, 0.7].forEach((dz, k) => {
      const a: V3 = [x, P.arms[k % 2]!, P.z + dz];
      const bx = x + (k - 1) * 0.5;
      const b: V3 = [bx, Math.min(WIRE_FACADE.ys[k]!, houseTop(bx) - 0.15), WIRE_FACADE.z]; // không neo lơ lửng trên nhà thấp
      out.push(...sagWire(a, b, 0.45 + k * 0.1, 8));
    });
    // dây dọc phố tới cột kế tiếp
    const next = P.xs[i + 1];
    if (next !== undefined) {
      for (const [k, dz] of [-0.7, 0, 0.7].entries()) out.push(...sagWire([x, P.arms[k % 2]!, P.z + dz], [next, P.arms[k % 2]!, P.z + dz], 0.4 + k * 0.08, 8));
    }
  });
  return out;
}
