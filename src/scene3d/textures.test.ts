import { describe, expect, it } from 'vitest';
import { mixHex, skyGradient } from './textures';

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
