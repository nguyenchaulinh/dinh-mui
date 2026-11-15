import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { isBlocked } from '../game/collision';
import { PLAYER_RADIUS } from '../game/movement';
import { SETS } from './registry';
import { walkAreaFor } from './walk';

/**
 * Bản đồ tram-dung (dữ liệu trong v1.json) khớp với cảnh 3D: không xem được hình thì chứng minh bằng hình học rằng mọi
 * NPC, đồ vật và xe khách đều có chỗ đứng với tới được từ chỗ xuất phát (loang lưới 10 cm, mẫu: walkCuoiNam.test.ts).
 */
const content = loadContent();
const map = content.maps.find((m) => m.id === 'tram-dung')!;
const set = SETS['tram-dung']!;
const area = walkAreaFor('tram-dung', 'bac')!;
const STEP = 0.1;
const NPC_REACH = 1.9; // game: 2.1 m (interact.ts)
const OBJECT_REACH = 1.5; // game: 1.7 m (RoamView)

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

describe('bản đồ tram-dung: đi tới và với tới được mọi thứ', () => {
  const cells = reachableCells();
  const nearest = (x: number, z: number) => Math.min(...cells.map((c) => Math.hypot(c.x - x, c.z - z)));

  it('bản đồ tồn tại và vùng đi lại đủ rộng', () => {
    expect(map).toBeDefined();
    expect(cells.length * STEP * STEP).toBeGreaterThan(60); // > 60 m² sàn đi lại được
  });

  it('mọi NPC đứng ở chỗ trống và người chơi lại gần được', () => {
    expect(map.npcs.length).toBeGreaterThanOrEqual(2);
    for (const n of map.npcs) {
      const s = set.spots[n.spot]!;
      expect(s, `${n.characterId}: spot ${n.spot}`).toBeDefined();
      expect(isBlocked({ x: s.pos[0], z: s.pos[2] }, 0.36, area.colliders, area.bounds), `${n.characterId} trong vật cản`).toBe(false);
      expect(nearest(s.pos[0], s.pos[2]), `${n.characterId} không với tới`).toBeLessThan(NPC_REACH);
    }
  });

  it('mọi đồ vật (bánh mì, xe khách) đều có chỗ đứng với tới được', () => {
    expect((map.objects ?? []).map((o) => o.id).sort()).toEqual(['banh-mi', 'xe-khach']);
    for (const o of map.objects ?? []) {
      const s = set.spots[o.spot]!;
      expect(s, `${o.id}: spot ${o.spot}`).toBeDefined();
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

  it('chú Ba bắn câu hỏi được tính từ chỗ xuất phát: nằm trong tầm lao tới nhưng không sát mặt', () => {
    const chuBa = map.npcs.find((n) => n.characterId === 'chu-ba-triet-ly')!;
    const s = set.spots[chuBa.spot]!;
    const d = Math.hypot(s.pos[0] - area.spawn.x, s.pos[2] - area.spawn.z);
    expect(chuBa.ambush).toBeDefined();
    expect(d).toBeLessThanOrEqual(chuBa.ambush!.range);
    expect(d).toBeGreaterThan(chuBa.ambush!.minRange);
  });
});
