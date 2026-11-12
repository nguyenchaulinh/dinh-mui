import type { Content, MapNpc, RoamMap } from '../engine/types';
import { DEFAULT_NPC, type NpcParams } from './npc';

/**
 * Cầu nối giữa dữ liệu bản đồ trong nội dung (src/content/v1.json, mục "maps") và chế độ đi lại.
 * NPC, hành động, nhiệm vụ đều khai báo trong JSON; ở đây chỉ tra cứu và đổi thành thông số hành vi.
 */

/** Tìm bản đồ theo id; không có thì null. */
export function getRoamMap(content: Content, id: string): RoamMap | null {
  return content.maps.find((m) => m.id === id) ?? null;
}

/**
 * Thông số hành vi thật của một NPC. Người đang ngồi (spot.seated) luôn đứng yên và không quay mặt,
 * dù dữ liệu ghi gì: ngồi mà đi lại thì xuyên qua bàn.
 */
export function buildNpcParams(spec: MapNpc, seated: boolean): NpcParams {
  if (seated) return { ...DEFAULT_NPC, behavior: 'stand', aware: 0 };
  return {
    ...DEFAULT_NPC,
    behavior: spec.behavior,
    speed: spec.speed ?? DEFAULT_NPC.speed,
    leash: spec.leash ?? DEFAULT_NPC.leash,
    aware: spec.aware ?? DEFAULT_NPC.aware,
    stopDist: spec.stopDist ?? DEFAULT_NPC.stopDist,
  };
}
