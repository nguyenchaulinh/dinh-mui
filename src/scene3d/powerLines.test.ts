import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BALCONY, houseShapes } from './houseShapes';
import { phoHouses } from './phoLayout';
import { mergeShapes } from './shapes';
import { UTILITY_POLES, WIRE_FACADE, powerLineShapes, sagWire, wireSegment } from './streetShapes';
import { PHO_TET, walkAreaFor } from './walk';

const bbox = (shapes: Parameters<typeof mergeShapes>[0]) => {
  const g = mergeShapes(shapes);
  g.computeBoundingBox();
  return g.boundingBox as Box3;
};

describe('wireSegment / sagWire', () => {
  it('đoạn dây có đúng độ dài và hai đầu nằm ở a, b (xoay đúng hướng)', () => {
    const a: [number, number, number] = [0, 5, 0];
    const b: [number, number, number] = [3, 6, -4];
    const sh = wireSegment(a, b);
    expect(sh.s[2]).toBeCloseTo(Math.hypot(3, 1, 4), 6);
    const g = mergeShapes([sh]);
    const pos = g.attributes.position!;
    // Hai đầu hình trụ: lấy đỉnh xa nhất theo hướng a -> b và gần nhất.
    const d = new Vector3(...b).sub(new Vector3(...a)).normalize();
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const t = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(new Vector3(...a)).dot(d);
      lo = Math.min(lo, t);
      hi = Math.max(hi, t);
    }
    expect(lo).toBeCloseTo(0, 2);
    expect(hi).toBeCloseTo(Math.hypot(3, 1, 4), 2);
  });
  it('dây võng: giữa thấp hơn hai đầu đúng `sag`, hai đầu đúng chỗ', () => {
    const segs = sagWire([0, 6, 0], [8, 6, 0], 0.5, 8);
    expect(segs).toHaveLength(8);
    const ys = segs.map((s) => s.p[1]);
    expect(Math.min(...ys)).toBeLessThan(6 - 0.4);
    expect(Math.max(...ys)).toBeGreaterThan(5.8);
  });
});

describe('cột điện và dây điện phố Tết', () => {
  const houses = phoHouses('bac');
  const top = (x: number) => (houses.find((h) => Math.abs(x - h.x) <= h.w / 2)?.h ?? 4.5) + 0.24;
  const shapes = powerLineShapes(top);

  it('cột đặt ở vỉa hè xa: người chơi (bán kính 0.35) không với tới và cột không chắn làn xe', () => {
    const area = walkAreaFor('pho-tet', 'bac')!;
    expect(UTILITY_POLES.z - 0.12 - area.bounds.maxZ).toBeGreaterThan(0.35 + 1);
    expect(UTILITY_POLES.z - 0.12).toBeGreaterThan(3.4); // sau mép vỉa hè xa, ngoài làn xe (z tới 1.3)
  });

  it('cột không đè xe máy đậu, cột đèn, bụi cây', async () => {
    const { PARKED_BIKES, STREET_LAMP_XS } = await import('./props-street');
    for (const x of UTILITY_POLES.xs) {
      for (const lx of STREET_LAMP_XS) expect(Math.abs(x - lx), `cột ${x} sát đèn ${lx}`).toBeGreaterThan(1);
      for (const [bx, bz] of PARKED_BIKES) expect(Math.hypot(x - bx, UTILITY_POLES.z - bz), `cột ${x} sát xe ${bx}`).toBeGreaterThan(1);
      for (let i = 0; i < 7; i++) expect(Math.abs(x - (-10.5 + i * 3.6)), `cột ${x} đè bụi cây`).toBeGreaterThan(0.6);
    }
  });

  it('phần dây về phía camera (z > -1.5) cao hơn 5 m: trên tầm mắt camera phố (~4.4 m) và đầu người', () => {
    expect(PHO_TET.camera.pitch).toBeGreaterThan(0);
    const wires = shapes.filter((s) => s.g === 'cyl' && s.s[0]! <= 0.02);
    expect(wires.length).toBeGreaterThan(60);
    for (const w of wires.filter((s) => s.p[2] > -1.5)) expect(w.p[1], `đoạn dây z=${w.p[2]!.toFixed(1)}`).toBeGreaterThan(5);
  });

  it('dây không đi xuyên vào thân nhà: neo ở trước mặt tiền, không cao quá đỉnh nhà rồi lơ lửng', () => {
    const b = bbox(shapes);
    expect(b.min.z).toBeGreaterThanOrEqual(WIRE_FACADE.z - 0.05);
    expect(b.max.z).toBeLessThanOrEqual(UTILITY_POLES.z + 1);
    // Nhà thấp: điểm neo không cao hơn đỉnh nhà.
    for (const s of shapes.filter((x) => x.g === 'cyl' && x.s[0]! <= 0.02 && x.p[2] < WIRE_FACADE.z + 0.4)) {
      expect(s.p[1], `neo tại x=${s.p[0]!.toFixed(1)}`).toBeLessThanOrEqual(top(s.p[0]!) + 0.05);
    }
  });

  it('cột và biến áp có đủ, mọi màu hợp lệ', () => {
    expect(shapes.filter((s) => s.g === 'cyl' && s.s[0]! >= 0.08)).toHaveLength(UTILITY_POLES.xs.length + 2);
    for (const s of shapes) expect(s.c).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('ban công lồng sắt (chuồng cọp)', () => {
  it('một nhà trong ba có từ ba tầng; nằm trên đầu người, trong bề ngang nhà, nhô ra đúng độ nhô', () => {
    let withCage = 0;
    for (let v = 0; v < 6; v++) {
      const base = houseShapes({ w: 3.2, h: 6, c: '#ffffff', variant: v, shop: true });
      const plain = houseShapes({ w: 3.2, h: 6, c: '#ffffff', variant: v + 0, shop: true, far: false });
      expect(plain.solid.length).toBe(base.solid.length);
      const cage = base.solid.filter((s) => s.g === 'box' && s.p[2] > 2.02 && s.p[1] > 3 && s.p[1] < 4.7 && Math.abs(s.p[0]) <= 3.2 * 0.4);
      if (v % 3 === 1) {
        expect(cage.length, `nhà ${v}`).toBeGreaterThan(8);
        withCage++;
        const b = bbox(cage);
        expect(b.min.y, 'sàn cao hơn đầu người').toBeGreaterThan(2.6);
        expect(b.max.z - 2.02, 'độ nhô').toBeLessThanOrEqual(BALCONY.out + 0.03);
        expect(Math.abs(b.max.x)).toBeLessThanOrEqual(3.2 / 2);
      }
    }
    expect(withCage).toBe(2);
  });
  it('nhà thấp (dưới ba tầng) và nhà bên kia đường không có ban công', () => {
    const low = houseShapes({ w: 3.2, h: 3.4, c: '#ffffff', variant: 1, shop: false });
    const full = houseShapes({ w: 3.2, h: 6, c: '#ffffff', variant: 1, shop: false });
    expect(full.solid.length).toBeGreaterThan(low.solid.length + 8);
    const far = houseShapes({ w: 3.2, h: 6, c: '#ffffff', variant: 1, shop: false, far: true });
    expect(far.solid.some((x) => x.g === 'box')).toBe(false);
  });
});
