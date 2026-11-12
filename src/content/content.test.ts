import { describe, expect, it } from 'vitest';
import { advance, choose, createGame, getView } from '../engine/engine';
import type { Content, GameState } from '../engine/types';
import { validateContent } from '../engine/validate';
import { SETS } from '../scene3d/registry';
import { loadContent } from './index';

/** Kiểm tra nội dung thật (v1.json), không phải dữ liệu mẫu. */
const c: Content = loadContent();

function play(personaId: string, regionIds: string[], pickIndex: number, seed = 0): { path: string[]; end: GameState } {
  let s = createGame(c, personaId, regionIds, seed);
  const path: string[] = [];
  for (let guard = 0; s.sceneId && guard < 500; guard++) {
    path.push(s.sceneId);
    const v = getView(c, s)!;
    s = v.scene.kind === 'cutscene' ? advance(c, s) : choose(c, s, v.choices[pickIndex % v.choices.length]!.id).state;
  }
  return { path, end: s };
}

describe('nội dung v1', () => {
  it('hợp lệ, kể cả set 3D, vị trí đứng và góc máy', () => {
    expect(validateContent(c, { sets: SETS })).toEqual([]);
  });

  it('mọi persona × thành phố × kiểu chọn đều chơi tới kết thúc', () => {
    const regionSets = [['ha-noi'], ['da-nang'], ['sai-gon'], ['ha-noi', 'da-nang', 'sai-gon']];
    for (const p of c.personas) {
      for (const r of regionSets) {
        for (let pick = 0; pick < 4; pick++) {
          const { end } = play(p.id, r, pick, 7);
          expect(end.sceneId, `${p.id} ${r.join('+')} pick ${pick}`).toBeNull();
          expect(end.endingId).not.toBeNull();
        }
      }
    }
  });

  it('mỗi persona gặp đúng câu hỏi của mình ở chặng Bước vào nhà', () => {
    expect(play('sinh-vien', ['ha-noi'], 1).path).toContain('bvn-1-sv');
    expect(play('moi-di-lam', ['ha-noi'], 1).path).toContain('bvn-1-dl');
    const dt = play('doc-than-27', ['ha-noi'], 1).path;
    expect(dt).toContain('bvn-1-dt');
    expect(dt).toContain('bvn-4');
    expect(play('sinh-vien', ['ha-noi'], 1).path).not.toContain('bvn-4');
  });

  it('mọi scene đều tới được bằng một cách chơi nào đó', () => {
    const reached = new Set<string>();
    for (const p of c.personas) {
      for (const r of c.regions) {
        for (let pick = 0; pick < 4; pick++) for (const id of play(p.id, [r.id], pick).path) reached.add(id);
      }
    }
    // Scene roamOnly chỉ mở qua NPC trong chế độ đi lại, không nằm trên luồng chính.
    const unreached = c.scenes.filter((s) => !s.roamOnly).map((s) => s.id).filter((id) => !reached.has(id));
    expect(unreached).toEqual([]);
  });

  it('nhân vật nhại đều có cờ parody và bản thay thế', () => {
    for (const ch of c.characters.filter((x) => x.parody)) {
      expect(ch.fallbackId, ch.id).toBeTruthy();
    }
  });

  it('mọi scene đều có chỉ đạo cảnh 3D', () => {
    expect(c.scenes.filter((s) => !s.stage3d).map((s) => s.id)).toEqual([]);
  });

  describe('cân bằng', () => {
    /** Duyệt mọi đường đi của luồng chính (mỗi lựa chọn đều thử) và đếm số lần ra từng kết thúc. */
    function distribution(personaId: string): { counts: Record<string, number>; total: number } {
      const counts: Record<string, number> = {};
      let total = 0;
      const walk = (s: GameState): void => {
        if (s.sceneId === null) {
          counts[s.endingId!] = (counts[s.endingId!] ?? 0) + 1;
          total++;
          return;
        }
        const v = getView(c, s)!;
        if (v.scene.kind === 'cutscene') return walk(advance(c, s));
        for (const ch of v.choices) walk(choose(c, s, ch.id).state);
      };
      walk(createGame(c, personaId, ['ha-noi'], 1));
      return { counts, total };
    }
    const dist = new Map(c.personas.map((p) => [p.id, distribution(p.id)]));

    it('mọi kết thúc đều tới được bằng một cách chơi nào đó ở luồng chính', () => {
      const reached = new Set<string>();
      for (const { counts } of dist.values()) for (const id of Object.keys(counts)) reached.add(id);
      expect(c.endings.map((e) => e.id).filter((id) => !reached.has(id))).toEqual([]);
    });

    it('không kết thúc nào chiếm quá 75% số đường đi của một persona', () => {
      for (const [persona, { counts, total }] of dist) {
        for (const [ending, n] of Object.entries(counts)) {
          expect(n / total, `${persona} ${ending}`).toBeLessThanOrEqual(0.75);
        }
      }
    });

    it('Lầy không còn là lựa chọn miễn phí: mỗi scene luồng chính, Lầy luôn tốn thứ gì đó', () => {
      for (const s of c.scenes.filter((x) => !x.roamOnly)) {
        for (const ch of s.choices.filter((x) => x.style === 'lay')) {
          const costs = Object.values(ch.effects).some((v) => v !== undefined && v < 0);
          expect(costs, `${s.id}/${ch.id}`).toBe(true);
        }
      }
    });
  });
});
