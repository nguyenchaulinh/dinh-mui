import { describe, expect, it } from 'vitest';
import v1 from '../content/v1.json';
import { SETS } from '../scene3d/registry';
import { ROAM_SETS } from '../scene3d/walk';
import { createGame } from './engine';
import {
  DODGE_MILESTONES,
  HIT_FLAG,
  completeQuests,
  mapAutoFlags,
  objectiveDone,
  questFlag,
  questProgress,
  questRecorded,
  withFlag,
} from './quests';
import type { Content, GameState, Quest, RoamMap } from './types';
import { validateContent } from './validate';

const clone = (): Content => structuredClone(v1) as unknown as Content;
const base = (): GameState => createGame(clone(), 'moi-di-lam', ['ha-noi']);
const mapOf = (c: Content): RoamMap => c.maps![0]!;

const quest = (over: Partial<Quest> = {}): Quest => ({
  id: 'q',
  title: 'Q',
  objectives: [
    { id: 'a', text: 'A', done: { flags: ['x'] } },
    { id: 'b', text: 'B', done: { flags: ['y'] } },
  ],
  reward: { harmony: 10 },
  ...over,
});

describe('tiến độ nhiệm vụ', () => {
  it('đếm mục tiêu đã xong; chỉ hoàn thành khi xong hết', () => {
    const q = quest();
    let s = base();
    expect(questProgress(q, s)).toEqual({ done: 0, total: 2, complete: false });
    s = withFlag(s, 'x');
    expect(questProgress(q, s)).toEqual({ done: 1, total: 2, complete: false });
    expect(objectiveDone(q.objectives[0]!, s)).toBe(true);
    s = withFlag(s, 'y');
    expect(questProgress(q, s)).toEqual({ done: 2, total: 2, complete: true });
  });

  it('nhiệm vụ không có mục tiêu thì không bao giờ tự hoàn thành', () => {
    expect(questProgress(quest({ objectives: [] }), base()).complete).toBe(false);
  });

  it('withFlag không thêm cờ trùng và không đổi state đầu vào', () => {
    const s = base();
    const a = withFlag(s, 'x');
    expect(withFlag(a, 'x')).toBe(a);
    expect(s.flags).toEqual([]);
    expect(a.flags).toEqual(['x']);
  });
});

describe('completeQuests', () => {
  it('chưa đủ thì không làm gì; đủ thì áp thưởng một lần và bật cờ quest:', () => {
    const q = quest();
    const s0 = withFlag(base(), 'x');
    expect(completeQuests([q], s0).completed).toEqual([]);

    const s1 = withFlag(s0, 'y');
    const before = s1.stats.harmony;
    const r = completeQuests([q], s1);
    expect(r.completed.map((c) => c.id)).toEqual(['q']);
    expect(r.state.stats.harmony).toBe(before + 10);
    expect(r.state.flags).toContain(questFlag('q'));
    expect(questRecorded(q, r.state)).toBe(true);

    // Gọi lại không áp thưởng lần hai.
    const again = completeQuests([q], r.state);
    expect(again.completed).toEqual([]);
    expect(again.state.stats.harmony).toBe(before + 10);
  });

  it('không đổi state đầu vào', () => {
    const q = quest();
    const s = withFlag(withFlag(base(), 'x'), 'y');
    const snapshot = structuredClone(s);
    completeQuests([q], s);
    expect(s).toEqual(snapshot);
  });

  it('thưởng bị kẹp trong 0..100 như mọi hiệu ứng khác', () => {
    const q = quest({ reward: { harmony: 999, wallet: -999 } });
    const r = completeQuests([q], withFlag(withFlag(base(), 'x'), 'y'));
    expect(r.state.stats.harmony).toBe(100);
    expect(r.state.stats.wallet).toBe(0);
  });

  it('nhiệm vụ tổng hợp (mục tiêu là cờ quest:...) hoàn thành ngay trong cùng một lần gọi', () => {
    const a = quest({ id: 'a', reward: { stamina: 3 } });
    const meta = quest({
      id: 'meta',
      objectives: [{ id: 'm', text: 'M', done: { flags: ['quest:a'] } }],
      reward: { wallet: 5 },
    });
    const s = withFlag(withFlag(base(), 'x'), 'y');
    const r = completeQuests([meta, a], s); // thứ tự ngược cũng phải ổn
    expect(r.completed.map((q) => q.id).sort()).toEqual(['a', 'meta']);
    expect(r.state.flags).toContain('quest:meta');
  });

  it('vòng phụ thuộc (hai nhiệm vụ chờ nhau) không lặp vô hạn và không hoàn thành', () => {
    const a = quest({ id: 'a', objectives: [{ id: 'o', text: '', done: { flags: ['quest:b'] } }] });
    const b = quest({ id: 'b', objectives: [{ id: 'o', text: '', done: { flags: ['quest:a'] } }] });
    const r = completeQuests([a, b], base());
    expect(r.completed).toEqual([]);
  });
});

