import { describe, expect, it } from 'vitest';
import demo from './__fixtures__/demo.json';
import {
  advance,
  applyEffects,
  choose,
  createGame,
  getEnding,
  getScene,
  getView,
  pickEnding,
  resolveCharacter,
  sceneRegion,
} from './engine';
import type { Content, GameState } from './types';
import { validateContent } from './validate';

const clone = (): Content => structuredClone(demo) as Content;

/** Đi hết game: cắt cảnh thì advance, hội thoại thì chọn lựa chọn thứ `pickIndex` (vòng). */
function playThrough(c: Content, s0: GameState, pickIndex = 0): { path: string[]; end: GameState } {
  let s = s0;
  const path: string[] = [];
  for (let guard = 0; s.sceneId && guard < 500; guard++) {
    path.push(s.sceneId);
    const view = getView(c, s)!;
    if (view.scene.kind === 'cutscene') {
      s = advance(c, s);
    } else {
      const ch = view.choices[pickIndex % view.choices.length]!;
      s = choose(c, s, ch.id).state;
    }
  }
  return { path, end: s };
}

/** Nội dung nhỏ để thử cờ, điều kiện, cắt cảnh, biến thể vùng. */
function mini(): Content {
  return {
    version: 1,
    regions: [
      { id: 'hn', city: 'Hà Nội', tagline: '' },
      { id: 'sg', city: 'Sài Gòn', tagline: '' },
    ],
    personas: [{ id: 'p', name: 'P', description: '' }],
    stages: [{ id: 's1', title: 'S1', intro: '', firstSceneId: 'a' }],
    characters: [
      { id: 'x', name: 'X', role: '', enabled: true },
      { id: 'y', name: 'Y', role: '', enabled: true },
    ],
    scenes: [
      {
        id: 'a',
        stageId: 's1',
        characterId: 'x',
        line: 'mặc định',
        lineByRegion: { sg: 'giọng Nam' },
        next: 'cut',
        choices: [
          { id: 'flag', style: 'kheo', text: 'bật cờ', effects: {}, reply: 'ok', replyByRegion: { sg: 'ok nghen' }, setFlags: ['f'] },
          { id: 'plain', style: 'lay', text: 'thường', effects: {}, reply: 'ừ' },
          { id: 'stop', style: 'phan-don', text: 'thôi', effects: {}, reply: 'hết', end: true, setFlags: ['g'] },
        ],
      },
      {
        id: 'cut',
        stageId: 's1',
        kind: 'cutscene',
        characterId: 'x',
        line: 'cắt cảnh',
        lines: [
          { characterId: 'y', text: 'chỉ khi có cờ', if: { flags: ['f'] } },
          { text: 'luôn hiện', byRegion: { sg: 'luôn hiện nghen' } },
          { text: 'nhớ lựa chọn thường', if: { history: ['a/plain'] } },
        ],
        next: 'only-flag',
        choices: [],
      },
      {
        id: 'only-flag',
        stageId: 's1',
        characterId: 'y',
        line: 'chỉ khi có cờ f',
        if: { flags: ['f'] },
        next: 'last',
        choices: [{ id: 'o', style: 'kheo', text: 'o', effects: {}, reply: '' }],
      },
      {
        id: 'last',
        stageId: 's1',
        characterId: 'x',
        line: 'cuối',
        next: null,
        choices: [
          { id: 'always', style: 'kheo', text: 'luôn có', effects: {}, reply: '' },
          { id: 'noflag', style: 'lay', text: 'khi chưa có cờ', effects: {}, reply: '', if: { notFlags: ['f'] } },
        ],
      },
    ],
    tips: [],
    endings: [
      { id: 'by-g', title: 'G', description: '', flags: ['g'] },
      { id: 'by-f', title: 'F', description: '', flags: ['f'] },
      { id: 'default', title: 'D', description: '' },
    ],
  };
}

