import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { resolveCharacter } from '../engine/engine';
import { SETS } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { isBlocked, resolveMove } from './collision';
import { DEFAULT_MOVE, PLAYER_RADIUS, stepMover } from './movement';
import { createNpcState, stepNpc, type NpcState } from './npc';
import { buildNpcParams, getRoamMap } from './roamDemo';
import { buildRoamWorld, type RoamNpc } from './roamWorld';
import type { MoverState, Vec2 } from './types';

const content = loadContent();
const map = getRoamMap(content, 'san-nha')!;
const set = SETS[map.setId]!;
const STYLES = ['bac', 'trung', 'nam'] as const;

function npcsFor(): RoamNpc[] {
  return map.npcs.map((spec) => ({
    key: spec.characterId,
    look: resolveCharacter(content, spec.characterId).look,
    spot: spec.spot,
    params: buildNpcParams(spec, set.spots[spec.spot]?.seated === true),
    reach: spec.reach,
    shoots: spec.shoots,
  }));
}

describe('buildRoamWorld', () => {
  it('NPC đi lại có vòng va chạm riêng, NPC ngồi/đứng dùng vòng cố định', () => {
    const area = walkAreaFor(map.setId, 'bac')!;
    const { runtimes } = buildRoamWorld(npcsFor(), set, area);
    const byKey = Object.fromEntries(runtimes.map((r) => [r.npc.key, r]));
    expect(byKey['vang']!.dynamic).toBe(true);
    expect(byKey['bin']!.dynamic).toBe(true);
    expect(byKey['co-hai']!.dynamic).toBe(false);
    expect(byKey['co-hai']!.seated).toBe(true);
    expect(byKey['vang']!.col.id).toBe('npc-vang');
  });

  it('vật cản của NGƯỜI CHƠI không gồm NPC đi lại (tránh soft-lock), nhưng gồm NPC ngồi', () => {
    const area = walkAreaFor(map.setId, 'bac')!;
    const { playerColliders, runtimes } = buildRoamWorld(npcsFor(), set, area);
    for (const r of runtimes) {
      expect(playerColliders.includes(r.col), r.npc.key).toBe(!r.dynamic);
    }
  });

  it('NPC đi lại tránh người chơi và NPC đi lại khác, nhưng không tránh chính mình', () => {
    const area = walkAreaFor(map.setId, 'bac')!;
    const { runtimes, world } = buildRoamWorld(npcsFor(), set, area);
    const vang = runtimes.find((r) => r.npc.key === 'vang')!;
    const bin = runtimes.find((r) => r.npc.key === 'bin')!;
    expect(vang.obstacles).toContain(world.playerCol);
    expect(vang.obstacles).toContain(bin.col);
    expect(vang.obstacles).not.toContain(vang.col);
  });

  it('spot không tồn tại thì bỏ qua NPC đó, không ném lỗi', () => {
    const area = walkAreaFor(map.setId, 'bac')!;
    const bad: RoamNpc = { ...npcsFor()[0]!, spot: 'khong-co' };
    const built = buildRoamWorld([bad], set, area);
    expect(built.runtimes).toHaveLength(0);
    expect(built.world.targets).toHaveLength(0);
  });
});

/**
 * Mô phỏng headless đúng vòng khung hình của RoamView: người chơi (stepMover + resolveMove với playerColliders)
 * và từng NPC (stepNpc với vật cản riêng), 60 FPS cố định.
 */
