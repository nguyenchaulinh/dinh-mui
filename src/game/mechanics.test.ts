import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { createGame } from '../engine/engine';
import { completeQuests, mapAutoFlags } from '../engine/quests';
import type { MapNpc } from '../engine/types';
import { createLensState, stepLens, type LensParams } from './lens';
import { createNpcState, stepNpc } from './npc';
import { carryOver } from './journey';
import { buildNpcParams } from './roamDemo';
import { PLAYER_RADIUS } from './movement';
import { trafficBikes, trafficHit } from './traffic';

/**
 * Kiểm tra cơ chế theo ĐÚNG số liệu trong nội dung (v1.json), không phải số tự đặt trong test:
 * sửa số liệu mà làm cơ chế hỏng (không né nổi, hoặc quá dễ) thì test này báo ngay.
 */

const content = loadContent();
const DT = 1 / 60;
const free = (from: { x: number; z: number }, d: { x: number; z: number }) => ({ x: from.x + d.x, z: from.z + d.z });

function lensNpcs(): { mapId: string; npc: MapNpc }[] {
  return (content.maps ?? []).flatMap((m) => m.npcs.filter((n) => n.lens).map((npc) => ({ mapId: m.id, npc })));
}

/** Mô phỏng một người chơi quay ngang nhiều đoạn 2.5 s (đổi chiều mỗi đoạn) trong `seconds` giây; v = 0 là đứng im. */
function simulateLens(npcSpec: MapNpc, home: { x: number; z: number }, v: number, seconds = 60) {
  const params = buildNpcParams(npcSpec, false);
  const lens = npcSpec.lens!;
  const lp: LensParams = {
    range: lens.range,
    halfAngle: (lens.halfAngleDeg * Math.PI) / 180,
    holdSec: lens.holdSec,
    restSec: lens.restSec,
  };
  let npc = createNpcState(home, 0, 7);
  let state = createLensState();
  // Người chơi xuất phát cách 3.75 m phía trước NPC.
  let player = { x: home.x + 3.2, z: home.z + 0.15 };
  let recorded = 0;
  let escaped = 0;
  let dir = 1;
  let seg = 0;
  for (let t = 0; t < seconds; t += DT) {
    npc = stepNpc(params, home, npc, player, DT, free);
    const fx = Math.sin(npc.heading);
    const fz = Math.cos(npc.heading);
    player = { x: player.x + dir * fz * v * DT, z: player.z - dir * fx * v * DT };
    seg += DT;
    if (seg > 2.5) {
      seg = 0;
      dir = -dir;
    }
    const r = stepLens(state, DT, { params: lp, npc: npc.pos, npcHeading: npc.heading, player, paused: false });
    state = r.state;
    if (r.events.recorded) recorded++;
    if (r.events.escaped) escaped++;
  }
  return { recorded, escaped };
}

describe('ống kính livestream theo số liệu nội dung', () => {
  const list = lensNpcs();

  it('nội dung có ít nhất một NPC cầm ống kính', () => {
    expect(list.length).toBeGreaterThan(0);
  });

  it('NPC cầm ống kính xoay mặt chậm (người chơi đi vòng được) và không bị ngồi', () => {
    for (const { npc } of list) {
      expect(npc.turnRate ?? 99, npc.characterId).toBeLessThanOrEqual(0.6);
      expect(npc.behavior, npc.characterId).not.toBe('stand');
    }
  });

  it('đứng yên thì bị quay nhiều lần; đi ngang ở tốc độ đi bộ thì thoát được', async () => {
    const { SETS } = await import('../scene3d/registry');
    for (const { mapId, npc } of list) {
      const map = content.maps!.find((m) => m.id === mapId)!;
      const spot = SETS[map.setId]!.spots[npc.spot]!;
      const home = { x: spot.pos[0], z: spot.pos[2] };

      const still = simulateLens(npc, home, 0);
      expect(still.recorded, `${npc.characterId} đứng yên`).toBeGreaterThanOrEqual(3);

      const walking = simulateLens(npc, home, 2.2);
      expect(walking.escaped, `${npc.characterId} đi bộ`).toBeGreaterThanOrEqual(5);
      expect(walking.recorded, `${npc.characterId} đi bộ`).toBeLessThanOrEqual(2);

      const running = simulateLens(npc, home, 4.2);
      expect(running.escaped, `${npc.characterId} chạy`).toBeGreaterThanOrEqual(5);
      expect(running.recorded, `${npc.characterId} chạy`).toBeLessThanOrEqual(2);
    }
  });
});

