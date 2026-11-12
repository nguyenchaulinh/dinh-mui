import { choose, createGame, finishGame, getView, pickScene } from '../engine/engine';
import { completeQuests, dodgedFlag, mapGoalReached, pettedFlag, talkedFlag, withFlag } from '../engine/quests';
import type { Content, GameState, RoamMap } from '../engine/types';

/**
 * Mô phỏng một chặng chơi để kiểm tra nội dung (chỉ dùng trong test): duyệt MỌI tổ hợp câu đáp với mọi NPC
 * (mỗi NPC có thể bỏ qua), vuốt ve thú cưng hay không, và có né đủ các mốc câu hỏi hay không.
 * Chỉ tính các lượt chơi kết thúc được: hoàn thành nhiệm vụ đích, hoặc một chỉ số về 0 giữa chừng.
 * Không mô phỏng việc bị bong bóng trúng nhiều lần (đó là hành vi lặp, không phải lựa chọn nội dung).
 */
export function endingsOfMap(
  content: Content,
  map: RoamMap,
  personaId: string,
  regionId: string,
  dodgeMilestones: readonly number[],
  onEnd?: (final: GameState) => void,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const record = (s: GameState) => {
    counts[s.endingId!] = (counts[s.endingId!] ?? 0) + 1;
    onEnd?.(s);
  };

  type Step = (s: GameState) => GameState[];
  const steps: Step[] = map.npcs.map((npc): Step => {
    const key = npc.characterId;
    const a = npc.action;
    if (a.kind === 'pet') {
      return (s) => [s, withFlag({ ...s, stats: applyPet(s, a.effects) }, pettedFlag(key))];
    }
    return (s) => {
      const scene = pickScene(content, s, a.sceneIds);
      const out = [s]; // bỏ qua NPC này
      if (!scene) return out;
      for (const ch of getView(content, s, scene.id).choices) {
        const r = choose(content, s, scene.id, ch.id).state;
        out.push(r.endingId === null ? withFlag(r, talkedFlag(key)) : r);
      }
      return out;
    };
  });

  const finishRun = (s: GameState) => {
    if (s.endingId !== null) return record(s);
    let g = s;
    for (const n of dodgeMilestones) g = withFlag(g, dodgedFlag(n));
    g = completeQuests(map.quests, g).state;
    if (mapGoalReached(map, g)) record(finishGame(content, g));
  };

  const walk = (i: number, s: GameState): void => {
    if (s.endingId !== null || i === steps.length) return finishRun(s);
    for (const next of steps[i]!(s)) walk(i + 1, next);
  };
  walk(0, createGame(content, personaId, regionId));
  return counts;
}

function applyPet(s: GameState, effects: Partial<Record<'harmony' | 'stamina' | 'wallet', number>>): GameState['stats'] {
  const next = { ...s.stats };
  for (const k of ['harmony', 'stamina', 'wallet'] as const) next[k] = Math.min(100, Math.max(0, next[k] + (effects[k] ?? 0)));
  return next;
}
