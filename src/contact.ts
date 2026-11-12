const EMAIL = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/;

/**
 * Email liên hệ hiển thị ở chân trang (góp ý, khiếu nại về nhân vật). Đặt lúc build bằng biến môi trường
 * `VITE_CONTACT_EMAIL`; thiếu hoặc sai định dạng thì không hiện (không có giá trị mặc định trong mã nguồn).
 */
export const CONTACT_EMAIL: string | null = (() => {
  const v: unknown = import.meta.env.VITE_CONTACT_EMAIL;
  return typeof v === 'string' && EMAIL.test(v.trim()) ? v.trim() : null;
})();
