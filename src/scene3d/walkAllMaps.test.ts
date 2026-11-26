import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { isBlocked } from '../game/collision';
import { INTERACT_DIST } from '../game/interact';
import { PLAYER_RADIUS } from '../game/movement';
import { SETS } from './registry';
import { actorCollider, walkAreaFor } from './walk';

/**
 * Mọi bản đồ: NPC đứng cố định (không đi lại, không ngồi) chặn người chơi bằng một vòng tròn. Test này loang từ chỗ xuất phát
 * trên lưới 10 cm, tính cả vòng chặn của họ, và đòi mọi NPC / đồ vật còn với tới được (không bị NPC khác chặn mất lối).
 */
const content = loadContent();
const STEP = 0.1;
/** Tầm tương tác thật của game (INTERACT_DIST) trừ 0.2 m dư cho góc quay mặt. */
const NPC_REACH = INTERACT_DIST - 0.2;
const OBJECT_REACH = INTERACT_DIST - 0.2;

describe.each(content.maps.filter((m) => walkAreaFor(m.setId, 'bac')))('bản đồ $id: NPC đứng không chặn lối tới nhau', (map) => {
  const set = SETS[map.setId]!;
  const area = walkAreaFor(map.setId, 'bac')!;
  const standing = map.npcs
    .filter((n) => n.behavior === 'stand' && set.spots[n.spot]?.seated !== true)
    .map((n) => actorCollider(set.spots[n.spot]!.pos[0], set.spots[n.spot]!.pos[2]));
  const colliders = [...area.colliders, ...standing];
  const { minX, maxX, minZ, maxZ } = area.bounds;
  const nx = Math.round((maxX - minX) / STEP);
  const nz = Math.round((maxZ - minZ) / STEP);
  const seen = new Uint8Array((nx + 1) * (nz + 1));
  const cells: { x: number; z: number }[] = [];
  const si = Math.round((area.spawn.x - minX) / STEP);
  const sj = Math.round((area.spawn.z - minZ) / STEP);
  const stack: [number, number][] = [[si, sj]];
  seen[sj * (nx + 1) + si] = 1;
  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    cells.push({ x: minX + i * STEP, z: minZ + j * STEP });
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a > nx || b > nz || seen[b * (nx + 1) + a]) continue;
      seen[b * (nx + 1) + a] = 1;
      if (!isBlocked({ x: minX + a * STEP, z: minZ + b * STEP }, PLAYER_RADIUS, colliders, area.bounds)) stack.push([a, b]);
    }
  }
  const nearest = (x: number, z: number) => Math.min(...cells.map((c) => Math.hypot(c.x - x, c.z - z)));

  it('mọi NPC với tới được dù có NPC đứng khác', () => {
    for (const n of map.npcs) {
      const s = set.spots[n.spot];
      if (!s || s.seated) continue;
      expect(nearest(s.pos[0], s.pos[2]), `${n.characterId} bị chặn lối`).toBeLessThan(NPC_REACH);
    }
  });
  it('mọi đồ vật với tới được dù có NPC đứng', () => {
    for (const o of map.objects ?? []) {
      const s = set.spots[o.spot];
      if (!s) continue;
      expect(nearest(s.pos[0], s.pos[2]), `${o.id} bị chặn lối`).toBeLessThan(OBJECT_REACH);
    }
  });
});
