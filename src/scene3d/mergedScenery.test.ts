import { describe, expect, it } from 'vitest';
import { BLOSSOM_POT_R, QUAT_BALL, blossomShapes, type Blossom } from './blossomShapes';
import { AWNING, awningLowestY, houseFloors, houseShapes } from './houseShapes';
import { motorbikeShapes } from './motorbikeShapes';
import { mergeShapes } from './shapes';
import { buntingShapes, crosswalkShapes } from './streetShapes';

const box3 = (shapes: Parameters<typeof mergeShapes>[0]) => {
  const g = mergeShapes(shapes);
  g.computeBoundingBox();
  return g.boundingBox!;
};

describe('hoa Tết gộp', () => {
  it.each(['dao', 'mai', 'quat'] as Blossom[])('%s: gộp được, chân chậu ở y = 0, tán trong tầm cây', (kind) => {
    const b = box3(blossomShapes(kind));
    expect(b.min.y).toBeCloseTo(0, 2);
    expect(b.max.y).toBeGreaterThan(1.1);
    expect(b.max.y).toBeLessThan(1.7);
    expect(Math.max(b.max.x, -b.min.x, b.max.z, -b.min.z)).toBeLessThan(0.75);
  });
  it('quất có quả cầu tán đúng QUAT_BALL (vòng va chạm sân nhà dựa vào số này) và đào / mai thì không', () => {
    const quat = blossomShapes('quat').find((s) => s.g === 'ico' && s.s[0] === QUAT_BALL.r)!;
    expect(quat.p[1]).toBe(QUAT_BALL.y);
    expect(blossomShapes('dao').some((s) => s.g === 'ico' && s.s[0] === QUAT_BALL.r)).toBe(false);
  });
  it('chậu có bán kính BLOSSOM_POT_R và là khối đầu tiên', () => {
    for (const k of ['dao', 'mai', 'quat'] as Blossom[]) expect(blossomShapes(k)[0]!.s[0]).toBe(BLOSSOM_POT_R);
  });
  it('xác định: gọi hai lần ra cùng hình', () => {
    expect(JSON.stringify(blossomShapes('mai'))).toBe(JSON.stringify(blossomShapes('mai')));
  });
});

describe('xe máy gộp', () => {
  const style = { body: '#dc2626', shirt: '#1d4ed8', helmet: '#f8fafc', rider: true, box: false };
  it('có người lái nhiều khối hơn xe đậu; thùng hàng thêm 3 khối', () => {
    const a = motorbikeShapes(style).length;
    expect(a).toBeGreaterThan(motorbikeShapes({ ...style, rider: false }).length + 5);
    expect(motorbikeShapes({ ...style, box: true }).length).toBe(a + 3);
  });
  it('xe đứng trên mặt đất, dài khoảng 1.3 m theo z, cao hơn 1.4 m khi có người, dưới 1.5 m khi không', () => {
    const rider = box3(motorbikeShapes(style));
    expect(rider.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(rider.max.y).toBeGreaterThan(1.4);
    expect(rider.max.z - rider.min.z).toBeLessThan(1.4);
    expect(box3(motorbikeShapes({ ...style, rider: false })).max.y).toBeLessThan(1.0);
  });
  it('màu thân và áo đi vào hình', () => {
    const cols = new Set(motorbikeShapes(style).map((s) => s.c));
    expect(cols.has('#dc2626') && cols.has('#1d4ed8') && cols.has('#f8fafc')).toBe(true);
  });
});

describe('nhà phố gộp', () => {
  const base = { w: 3, h: 7, c: '#fde68a', sign: '#2563eb', flag: true, variant: 2, shop: true };
  it('hình nằm trong thân nhà: chân y = 0 tới đỉnh mái, mặt tiền z = +2 (mái hiên nhô ra ngoài nhưng không quá 1.2 m)', () => {
    const b = box3([...houseShapes(base).solid, ...houseShapes(base).lit]);
    expect(b.min.y).toBeGreaterThanOrEqual(-0.01);
    expect(b.max.y).toBeLessThan(base.h + 1.8); // anten, bồn nước trên mái
    expect(b.max.z).toBeGreaterThan(2.0);
    expect(b.max.z).toBeLessThan(2 + 1.2);
    expect(Math.abs(b.max.x)).toBeLessThan(base.w / 2 + 0.3);
  });
  it('chỉ nhà cửa hàng mới có mái hiên và câu đối; nhà thường vẫn có cửa sổ, mái', () => {
    const shop = houseShapes(base);
    const home = houseShapes({ ...base, shop: false });
    expect(shop.solid.length).toBe(home.solid.length + 6); // 4 sọc mái hiên + 2 vế câu đối
    expect(shop.lit.length).toBe(home.lit.length + 6); // 6 chấm vàng trên hai vế câu đối
    expect(home.solid.length).toBeGreaterThan(houseFloors(base.h) * 3);
  });
  it('phần phát sáng gồm biển hiệu và cửa sổ sáng đèn, chỉ có biển khi có màu biển', () => {
    expect(houseShapes(base).lit.some((s) => s.c === '#2563eb')).toBe(true);
    expect(houseShapes({ ...base, sign: undefined }).lit.some((s) => s.c === '#2563eb')).toBe(false);
  });
  it('mái hiên cao hơn đầu người chơi (mái nhô ra vỉa hè đi lại được)', () => {
    expect(awningLowestY()).toBeGreaterThan(1.9);
    expect(AWNING.y).toBeGreaterThan(2);
  });
  it('nhà bên kia đường ít khối hơn nhà phía bắc', () => {
    const far = houseShapes({ ...base, far: true, shop: false });
    expect(far.solid.length + far.lit.length).toBeLessThan(houseShapes(base).solid.length);
  });
  it('xác định: cùng tham số ra cùng hình', () => {
    expect(JSON.stringify(houseShapes(base))).toBe(JSON.stringify(houseShapes(base)));
  });
});

describe('dây cờ và vạch qua đường gộp', () => {
  it('dây cờ: một sợi dây và đúng số lá cờ, nằm giữa hai đầu dây', () => {
    const s = buntingShapes({ x: 2, y0: 4.9, y1: 4.6, z0: -3.9, z1: 5.4, flags: 10 });
    expect(s).toHaveLength(11);
    const b = box3(s);
    expect(b.min.z).toBeGreaterThan(-3.95);
    expect(b.max.z).toBeLessThan(5.45);
    expect(b.max.y).toBeLessThan(5.0);
    expect(b.min.y).toBeGreaterThan(4.1); // lá cờ treo dưới dây nhưng vẫn rất cao
  });
  it('vạch qua đường: 7 vạch trên lòng đường, sát mặt nhựa', () => {
    const b = box3(crosswalkShapes(-1.5));
    expect(b.min.x).toBeCloseTo(-1.5 - 0.225, 3);
    expect(b.max.z).toBeLessThanOrEqual(2.2);
    expect(b.min.z).toBeGreaterThanOrEqual(-1.8);
    expect(b.max.y).toBeLessThan(0.05);
  });
});
