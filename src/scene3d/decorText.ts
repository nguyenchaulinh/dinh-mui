import { GA_HA_NOI, PHO_HANG_MA } from '../content/places';
import type { LabelLine } from './textures';

/**
 * Chữ trên đồ họa treo tường và biển hiệu (băng rôn, câu đối, bảng, lịch, áp phích, biển cửa hàng, băng rôn phố). Dữ liệu
 * thuần để test được; `TextPlane` vẽ thành texture bằng các phông ở public/fonts.
 *
 * Phong cách theo xu hướng thiết kế 2026 (docs/11 mục 6): chữ như đồ họa (poster đậm), serif đậm kiểu retro, chữ cọ cho
 * lời chúc, màu đỏ vàng làm chủ đạo (đỏ nền, vàng chữ, nhấn kem / trắng), nhãn dán viền dày, hạt nhám. Lời văn là GỐC, giọng
 * Gen Z vui vẻ chơi chữ ("Dê" của năm Đinh Mùi, "gieo quẻ", ưu đãi giả): không dùng tên, logo hay khẩu hiệu thương hiệu
 * có thật. Mọi thứ gắn với Hà Nội.
 */

export type DecorLine = LabelLine;

const RED_DARK = '#7f1d1d';
const CREAM = '#fff7e6';

/** Vàng chuyển sắc, viền đỏ sẫm, bóng mờ: kiểu băng rôn Tết. */
const GOLD = {
  fill: 'gold' as const,
  color: '#f6c343',
  stroke: { color: RED_DARK, w: 0.1 },
  shadow: { color: 'rgba(0,0,0,0.35)', dx: 0.04, dy: 0.06 },
};
/** Kiểu nhãn dán: viền trắng dày, bóng đen lệch. */
const STICKER = { stroke: { color: '#ffffff', w: 0.14 }, shadow: { color: '#111827', dx: 0.05, dy: 0.07 } };

export const BANNER: readonly DecorLine[] = [{ text: 'ĐINH MÙI · DÊ XUÂN PHƠI PHỚI', size: 100, font: 'slab', ...GOLD }];

/** Hai vế câu đối đỏ dán hai bên bảng, mỗi dòng một chữ / cụm. */
export const COUPLET_LEFT: readonly DecorLine[] = ['VẠN', 'SỰ', 'NHƯ', 'Ý'].map((text) => ({ text, size: 78, font: 'slab' as const, ...GOLD }));
export const COUPLET_RIGHT: readonly DecorLine[] = ['TỶ', 'ĐIỀU', 'AN', 'VUI'].map((text) => ({ text, size: 78, font: 'slab' as const, ...GOLD }));

export const BOARD_TEXT: Readonly<Record<'van-phong' | 'lop-hoc', readonly DecorLine[]>> = {
  'van-phong': [
    { text: 'HÔM NAY LÀM NỐT', size: 62, font: 'display', color: '#1d4ed8' },
    { text: '- Chốt báo cáo cuối năm', size: 36, font: 'hand', color: '#111827' },
    { text: '- Dọn bàn, tắt máy, tắt thông báo', size: 36, font: 'hand', color: '#111827' },
    { text: 'MAI NGHỈ TẾT!', size: 62, font: 'display', color: '#dc2626' },
  ],
  'lop-hoc': [
    { text: 'Chúc mừng năm mới!', size: 62, font: 'script', color: '#f8fafc' },
    { text: 'Ngày mai nghỉ Tết, nhớ ôn bài nhé', size: 40, font: 'hand', color: '#fde68a' },
    { text: '1 + 1 = Tết', size: 44, font: 'hand', color: '#bae6fd' },
  ],
};

export const SCHOOL_MOTTO: readonly DecorLine[] = [{ text: 'TIÊN HỌC LỄ, HẬU HỌC VĂN', size: 100, font: 'slab', color: '#7c2d12' }];
export const OFFICE_MOTTO: readonly DecorLine[] = [{ text: 'LÀM HẾT MÌNH · NGHỈ HẾT CỠ', size: 100, font: 'round', color: '#1e3a8a' }];

export const CALENDAR: readonly DecorLine[] = [
  { text: 'TẾT ĐINH MÙI', size: 70, font: 'round', color: '#b91c1c' },
  { text: '28', size: 160, font: 'display', color: '#b91c1c' },
  { text: 'tháng Chạp', size: 60, font: 'hand', color: '#44403c' },
];

export const SCHEDULE_TITLE: readonly DecorLine[] = [{ text: 'THỜI KHÓA BIỂU', size: 90, font: 'slab', color: '#7c2d12' }];
/** Ba vạch giả làm các dòng thời khóa biểu (nền kem). */
export const SCHEDULE_ROWS: readonly DecorLine[] = [
  { text: 'Thứ 2 · Toán · Văn', size: 40, font: 'hand', color: '#b45309' },
  { text: 'Thứ 3 · Anh · Sử', size: 40, font: 'hand', color: '#2563eb' },
  { text: 'Thứ 4 · Nghỉ Tết!', size: 40, font: 'hand', color: '#16a34a' },
];

