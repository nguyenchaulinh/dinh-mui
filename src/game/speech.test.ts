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
  { kind: 'reply', key: 'co-hai', speaker: npc, said: 'Dạ đủ sống ạ', reply: 'Cô khỏe!', tip: null },
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

  it('câu người chơi vừa chọn không thành bong bóng; bong bóng là của NPC đang nói', () => {
    const r = speechBubbles(talks[2]!, null, onMap, color);
    expect(r.bubbles).toEqual([{ key: 'co-hai', name: 'Cô Hai', text: 'Cô khỏe!', color: '#f00' }]);
    expect(r.speakerOnMap).toBe(true);
  });

  it('người nói không đứng trong cảnh (máy tính, feed, cửa) thì không có bong bóng, lời nói nằm trong dock', () => {
    for (const t of [talks[1]!, talks[4]!, talks[5]!]) {
      const r = speechBubbles(t, null, onMap, color);
      expect(r.bubbles, t.key).toEqual([]);
      expect(r.speakerOnMap, t.key).toBe(false);
    }
  });

  it('không có hội thoại thì câu hỏi của người lao tới là bong bóng cảnh báo', () => {
    expect(speechBubbles(null, qte, onMap, color).bubbles).toEqual([{ key: 'di-ut', name: 'Dì Út', text: 'Bao giờ cưới?', color: '#f00', alert: true }]);
  });
});
