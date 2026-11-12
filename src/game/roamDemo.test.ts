import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { choose, createGame, getView } from '../engine/engine';
import { SETS } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { isBlocked } from './collision';
import { PLAYER_RADIUS } from './movement';
import { INTERACT_ANY_ANGLE_DIST } from './interact';
import { ROAM_DEMO, ROAM_NPCS, buildNpcParams } from './roamDemo';

const content = loadContent();
const set = SETS[ROAM_DEMO.setId]!;
const STYLES = ['bac', 'trung', 'nam'] as const;

describe('dữ liệu NPC chế độ đi lại', () => {
  it('khoá NPC không trùng và là nhân vật có thật (cả người chơi)', () => {
    const keys = ROAM_NPCS.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of [...keys, ROAM_DEMO.playerId]) {
      expect(content.characters.some((c) => c.id === k), k).toBe(true);
    }
    expect(keys).not.toContain(ROAM_DEMO.playerId);
  });

  it('vị trí xuất phát (spot) có thật trong set', () => {
    for (const n of ROAM_NPCS) expect(set.spots[n.spot], n.key).toBeDefined();
  });

  it('mọi scene hội thoại tồn tại, và mỗi persona đều có ít nhất một scene hợp để nói với từng NPC', () => {
    for (const n of ROAM_NPCS) {
      if (n.action.kind !== 'talk') continue;
      const scenes = n.action.sceneIds.map((id) => content.scenes.find((s) => s.id === id));
      scenes.forEach((s, i) => expect(s, `${n.key}:${n.action.kind === 'talk' ? n.action.sceneIds[i] : ''}`).toBeDefined());
      for (const p of content.personas) {
        const ok = scenes.some((s) => !s!.personas || s!.personas.includes(p.id));
        expect(ok, `${n.key} thiếu scene cho persona ${p.id}`).toBe(true);
      }
    }
  });

  it('mọi lựa chọn của mọi scene hội thoại đều chơi được và ra phản ứng, với mọi persona × vùng', () => {
    for (const p of content.personas) {
      for (const r of content.regions) {
        for (const n of ROAM_NPCS) {
          if (n.action.kind !== 'talk') continue;
          for (const id of n.action.sceneIds) {
            const base = createGame(content, p.id, [r.id]);
            const state = { ...base, sceneId: id };
            const view = getView(content, state);
            expect(view, `${n.key}/${id}`).not.toBeNull();
            for (const ch of view!.choices) {
              const res = choose(content, state, ch.id);
              expect(res.reply, `${id}/${ch.id}`).toBeTruthy();
            }
          }
        }
      }
    }
  });

  it('scene chỉ dành cho đi lại được đánh dấu roamOnly (không nằm trên luồng chính)', () => {
    for (const n of ROAM_NPCS) {
      if (n.action.kind !== 'talk') continue;
      if (n.key === 'bin') expect(content.scenes.find((s) => s.id === 'roam-bin')?.roamOnly).toBe(true);
    }
  });

  it('người ngồi luôn đứng yên và không quay mặt, dù dữ liệu ghi hành vi gì', () => {
    for (const n of ROAM_NPCS) {
      const seated = set.spots[n.spot]?.seated === true;
      const p = buildNpcParams(n, seated);
      if (seated) {
        expect(p.behavior, n.key).toBe('stand');
        expect(p.aware, n.key).toBe(0);
      } else {
        expect(p.behavior, n.key).toBe(n.behavior);
      }
    }
  });

  it('chỉ NPC không ngồi mới đi lại; có ít nhất một NPC đi lại và một NPC đuổi theo', () => {
    const dyn = ROAM_NPCS.filter((n) => buildNpcParams(n, set.spots[n.spot]?.seated === true).behavior !== 'stand');
    expect(dyn.length).toBeGreaterThanOrEqual(2);
    expect(dyn.every((n) => set.spots[n.spot]?.seated !== true)).toBe(true);
  });
});

describe('thông số tương tác', () => {
  it('NPC đuổi theo dừng trong vùng rất gần để luôn tương tác được dù đứng sau lưng', () => {
    for (const n of ROAM_NPCS) {
      if (n.behavior !== 'approach') continue;
      expect(n.stopDist ?? 99, n.key).toBeLessThanOrEqual(INTERACT_ANY_ANGLE_DIST);
    }
  });

  it('chó phải lại gần hơn mới vuốt ve được (không đóng băng nó giữa đường chạy)', () => {
    const vang = ROAM_NPCS.find((n) => n.key === 'vang')!;
    expect(vang.reach).toBeDefined();
    expect(vang.reach!).toBeLessThan(2.1);
  });
});

describe('NPC không xuất phát trong vật cản, ở cả 3 miền', () => {
  for (const style of STYLES) {
    it(`miền ${style}`, () => {
      const area = walkAreaFor(ROAM_DEMO.setId, style)!;
      for (const n of ROAM_NPCS) {
        const spot = set.spots[n.spot]!;
        const seated = spot.seated === true;
        if (seated) continue; // người ngồi nằm quanh bàn trà, đã có vòng va chạm riêng
        const r = n.key === 'vang' ? 0.28 : 0.36;
        expect(
          isBlocked({ x: spot.pos[0], z: spot.pos[2] }, r, area.colliders, area.bounds),
          `${n.key} xuất phát trong vật cản (miền ${style})`,
        ).toBe(false);
      }
    });

    it(`miền ${style}: NPC đi lại không xuất phát trùng người chơi`, () => {
      const area = walkAreaFor(ROAM_DEMO.setId, style)!;
      for (const n of ROAM_NPCS) {
        const spot = set.spots[n.spot]!;
        const d = Math.hypot(spot.pos[0] - area.spawn.x, spot.pos[2] - area.spawn.z);
        expect(d, n.key).toBeGreaterThan(PLAYER_RADIUS + 0.4);
      }
    });
  }
});
