import { describe, expect, it } from 'vitest';
import { loadContent } from './index';
import { GA_HA_NOI, OTHER_CITIES, PHO_HANG_MA } from './places';
import { SETS } from '../scene3d/registry';
import { STATION_SIGN, STALL_SIGN } from '../scene3d/decorText';
import setsSrc from '../scene3d/sets.tsx?raw';
import { PHO_TET, walkAreaFor } from '../scene3d/walk';

/** Mọi chuỗi trong nội dung (trừ khoá), để canh quy tắc "chỉ Hà Nội". */
function strings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) for (const v of o) strings(v, out);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) strings(v, out);
  return out;
}

describe('game chỉ ở Hà Nội', () => {
  const c = loadContent();
  const all = strings({ ...c, regions: undefined });

  it('chỉ còn một vùng là Hà Nội, và không còn biến thể câu thoại theo vùng', () => {
    expect(c.regions.map((r) => r.id)).toEqual(['ha-noi']);
    expect(JSON.stringify(c)).not.toMatch(/ByRegion/);
  });

  it('không chuỗi nào nhắc thành phố khác', () => {
    for (const city of OTHER_CITIES) {
      const hit = all.find((s) => s.toLowerCase().includes(city.toLowerCase()));
      expect(hit, `nhắc "${city}": ${hit}`).toBeUndefined();
    }
  });

  it('mọi lần nhắc "Ga Hà Nội" kèm nhãn địa chỉ chỉ dùng đúng địa chỉ đã xác minh', () => {
    const withAddr = all.filter((s) => /Ga Hà Nội\s*[(·,]\s*\d+/.test(s)); // số nhà ngay sau tên ga
    expect(withAddr.length).toBeGreaterThanOrEqual(2);
    for (const s of withAddr) expect(s, s).toContain(GA_HA_NOI.address);
    // Số nhà lạ gắn vào phố Hàng Mã (chưa xác minh số nhà) là lỗi.
    for (const s of all.filter((x) => x.includes(PHO_HANG_MA.name))) expect(s, s).not.toMatch(/Hàng Mã[^.,;]{0,6}\d/);
  });

  it('không còn gọi nơi lên tàu là "trạm xe buýt" (đã đổi thành Ga Hà Nội)', () => {
    expect(all.find((s) => /xe buýt/i.test(s))).toBeUndefined();
  });

  it('biển trong cảnh dùng đúng tên và địa chỉ trong places.ts', () => {
    expect(STATION_SIGN.map((l) => l.text).join(' ')).toContain(GA_HA_NOI.name.toUpperCase());
    expect(STATION_SIGN.map((l) => l.text).join(' ')).toContain(GA_HA_NOI.address);
    expect(STALL_SIGN[0]!.text).toContain('HÀNG MÃ');
    expect(setsSrc).toContain('STATION_SIGN');
    expect(setsSrc).toContain('STALL_SIGN');
    expect(SETS['pho-tet']!.label).toContain('Hàng Mã');
  });

  it('biển Ga Hà Nội treo cao hơn đầu người và nằm trong dải phố (đi bên dưới được, không cần vật cản)', () => {
    const m = /export const SIGN_Y = ([\d.]+)/.exec(setsSrc);
    const y = Number(m?.[1]);
    expect(y - 0.95 / 2, 'cạnh dưới biển').toBeGreaterThan(1.9);
    expect(walkAreaFor('pho-tet', 'bac')!.bounds.maxX).toBeGreaterThan(PHO_TET.bus.x - 1.6);
  });
});

describe('nhân vật phố Hàng Mã', () => {
  const c = loadContent();
  const map = c.maps.find((m) => m.id === 'ra-ben')!;
  const ids = ['bac-to-truong', 'co-tra-da', 'ba-hai-hoa-dao'];

  it('có đủ ba nhân vật, mỗi người một cảnh thoại, vị trí riêng trên vỉa hè và đều là hư cấu', () => {
    for (const id of ids) {
      const ch = c.characters.find((x) => x.id === id)!;
      expect(ch, id).toBeDefined();
      expect(ch.parody, `${id} không phải nhân vật nhại`).toBeUndefined();
      const npc = map.npcs.find((n) => n.characterId === id)!;
      expect(npc, id).toBeDefined();
      expect(npc.action?.kind).toBe('talk');
      expect(SETS['pho-tet']!.spots[npc.spot], `spot ${npc.spot}`).toBeDefined();
    }
    expect(new Set(map.npcs.map((n) => n.spot)).size).toBe(map.npcs.length);
  });

  it('nhiệm vụ làm quen có đủ ba mục tiêu trỏ đúng cờ nói chuyện, và là nhiệm vụ tuỳ chọn (không nằm trong nhiệm vụ đích)', () => {
    const q = map.quests.find((x) => x.id === 'chao-pho')!;
    expect(q.objectives.map((o) => o.done.flags?.[0])).toEqual(ids.map((id) => `talked:ra-ben:${id}`));
    const goal = map.quests.find((x) => x.id === map.goalQuestId)!;
    expect(JSON.stringify(goal.objectives)).not.toContain('chao-pho');
  });
});
