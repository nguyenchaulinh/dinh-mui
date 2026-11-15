import type { Look } from '../engine/types';
import type { Fit, PropPart } from './outfit';
import type { Shape } from './shapes';

/**
 * Bộ tóc riêng (hàm thuần): mỗi model có xương chỉ có một kiểu tóc cố định nên `look.hairStyle` bị bỏ qua. Ta ẩn tóc gốc
 * của model và gắn khối tóc vào xương Head (cùng cách với phụ kiện, xem outfit.ts), theo số đo đầu của model (`Fit`).
 * Tóc là một mũ trùm đỉnh và sau đầu, thêm mái ngố, búi hoặc tóc dài tuỳ kiểu; 'bald' không có khối nào (chỉ ẩn tóc gốc).
 * Toạ độ tuyệt đối trong tư thế gốc như phụ kiện đầu: đầu cao từ hy0 tới hy1, mặt hướng +z.
 */

export type HairStyle = NonNullable<Look['hairStyle']>;

export const HAIR_STYLES: readonly HairStyle[] = ['short', 'bun', 'long', 'bald'];

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_HAIR = '#2b1d15';

export function hairShapes(style: HairStyle, fit: Fit, color?: string): Shape[] {
  if (style === 'bald') return [];
  const c = color !== undefined && HEX.test(color) ? color : DEFAULT_HAIR;
  const { hy1, hhw, hzb, hzf } = fit;
  const hcz = (hzb + hzf) / 2;
  const r = hhw + 0.015;
  // Mũ trùm đỉnh và hai bên tới ngang tai, lệch ra sau một chút để chừa trán.
  const out: Shape[] = [{ g: 'sphere', s: [r, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56], p: [0, hy1 - 0.125, hcz - 0.03], c }];
  // Mái ngố chạm trán.
  out.push({ g: 'box', s: [hhw * 1.7, 0.05, 0.05], p: [0, hy1 - 0.075, hzf - 0.04], r: [0.25, 0, 0], c });
  if (style === 'bun') out.push({ g: 'sphere', s: [0.07, 8, 6], p: [0, hy1 + 0.01, hcz - 0.1], c });
  if (style === 'long') {
    out.push({ g: 'box', s: [hhw * 2 + 0.05, 0.42, 0.07], p: [0, hy1 - 0.2, hzb - 0.005], c });
    for (const s of [-1, 1]) out.push({ g: 'box', s: [0.05, 0.3, 0.1], p: [s * (hhw + 0.012), hy1 - 0.17, hcz - 0.04], c });
  }
  return out;
}

/** Tóc như một phần gắn xương Head (để đưa chung vào `attachProps` với phụ kiện). Rỗng nếu trọc. */
export function hairParts(style: HairStyle, fit: Fit, color?: string): PropPart[] {
  const shapes = hairShapes(style, fit, color);
  return shapes.length === 0 ? [] : [{ anchor: 'head', frame: 'bind', shapes }];
}
