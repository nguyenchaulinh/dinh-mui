import { describe, expect, it } from 'vitest';
import { CONFIDENT_MIN, DANGER_MAX, statLevel } from '../labels';

describe('mức của chỉ số', () => {
  it('nguy hiểm <= 25, trung bình 26-59, tự tin >= 60; giá trị hỏng coi là nguy hiểm', () => {
    expect(statLevel(0)).toBe('danger');
    expect(statLevel(DANGER_MAX)).toBe('danger');
    expect(statLevel(DANGER_MAX + 1)).toBe('medium');
    expect(statLevel(CONFIDENT_MIN - 1)).toBe('medium');
    expect(statLevel(CONFIDENT_MIN)).toBe('confident');
    expect(statLevel(100)).toBe('confident');
    expect(statLevel(Number.NaN)).toBe('danger');
  });
});
