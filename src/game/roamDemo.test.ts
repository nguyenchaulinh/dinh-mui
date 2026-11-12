import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { choose, createGame, getView } from '../engine/engine';
import { SETS } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { isBlocked } from './collision';
import { INTERACT_ANY_ANGLE_DIST } from './interact';
import { PLAYER_RADIUS } from './movement';
import { buildNpcParams, getRoamMap } from './roamDemo';

const content = loadContent();
const map = getRoamMap(content, 'san-nha')!;
const set = SETS[map.setId]!;
const STYLES = ['bac', 'trung', 'nam'] as const;

describe('bản đồ san-nha trong nội dung', () => {
  it('có bản đồ, tra cứu theo id; id lạ thì null', () => {
    expect(map).toBeTruthy();
    expect(getRoamMap(content, 'khong-co')).toBeNull();
    expect(getRoamMap({ ...content, maps: [] }, 'san-nha')).toBeNull();
  });

  it('khoá NPC không trùng và không trùng người chơi', () => {
    const keys = map.npcs.map((n) => n.characterId);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain(map.playerId);
  });

  it('mọi lựa chọn của mọi scene hội thoại (nói chuyện và bị trúng) đều chơi được, với mọi persona × vùng', () => {
    for (const p of content.personas) {
      for (const r of content.regions) {
        for (const n of map.npcs) {
          const ids = [...(n.action.kind === 'talk' ? n.action.sceneIds : []), ...(n.shoots?.hitSceneIds ?? [])];
          for (const id of ids) {
            const scene = content.scenes.find((s) => s.id === id)!;
            // Chỉ kiểm tra scene hợp persona (scene khác persona không bao giờ được chọn cho người chơi này).
            if (scene.personas && !scene.personas.includes(p.id)) continue;
            const state = createGame(content, p.id, r.id);
            const view = getView(content, state, id);
            expect(view.choices.length, `${n.characterId}/${id} không có lựa chọn`).toBeGreaterThan(0);
            for (const ch of view.choices) {
              expect(choose(content, state, id, ch.id).reply, `${id}/${ch.id}`).toBeTruthy();
            }
          }
        }
      }
    }
  });

  it('người ngồi luôn đứng yên và không quay mặt, dù dữ liệu ghi hành vi gì', () => {
    for (const n of map.npcs) {
      const seated = set.spots[n.spot]?.seated === true;
      const p = buildNpcParams(n, seated);
      if (seated) {
        expect(p.behavior, n.characterId).toBe('stand');
        expect(p.aware, n.characterId).toBe(0);
      } else {
        expect(p.behavior, n.characterId).toBe(n.behavior);
      }
    }
  });

  it('có NPC đi lại, NPC đuổi theo và NPC bắn câu hỏi; chỉ NPC không ngồi mới đi lại', () => {
    const dyn = map.npcs.filter((n) => buildNpcParams(n, set.spots[n.spot]?.seated === true).behavior !== 'stand');
    expect(dyn.length).toBeGreaterThanOrEqual(3);
    expect(dyn.every((n) => set.spots[n.spot]?.seated !== true)).toBe(true);
    expect(map.npcs.some((n) => n.behavior === 'approach')).toBe(true);
    expect(map.npcs.some((n) => n.shoots)).toBe(true);
  });

  it('NPC bắn câu hỏi không ngồi (ngồi thì không bắn được vì không có vị trí đi lại hợp lý)', () => {
    for (const n of map.npcs.filter((x) => x.shoots)) {
      expect(set.spots[n.spot]?.seated, n.characterId).not.toBe(true);
    }
  });
});

describe('thông số tương tác', () => {
  it('NPC đuổi theo dừng trong vùng rất gần để luôn tương tác được dù đứng sau lưng', () => {
    for (const n of map.npcs) {
      if (n.behavior !== 'approach') continue;
      expect(n.stopDist ?? 99, n.characterId).toBeLessThanOrEqual(INTERACT_ANY_ANGLE_DIST);
    }
  });

  it('chó phải lại gần hơn mới vuốt ve được (không đóng băng nó giữa đường chạy)', () => {
    const vang = map.npcs.find((n) => n.characterId === 'vang')!;
    expect(vang.reach).toBeDefined();
    expect(vang.reach!).toBeLessThan(2.1);
  });
});

describe('NPC không xuất phát trong vật cản, ở cả 3 miền', () => {
  for (const style of STYLES) {
    it(`miền ${style}`, () => {
      const area = walkAreaFor(map.setId, style)!;
      for (const n of map.npcs) {
        const spot = set.spots[n.spot]!;
        if (spot.seated === true) continue; // người ngồi nằm quanh bàn trà, đã có vòng va chạm riêng
        const r = n.characterId === 'vang' ? 0.28 : 0.36;
        expect(
          isBlocked({ x: spot.pos[0], z: spot.pos[2] }, r, area.colliders, area.bounds),
          `${n.characterId} xuất phát trong vật cản (miền ${style})`,
        ).toBe(false);
      }
    });

    it(`miền ${style}: NPC không xuất phát trùng người chơi`, () => {
      const area = walkAreaFor(map.setId, style)!;
      for (const n of map.npcs) {
        const spot = set.spots[n.spot]!;
        const d = Math.hypot(spot.pos[0] - area.spawn.x, spot.pos[2] - area.spawn.z);
        expect(d, n.characterId).toBeGreaterThan(PLAYER_RADIUS + 0.4);
      }
    });
  }
});
