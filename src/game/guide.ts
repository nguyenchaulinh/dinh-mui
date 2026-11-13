/**
 * Mũi tên chỉ hướng tới mục tiêu đang nằm ngoài khung nhìn (hàm thuần, không import three/react). Camera bám sau lưng và
 * (nhất là trên điện thoại dọc) chỉ thấy một vùng nhỏ, nên NPC / đồ vật của việc đang cần làm hay ra khỏi khung và người
 * chơi mất phương hướng. Mũi tên nằm trong một vùng chữ nhật ở giữa màn hình để không đè khung chỉ số (trên) và joystick,
 * nút tương tác (dưới).
 */

/** Vùng đặt mũi tên, toạ độ NDC (-1..1, y hướng lên). Trên dừng ở ~38% chiều cao để tránh khung chỉ số và danh sách việc. */
export const GUIDE_ZONE = { left: -0.84, right: 0.84, top: 0.25, bottom: -0.55 } as const;

/** Mục tiêu coi là đang thấy nếu nằm trong khung này (NDC): không cần mũi tên. Hơi lệch xuống vì dock/nút che phần đáy. */
const SEEN = { x: 0.9, top: 0.9, bottom: -0.8 } as const;

export interface GuideArrow {
  /** Vị trí trên màn hình theo tỉ lệ 0..1 (x từ trái, y từ trên). */
  x: number;
  y: number;
  /** Góc xoay mũi tên (rad), theo chiều kim đồng hồ, 0 = hướng lên. */
  angle: number;
}

/**
 * @param ndcX toạ độ NDC ngang của mục tiêu sau phép chiếu; @param ndcY dọc
 * @param behind mục tiêu nằm sau lưng camera (khi đó phép chiếu lật dấu x, y)
 * @param aspect rộng / cao của màn hình (để tính góc theo pixel, vì NDC không đồng đều hai trục)
 * @returns null nếu mục tiêu đang thấy trên màn hình hoặc đầu vào hỏng
 */
export function guideArrow(ndcX: number, ndcY: number, behind: boolean, aspect: number): GuideArrow | null {
  if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return null;
  const ar = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  if (!behind && Math.abs(ndcX) <= SEEN.x && ndcY <= SEEN.top && ndcY >= SEEN.bottom) return null;

  // Sau lưng: phép chiếu lật dấu nên lật lại. Ngay sau lưng (không lệch bên nào) thì chỉ xuống dưới.
  let dx = behind ? -ndcX : ndcX;
  let dy = behind ? -ndcY : ndcY;
  if (behind) dy = Math.min(dy, -0.2);
  if (Math.hypot(dx, dy) < 1e-6) {
    dx = 0;
    dy = -1;
  }

  // Tia từ tâm vùng đặt mũi tên theo hướng (dx, dy) cắt biên vùng.
  const cx = (GUIDE_ZONE.left + GUIDE_ZONE.right) / 2;
  const cy = (GUIDE_ZONE.top + GUIDE_ZONE.bottom) / 2;
  const hx = (GUIDE_ZONE.right - GUIDE_ZONE.left) / 2;
  const hy = (GUIDE_ZONE.top - GUIDE_ZONE.bottom) / 2;
  const t = Math.min(Math.abs(dx) > 1e-9 ? hx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hy / Math.abs(dy) : Infinity);
  const x = cx + dx * t;
  const y = cy + dy * t;
  return { x: (x + 1) / 2, y: (1 - y) / 2, angle: Math.atan2(dx * ar, dy) };
}