describe('dòng xe máy theo số liệu nội dung', () => {
  const maps = (content.maps ?? []).filter((m) => m.traffic);

  it('nội dung có ít nhất một bản đồ có dòng xe', () => {
    expect(maps.length).toBeGreaterThan(0);
  });

  for (const m of maps) {
    const t = m.traffic!;
    const cfg = { lanes: t.lanes, count: t.count, length: t.length };

    // Băng thẳng qua đường từ vỉa hè này sang vỉa hè kia, bỏ qua việc nhìn xe, ở nhiều thời điểm và vị trí ngang.
    const blindSafeFraction = (v: number): number => {
      const bikes = trafficBikes(cfg);
      let ok = 0;
      let n = 0;
      for (let t0 = 0; t0 < 90; t0 += 0.25) {
        for (const x0 of [-4, -2, 0, 2, 4, 6, 8]) {
          n++;
          let hit = false;
          const dur = (t.safeSouthZ - t.safeNorthZ) / v;
          for (let s = 0; s <= dur && !hit; s += 0.02) {
            hit = trafficHit(bikes, cfg, t0 + s, { x: x0, z: t.safeNorthZ + v * s }, PLAYER_RADIUS);
          }
          if (!hit) ok++;
        }
      }
      return ok / n;
    };

    it(`${m.id}: băng bừa không nhìn xe thì rủi ro thật nhưng canh nhịp thì qua được`, () => {
      for (const v of [2.2, 4.2]) {
        const f = blindSafeFraction(v);
        expect(f, `${m.id} v=${v}`).toBeGreaterThan(0.25); // có khoảng trống để canh
        expect(f, `${m.id} v=${v}`).toBeLessThan(0.85); // không quá dễ để bỏ qua cơ chế
      }
    });

    it(`${m.id}: bị quẹt thì được đặt về chỗ đứng được (không kẹt trong vật cản), mọi vị trí ngang`, async () => {
      const { SETS } = await import('../scene3d/registry');
      const { walkAreaFor } = await import('../scene3d/walk');
      const { isBlocked } = await import('./collision');
      for (const style of ['bac', 'trung', 'nam'] as const) {
        const area = walkAreaFor(m.setId, style)!;
        expect(SETS[m.setId]).toBeTruthy();
        for (let x = area.bounds.minX + 0.5; x <= area.bounds.maxX - 0.5; x += 0.1) {
          for (const z of [t.safeNorthZ, t.safeSouthZ]) {
            expect(isBlocked({ x, z }, PLAYER_RADIUS, area.colliders, area.bounds), `${style} (${x.toFixed(1)}, ${z})`).toBe(false);
          }
        }
      }
    });
  }
});

describe('mọi chặng của hành trình hoàn thành được', () => {
  it('bật đủ cờ tự sinh của bản đồ (mỗi cờ chỉ một lần, theo mọi persona) thì các nhiệm vụ finish đều xong', () => {
    const steps = content.journey?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      const map = content.maps!.find((x) => x.id === step.mapId)!;
      for (const p of content.personas) {
        const g0 = createGame(content, p.id, [content.regions[0]!.id]);
        // Cờ "xấu" (bị quẹt, bị quay, bị trúng câu hỏi) không cần để hoàn thành: bỏ ra để chắc chắn chặng không đòi cờ xấu.
        const bad = new Set(['hit:1', 'bike-hit:1', 'lens-recorded:1']);
        const flags = mapAutoFlags(map).filter((f) => !f.startsWith('quest:') && !bad.has(f));
        const done = completeQuests(map.quests, { ...g0, flags });
        for (const q of step.finish) {
          expect(done.state.flags, `${step.id}/${p.id}`).toContain(`quest:${q}`);
        }
      }
    }
  });
});

describe('nối các chặng của hành trình', () => {
  it('cờ riêng của chặng trước không làm nhiệm vụ chặng sau tự hoàn thành (kể cả khi chặng trước làm đủ mọi việc)', () => {
    const steps = content.journey?.steps ?? [];
    expect(steps.length).toBeGreaterThan(1);
    for (let i = 0; i + 1 < steps.length; i++) {
      const a = content.maps!.find((m) => m.id === steps[i]!.mapId)!;
      const b = content.maps!.find((m) => m.id === steps[i + 1]!.mapId)!;
      const g0 = createGame(content, content.personas[0]!.id, content.regions.map((r) => r.id), 5);
      // Chặng trước: bật MỌI cờ tự sinh, cộng một cờ cốt truyện cần giữ.
      const finished = { ...g0, flags: [...mapAutoFlags(a), 'xem-mat'], regionIds: [content.regions[0]!.id] };
      const carried = carryOver(content, steps[i]!, finished, content.regions.map((r) => r.id));
      expect(carried.flags, 'giữ cờ cốt truyện').toContain('xem-mat');
      expect(carried.regionIds, 'trả danh sách vùng đầy đủ').toEqual(content.regions.map((r) => r.id));
      const { completed } = completeQuests(b.quests, carried);
      expect(
        completed.map((q) => q.id),
        `${steps[i]!.id} -> ${steps[i + 1]!.id}`,
      ).toEqual([]);
    }
  });

  it('không có carryOver thì rò cờ thật (xác nhận test có ý nghĩa)', () => {
    const steps = content.journey?.steps ?? [];
    let leaked = 0;
    for (let i = 0; i + 1 < steps.length; i++) {
      const a = content.maps!.find((m) => m.id === steps[i]!.mapId)!;
      const b = content.maps!.find((m) => m.id === steps[i + 1]!.mapId)!;
      const g0 = createGame(content, content.personas[0]!.id, [content.regions[0]!.id]);
      leaked += completeQuests(b.quests, { ...g0, flags: mapAutoFlags(a) }).completed.length;
    }
    expect(leaked).toBeGreaterThan(0);
  });
});
