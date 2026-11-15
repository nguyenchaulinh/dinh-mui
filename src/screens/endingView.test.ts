import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { STAT_MAX } from '../engine/types';
import { MAX_SCORE, countUp, endingLook, starsFor, totalScore } from './endingView';

const HEX = /^#[0-9a-fA-F]{6}$/;

describe('giọng điệu màn kết thúc', () => {
  const content = loadContent();
  it('mọi kết thúc trong nội dung có kiểu riêng (không rơi vào mặc định ngoài ý muốn)', () => {
    const known = new Set(['E1', 'E2', 'E3', 'E4', 'E6', 'E7', 'E8', 'E9']);
    for (const e of content.endings) expect(known.has(e.id), `${e.id} chưa có trong endingView`).toBe(true);
  });
  it('mỗi kiểu có dải lụa, cường độ 1-3, bảng màu hex hợp lệ và màu ánh sáng', () => {
    for (const e of content.endings) {
      const l = endingLook(e.id);
      expect(l.ribbon.length, e.id).toBeGreaterThan(2);
      expect([1, 2, 3]).toContain(l.intensity);
      expect(l.palette.length).toBeGreaterThanOrEqual(4);
      for (const c of [...l.palette, l.glow]) expect(c, e.id).toMatch(HEX);
    }
  });
  it('kết thúc đẹp có pháo hoa hoành tráng nhất; id lạ dùng "về tới nhà"', () => {
    expect(endingLook('E8').intensity).toBe(3);
    expect(endingLook('E7').intensity).toBe(3);
    expect(endingLook('E1').intensity).toBeLessThan(3);
    expect(endingLook('???').tone).toBe('song-sot');
    expect(endingLook('E4').ribbon).not.toBe(endingLook('E8').ribbon);
  });
});

describe('số sao theo tổng chỉ số', () => {
  const s = (h: number, st: number, w: number) => ({ harmony: h, stamina: st, wallet: w });
  it('tổng cao thì nhiều sao hơn, tối thiểu một sao và tối đa ba', () => {
    expect(starsFor(s(0, 0, 0))).toBe(1);
    expect(starsFor(s(100, 38, 16))).toBe(2); // ví dụ trong màn hình thật: 154
    expect(starsFor(s(100, 60, 40))).toBe(3);
    expect(starsFor(s(100, 100, 100))).toBe(3);
  });
  it('đơn điệu theo từng chỉ số và kẹp giá trị ngoài khoảng', () => {
    let prev = 0;
    for (let v = 0; v <= STAT_MAX; v += 5) {
      const n = starsFor(s(v, v, v));
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(totalScore(s(500, -5, NaN))).toBe(STAT_MAX);
    expect(MAX_SCORE).toBe(300);
  });
});

describe('đếm số lên', () => {
  it('từ 0 tăng dần tới đúng giá trị, không vượt, giữ nguyên sau khi xong', () => {
    let prev = -1;
    for (let t = -0.2; t <= 1.2; t += 0.05) {
      const v = countUp(80, t);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(80);
      prev = v;
    }
    expect(countUp(80, -1)).toBe(0);
    expect(countUp(80, 0.9)).toBe(80);
    expect(countUp(80, 5)).toBe(80);
    expect(countUp(NaN, 1)).toBe(0);
    expect(countUp(50, 0.3, 0)).toBe(50);
  });
});
