import { describe, expect, it } from 'vitest';
import {
  afterStage,
  applyEffects,
  choose,
  createGame,
  finishGame,
  getEnding,
  getView,
  pickEnding,
  pickBySeed,
  pickScene,
  resolveCharacter,
} from './engine';
import type { Content } from './types';
import { validateContent } from './validate';

/** Nội dung nhỏ để thử cờ, điều kiện, biến thể vùng, vai, chỉ số về 0 và kết thúc. */
function mini(): Content {
  return {
    version: 1,
    regions: [
      { id: 'hn', city: 'Hà Nội', tagline: '' },
      { id: 'sg', city: 'Sài Gòn', tagline: '' },
    ],
    personas: [
      { id: 'p', name: 'P', description: '', startStats: { wallet: 40 } },
      { id: 'q', name: 'Q', description: '' },
    ],
    stages: [{ id: 's1', title: 'S1', intro: '', mapId: 'm' }],
    characters: [
      { id: 'player', name: 'Bạn', role: '', enabled: true },
      { id: 'x', name: 'X', role: '', enabled: true },
      { id: 'y', name: 'Y', role: '', enabled: true },
      { id: 'nhai', name: 'Nhại', role: '', enabled: true, parody: true, fallbackId: 'x' },
    ],
    scenes: [
      {
        id: 'a',
        characterId: 'x',
        line: 'mặc định',
        lineByRegion: { sg: 'giọng Nam' },
        lines: [
          { characterId: 'y', text: 'chỉ khi có cờ', if: { flags: ['f'] } },
          { text: 'luôn hiện', byRegion: { sg: 'luôn hiện nghen' } },
          { text: 'nhớ lựa chọn thường', if: { history: ['a/plain'] } },
        ],
        choices: [
          { id: 'flag', style: 'kheo', text: 'bật cờ', effects: { harmony: 5 }, reply: 'ok', replyByRegion: { sg: 'ok nghen' }, setFlags: ['f'], tipId: 't1' },
          { id: 'plain', style: 'lay', text: 'thường', textByRegion: { sg: 'thường nghen' }, effects: { stamina: -5 }, reply: 'ừ' },
          { id: 'drain', style: 'phan-don', text: 'tụt hết', effects: { harmony: -100 }, reply: 'hết sạch' },
          { id: 'stop', style: 'that-tha', text: 'thôi', effects: {}, reply: 'hết', end: true, setFlags: ['g'] },
          { id: 'only-f', style: 'kheo', text: 'chỉ khi có cờ f', effects: {}, reply: '', if: { flags: ['f'] } },
          { id: 'no-f', style: 'lay', text: 'chỉ khi chưa có cờ f', effects: {}, reply: '', if: { notFlags: ['f'] } },
        ],
      },
      {
        id: 'b-p',
        characterId: 'y',
        line: 'chỉ vai p',
        personas: ['p'],
        choices: [{ id: 'o', style: 'kheo', text: 'o', effects: {}, reply: '' }],
      },
      {
        id: 'b-sg',
        characterId: 'y',
        line: 'chỉ vùng sg',
        regions: ['sg'],
        choices: [{ id: 'o', style: 'kheo', text: 'o', effects: {}, reply: '' }],
      },
      {
        id: 'b-flag',
        characterId: 'y',
        line: 'chỉ khi có cờ f',
        if: { flags: ['f'] },
        choices: [{ id: 'o', style: 'kheo', text: 'o', effects: {}, reply: '' }],
      },
      {
        id: 'b-nhai',
        characterId: 'nhai',
        line: 'nhân vật nhại nói',
        choices: [{ id: 'o', style: 'kheo', text: 'o', effects: {}, reply: '' }],
      },
    ],
    tips: [{ id: 't1', text: 'mẹo', source: 'nguồn' }],
    endings: [
      { id: 'by-g', title: 'G', description: '', flags: ['g'] },
      { id: 'by-f', title: 'F', description: '', flags: ['f'], when: { harmony: { min: 50 } } },
      { id: 'rich', title: 'R', description: '', when: { wallet: { min: 80 } } },
      { id: 'default', title: 'D', description: '' },
    ],
    maps: [
      {
        id: 'm',
        setId: 'set',
        playerId: 'player',
        goalQuestId: 'goal',
        npcs: [
          { characterId: 'x', spot: 'a', behavior: 'stand', prompt: 'Nói', action: { kind: 'talk', sceneIds: ['a'], after: 'ok' } },
          { characterId: 'y', spot: 'b', behavior: 'stand', prompt: 'Nói', action: { kind: 'talk', sceneIds: ['b-p', 'b-sg', 'b-flag'], after: 'ok' } },
          { characterId: 'nhai', spot: 'c', behavior: 'stand', prompt: 'Nói', action: { kind: 'talk', sceneIds: ['b-nhai'], after: 'ok' } },
        ],
        quests: [{ id: 'goal', title: 'Đích', objectives: [{ id: 'o', text: 'x', done: { flags: ['talked:m:x'] } }] }],
      },
    ],
  };
}

