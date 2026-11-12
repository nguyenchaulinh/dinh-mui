import { describe, expect, it } from 'vitest';
import { validateContent } from '../engine/validate';
import { SETS } from '../scene3d/registry';
import { ROAM_SETS } from '../scene3d/walk';
import { loadContent } from './index';
import { endingsOfMap } from './simulate';

/** Kiểm tra nội dung thật (v1.json), không phải dữ liệu mẫu. */
const c = loadContent();

/** Né 3 câu (đủ để xong nhiệm vụ đích) hoặc né 5 câu (kỹ năng cao, mở E8). */
const DODGE_3 = [1, 3];
const DODGE_5 = [1, 3, 5];

/**
 * Các kết thúc mà nội dung hiện chưa thể đạt tới (cần chặng/áp lực chỉ số chưa làm: chỉ số về 0 phải có chi phí lớn hơn
 * ở các chặng sau). Khi nội dung mới làm một kết thúc đạt tới được, test này báo lỗi để cập nhật danh sách.
 */
const AWAITING_CONTENT = ['E1', 'E2', 'E3'];

describe('nội dung v1', () => {
  it('hợp lệ, kể cả set 3D, vị trí đứng và vùng đi lại', () => {
    expect(validateContent(c, { sets: SETS, roamSets: ROAM_SETS })).toEqual([]);
  });

  it('mỗi chặng có bản đồ đi lại được', () => {
    for (const s of c.stages) expect(c.maps.some((m) => m.id === s.mapId), s.id).toBe(true);
  });

  it('nhân vật nhại đều có cờ parody và bản thay thế', () => {
    for (const ch of c.characters.filter((x) => x.parody)) {
      expect(ch.fallbackId, ch.id).toBeTruthy();
    }
  });
});

describe('kết thúc của từng chặng (duyệt mọi tổ hợp câu đáp, mọi vai × vùng)', () => {
  const map = c.maps[0]!;
  const runs = (dodge: readonly number[]) =>
    c.personas.map((p) =>
      c.regions.map((r) => ({ persona: p.id, region: r.id, counts: endingsOfMap(c, map, p.id, r.id, dodge) })),
    ).flat();

  it('mọi vai × vùng chơi tới một kết thúc, né 3 hay 5 câu đều được', () => {
    for (const dodge of [DODGE_3, DODGE_5]) {
      for (const r of runs(dodge)) {
        const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
        expect(total, `${r.persona}/${r.region}`).toBeGreaterThan(0);
        for (const id of Object.keys(r.counts)) expect(c.endings.some((e) => e.id === id), id).toBe(true);
      }
    }
  });

  it('mọi kết thúc đều tới được, trừ những cái đã khai báo là chờ nội dung', () => {
    const reached = new Set<string>();
    for (const dodge of [DODGE_3, DODGE_5]) for (const r of runs(dodge)) for (const id of Object.keys(r.counts)) reached.add(id);
    const unreachable = c.endings.map((e) => e.id).filter((id) => !reached.has(id));
    expect(unreachable).toEqual(AWAITING_CONTENT);
  });

  it('không kết thúc nào chiếm quá 75% số cách chơi của một vai (khi né 3 câu)', () => {
    for (const r of runs(DODGE_3)) {
      const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
      for (const [id, n] of Object.entries(r.counts)) {
        expect(n / total, `${r.persona}/${r.region} ${id}`).toBeLessThanOrEqual(0.75);
      }
    }
  });

  it('né đủ 5 câu thì luôn được "Chiến thần né câu hỏi"; né 3 câu thì không', () => {
    for (const r of runs(DODGE_5)) expect(Object.keys(r.counts), `${r.persona}/${r.region}`).toEqual(['E8']);
    for (const r of runs(DODGE_3)) expect(Object.keys(r.counts), `${r.persona}/${r.region}`).not.toContain('E8');
  });

  it('Lầy không còn là lựa chọn miễn phí: mỗi "Lầy" luôn tốn thứ gì đó', () => {
    for (const s of c.scenes) {
      for (const ch of s.choices.filter((x) => x.style === 'lay')) {
        const costs = Object.values(ch.effects).some((v) => v !== undefined && v < 0);
        expect(costs, `${s.id}/${ch.id}`).toBe(true);
      }
    }
  });
});
