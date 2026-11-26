import { Box3 } from 'three';
import setsSrc from './sets.tsx?raw';
import { describe, expect, it } from 'vitest';
import { CURTAIN, roomShapes, type RoomKind } from './roomShapes';
import { facadeRepeat, skylineGeometry, skylineTowers } from './skyline';
import { mergeShapes } from './shapes';
import { CUOI_NAM } from './walk';
import { windowedWallBoxes } from './wallPieces';

const PAL = { wall: '#f1ece4', dado: '#d6cfc4', board: '#f8fafc' };
const KINDS: RoomKind[] = ['van-phong', 'lop-hoc'];
const bbox = (shapes: Parameters<typeof mergeShapes>[0]) => {
  const g = mergeShapes(shapes);
  g.computeBoundingBox();
  return g.boundingBox as Box3;
};

describe('phần tĩnh của phòng gộp thành dữ liệu', () => {
  it.each(KINDS)('%s: nhiều khối nhưng chỉ vài mesh (khối đặc + sáng + kính); đủ số khối chính', (k) => {
    const r = roomShapes(k, PAL);
    expect(r.solid.length).toBeGreaterThan(60);
    expect(r.glass).toHaveLength(CUOI_NAM.windows.zs.length);
    expect(r.lit.length).toBeGreaterThanOrEqual(3); // biển lối ra + 2 đèn báo máy lạnh
    for (const sh of [...r.solid, ...r.lit, ...r.glass]) expect(sh.c).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each(KINDS)('%s: mọi khối nằm trong khoảng phòng (trong tường, không vượt trần hay mặt đất)', (k) => {
    const L = CUOI_NAM;
    const b = bbox(roomShapes(k, PAL).solid);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(b.max.y).toBeLessThanOrEqual(L.wallHeight + 0.001);
    expect(b.min.x).toBeGreaterThanOrEqual(-L.wallSideX - L.wallThick - 0.01);
    expect(b.max.x).toBeLessThanOrEqual(L.wallSideX + L.wallThick + 0.01);
    expect(b.min.z).toBeGreaterThanOrEqual(L.wallBackZ - L.wallThick - 0.01);
    expect(b.max.z).toBeLessThanOrEqual(L.frontZ + L.wallThick + L.ext + 0.01);
  });

  it('văn phòng và lớp học khác nhau (rèm, quầy, khung tường trái, bảng)', () => {
    const v = roomShapes('van-phong', PAL);
    const l = roomShapes('lop-hoc', PAL);
    expect(CURTAIN['van-phong']).not.toBe(CURTAIN['lop-hoc']);
    expect(v.solid.some((s) => s.c === CURTAIN['van-phong'])).toBe(true);
    expect(l.solid.some((s) => s.c === CURTAIN['lop-hoc'])).toBe(true);
    expect(v.solid.map((x) => x.c).join()).not.toBe(l.solid.map((x) => x.c).join());
  });

  it('tường trái phủ kín trừ các ô cửa sổ: bốn dải/trụ không chồng lên ô mở', () => {
    const L = CUOI_NAM;
    const w = windowedWallBoxes({ x: 0, thick: 0.3, z0: -5, z1: 5, h: 3, sill: L.windows.sill, head: L.windows.head, openings: L.windows.zs.map((z) => ({ z, w: L.windows.w })) });
    // Phần giữa sill và head chỉ có trụ: không khối nào phủ tâm của một ô mở.
    for (const z of L.windows.zs) {
      const mid = (L.windows.sill + L.windows.head) / 2;
      const covers = w.some((b) => Math.abs(b.p[1] - mid) < b.s[1] / 2 && Math.abs(b.p[2] - z) < b.s[2] / 2);
      expect(covers, `ô z=${z}`).toBe(false);
    }
    expect(w.length).toBe(2 + L.windows.zs.length + 1);
  });
});

describe('dãy nhà cao tầng gộp một geometry', () => {
  it('cùng hạt cho cùng dãy; khác hạt thì khác', () => {
    expect(skylineTowers(80, 1, '#e8c9b0', 10, 26)).toEqual(skylineTowers(80, 1, '#e8c9b0', 10, 26));
    expect(skylineTowers(80, 1, '#e8c9b0', 10, 26)).not.toEqual(skylineTowers(80, 2, '#e8c9b0', 10, 26));
  });
  it('một geometry có position/uv/color, đủ 24 đỉnh mỗi toà, UV nhân theo số lần lặp', () => {
    const t = skylineTowers(80, 1, '#e8c9b0', 10, 26);
    const g = skylineGeometry(t);
    expect(g.attributes.position!.count).toBe(t.length * 24);
    expect(g.attributes.color!.count).toBe(t.length * 24);
    const [rx, ry] = facadeRepeat(t[0]!);
    let maxU = 0;
    let maxV = 0;
    for (let i = 0; i < 24; i++) {
      maxU = Math.max(maxU, g.attributes.uv!.getX(i));
      maxV = Math.max(maxV, g.attributes.uv!.getY(i));
    }
    expect([maxU, maxV]).toEqual([rx, ry]);
  });
  it('các toà không lệch khỏi khoảng span và cao trong [minH, maxH]', () => {
    for (const t of skylineTowers(110, 2, '#e8c9b0', 16, 36)) {
      expect(t.h).toBeGreaterThanOrEqual(16);
      expect(t.h).toBeLessThanOrEqual(36);
      expect(Math.abs(t.x)).toBeLessThan(110 / 2 + 8);
    }
  });
  it('rỗng không làm hỏng', () => {
    expect(skylineGeometry([]).attributes.position?.count ?? 0).toBe(0);
  });
});

describe('MergedShapes không dựng lại hình mỗi lần render', () => {
  it('giá trị mặc định của lit / glass là hằng dùng chung, không phải `= []` (mảng mới mỗi render làm useMemo vô tác dụng)', async () => {
    const src = (await import('./Merged.tsx?raw')).default as string;
    expect(src).not.toMatch(/lit\s*=\s*\[\]/);
    expect(src).not.toMatch(/glass\s*=\s*\[\]/);
    expect(src).toMatch(/lit = NONE/);
  });
});

describe('cấu trúc dựng CuoiNam giữ ngân sách draw call', () => {
  const room = setsSrc.slice(setsSrc.indexOf('function CuoiNam'), setsSrc.indexOf('function NhaTren'));
  it('không còn <Box> / <mesh> riêng lẻ trong phòng (khối tĩnh đã gộp trong roomShapes)', () => {
    expect(room).not.toMatch(/<Box\b/);
    expect(room).not.toMatch(/<mesh\b/);
    expect(room).toContain('<MergedShapes');
  });
  it('mỗi dãy nhà cao tầng chỉ một mesh; vạch kẻ đường gộp', () => {
    const t = skylineTowers(80, 1, '#e8c9b0', 10, 26);
    expect(t.length).toBeGreaterThan(8); // trước đây mỗi toà một mesh
    expect(skylineGeometry(t).attributes.position!.count).toBe(t.length * 24);
  });
});
