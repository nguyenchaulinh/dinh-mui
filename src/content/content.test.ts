import { describe, expect, it } from 'vitest';
import { choose, createGame, getView } from '../engine/engine';
import { validateContent } from '../engine/validate';
import { SETS } from '../scene3d/registry';
import { ROAM_SETS } from '../scene3d/walk';
import { loadContent } from './index';
import { sampleJourney } from './simulate';

/** Kiểm tra nội dung thật (v1.json), không phải dữ liệu mẫu. */
const c = loadContent();

/**
 * Hồ sơ né câu hỏi theo bản đồ: né vừa đủ nhiệm vụ (tổng 6 câu), và né giỏi (tổng 8 câu, mở E8).
 * Sân nhà bắt buộc né 3 câu mới xong chặng.
 */
const NE_VUA = { 'cuoi-nam': 3, 'san-nha': 3 };
const NE_GIOI = { 'cuoi-nam': 3, 'san-nha': 5 };
const NE_IT = { 'cuoi-nam': 0, 'san-nha': 3 };
const RUNS = 1500;

/**
 * Kết thúc mà nội dung hiện chưa thể đạt tới (cần các chặng sau gây áp lực Hòa khí). Khi nội dung mới làm một kết thúc
 * tới được, test báo lỗi để cập nhật danh sách.
 */
const AWAITING_CONTENT = ['E1'];

const share = (counts: Record<string, number>) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / total]));
};

describe('nội dung v1', () => {
  it('hợp lệ, kể cả set 3D, vị trí đứng và vùng đi lại', () => {
    expect(validateContent(c, { sets: SETS, roamSets: ROAM_SETS })).toEqual([]);
  });

  it('chặng đầu là cuối năm ở phố (văn phòng / lớp học), sau đó về sân nhà', () => {
    expect(c.stages.map((s) => s.mapId)).toEqual(['cuoi-nam', 'san-nha']);
  });

  it('nhân vật nhại đều có cờ parody và bản thay thế', () => {
    for (const ch of c.characters.filter((x) => x.parody)) expect(ch.fallbackId, ch.id).toBeTruthy();
  });

  it('Lầy không còn là lựa chọn miễn phí: mỗi "Lầy" luôn tốn thứ gì đó', () => {
    for (const s of c.scenes) {
      for (const ch of s.choices.filter((x) => x.style === 'lay')) {
        expect(Object.values(ch.effects).some((v) => v !== undefined && v < 0), `${s.id}/${ch.id}`).toBe(true);
      }
    }
  });
});

describe('cả hành trình (lấy mẫu ngẫu nhiên có hạt giống cố định)', () => {
  const runAll = (dodges: Record<string, number>) =>
    c.personas.map((p) => ({ persona: p.id, r: sampleJourney(c, p.id, 'ha-noi', dodges, RUNS, 7) }));
  const vua = runAll(NE_VUA);
  const gioi = runAll(NE_GIOI);
  const it3 = runAll(NE_IT);

  it('không lượt chơi nào bị kẹt giữa chặng', () => {
    for (const { persona, r } of [...vua, ...gioi, ...it3]) expect(r.stuck, persona).toBe(0);
  });

  it('mọi kết thúc đều tới được, trừ những cái đã khai báo là chờ nội dung', () => {
    const reached = new Set([...vua, ...gioi, ...it3].flatMap(({ r }) => Object.keys(r.endings)));
    expect(c.endings.map((e) => e.id).filter((id) => !reached.has(id))).toEqual(AWAITING_CONTENT);
  });

  it('không kết thúc nào chiếm quá 60% số lượt của một vai (khi né vừa đủ)', () => {
    for (const { persona, r } of vua) {
      for (const [id, x] of Object.entries(share(r.endings))) expect(x, `${persona} ${id}`).toBeLessThanOrEqual(0.6);
    }
  });

  it('né tổng cộng 8 câu thì "Chiến thần né câu hỏi" là kết thúc chính; né ít hơn thì không có', () => {
    for (const { persona, r } of gioi) expect(share(r.endings).E8 ?? 0, persona).toBeGreaterThan(0.5);
    for (const { persona, r } of vua) expect(r.endings.E8, persona).toBeUndefined();
  });

  it('mỗi vai gặp ít nhất 3 kết thúc khác nhau', () => {
    for (const { persona, r } of vua) expect(Object.keys(r.endings).length, persona).toBeGreaterThanOrEqual(3);
  });
});

describe('kết thúc ẩn "Tết xa nhà"', () => {
  it('nói với mẹ "năm nay con ở lại" rồi xác nhận thì kết thúc ngay bằng E4', () => {
    let s = createGame(c, 'moi-di-lam', 'ha-noi', 'Lan');
    s = choose(c, s, 'me-goi', 'd').state;
    expect(s.flags).toContain('muon-o-lai');
    expect(s.endingId).toBeNull();
    s = choose(c, s, 'chac-chua', 'a').state;
    expect(s.endingId).toBe('E4');
  });

  it('đổi ý ("con về") thì chơi tiếp', () => {
    let s = createGame(c, 'sinh-vien', 'sai-gon', 'Minh');
    s = choose(c, s, 'me-goi', 'd').state;
    s = choose(c, s, 'chac-chua', 'b').state;
    expect(s.endingId).toBeNull();
  });
});

describe('tên người chơi trong thoại', () => {
  it('Bà Tám gọi đúng tên người chơi; bài "để mai săn" ghi tên người chơi làm người đăng', () => {
    const s = createGame(c, 'moi-di-lam', 'ha-noi', 'Thảo');
    expect(getView(c, s, 'bvn-3').line).toContain('Thảo về rồi nè');
    expect(getView(c, s, 'san-ve').choices.find((x) => x.id === 'f')!.author).toBe('Thảo');
  });
});
