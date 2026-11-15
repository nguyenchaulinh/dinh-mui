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
