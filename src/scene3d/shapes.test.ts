import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { geometryOf, mergeShapes, type Shape } from './shapes';

const box = (p: [number, number, number], c = '#ff0000', extra: Partial<Shape> = {}): Shape => ({ g: 'box', s: [1, 1, 1], p, c, ...extra });
const bounds = (g: ReturnType<typeof mergeShapes>) => new Box3().setFromBufferAttribute(g.attributes.position as never);

describe('mergeShapes', () => {
  it('gộp thành một geometry: tổng số đỉnh bằng tổng các khối, có màu và pháp tuyến, không chỉ số', () => {
    const shapes: Shape[] = [box([0, 0, 0]), { g: 'cyl', s: [0.5, 0.5, 1, 8], p: [3, 0, 0], c: '#00ff00' }, { g: 'ico', s: [0.5, 0], p: [6, 0, 0], c: '#0000ff' }];
    const each = shapes.map((s) => {
      const g = geometryOf(s);
      return (g.index ? g.toNonIndexed() : g).attributes.position!.count;
    });
    const g = mergeShapes(shapes);
    expect(g.attributes.position!.count).toBe(each.reduce((a, b) => a + b, 0));
    expect(g.attributes.color!.count).toBe(g.attributes.position!.count);
    expect(g.attributes.normal!.count).toBe(g.attributes.position!.count);
    expect(g.attributes.uv).toBeUndefined();
    expect(g.index).toBeNull();
  });

  it('đặt đúng vị trí, xoay và co giãn của từng khối', () => {
    const b = bounds(mergeShapes([box([10, 2, -3], '#ffffff', { k: [2, 4, 6] })]));
    expect(b.min.x).toBeCloseTo(9, 6);
    expect(b.max.x).toBeCloseTo(11, 6);
    expect(b.min.y).toBeCloseTo(0, 6);
    expect(b.max.y).toBeCloseTo(4, 6);
    expect(b.min.z).toBeCloseTo(-6, 6);
    expect(b.max.z).toBeCloseTo(0, 6);
    // xoay 90° quanh y: hộp 2 x 1 x 1 thành 1 x 1 x 2
    const r = bounds(mergeShapes([{ g: 'box', s: [2, 1, 1], p: [0, 0, 0], r: [0, Math.PI / 2, 0], c: '#ffffff' }]));
    expect(r.max.x - r.min.x).toBeCloseTo(1, 6);
    expect(r.max.z - r.min.z).toBeCloseTo(2, 6);
  });

  it('nhóm bao ngoài đặt khối trong hệ toạ độ của nhóm (như <group position rotation> trong JSX)', () => {
    // khối ở (0, 1, 0) trong nhóm xoay 90° quanh z rồi tịnh tiến (5, 0, 0): (0,1) -> (-1, 0) -> (4, 0)
    const b = bounds(mergeShapes([box([0, 1, 0], '#fff', { group: { p: [5, 0, 0], r: [0, 0, Math.PI / 2] } })]));
    expect((b.min.x + b.max.x) / 2).toBeCloseTo(4, 6);
    expect((b.min.y + b.max.y) / 2).toBeCloseTo(0, 6);
  });

  it('màu theo đỉnh đúng màu của từng khối; màu hỏng thành xám, không ném lỗi', () => {
    const g = mergeShapes([box([0, 0, 0], '#ff0000'), box([2, 0, 0], 'đỏ')]);
    const col = g.attributes.color!;
    const n = col.count / 2;
    expect(col.getX(0)).toBeGreaterThan(0.9);
    expect(col.getY(0)).toBeLessThan(0.01);
    expect(col.getX(n)).toBeCloseTo(col.getY(n), 6); // xám: r = g = b
    expect(col.getX(n)).toBeGreaterThan(0.1);
  });

  it('danh sách rỗng trả geometry rỗng; mọi loại khối đều dựng được', () => {
    expect(mergeShapes([]).attributes.position).toBeUndefined();
    const kinds: Shape[] = [
      { g: 'box', s: [1, 1, 1], p: [0, 0, 0], c: '#fff' },
      { g: 'cyl', s: [1, 1, 1], p: [0, 0, 0], c: '#fff' },
      { g: 'sphere', s: [1], p: [0, 0, 0], c: '#fff' },
      { g: 'cone', s: [1, 1], p: [0, 0, 0], c: '#fff' },
      { g: 'torus', s: [1, 0.1], p: [0, 0, 0], c: '#fff' },
      { g: 'ico', s: [1], p: [0, 0, 0], c: '#fff' },
      { g: 'plane', s: [1, 1], p: [0, 0, 0], c: '#fff' },
      { g: 'circle', s: [1], p: [0, 0, 0], c: '#fff' },
    ];
    const g = mergeShapes(kinds);
    expect(g.attributes.position!.count).toBeGreaterThan(100);
    expect(Number.isFinite(g.attributes.position!.getX(0))).toBe(true);
  });
});
