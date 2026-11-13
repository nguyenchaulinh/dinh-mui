import { applyEffects, matches } from './engine';
import type { GameState, Objective, Quest, RoamMap } from './types';

/**
 * Nhiệm vụ trong chế độ đi lại. Mọi thứ dựa trên CỜ của GameState (cùng hệ thống cờ với hội thoại):
 * - nói chuyện xong với NPC X -> cờ `talked:X`; vuốt ve/tặng quà xong -> `petted:X`
 * - né được n câu hỏi -> `dodged:n` (n thuộc DODGE_MILESTONES); bị trúng lần đầu -> `hit:1`
 * - mời ăn xong NPC X -> `served:X`; lấy đồ ở trạm S -> `picked:S`; dùng trạm S -> `used:S`; lên xe ở trạm S -> `boarded:S`
 * - bước vào vùng Z -> `zone:Z`
 * - thoát được ống kính livestream n lần -> `lens-escaped:n`; bị quay lần đầu -> `lens-recorded:1`
 * - bị xe máy quẹt lần đầu -> `bike-hit:1`
 * - hoàn thành nhiệm vụ Q -> `quest:Q`
 */

/** Các mốc số câu hỏi đã né tạo cờ `dodged:<n>`. */
export const DODGE_MILESTONES: readonly number[] = [1, 3, 5];

export const talkedFlag = (npcKey: string): string => `talked:${npcKey}`;
export const pettedFlag = (npcKey: string): string => `petted:${npcKey}`;
export const dodgedFlag = (n: number): string => `dodged:${n}`;
export const questFlag = (questId: string): string => `quest:${questId}`;
export const HIT_FLAG = 'hit:1';
export const servedFlag = (npcKey: string): string => `served:${npcKey}`;
export const pickedFlag = (stationId: string): string => `picked:${stationId}`;
export const usedFlag = (stationId: string): string => `used:${stationId}`;
export const boardedFlag = (stationId: string): string => `boarded:${stationId}`;
export const zoneFlag = (zoneId: string): string => `zone:${zoneId}`;
/** Các mốc số lần thoát ống kính tạo cờ `lens-escaped:<n>`. */
export const LENS_MILESTONES: readonly number[] = [1, 3, 5];
export const lensEscapedFlag = (n: number): string => `lens-escaped:${n}`;
export const LENS_RECORDED_FLAG = 'lens-recorded:1';
export const BIKE_HIT_FLAG = 'bike-hit:1';

/** Mọi cờ mà bản đồ này có thể tự sinh (để validate cờ gõ sai trong điều kiện nhiệm vụ). */
export function mapAutoFlags(map: RoamMap): string[] {
  const flags: string[] = [];
  // Chịu được dữ liệu thiếu trường (JSON viết tay): validate sẽ báo lỗi dễ đọc thay vì ném TypeError ở đây.
  for (const n of map.npcs ?? []) {
    flags.push(n.action?.kind === 'pet' ? pettedFlag(n.characterId) : talkedFlag(n.characterId));
    if (n.shoots) flags.push(...DODGE_MILESTONES.map(dodgedFlag), HIT_FLAG);
    if (n.serve) flags.push(servedFlag(n.characterId));
    if (n.lens) flags.push(...LENS_MILESTONES.map(lensEscapedFlag), LENS_RECORDED_FLAG);
  }
  for (const st of map.stations ?? []) {
    const k = st.action?.kind;
    if (k === 'pickup') flags.push(pickedFlag(st.id));
    else if (k === 'use') flags.push(usedFlag(st.id));
    else if (k === 'board') flags.push(boardedFlag(st.id));
  }
  for (const z of map.zones ?? []) flags.push(zoneFlag(z.id));
  if (map.traffic) flags.push(BIKE_HIT_FLAG);
  for (const q of map.quests ?? []) flags.push(questFlag(q.id));
  return flags;
}

type Ctx = Pick<GameState, 'personaId' | 'regionIds' | 'seed' | 'flags' | 'history'>;

export function objectiveDone(o: Objective, state: Ctx): boolean {
  return matches(o.done, state);
}

export function questProgress(q: Quest, state: Ctx): { done: number; total: number; complete: boolean } {
  const done = q.objectives.filter((o) => objectiveDone(o, state)).length;
  return { done, total: q.objectives.length, complete: q.objectives.length > 0 && done === q.objectives.length };
}

/** Nhiệm vụ đã được ghi nhận hoàn thành (có cờ `quest:<id>`). */
export function questRecorded(q: Quest, state: Ctx): boolean {
  return state.flags.includes(questFlag(q.id));
}

/**
 * Ghi nhận mọi nhiệm vụ vừa đủ điều kiện: áp thưởng chỉ số, bật cờ `quest:<id>`. Thuần (không đổi state vào).
 * Lặp tới khi ổn định vì cờ `quest:...` có thể là điều kiện của nhiệm vụ khác (có giới hạn để chống vòng lặp).
 */
export function completeQuests(quests: readonly Quest[], state: GameState): { state: GameState; completed: Quest[] } {
  let cur = state;
  const completed: Quest[] = [];
  for (let round = 0; round <= quests.length; round++) {
    const next = quests.filter((q) => !questRecorded(q, cur) && questProgress(q, cur).complete);
    if (next.length === 0) break;
    for (const q of next) {
      cur = {
        ...cur,
        stats: q.reward ? applyEffects(cur.stats, q.reward) : cur.stats,
        flags: [...cur.flags, questFlag(q.id)],
      };
      completed.push(q);
    }
  }
  return { state: cur, completed };
}

/** Thêm cờ nếu chưa có (không đổi state vào). */
export function withFlag(state: GameState, flag: string): GameState {
  return state.flags.includes(flag) ? state : { ...state, flags: [...state.flags, flag] };
}
