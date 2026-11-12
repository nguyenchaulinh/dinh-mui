import type { Effects } from '../engine/types';
import { DEFAULT_NPC, type Behavior, type NpcParams } from './npc';

/**
 * Dữ liệu bản thử chế độ đi lại (bước 2): ai ở đâu, hành vi ra sao, tương tác thì xảy ra gì.
 * Hội thoại dùng lại scene sẵn có trong src/content/v1.json (engine hội thoại giữ nguyên).
 */

export type NpcAction =
  /** Nói chuyện: mở scene hội thoại đầu tiên hợp với persona/vùng trong `sceneIds`; xong thì `after` là câu nói lại. */
  | { kind: 'talk'; sceneIds: string[]; after: string }
  /** Vuốt ve / tặng quà: một câu và hiệu ứng chỉ số, chỉ có tác dụng một lần; sau đó `after`. */
  | { kind: 'pet'; line: string; effects: Effects; after: string };

export interface RoamNpcSpec {
  /** Id nhân vật trong content.characters (cũng là khoá của NPC). */
  key: string;
  /** Vị trí xuất phát = tên spot trong registry của set. */
  spot: string;
  behavior: Behavior;
  speed?: number;
  leash?: number;
  aware?: number;
  stopDist?: number;
  /** Tầm tương tác (m); thiếu thì dùng mặc định. Vuốt ve chó phải lại thật gần (không đóng băng nó giữa đường chạy). */
  reach?: number;
  /** Chữ trên nút tương tác, ví dụ "Nói chuyện". */
  prompt: string;
  action: NpcAction;
}

export const ROAM_NPCS: readonly RoamNpcSpec[] = [
    {
      key: 'co-hai',
      spot: 'ghe-1',
      behavior: 'stand',
      aware: 0,
      prompt: 'Nói chuyện',
      action: {
        kind: 'talk',
        sceneIds: ['bvn-1-dl', 'bvn-1-dt', 'bvn-1-sv'],
        after: 'Ăn miếng bánh đi con, đứng đó làm gì.',
      },
    },
    {
      key: 'bac-ca',
      spot: 'ghe-2',
      behavior: 'stand',
      aware: 0,
      prompt: 'Nói chuyện',
      action: { kind: 'talk', sceneIds: ['bvn-2'], after: 'Hôm nay bác nói vậy thôi, đừng để bụng.' },
    },
    {
      key: 'ba-tam',
      spot: 'ghe-3',
      behavior: 'stand',
      aware: 0,
      prompt: 'Chào',
      action: { kind: 'talk', sceneIds: ['bvn-3'], after: 'Bà đăng rồi nhé, 47 người thả tim đó!' },
    },
    {
      key: 'vang',
      spot: 'goc-san',
      behavior: 'approach',
      speed: 1.9,
      leash: 3.5,
      aware: 6,
      stopDist: 1.0,
      reach: 1.5,
      prompt: 'Vuốt ve',
      action: {
        kind: 'pet',
        line: 'Vàng dụi đầu vào tay bạn, vẫy đuôi tít mù. Bạn thấy khỏe hẳn ra.',
        effects: { stamina: 8 },
        after: 'Vàng liếm tay bạn, rồi lại chạy đi đâu mất.',
      },
    },
    {
      key: 'bin',
      spot: 'be-de',
      behavior: 'approach',
      speed: 2.6,
      leash: 3,
      aware: 9,
      // Dừng trong vùng "rất gần" (<= 1.0 m) để luôn tương tác được dù đuổi kịp từ phía sau.
      stopDist: 0.95,
      prompt: 'Nói chuyện',
      action: { kind: 'talk', sceneIds: ['roam-bin'], after: 'Em cảm ơn anh/chị! Em đi quay clip đây.' },
    },
];

export const ROAM_DEMO = { setId: 'san-nha', playerId: 'ban', npcs: ROAM_NPCS } as const;

/**
 * Thông số hành vi thật của một NPC. Người đang ngồi (spot.seated) luôn đứng yên và không quay mặt,
 * dù dữ liệu ghi gì: ngồi mà đi lang thang thì xuyên qua bàn.
 */
export function buildNpcParams(spec: RoamNpcSpec, seated: boolean): NpcParams {
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
