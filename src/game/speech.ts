import type { Character } from '../engine/types';
import type { Talk } from './TalkDock';

/** Phía bong bóng bung ra so với đầu người nói (đuôi chỉ về người nói). */
export type BubbleSide = 'left' | 'right' | 'center';

/** Bong bóng thoại trên đầu một nhân vật (`key` = id NPC, hoặc 'player'). */
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
 * Bong bóng nào đang hiện. Mỗi nhân vật tối đa MỘT bong bóng, tổng tối đa hai (người chơi + một NPC):
 * - đang chọn: câu hỏi của NPC;
 * - sau khi chọn: câu người chơi vừa nói (trên đầu người chơi) VÀ phản ứng của NPC, hiện cùng lúc;
 *   hai bong bóng bung ra hai phía ngược nhau (`bubbleSides`) nên không đè lên nhau.
 * Người nói không đứng trong cảnh (máy tính, Mẹ gọi điện, Bé Dê) thì lời của họ nằm trong dock. Hàm thuần.
 *
 * `speakerOnMap` = lời của người đối thoại đã nằm trong bong bóng, dock không cần nhắc lại.
 */
export function speechBubbles(
  talk: Talk | null,
  qte: { key: string; name: string; text: string; speaker: Character | null } | null,
  onMap: (key: string) => boolean,
  colorOf: (ch: Character | null) => string,
  playerName = '',
): { bubbles: SpeechBubble[]; speakerOnMap: boolean } {
  if (!talk) {
    return qte
      ? { bubbles: [{ key: qte.key, name: qte.name, text: qte.text, color: colorOf(qte.speaker), alert: true }], speakerOnMap: false }
      : { bubbles: [], speakerOnMap: false };
  }
  const k = talk.key;
  const npcHere = onMap(k);
  switch (talk.kind) {
    case 'choose':
      if (talk.view.scene.ui === 'feed' || !npcHere) return { bubbles: [], speakerOnMap: false };
      return { bubbles: [{ key: k, name: talk.view.speaker.name, text: talk.view.line, color: colorOf(talk.view.speaker) }], speakerOnMap: true };
    case 'reply': {
      const bubbles: SpeechBubble[] = [];
      if (talk.said && !talk.feed) bubbles.push({ key: 'player', name: playerName || 'Bạn', text: talk.said, color: 'var(--gold-dark)' });
      if (npcHere) bubbles.push({ key: k, name: talk.speaker.name, text: talk.reply, color: colorOf(talk.speaker) });
      return { bubbles, speakerOnMap: npcHere };
    }
    case 'line':
      return talk.speaker && npcHere
        ? { bubbles: [{ key: k, name: talk.speaker.name, text: talk.text, color: colorOf(talk.speaker) }], speakerOnMap: true }
        : { bubbles: [], speakerOnMap: false };
    default:
      return { bubbles: [], speakerOnMap: false };
  }
}

/** Độ trễ (đơn vị màn hình, NDC) để phía không nhảy qua lại khi hai người gần như thẳng hàng trên màn hình. */
export const SIDE_HYSTERESIS = 0.04;

/**
 * Phía bong bóng của người chơi và của NPC khi cả hai cùng nói: ai đứng bên trái màn hình thì bong bóng bung sang
 * trái, người kia sang phải (kiểu truyện tranh), nên hai bong bóng không chồng lên nhau dù hai người đứng sát.
 * `playerX`, `npcX` là toạ độ ngang trên màn hình (NDC -1..1); `prev` là kết quả lần trước để giữ ổn định.
 */
/** Người nói đứng lệch quá ngưỡng này (NDC) về một bên thì bong bóng đơn bung về phía giữa màn hình. */
export const SOLO_EDGE = 0.3;

/**
 * Phía bung của một bong bóng đứng MỘT mình: người ở nửa phải màn hình thì bong bóng bung sang trái (về giữa màn hình)
 * và ngược lại, để không tràn mép (bong bóng rộng tới 230 px, màn hình điện thoại 360 px). Gần giữa thì ở giữa.
 * `x` là toạ độ ngang trên màn hình (NDC -1..1), `prev` giữ ổn định (độ trễ SIDE_HYSTERESIS). Hàm thuần.
 */
export function soloSide(x: number, prev: BubbleSide = 'center'): BubbleSide {
  if (!Number.isFinite(x)) return 'center';
  if (x > SOLO_EDGE + (prev === 'left' ? -SIDE_HYSTERESIS : SIDE_HYSTERESIS)) return 'left';
  if (x < -SOLO_EDGE + (prev === 'right' ? SIDE_HYSTERESIS : -SIDE_HYSTERESIS)) return 'right';
  return 'center';
}

export function bubbleSides(playerX: number, npcX: number, prev?: { player: BubbleSide; npc: BubbleSide }): { player: BubbleSide; npc: BubbleSide } {
  const d = npcX - playerX;
  if (prev && prev.player !== 'center' && Math.abs(d) < SIDE_HYSTERESIS) return prev;
  return d >= 0 ? { player: 'left', npc: 'right' } : { player: 'right', npc: 'left' };
}
