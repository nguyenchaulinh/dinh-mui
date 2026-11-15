import type { Look } from '../engine/types';
import type { Fit, PropPart } from './outfit';
import type { Shape } from './shapes';

/**
 * Kiểu tóc theo `look.hairStyle`. Tóc GỐC của model (mesh có vật liệu Hair, đổi màu theo `look.hair`) ôm đầu tự nhiên hơn
 * mọi khối ta dựng thêm (hai lần dựng mũ ellipsoid đều ra cái bát úp, xem docs/11), nên giữ nguyên:
 * - 'short', 'long': tóc gốc của model, chỉ đổi màu.
 * - 'bun': tóc gốc cộng một búi tròn gắn vào xương Head ở sau đỉnh đầu (chồng lên tóc gốc).
 * - 'bald': ẩn tóc gốc (Rigged.tsx), không thêm khối nào.
 * Toạ độ tuyệt đối trong tư thế gốc như phụ kiện đầu, mặt hướng +z.
 */

export type HairStyle = NonNullable<Look['hairStyle']>;

export const HAIR_STYLES: readonly HairStyle[] = ['short', 'bun', 'long', 'bald'];

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_HAIR = '#2b1d15';

/** Tóc gốc có bị ẩn không (chỉ khi trọc). */
export const hidesOriginalHair = (style: HairStyle | undefined): boolean => style === 'bald';

/** Bán kính búi tóc (m). */
export const BUN_RADIUS = 0.065;

/** Khối tóc THÊM vào tóc gốc (rỗng nếu kiểu đó chỉ dùng tóc gốc). */
export function hairShapes(style: HairStyle, fit: Fit, color?: string): Shape[] {
  if (style !== 'bun') return [];
  const c = color !== undefined && HEX.test(color) ? color : DEFAULT_HAIR;
  // Búi nằm sau đỉnh đầu, một nửa chìm trong tóc gốc để không lơ lửng.
  return [{ g: 'sphere', s: [BUN_RADIUS, 10, 8], p: [0, fit.sTop - 0.005, fit.sZb + 0.015], c }];
}

/** Khối tóc thêm như một phần gắn xương Head (để đưa chung vào `attachProps` với phụ kiện). */
export function hairParts(style: HairStyle, fit: Fit, color?: string): PropPart[] {
  const shapes = hairShapes(style, fit, color);
  return shapes.length === 0 ? [] : [{ anchor: 'head', frame: 'bind', shapes }];
}
