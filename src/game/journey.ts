import { mapAutoFlags } from '../engine/quests';
import type { Content, GameState, JourneyStep } from '../engine/types';

/**
 * Trạng thái mang sang chặng sau khi kết thúc một chặng của hành trình (hàm thuần).
 *
 * Giữ: chỉ số, thẻ mẹo, lịch sử, cờ cốt truyện do cảnh kể chuyện bật (ví dụ `xem-mat` cho danh hiệu "Có hẹn mùng 2"; hiện chưa chặng đi lại nào bật cờ này) và danh sách vùng đầy đủ.
 * Bỏ: mọi cờ do CHÍNH bản đồ của chặng vừa xong tự sinh (`talked:`, `dodged:`, `served:`, `zone:`, `quest:`...).
 * Nếu không bỏ thì cờ trùng tên ở bản đồ sau làm nhiệm vụ tự hoàn thành ngay từ đầu
 * (ví dụ `talked:be-de` ở phố Tết làm xong "Chọn chiến thuật cuối" ở mâm cơm, `dodged:3` ở sân nhà làm xong "Né mã QR").
 */
export function carryOver(
  content: Content,
  step: Pick<JourneyStep, 'mapId'>,
  finished: GameState,
  allRegionIds: readonly string[],
): GameState {
  const map = content.maps?.find((m) => m.id === step.mapId);
  const scoped = new Set(map ? mapAutoFlags(map) : []);
  return {
    ...finished,
    regionIds: [...allRegionIds],
    flags: finished.flags.filter((f) => !scoped.has(f)),
  };
}
