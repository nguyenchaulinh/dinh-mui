import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { isBlocked } from '../game/collision';
import { PLAYER_RADIUS } from '../game/movement';
import { SETS } from './registry';
import { PHO_TET, phoPots, walkAreaFor } from './walk';

/**
 * Phố Tết (chặng Ra bến): vỉa hè bắc dài 25 m, rộng 2 m. Không xem được hình thì phải chứng minh bằng hình học rằng chơi
 * được: loang từ chỗ xuất phát trên lưới 10 cm rồi kiểm tra mọi NPC, đồ vật và điểm lên xe đều với tới được.
 */
const content = loadContent();
const map = content.maps.find((m) => m.id === 'ra-ben')!;
const set = SETS['pho-tet']!;
const STEP = 0.1;
const NPC_REACH = 1.9;
const OBJECT_REACH = 1.5;

describe.each(['bac', 'trung', 'nam'] as const)('bản đồ ra-ben (%s)', (style) => {
  const area = walkAreaFor('pho-tet', style)!;

  const reachable = (() => {
    const { minX, maxX, minZ, maxZ } = area.bounds;
    const nx = Math.round((maxX - minX) / STEP);
    const nz = Math.round((maxZ - minZ) / STEP);
    const free = (i: number, j: number) =>
      !isBlocked({ x: minX + i * STEP, z: minZ + j * STEP }, PLAYER_RADIUS, area.colliders, area.bounds);
    const seen = new Uint8Array((nx + 1) * (nz + 1));
    const si = Math.round((area.spawn.x - minX) / STEP);
    const sj = Math.round((area.spawn.z - minZ) / STEP);
    const stack: [number, number][] = [[si, sj]];
    seen[sj * (nx + 1) + si] = 1;
    const out: { x: number; z: number }[] = [];
    while (stack.length > 0) {
      const [i, j] = stack.pop()!;
      out.push({ x: minX + i * STEP, z: minZ + j * STEP });
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a > nx || b > nz || seen[b * (nx + 1) + a]) continue;
        seen[b * (nx + 1) + a] = 1;
        if (free(a, b)) stack.push([a, b]);
      }
    }
    return out;
  })();
  const nearest = (x: number, z: number) => Math.min(...reachable.map((c) => Math.hypot(c.x - x, c.z - z)));

  it('chỗ xuất phát trống và đi được từ đầu tây tới đầu đông vỉa hè (không bị tắc giữa chừng)', () => {
    expect(isBlocked(area.spawn, PLAYER_RADIUS, area.colliders, area.bounds)).toBe(false);
    const xs = reachable.map((c) => c.x);
    expect(Math.min(...xs)).toBeLessThan(area.bounds.minX + 0.5);
    expect(Math.max(...xs)).toBeGreaterThan(area.bounds.maxX - 0.5);
  });

  it('mọi NPC đứng ở chỗ trống và người chơi lại gần được', () => {
    for (const n of map.npcs) {
      const s = set.spots[n.spot]!;
      expect(isBlocked({ x: s.pos[0], z: s.pos[2] }, 0.36, area.colliders, area.bounds), `${n.characterId} trong vật cản`).toBe(false);
      expect(nearest(s.pos[0], s.pos[2]), `${n.characterId} không với tới`).toBeLessThan(NPC_REACH);
    }
  });

  it('đồ vật với tới được; điểm lên xe nằm trong vùng đi lại và không trong vật cản', () => {
    for (const o of map.objects ?? []) {
      const s = set.spots[o.spot]!;
      expect(nearest(s.pos[0], s.pos[2]), `${o.id} không với tới`).toBeLessThan(OBJECT_REACH);
      if (o.seat) {
        const seat = set.spots[o.seat]!;
        expect(isBlocked({ x: seat.pos[0], z: seat.pos[2] }, PLAYER_RADIUS, area.colliders, area.bounds), `${o.id}/${o.seat}`).toBe(false);
      }
    }
  });

  it('hàng chậu không chồng sạp quà và trạm xe buýt (hình dựng và va chạm dùng chung phoPots)', () => {
    const pots = phoPots();
    expect(pots.length).toBeGreaterThan(3);
    for (const p of pots) {
      expect(Math.abs(p.x - PHO_TET.stall.x), `chậu ${p.x}`).toBeGreaterThanOrEqual(PHO_TET.pots.skipNearStall);
      expect(Math.abs(p.x - PHO_TET.bus.x), `chậu ${p.x}`).toBeGreaterThanOrEqual(PHO_TET.pots.skipNearBus);
    }
  });

  it('người chơi (r 0.35) không đi vào được làn xe máy đầu tiên (z -0.9, xe rộng 0.64)', () => {
    expect(area.bounds.maxZ + PLAYER_RADIUS).toBeLessThan(-0.9 - 0.32);
  });
});
