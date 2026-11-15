import { describe, expect, it } from 'vitest';
import setsSrc from './sets.tsx?raw';
import { walkAreaFor } from './walk';

/** Hàng rào, chuối, bụi cây của sân nhà không có vật cản, nên phải nằm hẳn ngoài vùng đi lại (kể cả bán kính người chơi). */
describe('sân nhà: đồ trang trí bằng model CC0 nằm ngoài vùng đi lại', () => {
  const PLAYER_R = 0.35;
  const yard = setsSrc.slice(setsSrc.indexOf('function SanNha'), setsSrc.indexOf('<CountryHouse'));

  it('mọi hàng rào / chuối / bụi cây đặt theo `sx * x` đều cách bounds x của sân quá bán kính người chơi cộng nửa bề dày', () => {
    for (const style of ['bac', 'trung', 'nam'] as const) {
      const maxX = walkAreaFor('san-nha', style)!.bounds.maxX;
      const found = [...yard.matchAll(/model="(fence|banana|bush)"[^>]*?position=\{\[sx \* ([\d.]+)/g)];
      expect(found.length, 'số vật trang trí tìm thấy').toBeGreaterThanOrEqual(5);
      for (const [, model, x] of found) {
        const half = model === 'fence' ? 0.1 : 0.4; // hàng rào mỏng, cây có tán
        expect(Number(x) - half, `${model} ở x = ${x}`).toBeGreaterThan(maxX + PLAYER_R);
      }
    }
  });
});
