import { describe, expect, it } from 'vitest';
import { AWNING, FAR_LANE_Z, PARKED_BIKES, STREET_LAMP_XS, awningLowestY } from './props-street';
import streetSrc from './props-street.tsx?raw';
import setsSrc from './sets.tsx?raw';
import { PHO_TET, walkAreaFor } from './walk';

/** Chi tiết đường phố chỉ để nhìn: không được chắn lối đi hay đè lên xe đang chạy (không xem hình thì chứng minh bằng số). */
const BODY_H = 1.8;

describe('chi tiết đường phố phố Tết', () => {
  it('mái hiên nhô ra phía vỉa hè đi lại được nhưng cạnh thấp nhất cao hơn đầu người', () => {
    expect(awningLowestY()).toBeGreaterThan(BODY_H + 0.1);
    // Mái nhô ra tới z = -3.8 + out + nửa sâu: vẫn trong vùng đi lại, nên độ cao mới là thứ phải canh.
    const reach = -5.8 + 2 + AWNING.out + (AWNING.depth / 2) * Math.cos(AWNING.tilt);
    expect(reach).toBeGreaterThan(PHO_TET.bounds.minZ);
  });

  it('xe máy đậu ở lề bên kia đường: người chơi không với tới (kể cả bán kính), cách làn xe, cột đèn, không chồng nhau', () => {
    const area = walkAreaFor('pho-tet', 'bac')!;
    const PLAYER_R = 0.35;
    const BIKE_HALF_WIDTH = 0.3; // xe đậu song song lề: rộng ~0.6 m theo z
    for (const [x, z] of PARKED_BIKES) {
      // Khoảng cách tới vùng người chơi đứng được lớn hơn bán kính người + nửa bề ngang xe.
      expect(z - area.bounds.maxZ, `xe ${x}`).toBeGreaterThan(PLAYER_R + BIKE_HALF_WIDTH);
      expect(z - BIKE_HALF_WIDTH, `xe ${x} đè làn xe`).toBeGreaterThan(FAR_LANE_Z + 0.3);
      for (const lx of STREET_LAMP_XS) expect(Math.abs(x - lx), `xe ${x} sát cột đèn ${lx}`).toBeGreaterThan(1.0);
    }
    const xs = PARKED_BIKES.map((b) => b[0]).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!, `xe ${xs[i]}`).toBeGreaterThanOrEqual(1.05);
  });

  it('không thêm vật cản: vùng đi lại và vật cản của phố Tết giữ nguyên', () => {
    const area = walkAreaFor('pho-tet', 'bac')!;
    expect(area.colliders.map((c) => c.id ?? '').sort()).toEqual(
      ['cot-bien-ben', 'ghe-ben', 'nha-pho', 'sap-qua', 'tru-ben-1', 'tru-ben-2', ...area.colliders.map((c) => c.id ?? '').filter((id) => id.startsWith('chau-'))].sort(),
    );
  });

  it('tĩnh và nhẹ: không Math.random, không useFrame, không tạo vật liệu riêng', () => {
    // Chỉ phần mới (GiftStall / BusStop cũ có vật liệu riêng, không thuộc đợt này).
    const code = streetSrc
      .slice(streetSrc.indexOf('// ---------- Chi tiết đường phố'))
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/Math\.random|Date\.now|useFrame/);
    expect(code).not.toMatch(/meshStandardMaterial/);
  });

  it('PhoTet dùng các đạo cụ mới và chỉ đưa vào nhà ở có số hợp lý (không phình số khối)', () => {
    for (const name of ['ShopFront', 'FarShop', 'Bunting', 'Crosswalk', 'StreetLamp', 'PARKED_BIKES']) expect(setsSrc, name).toContain(name);
    const far = /let x = -24;[\s\S]*?x < 24/.exec(setsSrc);
    expect(far).not.toBeNull();
  });
});