function simulate(style: (typeof STYLES)[number]) {
  const area = walkAreaFor(map.setId, style)!;
  const built = buildRoamWorld(npcsFor(), set, area);
  const { world, runtimes, playerColliders } = built;
  const states = new Map<string, NpcState>(
    runtimes.map((r) => [r.npc.key, createNpcState(r.home, r.spot.rotY ?? 0, 1000 + r.npc.key.length)]),
  );
  let player: MoverState = {
    pos: { x: area.spawn.x, z: area.spawn.z },
    vel: { x: 0, z: 0 },
    heading: area.spawn.rotY,
    speed: 0,
  };
  const dt = 1 / 60;
  const resolvePlayer = (from: Vec2, delta: Vec2) => resolveMove(from, delta, PLAYER_RADIUS, playerColliders, area.bounds);

  /** Một khung: `dir` là hướng muốn đi trong thế giới (đã chuẩn hoá hoặc 0), camera yaw 0 (tiến = -z, phải = +x). */
  function frame(dir: Vec2) {
    player = stepMover(player, { x: dir.x, y: -dir.z, run: false }, 0, DEFAULT_MOVE, dt, resolvePlayer);
    world.player.x = player.pos.x;
    world.player.z = player.pos.z;
    world.playerCol.x = player.pos.x;
    world.playerCol.z = player.pos.z;
    for (const rt of runtimes) {
      const resolve = (from: Vec2, delta: Vec2) => resolveMove(from, delta, rt.radius, rt.obstacles, world.bounds);
      const s = stepNpc(rt.npc.params, rt.home, states.get(rt.npc.key)!, world.player, dt, resolve);
      states.set(rt.npc.key, s);
      rt.target.x = s.pos.x;
      rt.target.z = s.pos.z;
      (rt.col as { x: number; z: number }).x = s.pos.x;
      (rt.col as { x: number; z: number }).z = s.pos.z;
    }
  }

  const idle = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) frame({ x: 0, z: 0 });
  };
  /** Đi tới điểm (tối đa `limit` giây); trả về true nếu tới trong 0.35 m. */
  const walkTo = (to: Vec2, limit: number): boolean => {
    for (let i = 0; i < Math.round(limit / dt); i++) {
      const dx = to.x - player.pos.x;
      const dz = to.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) return true;
      frame({ x: dx / d, z: dz / d });
    }
    return false;
  };

  return { area, world, runtimes, states, idle, walkTo, get player() { return player; }, playerColliders };
}

describe('mô phỏng chế độ đi lại với NPC (hồi quy soft-lock)', () => {
  for (const style of STYLES) {
    it(`miền ${style}: vào hẻm cạnh bàn trà khi chó và Bin vây quanh rồi vẫn đi ra được`, () => {
      const sim = simulate(style);
      // Đi tới gần chậu hoa bên trái bàn trà và chờ chó + Bin tụ lại quanh mình.
      expect(sim.walkTo({ x: -2.15, z: 1.0 }, 12)).toBe(true);
      sim.idle(4);
      // Vào hẻm sát tường nhà (có thể không tới nơi vì hẻm hẹp: không quan trọng), chờ NPC đỗ ở miệng hẻm.
      sim.walkTo({ x: -2.15, z: -1.45 }, 6);
      sim.idle(3);
      // Phải ra được, bất kể NPC đang đứng ở đâu.
      expect(sim.walkTo({ x: -2.15, z: 2.5 }, 10), `kẹt tại (${sim.player.pos.x.toFixed(2)}, ${sim.player.pos.z.toFixed(2)})`).toBe(true);
    });

    it(`miền ${style}: hẻm bên phải (giữa Bà Tám và cây quất) cũng ra được`, () => {
      const sim = simulate(style);
      expect(sim.walkTo({ x: 2.15, z: 1.0 }, 12)).toBe(true);
      sim.idle(4);
      sim.walkTo({ x: 2.15, z: -1.45 }, 6);
      sim.idle(3);
      expect(sim.walkTo({ x: 2.15, z: 2.5 }, 10), `kẹt tại (${sim.player.pos.x.toFixed(2)}, ${sim.player.pos.z.toFixed(2)})`).toBe(true);
    });

    it(`miền ${style}: 60 giây đi ngẫu nhiên, người chơi không bao giờ nằm trong vật cản và không NaN`, () => {
      const sim = simulate(style);
      let seed = 12345;
      const rnd = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let k = 0; k < 30; k++) {
        const to = { x: (rnd() - 0.5) * 8, z: -3 + rnd() * 9 };
        sim.walkTo(to, 2);
        const p = sim.player.pos;
        expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
        expect(isBlocked(p, PLAYER_RADIUS - 0.02, sim.playerColliders, sim.area.bounds)).toBe(false);
      }
    });
  }
});