describe('validateContent', () => {
  it('nội dung mini hợp lệ', () => {
    // 'b-p' chỉ hợp vai p và 'b-sg' chỉ hợp vùng sg: NPC y cần bao phủ mọi vai × vùng nên mini() dùng thêm 'b-flag'
    // (không giới hạn vai/vùng) làm phương án cuối.
    expect(validateContent(mini())).toEqual([]);
  });

  it('bắt tham chiếu hỏng', () => {
    const c = mini();
    c.scenes[0]!.choices[0]!.tipId = 'khong-co-tip';
    c.scenes[0]!.characterId = 'ai-do';
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('tipId khong-co-tip'))).toBe(true);
    expect(errs.some((e) => e.includes('nhân vật ai-do'))).toBe(true);
  });

  it('bắt nhân vật bị tắt mà thiếu fallback', () => {
    const c = mini();
    const ch = c.characters.find((x) => x.id === 'nhai')!;
    ch.enabled = false;
    delete ch.fallbackId;
    expect(validateContent(c).some((e) => e.includes('fallbackId'))).toBe(true);
  });

  it('bắt kết thúc cuối không phải mặc định và effect không nguyên', () => {
    const c = mini();
    c.endings[c.endings.length - 1]!.when = { harmony: { min: 1 } };
    c.scenes[0]!.choices[0]!.effects = { harmony: 1.5 };
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('mặc định'))).toBe(true);
    expect(errs.some((e) => e.includes('số nguyên'))).toBe(true);
  });

  it('bắt cờ gõ sai, lịch sử sai, vùng lạ', () => {
    const c = mini();
    c.scenes[3]!.if = { flags: ['f-go-sai'] };
    c.scenes[0]!.lines![2]!.if = { history: ['a/khong-co'] };
    c.scenes[0]!.lineByRegion = { hue: 'x' };
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('cờ f-go-sai'))).toBe(true);
    expect(errs.some((e) => e.includes('lịch sử a/khong-co'))).toBe(true);
    expect(errs.some((e) => e.includes('vùng lạ hue'))).toBe(true);
  });

  it('bắt scene không có lựa chọn và id lựa chọn trùng', () => {
    const c = mini();
    c.scenes[1]!.choices = [];
    c.scenes[2]!.choices.push({ ...c.scenes[2]!.choices[0]! });
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('scene b-p: cần ít nhất 1 lựa chọn'))).toBe(true);
    expect(errs.some((e) => e.includes('choice trong scene b-sg trùng id'))).toBe(true);
  });

  it('bắt set 3D và vị trí đứng không tồn tại khi có danh mục set', () => {
    const c = mini();
    expect(validateContent(c, { sets: { set: { spots: { a: {}, b: {}, c: {} } } } })).toEqual([]);
    const errs = validateContent(c, { sets: { set: { spots: { a: {} } } } });
    expect(errs.some((e) => e.includes('vị trí b'))).toBe(true);
    expect(validateContent(c, { sets: {} }).some((e) => e.includes('set 3D set'))).toBe(true);
  });
});

