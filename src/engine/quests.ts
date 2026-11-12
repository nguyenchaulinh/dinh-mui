import { applyEffects, matches } from './engine';
import type { GameState, MapEvent, MapNpc, MapObject, Objective, Quest, RoamMap } from './types';

/**
 * Luật chơi của một bản đồ đi lại, dựa trên CỜ của GameState (cùng hệ thống cờ với hội thoại). Cờ tự sinh mang
 * id bản đồ để không lẫn giữa các chặng (cùng một nhân vật có thể xuất hiện ở nhiều chặng):
 * - nói chuyện xong với NPC X -> `talked:<bản đồ>:X`; vuốt ve/tặng quà -> `petted:<bản đồ>:X`
 * - dùng đồ / ra cửa -> `used:<bản đồ>:<đồ>`; nhặt đồ -> `picked:<bản đồ>:<đồ>`; sự kiện đã bật -> `event:<bản đồ>:<id>`
 * - né được n câu trong bản đồ -> `dodged:<bản đồ>:<n>` (n thuộc DODGE_MILESTONES); bị trúng lần đầu -> `hit:<bản đồ>`
 * - né được tổng cộng n câu cả hành trình -> `dodged:<n>` (n thuộc DODGE_TOTAL_MILESTONES; dùng cho kết thúc)
 * - hoàn thành nhiệm vụ Q -> `quest:Q` (id nhiệm vụ không trùng giữa các bản đồ)
 */

/** Các mốc số câu đã né trong MỘT bản đồ, tạo cờ `dodged:<bản đồ>:<n>`. */
export const DODGE_MILESTONES: readonly number[] = [1, 3, 5];
/** Các mốc tổng số câu đã né cả hành trình, tạo cờ `dodged:<n>`. */
export const DODGE_TOTAL_MILESTONES: readonly number[] = [3, 5, 8];

export const talkedFlag = (mapId: string, npcKey: string): string => `talked:${mapId}:${npcKey}`;
export const pettedFlag = (mapId: string, npcKey: string): string => `petted:${mapId}:${npcKey}`;
export const usedFlag = (mapId: string, objectId: string): string => `used:${mapId}:${objectId}`;
export const pickedFlag = (mapId: string, objectId: string): string => `picked:${mapId}:${objectId}`;
export const eventFlag = (mapId: string, eventId: string): string => `event:${mapId}:${eventId}`;
export const dodgedFlag = (mapId: string, n: number): string => `dodged:${mapId}:${n}`;
export const totalDodgedFlag = (n: number): string => `dodged:${n}`;
export const hitFlag = (mapId: string): string => `hit:${mapId}`;
export const questFlag = (questId: string): string => `quest:${questId}`;

type Ctx = Pick<GameState, 'personaId' | 'regionId' | 'flags' | 'history'>;

/** Thứ chỉ có với một số vai (NPC, đồ vật, mục tiêu) có áp dụng cho vai này không. */
export const forPersona = (x: { personas?: string[] }, personaId: string): boolean =>
  !x.personas || x.personas.includes(personaId);

/** Cờ mà một NPC/đồ vật tạo ra khi xong tương tác. */
export const npcDoneFlag = (mapId: string, n: MapNpc): string =>
  n.action?.kind === 'pet' ? pettedFlag(mapId, n.characterId) : talkedFlag(mapId, n.characterId);
export const objectDoneFlag = (mapId: string, o: MapObject): string =>
  o.action?.kind === 'pickup' ? pickedFlag(mapId, o.id) : usedFlag(mapId, o.id);

/** Mọi cờ mà bản đồ này có thể tự sinh (để validate cờ gõ sai trong điều kiện nhiệm vụ). */
export function mapAutoFlags(map: RoamMap): string[] {
  const flags: string[] = [];
  // Chịu được dữ liệu thiếu trường (JSON viết tay): validate sẽ báo lỗi dễ đọc thay vì ném TypeError ở đây.
  for (const n of map.npcs ?? []) {
    flags.push(npcDoneFlag(map.id, n));
    if (n.shoots) flags.push(...DODGE_MILESTONES.map((k) => dodgedFlag(map.id, k)), hitFlag(map.id));
  }
  for (const o of map.objects ?? []) flags.push(objectDoneFlag(map.id, o));
  for (const e of map.events ?? []) flags.push(eventFlag(map.id, e.id));
  for (const q of map.quests ?? []) flags.push(questFlag(q.id));
  return flags;
}

/** Cờ tổng số câu né (không gắn bản đồ nào), có thể bật ở bất kỳ chặng có NPC bắn câu hỏi. */
export const totalDodgeFlags = (): string[] => DODGE_TOTAL_MILESTONES.map(totalDodgedFlag);

/** Cờ cần bật khi vừa né thêm một câu: mốc của bản đồ (số đã né trong bản đồ) và mốc tổng (cả hành trình). */
export function dodgeFlags(mapId: string, dodgedInMap: number, dodgedTotal: number): string[] {
  return [
    ...DODGE_MILESTONES.filter((n) => n === dodgedInMap).map((n) => dodgedFlag(mapId, n)),
    ...DODGE_TOTAL_MILESTONES.filter((n) => n === dodgedTotal).map(totalDodgedFlag),
  ];
}

export function objectiveDone(o: Objective, state: Ctx): boolean {
  return matches(o.done, state);
}

/** Mục tiêu của nhiệm vụ áp dụng cho vai của người chơi. */
export const objectivesFor = (q: Quest, state: Pick<GameState, 'personaId'>): Objective[] =>
  q.objectives.filter((o) => forPersona(o, state.personaId));

export function questProgress(q: Quest, state: Ctx): { done: number; total: number; complete: boolean } {
  const list = objectivesFor(q, state);
  const done = list.filter((o) => objectiveDone(o, state)).length;
  return { done, total: list.length, complete: list.length > 0 && done === list.length };
}

/** Nhiệm vụ đã được ghi nhận hoàn thành (có cờ `quest:<id>`). */
export function questRecorded(q: Quest, state: Pick<GameState, 'flags'>): boolean {
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

/** Chặng của bản đồ đã xong: nhiệm vụ đích đã được ghi nhận. */
export function mapGoalReached(map: RoamMap, state: Pick<GameState, 'flags'>): boolean {
  const q = map.quests.find((x) => x.id === map.goalQuestId);
  return q !== undefined && questRecorded(q, state);
}

/** Đồ vật đã dùng được chưa (không có điều kiện thì luôn được). */
export function objectUnlocked(o: MapObject, state: Ctx): boolean {
  return matches(o.requires, state);
}

/** Sự kiện đầu tiên đến lượt bật: đủ điều kiện, chưa bật lần nào. Null nếu không có. */
export function dueEvent(map: RoamMap, state: Ctx): MapEvent | null {
  for (const e of map.events ?? []) {
    if (!state.flags.includes(eventFlag(map.id, e.id)) && matches(e.when, state)) return e;
  }
  return null;
}

/** Thêm cờ nếu chưa có (không đổi state vào). */
export function withFlag(state: GameState, flag: string): GameState {
  return state.flags.includes(flag) ? state : { ...state, flags: [...state.flags, flag] };
}

/** Thêm nhiều cờ (bỏ qua cờ đã có). */
export function withFlags(state: GameState, flags: readonly string[]): GameState {
  return flags.reduce((s, f) => withFlag(s, f), state);
}