describe('bản đồ san-nha trong nội dung', () => {
  const c = clone();
  const map = mapOf(c);

  it('cờ tự sinh gồm talked/petted/dodged/hit/quest', () => {
    const flags = mapAutoFlags(map);
    expect(flags).toContain('talked:co-hai');
    expect(flags).toContain('petted:vang');
    for (const n of DODGE_MILESTONES) expect(flags).toContain(`dodged:${n}`);
    expect(flags).toContain(HIT_FLAG);
    for (const q of map.quests) expect(flags).toContain(questFlag(q.id));
  });

  it('mọi nhiệm vụ đều hoàn thành được: đủ cờ tự sinh thì xong, theo đúng thứ tự phụ thuộc', () => {
    let s = base();
    for (const f of mapAutoFlags(map)) if (!f.startsWith('quest:')) s = withFlag(s, f);
    const r = completeQuests(map.quests, s);
    expect(r.completed.map((q) => q.id).sort()).toEqual(map.quests.map((q) => q.id).sort());
  });

  it('nhiệm vụ "dodged:3" cần né đủ 3 câu, không phải 1', () => {
    const ne = map.quests.find((q) => q.id === 'ne-cau-hoi')!;
    const s = withFlag(base(), 'dodged:1');
    expect(questProgress(ne, s).complete).toBe(false);
    expect(questProgress(ne, withFlag(s, 'dodged:3')).complete).toBe(true);
  });
});

