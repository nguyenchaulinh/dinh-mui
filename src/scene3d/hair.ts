import type { Look } from '../engine/types';
import type { Fit, PropPart } from './outfit';
import type { Shape } from './shapes';

/**
 * Bộ tóc riêng (hàm thuần): mỗi model có xương chỉ có một kiểu tóc cố định nên `look.hairStyle` bị bỏ qua. Ta ẩn tóc gốc
 * của model và gắn khối tóc vào xương Head (cùng cách với phụ kiện, xem outfit.ts).
 *
 * Tóc ÔM THEO SỌ (số đo `sTop`, `sHW`, `sZb`, `sZf` của `Fit`, lấy từ phần da của mesh chứ không từ tóc gốc, nếu không mũ
 * tóc sẽ nổi lên như cái bát úp): hai nửa ellipsoid cùng tâm.
 * - Mũ trên: phủ đỉnh sọ, đường chân tóc ngay trên lông mày; đỉnh cao hơn sọ tối đa 4 cm và không quá đỉnh tóc gốc (`hy1`), nên
 *   nón, mũ đặt lên (tính theo `hy1`) lệch tối đa ~1.5 cm.
 * - Tóc sau và hai bên: thấp hơn, tới ngang mắt, chừa một nêm phía mặt.
 * Toạ độ tuyệt đối trong tư thế gốc như phụ kiện đầu, mặt hướng +z. 'bald' không có khối nào (chỉ ẩn tóc gốc).
 */

export type HairStyle = NonNullable<Look['hairStyle']>;

export const HAIR_STYLES: readonly HairStyle[] = ['short', 'bun', 'long', 'bald'];

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_HAIR = '#2b1d15';

/** Nửa góc (rad) của nêm phía mặt không có tóc sau/bên: bề ngang ở độ cao mắt khoảng ±6 cm, đủ chừa gò má và thái dương. */
const FACE_WEDGE = 0.5;
/** Độ dày tối đa của tóc trên đỉnh sọ (m): tóc gốc của vài model dày tới 5 cm, nhìn phồng như mũ. */
const MAX_HAIR_THICKNESS = 0.04;
/** Độ dày tóc (m) phía trên lông mày: đường chân tóc cách đỉnh lông mày chừng này. */
const HAIRLINE_ABOVE_BROW = 0.03;

export interface HairShell {
  /** Tâm ellipsoid (y, z), bán kính theo x, y, z. */
  cy: number;
  cz: number;
  rx: number;
  ry: number;
  rz: number;
  /** Góc cực (rad, từ đỉnh xuống) của mép dưới mũ trên và của phần sau/bên. */
  thetaTop: number;
  thetaBack: number;
}

const clampCos = (v: number): number => Math.min(1, Math.max(-1, v));

/** Hình học vỏ tóc theo số đo đầu. Tách ra để test được. */
export function hairShell(fit: Fit): HairShell {
  const cy = fit.sTop - 0.075;
  const top = Math.min(fit.hy1, fit.sTop + MAX_HAIR_THICKNESS); // không dày hơn tóc gốc, cũng không quá 4 cm
  const ry = top - cy;
  const rx = fit.sHW + 0.02;
  const rz = (fit.sZf - fit.sZb) / 2 + 0.012;
  const cz = (fit.sZf + fit.sZb) / 2 - 0.012;
  return {
    cy,
    cz,
    rx,
    ry,
    rz,
    thetaTop: Math.acos(clampCos((fit.browTop + HAIRLINE_ABOVE_BROW - cy) / ry)),
    thetaBack: Math.acos(clampCos((fit.eyeY - cy) / ry)),
  };
}

export function hairShapes(style: HairStyle, fit: Fit, color?: string): Shape[] {
  if (style === 'bald') return [];
  const c = color !== undefined && HEX.test(color) ? color : DEFAULT_HAIR;
  const h = hairShell(fit);
  const k: [number, number, number] = [h.rx, h.ry, h.rz];
  const out: Shape[] = [
    // Mũ trên: ellipsoid đơn vị co theo (rx, ry, rz), chỉ nửa trên tới đường chân tóc.
    { g: 'sphere', s: [1, 12, 8, 0, Math.PI * 2, 0, h.thetaTop], p: [0, h.cy, h.cz], k, c },
    // Tóc sau và hai bên: thấp tới ngang mắt, bỏ nêm phía mặt (phi = PI/2 là hướng +z, mặt).
    { g: 'sphere', s: [1, 12, 8, Math.PI / 2 + FACE_WEDGE, Math.PI * 2 - FACE_WEDGE * 2, 0, h.thetaBack], p: [0, h.cy, h.cz], k, c },
  ];
  if (style === 'bun') out.push({ g: 'sphere', s: [0.07, 8, 6], p: [0, fit.hy1 - 0.005, h.cz - h.rz * 0.75], c });
  if (style === 'long') {
    const top = fit.eyeY;
    const bottom = Math.max(fit.hy0 - 0.02, 1.5);
    const len = top - bottom;
    out.push({ g: 'box', s: [h.rx * 2 + 0.01, len, 0.07], p: [0, (top + bottom) / 2, h.cz - h.rz - 0.01], c });
    for (const s of [-1, 1]) out.push({ g: 'box', s: [0.045, len * 0.85, 0.1], p: [s * (h.rx + 0.004), (top + bottom) / 2 + len * 0.05, h.cz - 0.03], c });
  }
  return out;
}

/** Tóc như một phần gắn xương Head (để đưa chung vào `attachProps` với phụ kiện). Rỗng nếu trọc. */
export function hairParts(style: HairStyle, fit: Fit, color?: string): PropPart[] {
  const shapes = hairShapes(style, fit, color);
  return shapes.length === 0 ? [] : [{ anchor: 'head', frame: 'bind', shapes }];
}
