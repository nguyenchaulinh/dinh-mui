import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { createGame } from './engine';
import { goalTargetKeys, objectDoneFlag, talkedFlag } from './quests';

const c = loadContent();
const map = c.maps.find((m) => m.id === 'cuoi-nam')!;

describe('goalTargetKeys: mục tiêu cần chỉ hướng', () => {
  it('đầu chặng: có việc nào thì có mục tiêu tương ứng, mọi khoá đều tồn tại trong bản đồ', () => {
    for (const persona of c.personas) {
      const g = createGame(c, persona.id, c.regions[0]!.id);
      const keys = goalTargetKeys(map, g);
      expect(keys.length, persona.id).toBeGreaterThan(0);
      const valid = new Set([...map.npcs.map((n) => n.characterId), ...(map.objects ?? []).map((o) => `obj:${o.id}`)]);
      for (const k of keys) expect(valid.has(k), `${persona.id}: ${k}`).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('không chỉ tới cửa ra khi còn khoá; việc xong rồi thì hết mục tiêu', () => {
    const g = createGame(c, 'moi-di-lam', c.regions[0]!.id);
    const exit = (map.objects ?? []).find((o) => o.action?.kind === 'exit');
    if (exit?.requires) expect(goalTargetKeys(map, g)).not.toContain(`obj:${exit.id}`);
    const done = { ...g, flags: [...g.flags, ...(map.objects ?? []).map((o) => objectDoneFlag(map.id, o)), ...map.npcs.map((n) => talkedFlag(map.id, n.characterId))] };
    expect(goalTargetKeys(map, done)).toEqual([]);
  });

  it('xong một việc thì mục tiêu đó biến mất khỏi danh sách', () => {
    const g = createGame(c, 'moi-di-lam', c.regions[0]!.id);
    const before = goalTargetKeys(map, g);
    const first = before[0]!;
    const obj = first.startsWith('obj:') ? (map.objects ?? []).find((o) => `obj:${o.id}` === first) : undefined;
    const flag = obj ? objectDoneFlag(map.id, obj) : talkedFlag(map.id, first);
    const after = goalTargetKeys(map, { ...g, flags: [...g.flags, flag] });
    expect(after).not.toContain(first);
    expect(after.length).toBe(before.length - 1);
  });

  it('dữ liệu bản đồ thiếu trường không ném lỗi', () => {
    const g = createGame(c, 'moi-di-lam', c.regions[0]!.id);
    expect(goalTargetKeys({ ...map, quests: [], npcs: [], objects: undefined }, g)).toEqual([]);
  });
});
