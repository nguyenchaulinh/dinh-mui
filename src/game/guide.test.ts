import { describe, expect, it } from 'vitest';
import { GUIDE_ZONE, guideArrow } from './guide';

const AR = 369 / 772;

describe('guideArrow', () => {
  it('mục tiêu đang thấy thì không có mũi tên', () => {
    expect(guideArrow(0, 0, false, AR)).toBeNull();
    expect(guideArrow(0.8, -0.7, false, AR)).toBeNull();
    expect(guideArrow(-0.89, 0.85, false, AR)).toBeNull();
  });

  it('ra khỏi khung bên phải: mũi tên ở mép phải vùng, chỉ sang phải', () => {
    const a = guideArrow(2.5, 0.1, false, AR)!;
    expect(a).not.toBeNull();
    expect(a.x).toBeCloseTo((GUIDE_ZONE.right + 1) / 2, 6);
    expect(a.angle).toBeGreaterThan(Math.PI / 4);
    expect(a.angle).toBeLessThan((3 * Math.PI) / 4);
  });

  it('ra khỏi khung bên trái: mép trái, góc âm', () => {
    const a = guideArrow(-3, 0, false, AR)!;
    expect(a.x).toBeCloseTo((GUIDE_ZONE.left + 1) / 2, 6);
    expect(a.angle).toBeLessThan(0);
  });

  it('phía trên khung: chỉ lên; mũi tên không bao giờ vào vùng khung chỉ số (trên) hay nút điều khiển (dưới)', () => {
    const up = guideArrow(0, 3, false, AR)!;
    expect(up.y).toBeCloseTo((1 - GUIDE_ZONE.top) / 2, 6);
    expect(Math.abs(up.angle)).toBeLessThan(0.2);
    for (const [x, y, behind] of [[5, 5, false], [-5, -5, false], [0, 0, true], [0.3, 0.5, true], [-4, 1, true], [1, -9, false]] as const) {
      const a = guideArrow(x, y, behind, AR)!;
      expect(a.x, `${x},${y},${behind}`).toBeGreaterThanOrEqual((GUIDE_ZONE.left + 1) / 2 - 1e-9);
      expect(a.x).toBeLessThanOrEqual((GUIDE_ZONE.right + 1) / 2 + 1e-9);
      expect(a.y).toBeGreaterThanOrEqual((1 - GUIDE_ZONE.top) / 2 - 1e-9);
      expect(a.y).toBeLessThanOrEqual((1 - GUIDE_ZONE.bottom) / 2 + 1e-9);
    }
  });

  it('sau lưng camera luôn có mũi tên (kể cả chiếu về giữa màn hình); ngay sau lưng thì chỉ xuống', () => {
    const a = guideArrow(0, 0, true, AR)!;
    expect(a).not.toBeNull();
    expect(Math.abs(Math.abs(a.angle) - Math.PI)).toBeLessThan(0.01);
    // Sau lưng bên phải thì phép chiếu lật: ndcX dương nghĩa là thực ra ở bên trái.
    const left = guideArrow(0.6, 0, true, AR)!;
    expect(left.angle).toBeLessThan(0);
  });

  it('đầu vào hỏng không sinh NaN', () => {
    expect(guideArrow(NaN, 0, false, AR)).toBeNull();
    expect(guideArrow(0, Infinity, true, AR)).toBeNull();
    const a = guideArrow(3, 0, false, NaN)!;
    expect(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.angle)).toBe(true);
  });
});
