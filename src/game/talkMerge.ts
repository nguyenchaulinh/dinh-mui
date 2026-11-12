import { choose } from '../engine/engine';
import type { Content, GameState } from '../engine/types';

/**
 * Áp một lựa chọn hội thoại lên state MỚI NHẤT của trò chơi (không phải ảnh chụp lúc mở hội thoại).
 *
 * `talkState` là state lúc mở hội thoại, giữ `sceneId` của scene đang nói. Nếu ghi đè bằng kết quả `choose()` tính từ ảnh chụp thì
 * mọi cờ/chỉ số được cập nhật SAU lúc mở (cờ `hit:1`, `dodged:3`, thưởng nhiệm vụ...) đều bị xoá. Vì vậy ta tính lại `choose()` trên
 * state mới nhất rồi chỉ lấy phần "ghi nhớ" (chỉ số, cờ, thẻ mẹo, lịch sử); không chuyển cảnh/kết thúc vì đang đi lại tự do.
 */
export function mergeChoice(content: Content, talkState: GameState, latest: GameState, choiceId: string): GameState {
  const applied = choose(
    content,
    {
      ...talkState,
      stats: latest.stats,
      flags: latest.flags,
      tipsSeen: latest.tipsSeen,
      history: latest.history,
    },
    choiceId,
  ).state;
  return {
    ...latest,
    stats: applied.stats,
    flags: applied.flags,
    tipsSeen: applied.tipsSeen,
    history: applied.history,
  };
}
