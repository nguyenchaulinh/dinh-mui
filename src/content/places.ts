/**
 * Địa điểm công cộng có thật trong game (chỉ Hà Nội). Địa chỉ đã đối chiếu nhiều nguồn du lịch (không phải nguồn chính thức:
 * xem docs/11 mục 4); không ghi phường / quận vì đơn vị hành chính đã đổi từ 1/7/2025. Cơ sở tư nhân (sạp, quán, công ty,
 * trường) là hư cấu, chỉ gắn tên đường nổi tiếng, không gắn số nhà thật.
 */
export interface Place {
  name: string;
  /** `số nhà + đường` hoặc tên phố (chưa xác minh số nhà thì chỉ ghi tên phố). */
  address: string;
}

export const GA_HA_NOI: Place = { name: 'Ga Hà Nội', address: '120 Lê Duẩn' };
export const PHO_HANG_MA: Place = { name: 'Phố Hàng Mã', address: 'phố Hàng Mã' };

/** Thành phố khác không được xuất hiện trong nội dung (game chỉ ở Hà Nội); dùng cho test canh. */
export const OTHER_CITIES: readonly string[] = ['Đà Nẵng', 'Sài Gòn', 'Hồ Chí Minh', 'TP.HCM', 'TPHCM', 'Huế', 'Cần Thơ', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu'];
