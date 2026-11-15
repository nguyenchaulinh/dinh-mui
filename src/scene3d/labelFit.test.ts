import { describe, expect, it } from 'vitest';
import { fitLabelFonts, type LabelLine } from './textures';

/** Đo giả: mỗi ký tự rộng 0.6 em. */
const measure = (l: LabelLine) => l.text.length * 0.6;
const L = (text: string, size = 100, extra: Partial<LabelLine> = {}): LabelLine => ({ text, size, color: '#000000', ...extra });

describe('fitLabelFonts: cỡ chữ theo tỉ lệ, không chồng dòng, không méo', () => {
  it('chữ không bao giờ cao hơn dải của dòng nên các dòng không chồng nhau (lỗi câu đối cũ)', () => {
    const lines = ['VẠN', 'SỰ', 'NHƯ', 'Ý'].map((t) => L(t, 78));
    const { fonts, bands } = fitLabelFonts(lines, 192, 538, measure);
    expect(bands.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(538 * 0.88 + 1e-9);
    fonts.forEach((f, i) => expect(f, lines[i]!.text).toBeLessThanOrEqual(bands[i]! * 0.8 + 1e-9));
  });

  it('chữ dài tự thu nhỏ cho vừa bề ngang (không ép méo bằng maxWidth)', () => {
    const { fonts } = fitLabelFonts([L('CHÚC MỪNG NĂM MỚI · TẾT ĐINH MÙI')], 1267, 115, measure);
    expect(measure(L('CHÚC MỪNG NĂM MỚI · TẾT ĐINH MÙI')) * fonts[0]!).toBeLessThanOrEqual(1267 * 0.92 + 1e-6);
  });

  it('dòng ngắn giữ cỡ theo chiều cao, dòng dài bị thu nhỏ', () => {
    const { fonts } = fitLabelFonts([L('AB', 100), L('MỘT DÒNG RẤT RẤT DÀI ĐỂ THỬ THU NHỎ CHỮ', 100)], 400, 300, measure);
    expect(fonts[0]!).toBeGreaterThan(fonts[1]! * 2);
  });

  it('size là độ lớn tương đối: dòng có size gấp đôi nhận dải cao gấp đôi', () => {
    const { bands } = fitLabelFonts([L('A', 150), L('B', 75)], 1000, 300, measure);
    expect(bands[0]! / bands[1]!).toBeCloseTo(2, 6);
  });

  it('uniform: mọi dòng cùng cỡ, bằng cỡ nhỏ nhất vừa khung', () => {
    const lines = ['VẠN', 'SỰ', 'NHƯ', 'Ý'].map((t) => L(t, 78));
    const free = fitLabelFonts(lines, 100, 538, measure).fonts;
    const same = fitLabelFonts(lines, 100, 538, measure, true).fonts;
    expect(new Set(same).size).toBe(1);
    expect(same[0]).toBeCloseTo(Math.min(...free), 9);
    expect(Math.max(...free)).toBeGreaterThan(Math.min(...free)); // không uniform thì có dòng to hơn
  });

  it('đầu vào cực đoan không sinh NaN: không dòng nào, size 0 hoặc âm, chữ rỗng', () => {
    expect(fitLabelFonts([], 100, 100, measure).fonts).toEqual([]);
    const r = fitLabelFonts([L('', 0), L('x', -5)], 100, 100, measure);
    expect(r.fonts.every(Number.isFinite)).toBe(true);
    expect(r.bands.every((b) => b > 0)).toBe(true);
  });

  it('viền và bóng đổ được tính vào bề ngang nên chữ có viền không tràn khung', () => {
    const plain = fitLabelFonts([L('TẾT SUM VẦY · XUÂN AN KHANG')], 300, 200, measure).fonts[0]!;
    const outlined = fitLabelFonts([L('TẾT SUM VẦY · XUÂN AN KHANG', 100, { stroke: { color: '#000', w: 0.2 }, shadow: { color: '#000', dx: 0.1, dy: 0.1 } })], 300, 200, measure).fonts[0]!;
    expect(outlined).toBeLessThan(plain);
  });
});