describe('applyEffects', () => {
  it('kẹp trong khoảng 0..100', () => {
    expect(applyEffects({ harmony: 95, stamina: 5, wallet: 50 }, { harmony: 20, stamina: -20 })).toEqual({
      harmony: 100,
      stamina: 0,
      wallet: 50,
    });
  });
});

describe('createGame', () => {
  it('dùng chỉ số khởi đầu của vai và chưa có kết thúc', () => {
    const s = createGame(mini(), 'p', 'hn');
    expect(s.stats).toEqual({ harmony: 50, stamina: 50, wallet: 40 });
    expect(s).toMatchObject({ personaId: 'p', regionId: 'hn', flags: [], history: [], tipsSeen: [], endingId: null });
  });

  it('từ chối vai lạ và vùng lạ', () => {
    expect(() => createGame(mini(), 'khong-co', 'hn')).toThrow();
    expect(() => createGame(mini(), 'p', 'hue')).toThrow();
  });
});

describe('pickBySeed', () => {
  it('chọn một vùng thì lấy luôn; chọn nhiều thì ổn định theo seed và phủ hết các vùng', () => {
    expect(pickBySeed(['hn'], 1)).toBe('hn');
    expect(pickBySeed(['hn', 'sg'], 42, 'k')).toBe(pickBySeed(['hn', 'sg'], 42, 'k'));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => pickBySeed(['hn', 'sg'], i, 'k')));
    expect(seen).toEqual(new Set(['hn', 'sg']));
    expect(() => pickBySeed([], 1)).toThrow();
  });
});

describe('pickScene và getView', () => {
  it('lọc scene theo vai, vùng và cờ; trả scene đầu tiên hợp', () => {
    const c = mini();
    const ids = ['b-p', 'b-sg', 'b-flag'];
    expect(pickScene(c, createGame(c, 'p', 'hn'), ids)?.id).toBe('b-p');
    expect(pickScene(c, createGame(c, 'q', 'sg'), ids)?.id).toBe('b-sg');
    expect(pickScene(c, createGame(c, 'q', 'hn'), ids)).toBeNull(); // vai q + vùng hn + chưa có cờ: không scene nào hợp
    const flagged = { ...createGame(c, 'q', 'hn'), flags: ['f'] };
    expect(pickScene(c, flagged, ids)?.id).toBe('b-flag');
    expect(pickScene(c, createGame(c, 'p', 'hn'), ['khong-co'])).toBeNull();
  });

  it('thoại, lựa chọn đổi giọng theo vùng; thoại phụ và lựa chọn lọc theo cờ/lịch sử', () => {
    const c = mini();
    const hn = getView(c, createGame(c, 'p', 'hn'), 'a');
    expect(hn.line).toBe('mặc định');
    expect(hn.lines.map((l) => l.text)).toEqual(['luôn hiện']);
    expect(hn.choices.map((x) => x.id)).toEqual(['flag', 'plain', 'drain', 'stop', 'no-f']);
    const sg = getView(c, createGame(c, 'p', 'sg'), 'a');
    expect(sg.line).toBe('giọng Nam');
    expect(sg.lines.map((l) => l.text)).toEqual(['luôn hiện nghen']);
    expect(sg.choices.find((x) => x.id === 'plain')!.text).toBe('thường nghen');

    const after = choose(c, createGame(c, 'p', 'hn'), 'a', 'flag').state;
    const v = getView(c, after, 'a');
    expect(v.lines.map((l) => l.text)).toEqual(['chỉ khi có cờ', 'luôn hiện']);
    expect(v.lines[0]!.character.id).toBe('y');
    expect(v.choices.map((x) => x.id)).toEqual(['flag', 'plain', 'drain', 'stop', 'only-f']);
    const plain = choose(c, createGame(c, 'p', 'hn'), 'a', 'plain').state;
    expect(getView(c, plain, 'a').lines.map((l) => l.text)).toContain('nhớ lựa chọn thường');
  });

  it('scene không tồn tại thì ném lỗi', () => {
    const c = mini();
    expect(() => getView(c, createGame(c, 'p', 'hn'), 'khong-co')).toThrow();
  });
});

