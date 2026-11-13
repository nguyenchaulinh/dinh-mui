import { describe, expect, it } from 'vitest';
import { ACCESSORIES } from '../engine/types';
import { ANCHOR_BONE, FIT, MAX_ACCESSORIES, accessoriesOf, builtinOf, fitOf, propsFor } from './outfit';
import { CHARACTER_MODELS } from './rigging';

const ALL = ACCESSORIES.filter((a) => a !== 'none');

describe('accessoriesOf', () => {
  it('gộp accessory và accessories, bỏ none và trùng, giữ thứ tự', () => {
    expect(accessoriesOf({ accessory: 'glasses', accessories: ['backpack', 'glasses', 'none', 'lanyard'] })).toEqual(['glasses', 'backpack', 'lanyard']);
    expect(accessoriesOf(undefined)).toEqual([]);
    expect(accessoriesOf({ accessory: 'none' })).toEqual([]);
  });
  it(`cắt còn ${MAX_ACCESSORIES} phụ kiện`, () => {
    expect(accessoriesOf({ accessories: ['cap', 'glasses', 'tie', 'lanyard', 'bag', 'cup'] })).toHaveLength(MAX_ACCESSORIES);
  });
});

describe('propsFor', () => {
  it.each(ALL)('%s: có ít nhất một khối, mọi số hữu hạn, màu hợp lệ, gắn vào xương có tên', (kind) => {
    for (const model of CHARACTER_MODELS.filter((m) => m !== 'cho-pom')) {
      const parts = propsFor([kind], fitOf(model));
      expect(parts.length, `${kind}/${model}`).toBeGreaterThan(0);
      for (const part of parts) {
        expect(ANCHOR_BONE[part.anchor]).toBeTruthy();
        expect(part.shapes.length).toBeGreaterThan(0);
        for (const s of part.shapes) {
          expect([...s.s, ...s.p, ...(s.r ?? []), ...(s.k ?? [])].every(Number.isFinite), `${kind}/${model}`).toBe(true);
          expect(s.c).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(s.s.every((n) => n > 0 || n === 0)).toBe(true);
        }
      }
    }
  });

  it('khối khung bind nằm quanh thân và đầu (không bay đi đâu xa), khối khung hang gần cổ tay', () => {
    for (const model of Object.keys(FIT)) {
      for (const part of propsFor(ALL, fitOf(model))) {
        for (const s of part.shapes) {
          if (part.frame === 'bind') {
            expect(Math.abs(s.p[0]), `${model} x`).toBeLessThan(0.4);
            expect(s.p[1], `${model} y`).toBeGreaterThan(0.85);
            expect(s.p[1]).toBeLessThan(2.05);
            expect(Math.abs(s.p[2])).toBeLessThan(0.5);
          } else {
            expect(Math.hypot(...s.p), `${model} hang`).toBeLessThan(0.3);
          }
        }
      }
    }
  });

  it('màu nhấn hợp lệ thay màu mặc định; màu hỏng bị bỏ qua', () => {
    const colors = (accent?: string) => propsFor(['backpack'], fitOf('nam-hoodie'), accent)[0]!.shapes.map((s) => s.c);
    expect(colors('#ea580c')).toContain('#ea580c');
    expect(colors('đỏ')).not.toContain('đỏ');
    expect(colors(undefined)).toContain('#1d4ed8');
  });

  it('phụ kiện không có model nào khớp thì dùng số đo nam, model nữ có số đo riêng', () => {
    expect(fitOf('khong-co')).toEqual(fitOf('nam-vest'));
    expect(fitOf('nu-cong-so').ty0).toBeGreaterThan(fitOf('nam-vest').ty0);
  });

  it('đồ có sẵn trong mesh: thợ / nông dân đã có mũ, vest đã có cà vạt', () => {
    expect([...builtinOf('nam-tho')]).toEqual(expect.arrayContaining(['hat', 'cap', 'helmet']));
    expect(builtinOf('nam-vest').has('tie')).toBe(true);
    expect(builtinOf('nam-hoodie').size).toBe(0);
  });
});
