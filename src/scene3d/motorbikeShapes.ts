import type { Shape } from './shapes';

/**
 * Hình khối xe máy (hàm thuần): bánh, thân, yên, ghi đông, chắn bùn, đèn pha / hậu, ống xả, người lái (thân, mũ, kính, chân,
 * tay) và hàng chồng. Gộp thành MỘT geometry theo bộ màu (mergeShapes), nên một xe là một draw call (cộng một cho cây hoa
 * chở trên xe) thay vì ~25. Xe quay mặt về +z, chân bánh ở y = 0.
 */

export interface BikeStyle {
  body: string;
  shirt: string;
  helmet: string;
  /** false: xe đậu, không người lái. */
  rider: boolean;
  /** Ba thùng hàng chồng sau yên (không phải cây hoa: cây hoa là một mesh riêng). */
  box: boolean;
}

export function motorbikeShapes({ body, shirt, helmet, rider, box }: BikeStyle): Shape[] {
  const out: Shape[] = [];
  for (const z of [-0.45, 0.45]) out.push({ g: 'torus', s: [0.18, 0.06, 5, 10], p: [0, 0.22, z], r: [0, Math.PI / 2, 0], c: '#111827' }); // bánh
  out.push(
    { g: 'box', s: [0.24, 0.24, 0.9], p: [0, 0.42, 0], c: body }, // thân
    { g: 'box', s: [0.26, 0.08, 0.5], p: [0, 0.58, -0.12], c: '#1f2937' }, // yên
    { g: 'cyl', s: [0.02, 0.02, 0.5, 4], p: [0, 0.78, 0.42], r: [0, 0, Math.PI / 2], c: '#9ca3af' }, // ghi đông
    { g: 'box', s: [0.13, 0.04, 0.3], p: [0, 0.36, 0.5], c: body }, // chắn bùn trước
    { g: 'sphere', s: [0.065, 6, 4], p: [0, 0.66, 0.5], c: '#fde68a' }, // đèn pha
    { g: 'box', s: [0.1, 0.05, 0.03], p: [0, 0.5, -0.47], c: '#ef4444' }, // đèn hậu
    { g: 'cyl', s: [0.03, 0.035, 0.4, 5], p: [0.13, 0.22, -0.28], r: [Math.PI / 2, 0, 0], c: '#6b7280' }, // ống xả
  );
  if (rider) {
    out.push(
      { g: 'cyl', s: [0.15, 0.19, 0.5, 6], p: [0, 0.9, -0.05], c: shirt }, // thân người
      { g: 'ico', s: [0.2, 1], p: [0, 1.28, -0.02], c: helmet }, // mũ bảo hiểm
      { g: 'box', s: [0.2, 0.07, 0.05], p: [0, 1.29, 0.17], c: '#1e293b' }, // kính mũ
    );
    for (const s of [-1, 1]) {
      out.push(
        { g: 'box', s: [0.09, 0.42, 0.12], p: [s * 0.11, 0.62, 0.06], r: [-0.35, 0, 0], c: '#1f2937' }, // chân
        { g: 'box', s: [0.07, 0.34, 0.07], p: [s * 0.19, 0.98, 0.22], r: [-1.05, 0, s * -0.12], c: shirt }, // tay nắm ghi đông
      );
    }
  }
  if (box) {
    for (let i = 0; i < 3; i++) out.push({ g: 'box', s: [0.5, 0.28, 0.4], p: [0, i * 0.3, 0], r: [0, i * 0.2, 0], c: '#c08457', group: { p: [0, 0.85, -0.55] } });
  }
  return out;
}
