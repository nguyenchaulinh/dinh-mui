// Chạy vitest với cwd chuẩn hoá chữ hoa ổ đĩa (Windows).
// Terminal mở ở `d:\...` (chữ thường) làm vitest lỗi
// "Cannot read properties of undefined (reading 'config')" vì nạp 2 bản module.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const vitestBin = join(cwd, 'node_modules', 'vitest', 'vitest.mjs');

const result = spawnSync(process.execPath, [vitestBin, 'run', ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
