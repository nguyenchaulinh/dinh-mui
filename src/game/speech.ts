import type { Character } from '../engine/types';
import type { Talk } from './TalkDock';

/** Bong bóng thoại trên đầu một nhân vật (`key` = id NPC). */
export interface SpeechBubble {
  key: string;
  name: string;
  text: string;
  /** Màu tên người nói (màu áo). */
  color: string;
  /** Câu hỏi khi lao tới (viền đỏ, rung). */
  alert?: boolean;
}

/**
 * Bong bóng nào đang hiện. Quy tắc: TỐI ĐA MỘT bong bóng mỗi lúc (người chơi và NPC đứng sát nhau nên hai bong bóng
 * sẽ đè lên nhau, không đọc được). Ưu tiên hội thoại đang mở; không có hội thoại thì là câu hỏi của người đang lao tới.
 * Câu người chơi vừa chọn KHÔNG thành bong bóng (nằm trong dock). Hàm thuần.
 *
 * `speakerOnMap` = lời nói đã nằm trong bong bóng, dock không cần nhắc lại.
 */
export function speechBubbles(
  talk: Talk | null,
  qte: { key: string; name: string; text: string; speaker: Character | null } | null,
  onMap: (key: string) => boolean,
  colorOf: (ch: Character | null) => string,
): { bubbles: SpeechBubble[]; speakerOnMap: boolean } {
  if (!talk) {
    return qte
      ? { bubbles: [{ key: qte.key, name: qte.name, text: qte.text, color: colorOf(qte.speaker), alert: true }], speakerOnMap: false }
      : { bubbles: [], speakerOnMap: false };
  }
  const k = talk.key;
  if (!onMap(k)) return { bubbles: [], speakerOnMap: false };
  switch (talk.kind) {
    case 'choose':
      if (talk.view.scene.ui === 'feed') return { bubbles: [], speakerOnMap: false };
      return { bubbles: [{ key: k, name: talk.view.speaker.name, text: talk.view.line, color: colorOf(talk.view.speaker) }], speakerOnMap: true };
    case 'reply':
      return { bubbles: [{ key: k, name: talk.speaker.name, text: talk.reply, color: colorOf(talk.speaker) }], speakerOnMap: true };
    case 'line':
      return talk.speaker
        ? { bubbles: [{ key: k, name: talk.speaker.name, text: talk.text, color: colorOf(talk.speaker) }], speakerOnMap: true }
        : { bubbles: [], speakerOnMap: false };
    default:
      return { bubbles: [], speakerOnMap: false };
  }
}
