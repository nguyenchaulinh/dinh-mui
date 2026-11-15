/**
 * Chữ trên đồ họa treo tường của lớp học / văn phòng (băng rôn, câu đối, bảng, lịch, thời khóa biểu). Dữ liệu thuần để
 * test được; `office-decor.tsx` vẽ thành texture. Chỉ chữ chung chung, không tên người, không logo, không số liệu thật.
 */

export interface DecorLine {
  text: string;
  size: number;
  color: string;
  weight?: 'normal' | 'bold';
}

import { GA_HA_NOI, PHO_HANG_MA } from '../content/places';

/** Biển cổng ga (vuông góc phố) và biển sạp quà: tên địa điểm + địa chỉ, lấy từ `content/places.ts`. */
export const STATION_SIGN: readonly DecorLine[] = [
  { text: GA_HA_NOI.name.toUpperCase(), size: 118, color: '#fef3c7' },
  { text: GA_HA_NOI.address, size: 74, color: '#bae6fd', weight: 'normal' },
];
export const STALL_SIGN: readonly DecorLine[] = [{ text: `SẠP TẾT ${PHO_HANG_MA.name.replace('Phố ', '').toUpperCase()}`, size: 100, color: '#fde68a' }];

export const BANNER: readonly DecorLine[] = [{ text: 'CHÚC MỪNG NĂM MỚI · TẾT ĐINH MÙI', size: 130, color: '#fde68a' }];

/** Hai vế câu đối đỏ dán hai bên bảng, mỗi dòng một chữ / cụm. */
export const COUPLET_LEFT: readonly DecorLine[] = ['VẠN', 'SỰ', 'NHƯ', 'Ý'].map((text) => ({ text, size: 78, color: '#fde68a' }));
export const COUPLET_RIGHT: readonly DecorLine[] = ['TỶ', 'ĐIỀU', 'AN', 'VUI'].map((text) => ({ text, size: 78, color: '#fde68a' }));

export const BOARD_TEXT: Readonly<Record<'van-phong' | 'lop-hoc', readonly DecorLine[]>> = {
  'van-phong': [
    { text: 'HÔM NAY LÀM NỐT', size: 54, color: '#1d4ed8' },
    { text: '- Chốt báo cáo cuối năm', size: 36, color: '#111827', weight: 'normal' },
    { text: '- Dọn bàn, tắt máy', size: 36, color: '#111827', weight: 'normal' },
    { text: 'MAI NGHỈ TẾT!', size: 54, color: '#dc2626' },
  ],
  'lop-hoc': [
    { text: 'Chúc mừng năm mới', size: 58, color: '#f8fafc' },
    { text: 'Ngày mai nghỉ Tết', size: 44, color: '#fde68a' },
    { text: '+ - x : = 2027', size: 38, color: '#bae6fd', weight: 'normal' },
  ],
};

export const SCHOOL_MOTTO: readonly DecorLine[] = [{ text: 'TIÊN HỌC LỄ, HẬU HỌC VĂN', size: 110, color: '#7c2d12' }];
export const OFFICE_MOTTO: readonly DecorLine[] = [{ text: 'LÀM VIỆC HẾT MÌNH · NGHỈ TẾT HẾT CỠ', size: 100, color: '#1e3a8a' }];

export const CALENDAR: readonly DecorLine[] = [
  { text: 'TẾT ĐINH MÙI', size: 40, color: '#b91c1c' },
  { text: '28', size: 150, color: '#b91c1c' },
  { text: 'tháng Chạp', size: 46, color: '#44403c', weight: 'normal' },
];

export const SCHEDULE_TITLE: readonly DecorLine[] = [{ text: 'THỜI KHÓA BIỂU', size: 90, color: '#7c2d12' }];

/** Tất cả các dòng chữ (để test độ dài, màu, không rỗng). */
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
  ...STATION_SIGN,
  ...STALL_SIGN,
];
