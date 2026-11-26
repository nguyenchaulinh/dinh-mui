import { describe, expect, it } from 'vitest';
import lock from '../package-lock.json?raw';

/**
 * Canh giữ lockfile công khai: máy có `.npmrc` trỏ registry riêng thì `npm install` có thể ghi lại URL riêng vào
 * `package-lock.json` (đã từng lộ host registry nội bộ vào lịch sử git công khai, xem docs/10 mục 5). Test này chặn việc
 * đó trước khi commit: mọi `resolved` phải ở registry công khai, và không có thông tin đăng nhập trong URL.
 */
describe('package-lock.json chỉ trỏ registry công khai', () => {
  const urls = [...lock.matchAll(/"resolved":\s*"([^"]+)"/g)].map((m) => m[1]!);

  it('có các gói để kiểm (lockfile không rỗng)', () => {
    expect(urls.length).toBeGreaterThan(50);
  });

  it('mọi URL tải gói dùng registry.npmjs.org qua https', () => {
    const bad = urls.filter((u) => !u.startsWith('https://registry.npmjs.org/'));
    expect(bad, `URL ngoài registry công khai: ${bad.slice(0, 3).join(', ')}`).toEqual([]);
  });

  it('không có tên người dùng / mật khẩu trong URL và không có đường dẫn kho riêng', () => {
    for (const u of urls) {
      const parsed = new URL(u);
      expect(parsed.username, u).toBe('');
      expect(parsed.password, u).toBe('');
      expect(parsed.pathname, u).not.toMatch(/artifactory|\/api\/npm\//i);
    }
  });
});
