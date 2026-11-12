import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { isBlocked } from '../game/collision';
import { PLAYER_RADIUS } from '../game/movement';
import { SETS } from './registry';
import { walkAreaFor } from './walk';

/**
 * Bản đồ văn phòng / lớp học: không xem được hình thì phải chứng minh bằng hình học rằng chơi được.
 * Loang từ chỗ xuất phát trên lưới 10 cm (chỉ đi qua ô mà vòng tròn người chơi không chạm vật cản), rồi kiểm tra
 * mọi NPC, đồ vật và cửa đều có ô đi tới được nằm trong tầm với.
 */
const content = loadContent();
const map = content.maps.find((m) => m.id === 'cuoi-nam')!;
const set = SETS['cuoi-nam']!;
const area = walkAreaFor('cuoi-nam', 'bac')!;
const STEP = 0.1;
/** Tầm với trong game: NPC 2.1 m (interact.ts), đồ vật 1.7 m (RoamView). Dùng số nhỏ hơn một chút cho chắc. */
const NPC_REACH = 1.9;
const OBJECT_REACH = 1.5;

function reachableCells(): { x: number; z: number }[] {
  const { minX, maxX, minZ, maxZ } = area.bounds;
  const nx = Math.round((maxX - minX) / STEP);
  const nz = Math.round((maxZ - minZ) / STEP);
  const free = (i: number, j: number) => !isBlocked({ x: minX + i * STEP, z: minZ + j * STEP }, PLAYER_RADIUS, area.colliders, area.bounds);
  const seen = new Uint8Array((nx + 1) * (nz + 1));
  const si = Math.round((area.spawn.x - minX) / STEP);
  const sj = Math.round((area.spawn.z - minZ) / STEP);
  const queue: [number, number][] = [[si, sj]];
  seen[sj * (nx + 1) + si] = 1;
  const out: { x: number; z: number }[] = [];
  while (queue.length > 0) {
    const [i, j] = queue.pop()!;
    out.push({ x: minX + i * STEP, z: minZ + j * STEP });
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a > nx || b > nz || seen[b * (nx + 1) + a]) continue;
      seen[b * (nx + 1) + a] = 1;
      if (free(a, b)) queue.push([a, b]);
    }
  }
  return out;
}

describe('bản đồ cuoi-nam: đi tới và với tới được mọi thứ', () => {
  const cells = reachableCells();
  const nearest = (x: number, z: number) => Math.min(...cells.map((c) => Math.hypot(c.x - x, c.z - z)));

  it('chỗ xuất phát không nằm trong vật cản và vùng đi được đủ rộng', () => {
    expect(isBlocked(area.spawn, PLAYER_RADIUS, area.colliders, area.bounds)).toBe(false);
    expect(cells.length * STEP * STEP).toBeGreaterThan(40); // > 40 m² sàn đi lại được
  });

  it('mọi NPC đứng ở chỗ trống và người chơi lại gần được', () => {
    for (const n of map.npcs) {
      const s = set.spots[n.spot]!;
      expect(isBlocked({ x: s.pos[0], z: s.pos[2] }, 0.36, area.colliders, area.bounds), `${n.characterId} trong vật cản`).toBe(false);
      expect(nearest(s.pos[0], s.pos[2]), `${n.characterId} không với tới`).toBeLessThan(NPC_REACH);
    }
  });

  it('mọi đồ vật (máy tính, đồ để nhặt, cửa) đều có chỗ đứng với tới được', () => {
    for (const o of map.objects ?? []) {
      const s = set.spots[o.spot]!;
      expect(nearest(s.pos[0], s.pos[2]), `${o.id} không với tới`).toBeLessThan(OBJECT_REACH);
    }
  });

  it('NPC và đồ vật không chồng lên nhau', () => {
    const npcSpots = map.npcs.map((n) => set.spots[n.spot]!.pos);
    for (const o of map.objects ?? []) {
      const p = set.spots[o.spot]!.pos;
      for (const q of npcSpots) expect(Math.hypot(p[0] - q[0], p[2] - q[2]), o.id).toBeGreaterThan(0.6);
    }
  });
});
