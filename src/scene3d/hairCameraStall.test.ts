import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { HAIR_STYLES, hairParts, hairShapes, hidesOriginalHair } from './hair';
import { FIT, fitOf, propsFor } from './outfit';
import { builtinOf } from './outfit';
import { CHARACTER_MODELS, roleOf } from './rigging';
import { mergeShapes } from './shapes';
import { busStopShapes, stallShapes } from './streetShapes';
import { PHO_TET, walkAreaFor } from './walk';
import { DEFAULT_CAM } from '../game/camera';

const bbox = (shapes: Parameters<typeof mergeShapes>[0]) => {
  const g = mergeShapes(shapes);
  g.computeBoundingBox();
  return g.boundingBox as Box3;
};
const HUMANS = CHARACTER_MODELS.filter((m) => m !== 'cho-pom');

describe('kiểu tóc', () => {
  it('chỉ kiểu búi thêm khối (một búi tròn); ngắn, dài dùng tóc gốc; chỉ trọc ẩn tóc gốc', () => {
    const f = fitOf('nam-hoodie');
    expect(hairShapes('bald', f)).toEqual([]);
    expect(hairShapes('short', f)).toEqual([]);
    expect(hairShapes('long', f)).toEqual([]);
    expect(hairShapes('bun', f)).toHaveLength(1);
    expect(hairParts('short', f)).toEqual([]);
    expect(HAIR_STYLES.filter(hidesOriginalHair)).toEqual(['bald']);
    expect(hidesOriginalHair(undefined)).toBe(false);
  });

  it.each(Object.keys(FIT))('%s: búi nằm sau đỉnh đầu, chạm tóc gốc và không che mặt', (model) => {
    const f = fitOf(model);
    const b = bbox(hairShapes('bun', f));
    expect(b.min.z, 'búi không ra quá xa phía sau').toBeGreaterThanOrEqual(f.hzb - 0.1);
    expect(b.max.z, 'búi không che mặt').toBeLessThan((f.sZb + f.sZf) / 2);
    expect(b.max.y, 'búi không cao quá đỉnh tóc gốc quá 10 cm').toBeLessThanOrEqual(f.hy1 + 0.1);
    expect(b.min.y, 'búi chồng lên tóc gốc').toBeLessThan(f.hy1);
  });

  it('màu tóc đi vào búi; màu hỏng dùng màu mặc định', () => {
    const f = fitOf('nam-vest');
    expect(hairShapes('bun', f, '#e5e7eb').every((s) => s.c === '#e5e7eb')).toBe(true);
    expect(hairShapes('bun', f, 'bạc').every((s) => /^#[0-9a-f]{6}$/i.test(s.c))).toBe(true);
    expect(hairShapes('bun', f, undefined)[0]!.c).toBe('#2b1d15');
  });

  it('búi gắn vào xương Head, khung bind (cùng cách với phụ kiện)', () => {
    const p = hairParts('bun', fitOf('nam-vest'))[0]!;
    expect(p.anchor).toBe('head');
    expect(p.frame).toBe('bind');
  });

  it('tóc gốc của model (vật liệu "Hair") được nhận là vai trò tóc nên ẩn / đổi màu được; model có mũ giữ đầu gốc', () => {
    for (const mat of ['Hair', 'hair']) expect(roleOf(mat, 'head', false)).toBe('hair');
    for (const m of ['nam-tho', 'nam-nong-dan']) expect(builtinOf(m).has('hat')).toBe(true);
    for (const m of HUMANS.filter((x) => !['nam-tho', 'nam-nong-dan'].includes(x))) expect(builtinOf(m).has('hat'), m).toBe(false);
  });
});

describe('camera phố', () => {
  const area = walkAreaFor('pho-tet', 'bac')!;
  it('bản đồ phố có góc máy riêng, cao và xa hơn mặc định', () => {
    expect(area.camera).toBeDefined();
    expect(area.camera!.pitch).toBeGreaterThan(DEFAULT_CAM.pitch + 0.1);
    expect(area.camera!.dist).toBeGreaterThan(DEFAULT_CAM.dist);
  });
  it('mắt camera cao hơn mái hiên (2.2 m) nên không còn nằm sát mặt tiền; vẫn thấp hơn nhà thấp nhất để không chui qua mái', () => {
    const { pitch, dist } = area.camera!;
    const eyeY = 1.15 + dist * Math.sin(pitch); // LOOK_HEIGHT = 1.15 trong camera.ts
    expect(eyeY).toBeGreaterThan(3.5);
    expect(eyeY).toBeLessThan(6); // nhà cao tối thiểu 4.5 m: camera ở sau lưng người chơi, trên đường, không tới mái
  });
  it('các bản đồ khác không bị đổi góc máy (chỉ phố có camera riêng)', () => {
    for (const [set, style] of [['cuoi-nam', 'bac'], ['san-nha', 'bac'], ['tram-dung', 'bac']] as const) expect(walkAreaFor(set, style)!.camera, set).toBeUndefined();
  });
  it('không làm lệch hằng số khác của phố (bounds, spawn)', () => {
    expect(area.bounds.minZ).toBe(PHO_TET.bounds.minZ);
    expect(area.spawn.z).toBe(-2.7);
  });
});

describe('sạp quà và trạm chờ gộp', () => {
  it('quầy sạp rộng 2.6 và sâu 0.8 khớp vật cản PHO_TET.stall; mái cao hơn 2.3 m', () => {
    const counter = stallShapes().solid[0]!;
    expect(counter.s[0]).toBeCloseTo(PHO_TET.stall.hw * 2, 9);
    expect(counter.s[2]).toBeCloseTo(PHO_TET.stall.hd * 2, 9);
    const roof = stallShapes().solid.find((s) => s.g === 'box' && s.s[0] === 3.0 && s.s[1] === 0.08)!;
    expect(roof.p[1] - (roof.s[2]! / 2) * Math.sin(roof.r![0]!), 'mép thấp của mái').toBeGreaterThan(2.0);
    expect(stallShapes().lit.length).toBeGreaterThanOrEqual(2);
  });
  it('ghế trạm 1.4 x 0.4 và hai trụ cách nhau 2.2 khớp vật cản PHO_TET.bus', () => {
    const bus = busStopShapes().solid;
    const seat = bus.find((s) => s.g === 'box' && s.s[0] === 1.4)!;
    expect(seat.s[0]).toBeCloseTo(PHO_TET.bus.benchHw * 2, 9);
    expect(seat.s[2]).toBeCloseTo(PHO_TET.bus.benchHd * 2, 9);
    const posts = bus.filter((s) => s.g === 'cyl' && s.s[2] === 2.5);
    expect(posts).toHaveLength(2);
    expect(Math.abs(posts[1]!.p[0] - posts[0]!.p[0])).toBeCloseTo(PHO_TET.bus.postDx * 2, 9);
  });
  it('hình gộp đứng trên mặt đất và nằm gần vùng chiếm', () => {
    for (const s of [stallShapes(), busStopShapes()]) {
      const b = bbox([...s.solid, ...s.lit]);
      expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
      expect(b.max.y).toBeLessThan(3.2);
    }
  });
});

describe('kính đặt đúng độ cao mắt thật', () => {
  it.each(Object.keys(FIT))('%s: tròng kính ngang mắt (eyeY đo từ mesh), không ở trên trán', (model) => {
    const f = fitOf(model);
    const rims = propsFor(['glasses'], f).flatMap((p) => p.shapes).filter((s) => s.g === 'torus');
    expect(rims).toHaveLength(2);
    for (const r of rims) expect(r.p[1], model).toBeCloseTo(f.eyeY, 6);
    expect(f.eyeY).toBeLessThan(f.browTop); // mắt thấp hơn đỉnh lông mày
  });
});