describe('validateContent', () => {
  it('dữ liệu mẫu và mini hợp lệ', () => {
    expect(validateContent(clone())).toEqual([]);
    expect(validateContent(mini())).toEqual([]);
  });

  it('bắt tham chiếu hỏng', () => {
    const c = clone();
    c.scenes[0]!.next = 'khong-ton-tai';
    c.scenes[0]!.choices[0]!.tipId = 'khong-co-tip';
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('next khong-ton-tai'))).toBe(true);
    expect(errs.some((e) => e.includes('tipId khong-co-tip'))).toBe(true);
  });

  it('bắt nhân vật bị tắt mà thiếu fallback', () => {
    const c = clone();
    const ch = c.characters.find((x) => x.id === 'demo-duy-den-cay')!;
    ch.enabled = false;
    delete ch.fallbackId;
    expect(validateContent(c).some((e) => e.includes('fallbackId'))).toBe(true);
  });

  it('bắt kết thúc cuối không phải mặc định và effect không nguyên', () => {
    const c = clone();
    c.endings[c.endings.length - 1]!.when = { harmony: { min: 1 } };
    c.scenes[0]!.choices[0]!.effects = { harmony: 1.5 };
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('mặc định'))).toBe(true);
    expect(errs.some((e) => e.includes('số nguyên'))).toBe(true);
  });

  it('bắt cờ gõ sai, lịch sử sai, vùng lạ, cắt cảnh có lựa chọn', () => {
    const c = mini();
    c.scenes[2]!.if = { flags: ['f-go-sai'] };
    c.scenes[1]!.lines![2]!.if = { history: ['a/khong-co'] };
    c.scenes[0]!.lineByRegion = { hue: 'x' };
    c.scenes[1]!.choices = [{ id: 'z', style: 'kheo', text: '', effects: {}, reply: '' }];
    const errs = validateContent(c);
    expect(errs.some((e) => e.includes('cờ f-go-sai'))).toBe(true);
    expect(errs.some((e) => e.includes('lịch sử a/khong-co'))).toBe(true);
    expect(errs.some((e) => e.includes('vùng lạ hue'))).toBe(true);
    expect(errs.some((e) => e.includes('cắt cảnh không được có lựa chọn'))).toBe(true);
  });

  it('bắt set 3D, vị trí và góc máy không tồn tại', () => {
    const c = mini();
    c.scenes[0]!.stage3d = { set: 'nha', camera: 'khong-co', actors: [{ characterId: 'x', spot: 'xa-lac' }] };
    c.scenes[2]!.stage3d = { set: 'set-la' };
    const sets = { nha: { spots: { ghe: {} }, cameras: { rong: {} } } };
    const errs = validateContent(c, { sets });
    expect(errs.some((e) => e.includes('góc máy khong-co'))).toBe(true);
    expect(errs.some((e) => e.includes('vị trí xa-lac'))).toBe(true);
    expect(errs.some((e) => e.includes('set 3D set-la'))).toBe(true);
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
  it('dùng chỉ số khởi đầu của persona', () => {
    const s = createGame(clone(), 'moi-di-lam', ['ha-noi']);
    expect(s.stats).toEqual({ harmony: 50, stamina: 50, wallet: 40 });
    expect(s.sceneId).toBe('demo-vao-1');
    expect(s.flags).toEqual([]);
  });

  it('từ chối persona lạ, vùng rỗng, vùng lạ, seed không nguyên', () => {
    expect(() => createGame(clone(), 'khong-co', ['ha-noi'])).toThrow();
    expect(() => createGame(clone(), 'moi-di-lam', [])).toThrow();
    expect(() => createGame(clone(), 'moi-di-lam', ['hue'])).toThrow();
    expect(() => createGame(clone(), 'moi-di-lam', ['ha-noi'], 1.5)).toThrow();
  });
});

describe('choose (dữ liệu mẫu)', () => {
  it('lọc scene theo persona và vùng', () => {
    const c = clone();
    expect(playThrough(c, createGame(c, 'doc-than-27', ['ha-noi'])).path).toEqual([
      'demo-vao-1',
      'demo-vao-hn',
      'demo-vao-2',
      'demo-mam-1',
    ]);
    expect(playThrough(c, createGame(c, 'moi-di-lam', ['sai-gon'])).path).toEqual([
      'demo-vao-1',
      'demo-vao-sg',
      'demo-mam-1',
    ]);
    expect(playThrough(c, createGame(c, 'moi-di-lam', ['ha-noi', 'da-nang', 'sai-gon'])).path).toEqual([
      'demo-vao-1',
      'demo-vao-hn',
      'demo-vao-dn',
      'demo-vao-sg',
      'demo-mam-1',
    ]);
  });

  it('không đổi state đầu vào; ghi lịch sử và thẻ mẹo không trùng', () => {
    const c = clone();
    const s0 = createGame(c, 'moi-di-lam', ['ha-noi']);
    const snapshot = structuredClone(s0);
    const r = choose(c, s0, 'a');
    expect(s0).toEqual(snapshot);
    expect(r.tip?.id).toBe('demo-tip-chuyen-huong');
    expect(r.state.history).toEqual(['demo-vao-1/a']);
    expect(r.state.tipsSeen).toEqual(['demo-tip-chuyen-huong']);
  });

  it('từ chối lựa chọn không thuộc scene hoặc khi game đã xong', () => {
    const c = clone();
    const s = createGame(c, 'moi-di-lam', ['ha-noi']);
    expect(() => choose(c, s, 'z')).toThrow();
    expect(() => choose(c, { ...s, sceneId: null, endingId: 'demo-van-ve-nha' }, 'a')).toThrow();
  });

  it('chỉ số về 0 thì kết thúc ngay', () => {
    const c = clone();
    const s0 = createGame(c, 'moi-di-lam', ['ha-noi']);
    const r = choose(c, { ...s0, stats: { harmony: 5, stamina: 50, wallet: 40 } }, 'b'); // harmony -10 -> 0
    expect(r.state.stats.harmony).toBe(0);
    expect(r.state.sceneId).toBeNull();
    expect(r.state.endingId).toBe('demo-chien-than-ne'); // stamina 55
  });
});

