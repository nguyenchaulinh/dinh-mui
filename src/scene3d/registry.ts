/**
 * Danh mục bộ cảnh 3D: dữ liệu thuần (không import three) để engine/validate
 * dùng được trong test node. Phần dựng hình nằm ở `sets.tsx`.
 * Toạ độ: trục y hướng lên, đơn vị ~ mét.
 */

export type Vec3 = readonly [number, number, number];

export interface Spot {
  pos: Vec3;
  /** Góc quay quanh trục y (radian). 0 = nhìn về +z (về phía camera mặc định). */
  rotY?: number;
  /** Ngồi (hạ thấp, gập chân). */
  seated?: boolean;
}

export interface SetDef {
  id: string;
  label: string;
  spots: Record<string, Spot>;
}

/** Ghế quanh mâm: n chỗ trên vòng tròn bán kính r, chỗ 0 ở phía trước (gần camera). */
function ring(prefix: string, n: number, r: number, seated: boolean): Record<string, Spot> {
  const out: Record<string, Spot> = {};
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Quay mặt vào tâm.
    out[`${prefix}-${i}`] = { pos: [x, 0, z], rotY: Math.atan2(-x, -z), seated };
  }
  return out;
}

export const SETS: Record<string, SetDef> = {
  'nha-tren': {
    id: 'nha-tren',
    label: 'Nhà trên, mâm cơm tất niên',
    spots: {
      ...ring('ghe', 7, 1.55, true),
      'be-de': { pos: [2.7, 0, 1.6], rotY: -0.9 },
    },
  },
  'pho-tet': {
    id: 'pho-tet',
    label: 'Đường phố ngày 28 tháng Chạp',
    spots: {
      'via-he': { pos: [0, 0, 3.2], rotY: 0.3 },
      'via-he-2': { pos: [1.1, 0, 3.4], rotY: -0.4 },
      'cua-hang': { pos: [-2.2, 0, -2.6], rotY: 0.2 },
      'den-do': { pos: [3.2, 0, 1.0], rotY: -Math.PI / 2 },
    },
  },
  'san-nha': {
    id: 'san-nha',
    label: 'Sân nhà ở quê',
    spots: {
      'ghe-1': { pos: [-1.3, 0, -0.6], rotY: 0.5, seated: true },
      'ghe-2': { pos: [0, 0, -1.1], rotY: 0, seated: true },
      'ghe-3': { pos: [1.3, 0, -0.6], rotY: -0.5, seated: true },
      'goc-san': { pos: [2.6, 0, 1.2], rotY: -1.2 },
      'be-de': { pos: [-2.6, 0, 1.8], rotY: 1 },
      'cuoi-san': { pos: [3.4, 0, 3.2], rotY: -1.2 },
    },
  },
};

/** Phong cách miền của một vùng: Bắc, Trung, Nam (quyết định nhà, cổng, hoa, cây trong cảnh). */
export type RegionStyle = 'bac' | 'trung' | 'nam';

/** Vùng → phong cách miền. Chưa biết vùng thì mặc định miền Bắc. */
export function styleOfRegion(regionId: string): RegionStyle {
  if (regionId === 'da-nang') return 'trung';
  if (regionId === 'sai-gon') return 'nam';
  return 'bac';
}
