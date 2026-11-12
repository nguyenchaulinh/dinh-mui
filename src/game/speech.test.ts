import { describe, expect, it } from 'vitest';
import type { SceneView } from '../engine/engine';
import type { Character } from '../engine/types';
import { speechBubbles } from './speech';
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
  { kind: 'reply', key: 'co-hai', speaker: npc, said: 'Dạ đủ sống ạ', reply: 'Cô khỏe!', tip: null, showSaid: false },
  { kind: 'reply', key: 'co-hai', speaker: npc, said: 'Dạ đủ sống ạ', reply: 'Cô khỏe!', tip: null, showSaid: true },
  { kind: 'line', key: 'co-hai', speaker: npc, text: 'Ăn bánh đi con' },
  { kind: 'line', key: 'obj:cua', speaker: null, title: 'Cửa ra', text: 'Chưa về được' },
  { kind: 'call', key: 'ev:me-goi', caller: npc, sceneIds: [] },
];

describe('bong bóng thoại', () => {
  it('không bao giờ quá một bong bóng, kể cả khi đang có người lao tới hỏi', () => {
    for (const t of [null, ...talks]) {
      for (const q of [null, qte]) {
        expect(speechBubbles(t, q, onMap, color).bubbles.length, `${t?.kind}/${q ? 'qte' : '-'}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('sau khi chọn: trước là câu người chơi vừa nói (trên đầu người chơi), sau mới tới NPC đáp, không cùng lúc', () => {
    const said = speechBubbles(talks[3]!, null, onMap, color, 'Kan');
    expect(said.bubbles).toEqual([{ key: 'player', name: 'Kan', text: 'Dạ đủ sống ạ', color: 'var(--gold-dark)' }]);
    const reply = speechBubbles(talks[2]!, null, onMap, color, 'Kan');
    expect(reply.bubbles).toEqual([{ key: 'co-hai', name: 'Cô Hai', text: 'Cô khỏe!', color: '#f00' }]);
    expect(reply.speakerOnMap).toBe(true);
  });

  it('người nói không đứng trong cảnh (máy tính, feed, cửa) thì không có bong bóng, lời nói nằm trong dock', () => {
    for (const t of [talks[1]!, talks[5]!, talks[6]!]) {
      const r = speechBubbles(t, null, onMap, color);
      expect(r.bubbles, t.key).toEqual([]);
      expect(r.speakerOnMap, t.key).toBe(false);
    }
  });

  it('không có hội thoại thì câu hỏi của người lao tới là bong bóng cảnh báo', () => {
    expect(speechBubbles(null, qte, onMap, color).bubbles).toEqual([{ key: 'di-ut', name: 'Dì Út', text: 'Bao giờ cưới?', color: '#f00', alert: true }]);
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
