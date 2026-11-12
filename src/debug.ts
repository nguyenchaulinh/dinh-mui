import type { DebugInfo } from './game/types';

/**
 * Bật thông tin debug (FPS, draw call, vị trí người chơi) khi chạy dev hoặc URL có `?fps`.
 * Script đo hiệu năng (scripts/perf.mjs) đọc `window.__dinhmui`.
 */
export const DEBUG: boolean =
  import.meta.env.DEV || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fps'));

/**
 * Cho phép nhảy thẳng vào cảnh bằng URL (`?scene=` / `?roam=`): luôn bật khi dev;
 * với bản build chỉ bật khi build bằng `VITE_DEBUG_JUMP=1` (bản đo hiệu năng).
 */
export const ALLOW_JUMP: boolean = import.meta.env.DEV || import.meta.env.VITE_DEBUG_JUMP === '1';

/** Gộp thông tin vào `window.__dinhmui`. Không làm gì nếu DEBUG tắt. */
export function publish(info: Partial<DebugInfo>): void {
  if (!DEBUG || typeof window === 'undefined') return;
  window.__dinhmui = { ...window.__dinhmui, ...info };
}
