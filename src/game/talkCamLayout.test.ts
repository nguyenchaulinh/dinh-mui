import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { SETS, type RegionStyle } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { computeTalkPose, fovForAspect } from './camera';
import { clipRay, isBlocked } from './collision';
import { PLAYER_RADIUS } from './movement';
import type { Collider } from './types';

/**
 * Không xem được hình thì phải chứng minh bằng hình học: trên bố cục thật của từng chặng, với màn hình điện thoại dọc,
 * mọi chỗ người chơi có thể đứng để nói chuyện với một NPC thì camera hội thoại phải cho thấy người chơi (và gần như luôn
 * cả NPC). Lỗi gốc: văn phòng chật ép camera còn ~1.8 m, màn dọc chỉ thấy ~0.8 m bề ngang nên cả hai ra ngoài khung,
 * người chơi chỉ thấy sàn nhà.
 */
const content = loadContent();
const ASPECT = 369 / 772; // ảnh chụp iPhone của người dùng
const VFOV = (fovForAspect(ASPECT) * Math.PI) / 180;
const TAN_H = Math.tan(VFOV / 2) * ASPECT;
const REACH = 2.1; // INTERACT_DIST
const STEP = 0.25;

/** Một điểm có nằm trong khung ngang không (tính theo tan góc lệch trục nhìn), kèm điều kiện ở phía trước camera. */
function inFrame(pose: { pos: number[]; lookAt: number[] }, x: number, z: number): boolean {
  const ax = pose.lookAt[0]! - pose.pos[0]!;
  const az = pose.lookAt[2]! - pose.pos[2]!;
  const al = Math.hypot(ax, az);
  const vx = x - pose.pos[0]!;
  const vz = z - pose.pos[2]!;
  const fwd = (vx * ax + vz * az) / al;
  return fwd > 0.3 && Math.abs(vx * az - vz * ax) / al / fwd <= TAN_H;
}

const CASES: { map: string; style: RegionStyle }[] = [
  { map: 'cuoi-nam', style: 'bac' },
  { map: 'san-nha', style: 'bac' },
  { map: 'san-nha', style: 'trung' },
  { map: 'san-nha', style: 'nam' },
];

describe('camera hội thoại trên bố cục thật, màn hình điện thoại dọc', () => {
  it('góc nhìn dọc rộng hơn trên màn dọc, giữ nguyên trên màn ngang', () => {
    expect(fovForAspect(16 / 9)).toBe(50);
    expect(fovForAspect(1)).toBe(50);
    expect(fovForAspect(ASPECT)).toBeGreaterThan(70);
    expect(fovForAspect(ASPECT)).toBeLessThanOrEqual(76);
    expect(fovForAspect(0.2)).toBeLessThanOrEqual(76);
    expect(fovForAspect(NaN)).toBe(50);
  });

  for (const { map: mapId, style } of CASES) {
    it(`${mapId} (${style}): người chơi luôn trong khung, NPC gần như luôn trong khung`, () => {
      const map = content.maps.find((m) => m.id === mapId)!;
      const set = SETS[mapId]!;
      const area = walkAreaFor(mapId, style)!;
      const talkColliders: Collider[] = area.colliders.filter((c) => c.id !== 'npc').map((c) => ({ ...c, blocksCamera: true }));
      const clip = (o: { x: number; z: number }, d: { x: number; z: number }, m: number) => clipRay(o, d, m, talkColliders);
      const { minX, maxX, minZ, maxZ } = area.bounds;

      let samples = 0;
      let playerOut = 0;
      let npcOut = 0;
      const bad: string[] = [];
      for (const n of map.npcs) {
        const s = set.spots[n.spot];
        if (!s) continue;
        const npc = { x: s.pos[0], z: s.pos[2] };
        for (let x = npc.x - REACH; x <= npc.x + REACH; x += STEP) {
          for (let z = npc.z - REACH; z <= npc.z + REACH; z += STEP) {
            if (Math.hypot(x - npc.x, z - npc.z) > REACH || x < minX || x > maxX || z < minZ || z > maxZ) continue;
            if (isBlocked({ x, z }, PLAYER_RADIUS, area.colliders, area.bounds)) continue;
            samples++;
            const pose = computeTalkPose({ x, z }, npc, ASPECT, VFOV, clip);
            const pOk = inFrame(pose, x, z);
            const nOk = inFrame(pose, npc.x, npc.z);
            if (!pOk) {
              playerOut++;
              if (bad.length < 5) bad.push(`${n.characterId} người chơi (${x.toFixed(2)}, ${z.toFixed(2)})`);
            }
            if (!nOk) npcOut++;
          }
        }
      }
      expect(samples).toBeGreaterThan(50);
      expect(playerOut, `người chơi ra khỏi khung: ${bad.join('; ')}`).toBe(0);
      expect(npcOut / samples, `NPC ra khỏi khung ${npcOut}/${samples}`).toBeLessThan(0.1);
    });
  }
});
