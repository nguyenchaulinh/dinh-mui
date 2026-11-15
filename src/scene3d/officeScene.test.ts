import { describe, expect, it } from 'vitest';
import { ALL_DECOR } from './decorText';
import { normalizeOpenings, wallPiers } from './wallPieces';
import { SETS } from './registry';
import setsSrc from './sets.tsx?raw';
import { CUOI_NAM, walkAreaFor } from './walk';
import { isBlocked } from '../game/collision';
import { PLAYER_RADIUS } from '../game/movement';

describe('wallPieces: tường có ô cửa sổ', () => {
  it('trụ và ô mở phủ kín tường, không chồng nhau', () => {
    const z0 = -5.1;
    const z1 = 12.85;
    const openings = [{ z: 2, w: 1.4 }, { z: -2.8, w: 1.4 }, { z: -0.4, w: 1.4 }];
    const piers = wallPiers(z0, z1, openings);
    const holes = normalizeOpenings(z0, z1, openings);
    const total = piers.reduce((s, [a, b]) => s + (b - a), 0) + holes.reduce((s, [a, b]) => s + (b - a), 0);
    expect(total).toBeCloseTo(z1 - z0, 9);
    const all = [...piers, ...holes].sort((p, q) => p[0] - q[0]);
    for (let i = 1; i < all.length; i++) expect(all[i]![0]).toBeCloseTo(all[i - 1]![1], 9);
    expect(piers).toHaveLength(4); // trước, hai đoạn giữa, sau
  });
  it('ô trùng nhau được gộp, ô ngoài tường bị cắt hoặc bỏ, đầu vào hỏng bị bỏ', () => {
    expect(normalizeOpenings(0, 10, [{ z: 2, w: 2 }, { z: 2.5, w: 2 }])).toEqual([[1, 3.5]]);
    expect(normalizeOpenings(0, 10, [{ z: -0.5, w: 2 }])).toEqual([[0, 0.5]]);
    expect(normalizeOpenings(0, 10, [{ z: 20, w: 2 }, { z: NaN, w: 1 }, { z: 3, w: 0 }, { z: 3, w: Infinity }])).toEqual([]);
    expect(wallPiers(0, 10, [])).toEqual([[0, 10]]);
  });
  it('cửa sổ của phòng nằm trọn trong tường và cách nhau có trụ (không chạm nhau)', () => {
    const { zs, w, sill, head } = CUOI_NAM.windows;
    const z0 = CUOI_NAM.wallBackZ - CUOI_NAM.wallThick / 2;
    const z1 = CUOI_NAM.frontZ + CUOI_NAM.wallThick / 2 + CUOI_NAM.ext;
    for (const z of zs) {
      expect(z - w / 2).toBeGreaterThan(z0);
      expect(z + w / 2).toBeLessThan(z1);
    }
    const sorted = [...zs].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]! - w).toBeGreaterThan(0.5);
    expect(sill).toBeGreaterThan(0.8);
    expect(head).toBeLessThan(CUOI_NAM.wallHeight);
  });
});

describe('phòng kéo dài về phía camera và TV', () => {
  const area = walkAreaFor('cuoi-nam', 'bac')!;
  it('vùng đi lại không đổi (vẫn dừng ở frontZ), tường kéo dài chỉ chặn camera và nằm ngoài vùng đi lại', () => {
    expect(area.bounds.maxZ).toBe(CUOI_NAM.frontZ);
    for (const id of ['tuong-trai-xa', 'tuong-phai-xa']) {
      const c = area.colliders.find((x) => x.id === id)!;
      expect(c, id).toBeDefined();
      expect(c.blocksCamera, id).toBe(true);
      expect(c.kind).toBe('box');
      if (c.kind === 'box') {
        expect(c.z - c.hd, id).toBeGreaterThanOrEqual(CUOI_NAM.frontZ);
        expect(c.z + c.hd).toBeCloseTo(CUOI_NAM.frontZ + CUOI_NAM.ext, 6);
      }
    }
  });
  it('tủ TV nằm trong phòng, chặn người chơi, không đè NPC / đồ vật và không chắn camera', () => {
    const tv = area.colliders.find((c) => c.id === 'tu-tv')!;
    expect(tv.blocksCamera).toBe(false);
    if (tv.kind !== 'box') throw new Error('tủ TV phải là hộp');
    expect(tv.x + tv.hw).toBeLessThanOrEqual(CUOI_NAM.wallSideX + 1e-6);
    expect(tv.z - tv.hd).toBeGreaterThanOrEqual(CUOI_NAM.wallBackZ - 1e-6);
    for (const [name, s] of Object.entries(SETS['cuoi-nam']!.spots)) {
      if (name === 'ngoai-cua') continue; // điểm ngoài cửa, ngoài phòng
      expect(isBlocked({ x: s.pos[0], z: s.pos[2] }, 0.2, [tv], area.bounds), `${name} trong tủ TV`).toBe(false);
    }
    expect(isBlocked({ x: tv.x, z: tv.z }, PLAYER_RADIUS, area.colliders, area.bounds)).toBe(true);
  });
});

describe('chữ trên đồ họa tường', () => {
  it('mỗi dòng không rỗng, ngắn, cỡ chữ và màu hợp lệ, không có ký tự điều khiển', () => {
    expect(ALL_DECOR.length).toBeGreaterThan(15);
    for (const l of ALL_DECOR) {
      expect(l.text.trim().length, l.text).toBeGreaterThan(0);
      expect(l.text.length, l.text).toBeLessThanOrEqual(40);
      expect(l.size, l.text).toBeGreaterThan(10);
      expect(l.color, l.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(l.text).not.toMatch(/[\u0000-\u001f]/);
    }
  });
});

describe('CuoiNam dùng nguồn bố cục chung', () => {
  it('không còn mặt đất nâu cũ và dùng L.ext, L.windows trong hình dựng', () => {
    const room = setsSrc.slice(setsSrc.indexOf('function CuoiNam'), setsSrc.indexOf('function NhaTren'));
    expect(room).not.toContain('#6b5b4f');
    expect(room).toContain('L.ext');
    expect(room).toContain('L.windows');
    expect(room).toContain('<PaverGround');
  });
});