describe('choose', () => {
  it('áp hiệu ứng, cờ, lịch sử, thẻ mẹo (không trùng); không đổi state đầu vào', () => {
    const c = mini();
    const s0 = createGame(c, 'p', 'hn');
    const snapshot = structuredClone(s0);
    const r = choose(c, s0, 'a', 'flag');
    expect(s0).toEqual(snapshot);
    expect(r.state.stats.harmony).toBe(55);
    expect(r.state.flags).toEqual(['f']);
    expect(r.state.history).toEqual(['a/flag']);
    expect(r.tip?.id).toBe('t1');
    expect(r.state.tipsSeen).toEqual(['t1']);
    const again = choose(c, r.state, 'a', 'flag').state;
    expect(again.tipsSeen).toEqual(['t1']);
    expect(again.flags).toEqual(['f']);
    expect(again.history).toEqual(['a/flag', 'a/flag']);
  });

  it('phản ứng đổi theo vùng', () => {
    const c = mini();
    expect(choose(c, createGame(c, 'p', 'sg'), 'a', 'flag').reply).toBe('ok nghen');
    expect(choose(c, createGame(c, 'p', 'hn'), 'a', 'flag').reply).toBe('ok');
  });

  it('từ chối scene lạ, lựa chọn lạ, lựa chọn đang bị ẩn, và game đã kết thúc', () => {
    const c = mini();
    const s = createGame(c, 'p', 'hn');
    expect(() => choose(c, s, 'khong-co', 'flag')).toThrow();
    expect(() => choose(c, s, 'a', 'z')).toThrow();
    expect(() => choose(c, s, 'a', 'only-f')).toThrow(); // cần cờ f
    expect(() => choose(c, { ...s, endingId: 'default' }, 'a', 'flag')).toThrow();
  });

  it('chỉ số về 0 thì kết thúc ngay', () => {
    const c = mini();
    const r = choose(c, createGame(c, 'p', 'hn'), 'a', 'drain');
    expect(r.state.stats.harmony).toBe(0);
    expect(r.state.endingId).toBe('default');
  });

  it('lựa chọn `end` kết thúc ngay, theo cờ vừa bật', () => {
    const c = mini();
    const s = choose(c, createGame(c, 'p', 'hn'), 'a', 'stop').state;
    expect(s.endingId).toBe('by-g');
    expect(getEnding(c, s)?.title).toBe('G');
  });
});

describe('kết thúc và chặng', () => {
  it('pickEnding chọn cái đầu tiên khớp, rơi về mặc định', () => {
    const c = mini();
    const stats = { harmony: 60, stamina: 50, wallet: 90 };
    expect(pickEnding(c, stats, ['g']).id).toBe('by-g');
    expect(pickEnding(c, stats, ['f']).id).toBe('by-f');
    expect(pickEnding(c, { ...stats, harmony: 10 }, ['f']).id).toBe('rich'); // cờ f nhưng Hòa khí thấp: rơi xuống kết thúc kế
    expect(pickEnding(c, { harmony: 10, stamina: 10, wallet: 10 }).id).toBe('default');
  });

  it('finishGame đặt kết thúc theo chỉ số + cờ và không đổi state đầu vào', () => {
    const c = mini();
    const s = createGame(c, 'p', 'hn');
    const done = finishGame(c, { ...s, flags: ['g'] });
    expect(done.endingId).toBe('by-g');
    expect(s.endingId).toBeNull();
  });

  it('afterStage: còn chặng thì sang chặng kế (giữ state); hết chặng hoặc đã có kết thúc thì kết thúc', () => {
    const c = mini();
    c.stages.push({ id: 's2', title: 'S2', intro: '', mapId: 'm2' });
    const s = createGame(c, 'p', 'hn');
    expect(afterStage(c, 0, s)).toEqual({ next: 1 });
    expect(afterStage(c, 1, s)).toEqual({ end: finishGame(c, s) });
    const ended = { ...s, endingId: 'by-g' };
    expect(afterStage(c, 0, ended)).toEqual({ end: ended });
  });
});

