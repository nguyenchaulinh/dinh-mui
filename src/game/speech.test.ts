import { describe, expect, it } from 'vitest';
import type { SceneView } from '../engine/engine';
import type { Character } from '../engine/types';
import { bubbleSides, speechBubbles } from './speech';
import type { Talk } from './TalkDock';

const npc: Character = { id: 'co-hai', name: 'Cô Hai', role: '', enabled: true };
const view = (ui?: 'feed'): SceneView => ({
  scene: { id: 's', characterId: 'co-hai', line: 'Lương bao nhiêu?', choices: [], ui },
  speaker: npc,
  line: 'Lương bao nhiêu?',
  lines: [],
  choices: [],
});
const onMap = (k: string) => k === 'co-hai';
const color = () => '#f00';
const qte = { key: 'di-ut', name: 'Dì Út', text: 'Bao giờ cưới?', speaker: null };

const talks: Talk[] = [
  { kind: 'choose', key: 'co-hai', sceneId: 's', view: view() },
  { kind: 'choose', key: 'obj:may-tinh', sceneId: 's', view: view('feed') },
  { kind: 'reply', key: 'co-hai', speaker: npc, said: 'Dạ đủ sống ạ', reply: 'Cô khỏe!', tip: null },
  { kind: 'line', key: 'co-hai', speaker: npc, text: 'Ăn bánh đi con' },
  { kind: 'line', key: 'obj:cua', speaker: null, title: 'Cửa ra', text: 'Chưa về được' },
  { kind: 'call', key: 'ev:me-goi', caller: npc, sceneIds: [] },
  { kind: 'reply', key: 'ev:me-goi', speaker: npc, said: 'Dạ 28 con về', reply: 'Ừ', tip: null },
  { kind: 'reply', key: 'obj:may-tinh', speaker: npc, said: 'Nhà xe A', reply: 'Đặt được vé!', tip: null, feed: true },
];

describe('bong bóng thoại', () => {
  it('mỗi nhân vật tối đa một bong bóng, tổng tối đa hai', () => {
    for (const t of [null, ...talks]) {
      for (const q of [null, qte]) {
        const b = speechBubbles(t, q, onMap, color).bubbles;
        expect(b.length, `${t?.kind}`).toBeLessThanOrEqual(2);
        expect(new Set(b.map((x) => x.key)).size, `${t?.kind}`).toBe(b.length);
      }
    }
  });

  it('sau khi chọn: câu người chơi (trên đầu người chơi) và lời NPC đáp hiện CÙNG LÚC', () => {
    const r = speechBubbles(talks[2]!, null, onMap, color, 'Kan');
    expect(r.bubbles).toEqual([
      { key: 'player', name: 'Kan', text: 'Dạ đủ sống ạ', color: 'var(--gold-dark)' },
      { key: 'co-hai', name: 'Cô Hai', text: 'Cô khỏe!', color: '#f00' },
    ]);
    expect(r.speakerOnMap).toBe(true);
  });

  it('người đối thoại không đứng trong cảnh (Mẹ gọi điện): câu người chơi vẫn là bong bóng, lời đáp nằm trong dock', () => {
    const r = speechBubbles(talks[6]!, null, onMap, color, 'Kan');
    expect(r.bubbles.map((b) => b.key)).toEqual(['player']);
    expect(r.speakerOnMap).toBe(false);
  });

  it('feed, máy tính, cửa, cuộc gọi: không có bong bóng của NPC', () => {
    for (const t of [talks[1]!, talks[4]!, talks[5]!, talks[7]!]) {
      expect(speechBubbles(t, null, onMap, color).bubbles.filter((b) => b.key !== 'player'), t.key).toEqual([]);
    }
  });

  it('không có hội thoại thì câu hỏi của người lao tới là bong bóng cảnh báo', () => {
    expect(speechBubbles(null, qte, onMap, color).bubbles).toEqual([{ key: 'di-ut', name: 'Dì Út', text: 'Bao giờ cưới?', color: '#f00', alert: true }]);
  });
});

describe('phía bong bóng (không đè nhau khi cả hai cùng nói)', () => {
  it('ai bên trái màn hình thì bong bóng bung sang trái, người kia sang phải', () => {
    expect(bubbleSides(-0.2, 0.3)).toEqual({ player: 'left', npc: 'right' });
    expect(bubbleSides(0.4, -0.1)).toEqual({ player: 'right', npc: 'left' });
  });

  it('hai người gần như thẳng hàng: giữ phía cũ, không nhảy qua lại; luôn ngược phía nhau', () => {
    const prev = { player: 'right', npc: 'left' } as const;
    expect(bubbleSides(0.1, 0.12, prev)).toEqual(prev);
    for (const [a, b] of [[0, 0], [0.5, 0.5], [-1, 1]] as const) {
      const s = bubbleSides(a, b);
      expect(s.player).not.toBe(s.npc);
    }
  });
});

describe('phím tắt chọn đáp án', () => {
  it('A/B/C/D hoặc 1/2/3/4 chọn lựa chọn tương ứng; phím ngoài số lựa chọn thì bỏ qua', async () => {
    const { choiceIndexOf } = await import('./TalkDock');
    expect(choiceIndexOf('KeyA', 3)).toBe(0);
    expect(choiceIndexOf('KeyC', 3)).toBe(2);
    expect(choiceIndexOf('KeyD', 3)).toBe(-1);
    expect(choiceIndexOf('KeyD', 4)).toBe(3);
    expect(choiceIndexOf('Digit2', 3)).toBe(1);
    expect(choiceIndexOf('Numpad1', 3)).toBe(0);
    expect(choiceIndexOf('KeyF', 6)).toBe(5);
    expect(choiceIndexOf('KeyW', 6)).toBe(-1);
    expect(choiceIndexOf('Space', 3)).toBe(-1);
  });
});