describe('validate dữ liệu bản đồ', () => {
  const errs = (mutate: (c: Content) => void): string[] => {
    const c = clone();
    mutate(c);
    return validateContent(c, { sets: SETS });
  };

  it('nội dung thật hợp lệ', () => {
    expect(validateContent(clone(), { sets: SETS })).toEqual([]);
  });

  it('bắt set, nhân vật, vị trí đứng không tồn tại', () => {
    const e = errs((c) => {
      mapOf(c).setId = 'set-la';
      mapOf(c).npcs[0]!.characterId = 'nguoi-la';
    });
    expect(e.some((m) => m.includes('set 3D set-la'))).toBe(true);
    expect(e.some((m) => m.includes('nguoi-la'))).toBe(true);
    const e2 = errs((c) => {
      mapOf(c).npcs[0]!.spot = 'cho-la';
    });
    expect(e2.some((m) => m.includes('vị trí cho-la'))).toBe(true);
  });

  it('bắt NPC trùng, NPC trùng người chơi, hành vi và số liệu hỏng, prompt trống', () => {
    const e = errs((c) => {
      const m = mapOf(c);
      m.npcs.push({ ...m.npcs[0]! });
      m.npcs[1]!.characterId = m.playerId;
      (m.npcs[2] as { behavior: string }).behavior = 'bay';
      m.npcs[3]!.speed = -1;
      m.npcs[4]!.prompt = '  ';
    });
    expect(e.some((m) => m.includes('trùng id') || m.includes('trùng'))).toBe(true);
    expect(e.some((m) => m.includes('trùng nhân vật người chơi'))).toBe(true);
    expect(e.some((m) => m.includes('hành vi lạ bay'))).toBe(true);
    expect(e.some((m) => m.includes('speed phải là số không âm'))).toBe(true);
    expect(e.some((m) => m.includes('thiếu chữ trên nút'))).toBe(true);
  });

  it('bắt scene hội thoại không tồn tại, rỗng, hoặc thiếu persona', () => {
    const e = errs((c) => {
      const a = mapOf(c).npcs[0]!.action;
      if (a.kind === 'talk') a.sceneIds = ['khong-co'];
    });
    expect(e.some((m) => m.includes('scene khong-co không tồn tại'))).toBe(true);
    const e2 = errs((c) => {
      const a = mapOf(c).npcs[0]!.action;
      if (a.kind === 'talk') a.sceneIds = [];
    });
    expect(e2.some((m) => m.includes('danh sách scene rỗng'))).toBe(true);
    // Chỉ giữ scene của persona sinh viên: hai persona còn lại không có gì để nói.
    const e3 = errs((c) => {
      const a = mapOf(c).npcs[0]!.action;
      if (a.kind === 'talk') a.sceneIds = ['bvn-1-sv'];
    });
    expect(e3.some((m) => m.includes('persona moi-di-lam'))).toBe(true);
    expect(e3.some((m) => m.includes('persona doc-than-27'))).toBe(true);
  });

  it('bắt cấu hình bắn câu hỏi hỏng', () => {
    const shooter = (c: Content) => mapOf(c).npcs.find((n) => n.shoots)!.shoots!;
    expect(errs((c) => (shooter(c).everySec = 0)).some((m) => m.includes('everySec phải >= 0.5'))).toBe(true);
    expect(errs((c) => (shooter(c).minRange = shooter(c).range)).some((m) => m.includes('minRange'))).toBe(true);
    expect(errs((c) => (shooter(c).questions = [])).some((m) => m.includes('questions'))).toBe(true);
    expect(errs((c) => (shooter(c).questions = ['ok', '  '])).some((m) => m.includes('questions'))).toBe(true);
    expect(errs((c) => (shooter(c).hitSceneIds = ['khong-co'])).some((m) => m.includes('khong-co'))).toBe(true);
  });

  it('bắt cờ gõ sai trong mục tiêu, nhiệm vụ rỗng, thưởng không nguyên, id trùng', () => {
    const e = errs((c) => {
      mapOf(c).quests[0]!.objectives[0]!.done = { flags: ['talked:nguoi-ma'] };
    });
    expect(e.some((m) => m.includes('talked:nguoi-ma'))).toBe(true);
    expect(errs((c) => (mapOf(c).quests[0]!.objectives = [])).some((m) => m.includes('ít nhất 1 mục tiêu'))).toBe(true);
    expect(errs((c) => (mapOf(c).quests[0]!.reward = { harmony: 1.5 })).some((m) => m.includes('số nguyên'))).toBe(true);
    expect(errs((c) => mapOf(c).quests.push({ ...mapOf(c).quests[0]! })).some((m) => m.includes('trùng'))).toBe(true);
  });

  it('bắt lỗ hổng dữ liệu hay gặp: chỗ ngồi đi lại/bắn, hai NPC cùng chỗ, nói sai người, thiếu scene theo persona × vùng', () => {
    const npc = (c: Content, id: string) => mapOf(c).npcs.find((n) => n.characterId === id)!;
    // Dì Út đặt ở ghế ngồi: ngồi mà đi lại/bắn thì xuyên bàn
    expect(errs((c) => (npc(c, 'di-ut').spot = 'ghe-2')).some((m) => m.includes('chỗ ngồi'))).toBe(true);
    // Hai NPC cùng một vị trí xuất phát
    expect(errs((c) => (npc(c, 'bin').spot = npc(c, 'vang').spot)).some((m) => m.includes('vị trí xuất phát'))).toBe(true);
    // Cảnh hội thoại do người khác nói
    expect(errs((c) => {
      const a = npc(c, 'bac-ca').action;
      if (a.kind === 'talk') a.sceneIds = ['bvn-3'];
    }).some((m) => m.includes('không phải bac-ca'))).toBe(true);
    // Scene chỉ dành cho một vùng: các vùng khác không có gì để nói
    expect(errs((c) => {
      c.scenes.find((s) => s.id === 'bvn-2')!.regions = ['sai-gon'];
    }).some((m) => m.includes('vùng ha-noi'))).toBe(true);
    // hitSceneIds trỏ cắt cảnh
    expect(errs((c) => {
      const sh = npc(c, 'di-ut').shoots!;
      sh.hitSceneIds = ['rb-shipper'];
    }).some((m) => m.includes('cắt cảnh'))).toBe(true);
  });

  it('bắt số liệu nguy hiểm: bắn quá nhanh/xa, câu hỏi quá dài, câu hỏi theo vai sai, speed NPC quá lớn', () => {
    const sh = (c: Content) => mapOf(c).npcs.find((n) => n.shoots)!.shoots!;
    expect(errs((c) => (sh(c).speed = 200)).some((m) => m.includes('speed phải trong (0, 8]'))).toBe(true);
    expect(errs((c) => (sh(c).range = 1000)).some((m) => m.includes('range phải trong'))).toBe(true);
    expect(errs((c) => (sh(c).everySec = 0.05)).some((m) => m.includes('everySec phải >= 0.5'))).toBe(true);
    expect(errs((c) => (sh(c).questions = ['x'.repeat(500)])).some((m) => m.includes('dài quá'))).toBe(true);
    expect(errs((c) => (sh(c).questionsByPersona = { 'vai-la': ['ok'] })).some((m) => m.includes('persona vai-la'))).toBe(true);
    expect(errs((c) => (sh(c).questionsByPersona = { 'sinh-vien': [] })).some((m) => m.includes('questionsByPersona.sinh-vien'))).toBe(true);
    expect(errs((c) => (mapOf(c).npcs[3]!.speed = 99)).some((m) => m.includes('speed'))).toBe(true);
  });

  it('bắt nhiệm vụ không hoàn thành được: điều kiện rỗng, giới hạn persona, cờ ngoài bản đồ, vòng phụ thuộc', () => {
    expect(errs((c) => (mapOf(c).quests[0]!.objectives[0]!.done = {})).some((m) => m.includes('điều kiện done rỗng'))).toBe(true);
    expect(errs((c) => (mapOf(c).quests[0]!.objectives[0]!.done = { flags: ['talked:co-hai'], personas: ['sinh-vien'] })).some((m) => m.includes('giới hạn persona'))).toBe(true);
    // Cờ của luồng chính (xem-mat) có thật nhưng không bật được khi đi lại
    expect(errs((c) => (mapOf(c).quests[0]!.objectives[0]!.done = { flags: ['xem-mat'] })).some((m) => m.includes('không do bản đồ này sinh ra'))).toBe(true);
    expect(errs((c) => {
      const qs = mapOf(c).quests;
      qs[0]!.objectives = [{ id: 'x', text: 'x', done: { flags: ['quest:ne-cau-hoi'] } }];
      qs[1]!.objectives = [{ id: 'y', text: 'y', done: { flags: ['quest:chao-ho-hang'] } }];
    }).some((m) => m.includes('vòng phụ thuộc'))).toBe(true);
  });

  it('dữ liệu bản đồ thiếu trường ra danh sách lỗi dễ đọc, không ném TypeError', () => {
    const c = clone();
    delete (mapOf(c).npcs[0] as { action?: unknown }).action;
    let out: string[] = [];
    expect(() => (out = validateContent(c, { sets: SETS }))).not.toThrow();
    expect(out.some((m) => m.includes('dữ liệu thiếu hoặc sai kiểu'))).toBe(true);
    const c2 = clone();
    delete (mapOf(c2) as { npcs?: unknown }).npcs;
    expect(() => validateContent(c2, { sets: SETS })).not.toThrow();
  });

  it('bản đồ phải trỏ tới set có vùng đi lại khi được cung cấp danh sách roamSets', () => {
    const c = clone();
    const e = validateContent(c, { sets: SETS, roamSets: ['set-khac'] });
    expect(e.some((m) => m.includes('chưa có vùng đi lại'))).toBe(true);
    expect(validateContent(c, { sets: SETS, roamSets: ROAM_SETS })).toEqual([]);
  });

  it('nội dung không có maps vẫn hợp lệ (dữ liệu cũ)', () => {
    const c = clone();
    delete c.maps;
    delete c.journey;
    expect(validateContent(c, { sets: SETS })).toEqual([]);
  });
});