describe('cờ, điều kiện, cắt cảnh, biến thể vùng', () => {
  it('cờ mở scene và dòng thoại có điều kiện; lựa chọn notFlags bị ẩn', () => {
    const c = mini();
    const r = choose(c, createGame(c, 'p', ['hn']), 'flag');
    expect(r.state.flags).toEqual(['f']);
    const cut = getView(c, r.state)!;
    expect(cut.scene.id).toBe('cut');
    expect(cut.lines.map((l) => l.text)).toEqual(['chỉ khi có cờ', 'luôn hiện']);
    expect(cut.lines[0]!.character.id).toBe('y');

    let s = advance(c, r.state);
    expect(s.sceneId).toBe('only-flag');
    s = choose(c, s, 'o').state;
    expect(getView(c, s)!.choices.map((x) => x.id)).toEqual(['always']);
    expect(() => choose(c, s, 'noflag')).toThrow();
    s = choose(c, s, 'always').state;
    expect(s.endingId).toBe('by-f');
  });

  it('không có cờ thì bỏ qua scene; dòng thoại theo lịch sử hiện ra', () => {
    const c = mini();
    const s = choose(c, createGame(c, 'p', ['hn']), 'plain').state;
    expect(getView(c, s)!.lines.map((l) => l.text)).toEqual(['luôn hiện', 'nhớ lựa chọn thường']);
    const after = advance(c, s);
    expect(after.sceneId).toBe('last');
    expect(getView(c, after)!.choices.map((x) => x.id)).toEqual(['always', 'noflag']);
    expect(choose(c, after, 'noflag').state.endingId).toBe('default');
  });

  it('lựa chọn end kết thúc ngay, kết thúc theo cờ', () => {
    const c = mini();
    const s = choose(c, createGame(c, 'p', ['hn']), 'stop').state;
    expect(s.sceneId).toBeNull();
    expect(s.endingId).toBe('by-g');
    expect(getEnding(c, s)?.title).toBe('G');
  });

  it('advance/choose sai loại scene thì ném lỗi', () => {
    const c = mini();
    const s0 = createGame(c, 'p', ['hn']);
    expect(() => advance(c, s0)).toThrow();
    const cut = choose(c, s0, 'plain').state;
    expect(() => choose(c, cut, 'z')).toThrow();
  });

  it('thoại, lựa chọn và phản ứng đổi theo vùng', () => {
    const c = mini();
    const sg = createGame(c, 'p', ['sg']);
    expect(getView(c, sg)!.line).toBe('giọng Nam');
    expect(choose(c, sg, 'flag').reply).toBe('ok nghen');
    const hn = createGame(c, 'p', ['hn']);
    expect(getView(c, hn)!.line).toBe('mặc định');
    expect(choose(c, hn, 'flag').reply).toBe('ok');
  });

  it('chọn nhiều vùng: mỗi scene lấy một vùng ổn định theo seed', () => {
    const ctx = { personaId: 'p', regionIds: ['hn', 'sg'], seed: 42, flags: [], history: [] };
    const a = sceneRegion(ctx, 'a');
    expect(sceneRegion(ctx, 'a')).toBe(a);
    expect(['hn', 'sg']).toContain(a);
    const seen = new Set(Array.from({ length: 40 }, (_, i) => sceneRegion({ ...ctx, seed: i }, 'a')));
    expect(seen).toEqual(new Set(['hn', 'sg']));
  });
});

describe('pickEnding', () => {
  it('chọn cái đầu tiên khớp, rơi về mặc định', () => {
    const c = clone();
    expect(pickEnding(c, { harmony: 70, stamina: 10, wallet: 10 }).id).toBe('demo-ve-rong-tim-day');
    expect(pickEnding(c, { harmony: 70, stamina: 10, wallet: 80 }).id).toBe('demo-chau-ngoan');
    expect(pickEnding(c, { harmony: 10, stamina: 60, wallet: 80 }).id).toBe('demo-chien-than-ne');
    expect(pickEnding(c, { harmony: 10, stamina: 10, wallet: 80 }).id).toBe('demo-van-ve-nha');
  });
});

describe('kill-switch nhân vật', () => {
  it('nhân vật bật thì giữ nguyên, bị tắt thì thay bằng bản trung tính', () => {
    const c = clone();
    expect(resolveCharacter(c, 'demo-duy-den-cay').id).toBe('demo-duy-den-cay');
    c.characters.find((x) => x.id === 'demo-duy-den-cay')!.enabled = false;
    expect(resolveCharacter(c, 'demo-duy-den-cay').id).toBe('chu-ba-an-nhau');
  });

  it('getView dùng bản thay thế khi nhân vật nhại bị tắt', () => {
    const c = clone();
    c.characters.find((x) => x.id === 'demo-duy-den-cay')!.enabled = false;
    const s = { ...createGame(c, 'moi-di-lam', ['ha-noi']), sceneId: 'demo-mam-1' };
    expect(getView(c, s)!.speaker.id).toBe('chu-ba-an-nhau');
    expect(getScene(c, s)!.characterId).toBe('demo-duy-den-cay');
  });
});