/** Áp phích "ưu đãi" giả ở tường phải (nền đỏ, hạt nhám): nhái giọng khuyến mãi bằng chuyện họ hàng và bài tập. */
export const SALE_POSTER: Readonly<Record<'van-phong' | 'lop-hoc', readonly DecorLine[]>> = {
  'van-phong': [
    { text: 'GIẢM 100%', size: 130, font: 'display', color: '#f6c343', ...STICKER },
    { text: 'CÂU HỎI "BAO GIỜ CƯỚI?"', size: 50, font: 'round', color: CREAM },
    { text: '*né đúng lúc mới được giảm', size: 38, font: 'hand', color: '#fde68a' },
  ],
  'lop-hoc': [
    { text: 'ƯU ĐÃI TẾT', size: 130, font: 'display', color: '#f6c343', ...STICKER },
    { text: 'NGHỈ 7 NGÀY, MIỄN PHÍ', size: 50, font: 'round', color: CREAM },
    { text: '*áp dụng khi nộp hết bài tập', size: 38, font: 'hand', color: '#fde68a' },
  ],
};

/** Biển cổng ga (vuông góc phố) và biển sạp quà: tên địa điểm + địa chỉ, lấy từ `content/places.ts`. */
export const STATION_SIGN: readonly DecorLine[] = [
  { text: GA_HA_NOI.name.toUpperCase(), size: 118, font: 'display', color: '#fef3c7', stroke: { color: '#0f172a', w: 0.08 } },
  { text: GA_HA_NOI.address, size: 70, font: 'round', color: '#bae6fd' },
];
export const STALL_SIGN: readonly DecorLine[] = [{ text: `SẠP TẾT ${PHO_HANG_MA.name.replace('Phố ', '').toUpperCase()}`, size: 100, font: 'slab', ...GOLD }];

/** Ba băng rôn treo trên mặt tiền phố Hàng Mã. */
export const STREET_BANNERS: readonly { bg: string; lines: readonly DecorLine[] }[] = [
  { bg: '#b91c1c', lines: [{ text: 'TẾT SUM VẦY · XUÂN AN KHANG', size: 100, font: 'slab', ...GOLD }] },
  {
    bg: CREAM,
    lines: [
      { text: 'Gieo quẻ đầu năm', size: 90, font: 'script', color: '#b91c1c' },
      { text: 'QUẺ NÀY MIỄN PHÍ', size: 60, font: 'round', color: '#1f2937' },
      { text: '(né câu hỏi họ hàng thì quẻ mới linh)', size: 36, font: 'hand', color: '#57534e' },
    ],
  },
  { bg: '#be185d', lines: [{ text: 'ĐÀO NHẬT TÂN · BUNG ĐÚNG MÙNG 1', size: 100, font: 'display', color: '#fff1f2', stroke: { color: '#831843', w: 0.1 } }] },
];

/** Tên cửa hàng hư cấu trên biển hiệu nhà phố (xoay vòng theo thứ tự nhà). Chữ trắng viền đậm để đọc được trên mọi màu biển. */
const SHOP_NAMES: readonly { text: string; font: 'slab' | 'round' | 'script' | 'display' }[] = [
  { text: 'TIỆM BÁNH MÙI', font: 'slab' },
  { text: 'TRÀ TẾT 28', font: 'round' },
  { text: 'Hoa Đào Hàng Mã', font: 'script' },
  { text: 'ĐÈN LỒNG NHÀ BA', font: 'display' },
  { text: 'MỨT TẾT CÔ HAI', font: 'round' },
  { text: 'QUÀ TẾT ĐINH MÙI', font: 'slab' },
  { text: 'PHỞ GÁNH CHIỀU 28', font: 'round' },
  { text: 'Lì Xì Đỏ Hàng Mã', font: 'script' },
];

export function shopSign(i: number): readonly DecorLine[] {
  const s = SHOP_NAMES[((i % SHOP_NAMES.length) + SHOP_NAMES.length) % SHOP_NAMES.length]!;
  return [{ text: s.text, size: 100, font: s.font, color: '#ffffff', stroke: { color: 'rgba(15,23,42,0.85)', w: 0.12 } }];
}

export const SHOP_SIGN_COUNT = SHOP_NAMES.length;

/** Tất cả các dòng chữ (để test độ dài, màu, phông, không rỗng). */
export const ALL_DECOR: readonly DecorLine[] = [
  ...BANNER,
  ...COUPLET_LEFT,
  ...COUPLET_RIGHT,
  ...BOARD_TEXT['van-phong'],
  ...BOARD_TEXT['lop-hoc'],
  ...SCHOOL_MOTTO,
  ...OFFICE_MOTTO,
  ...CALENDAR,
  ...SCHEDULE_TITLE,
  ...SCHEDULE_ROWS,
  ...SALE_POSTER['van-phong'],
  ...SALE_POSTER['lop-hoc'],
  ...STATION_SIGN,
  ...STALL_SIGN,
  ...STREET_BANNERS.flatMap((b) => b.lines),
  ...Array.from({ length: SHOP_SIGN_COUNT }, (_, i) => shopSign(i)).flat(),
];
