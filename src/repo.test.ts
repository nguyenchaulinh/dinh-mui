import { describe, expect, it } from 'vitest';
import lockRaw from '../package-lock.json?raw';

/**
 * Kho mã công khai: lockfile chỉ được trỏ tới registry công khai. `npm install` trên máy dùng registry nội bộ/mirror
 * có thể ghi URL máy chủ riêng vào `resolved`; test này chặn việc đó trước khi đẩy lên.
 */
describe('package-lock.json', () => {
  const lock = JSON.parse(lockRaw) as { packages: Record<string, { resolved?: string }> };

  it('mọi gói resolve từ registry.npmjs.org (không lộ registry nội bộ)', () => {
    const bad = Object.entries(lock.packages)
      .filter(([, p]) => p.resolved !== undefined && !p.resolved.startsWith('https://registry.npmjs.org/'))
      .map(([name, p]) => `${name}: ${p.resolved}`);
    expect(bad).toEqual([]);
  });
});
