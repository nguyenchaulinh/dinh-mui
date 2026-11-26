import { describe, expect, it } from 'vitest';
import { labelCacheKey, mixHex, skyGradient } from './textures';

describe('mixHex / skyGradient', () => {
  it('mixHex: hai đầu mút và điểm giữa', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#0000ff', 0.5)).toBe('#800080');
  });
  it('skyGradient: chân trời giữ nguyên, đỉnh trời pha với màu đỉnh', () => {
    const g = skyGradient('#f2c4a0', '#5f93d8', 0.6);
    expect(g.horizon).toBe('#f2c4a0');
    expect(g.top).toBe(mixHex('#f2c4a0', '#5f93d8', 0.6));
    expect(g.top).not.toBe(g.horizon);
  });
  it('skyGradient: đầu vào hỏng dùng giá trị an toàn, amount kẹp 0..1', () => {
    const bad = skyGradient('do', 'xanh', NaN);
    expect(bad.horizon).toMatch(/^#[0-9a-f]{6}$/);
    expect(bad.top).toMatch(/^#[0-9a-f]{6}$/);
    expect(skyGradient('#000000', '#ffffff', 5).top).toBe('#ffffff');
    expect(skyGradient('#000000', '#ffffff', -5).top).toBe('#000000');
  });
});

describe('labelCacheKey: khoá cache texture chữ', () => {
  const lines = [{ text: 'TẾT', size: 100, color: '#fff' }];
  it('khác nhau đúng ở cờ phông đã nạp (để tìm và giải phóng bản vẽ phông dự phòng), giống nhau ở mọi thứ còn lại', () => {
    const a = labelCacheKey(false, 2, 1, '#fff', 384, {}, lines);
    const b = labelCacheKey(true, 2, 1, '#fff', 384, {}, lines);
    expect(a).not.toBe(b);
    const drop = (k: string) => k.split('|').filter((_, i) => i !== 7).join('|'); // đoạn thứ 8 là cờ phông
    expect(drop(a)).toBe(drop(b));
    expect(a.split('|')[7]).toBe('false');
    expect(b.split('|')[7]).toBe('true');
  });
  it('đổi nội dung, kích thước, nền hoặc tuỳ chọn thì khoá đổi', () => {
    const base = labelCacheKey(true, 2, 1, '#fff', 384, {}, lines);
    expect(labelCacheKey(true, 2, 1, '#fff', 384, { grain: true }, lines)).not.toBe(base);
    expect(labelCacheKey(true, 2, 1, '#fff', 384, { uniform: true }, lines)).not.toBe(base);
    expect(labelCacheKey(true, 3, 1, '#fff', 384, {}, lines)).not.toBe(base);
    expect(labelCacheKey(true, 2, 1, null, 384, {}, lines)).not.toBe(base);
    expect(labelCacheKey(true, 2, 1, '#fff', 384, {}, [{ text: 'XUÂN', size: 100, color: '#fff' }])).not.toBe(base);
  });
});