describe('kill-switch nhân vật', () => {
  it('nhân vật bật thì giữ nguyên, bị tắt thì thay bằng bản trung tính', () => {
    const c = mini();
    expect(resolveCharacter(c, 'nhai').id).toBe('nhai');
    c.characters.find((x) => x.id === 'nhai')!.enabled = false;
    expect(resolveCharacter(c, 'nhai').id).toBe('x');
  });

  it('getView dùng bản thay thế khi nhân vật nhại bị tắt', () => {
    const c = mini();
    c.characters.find((x) => x.id === 'nhai')!.enabled = false;
    const v = getView(c, createGame(c, 'p', 'hn'), 'b-nhai');
    expect(v.speaker.id).toBe('x');
    expect(v.scene.characterId).toBe('nhai');
  });
});

describe('tên người chơi', () => {
  it('chuẩn hoá: gộp khoảng trắng, nhận chữ tiếng Việt; từ chối rỗng, quá dài, ký tự lạ', async () => {
    const { normalizeName, NAME_MAX } = await import('./engine');
    expect(normalizeName('  Nguyễn   Thảo ')).toBe('Nguyễn Thảo');
    expect(normalizeName("O'Neil-Trần Jr.")).toBe("O'Neil-Trần Jr.");
    expect(normalizeName('An 2k7')).toBe('An 2k7');
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('a'.repeat(NAME_MAX + 1))).toBeNull();
    expect(normalizeName('ừ'.repeat(NAME_MAX))).toBe('ừ'.repeat(NAME_MAX));
    for (const bad of ['<b>Hi</b>', 'a&b', 'tên\u0000', 'x{ten}', 'emoji 🎉']) expect(normalizeName(bad), bad).toBeNull();
  });

  it('createGame chỉ nhận tên đã chuẩn hoá (hoặc rỗng)', () => {
    const c = mini();
    expect(createGame(c, 'p', 'hn', 'Lan').playerName).toBe('Lan');
    expect(createGame(c, 'p', 'hn').playerName).toBe('');
    expect(() => createGame(c, 'p', 'hn', '  Lan ')).toThrow();
    expect(() => createGame(c, 'p', 'hn', '<script>')).toThrow();
  });

  it('chèn {ten} vào thoại, lựa chọn, phản ứng và tên người đăng; chưa có tên thì dùng "bạn"', () => {
    const c = mini();
    c.scenes[0]!.line = 'Chào {ten}!';
    c.scenes[0]!.choices[0]!.text = '{ten} xin phép ạ';
    c.scenes[0]!.choices[0]!.reply = 'Ừ {ten}';
    c.scenes[0]!.choices[0]!.author = 'Trang của {ten}';
    const named = createGame(c, 'p', 'hn', 'Lan');
    const v = getView(c, named, 'a');
    expect(v.line).toBe('Chào Lan!');
    expect(v.choices[0]!.text).toBe('Lan xin phép ạ');
    expect(v.choices[0]!.author).toBe('Trang của Lan');
    expect(choose(c, named, 'a', 'flag').reply).toBe('Ừ Lan');
    expect(getView(c, createGame(c, 'p', 'hn'), 'a').line).toBe('Chào bạn!');
  });

  it('validate bắt chỗ chèn gõ sai ({name} thay vì {ten})', () => {
    const c = mini();
    c.scenes[0]!.line = 'Chào {name}';
    expect(validateContent(c).some((e) => e.includes('chỗ chèn lạ {name}'))).toBe(true);
  });
});
