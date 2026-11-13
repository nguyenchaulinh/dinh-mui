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

export interface CameraShot {
  pos: Vec3;
  target: Vec3;
}

export interface SetDef {
  id: string;
  label: string;
  spots: Record<string, Spot>;
  cameras: Record<string, CameraShot>;
  /** Góc máy khi scene không chỉ định và không có người nói trong cảnh. */
  defaultCamera: string;
  /** Tâm cảnh; camera bám người nói sẽ đặt ở phía đối diện qua tâm. */
  focusCenter: Vec3;
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
      /** Điểm lấy đồ ăn ở bàn bếp sát tường tây (chế độ đi lại). */
      bep: { pos: [-5.3, 0, 2.0], rotY: Math.PI / 2 },
    },
    cameras: {
      'toan-canh': { pos: [0, 4.2, 5.6], target: [0, 0.4, -0.3] },
      combo: { pos: [0, 6.2, 2.2], target: [0, 0, 0] },
      'mon-an': { pos: [0, 1.5, 1.9], target: [0, 0.45, 0] },
    },
    defaultCamera: 'toan-canh',
    focusCenter: [0, 0, 0],
  },
  'pho-tet': {
    id: 'pho-tet',
    label: 'Đường phố ngày 28 tháng Chạp',
    spots: {
      'via-he': { pos: [0, 0, 3.2], rotY: 0.3 },
      'via-he-2': { pos: [1.1, 0, 3.4], rotY: -0.4 },
      'cua-hang': { pos: [-2.2, 0, -2.6], rotY: 0.2 },
      'den-do': { pos: [3.2, 0, 1.0], rotY: -Math.PI / 2 },
      /** Chế độ đi lại: vỉa hè bắc có sạp quà (trước nhà phố), bên kia đường là bến xe. */
      'sap-qua': { pos: [-3.0, 0, -2.5], rotY: Math.PI / 2 },
      shipper: { pos: [2.6, 0, -2.6], rotY: Math.PI },
      ben: { pos: [6.5, 0, 3.1], rotY: 0 },
    },
    cameras: {
      'cua-hang': { pos: [2.4, 2.2, 8], target: [-1, 1, -1.5] },
      duong: { pos: [-8, 3.2, 7.5], target: [2, 0.6, 0] },
      'den-do': { pos: [6.5, 1.8, 4.5], target: [3.2, 1, 1] },
    },
    defaultCamera: 'duong',
    focusCenter: [0, 0, 0],
  },
  /**
   * Trạm dừng chân trên quốc lộ (chặng 4). Quốc lộ chạy dọc trục x ở z từ -6 tới -2 (xe tải, xe khách chạy qua, chỉ để nhìn);
   * khoảng sân trạm ở phía nam (z từ -1.5 tới 8.5) là nơi đi lại: quán có mái, bàn ghế nhựa, xe khách đậu ở phía đông,
   * xe cũ của anh họ ở phía tây.
   */
  'tram-dung': {
    id: 'tram-dung',
    label: 'Trạm dừng chân trên quốc lộ',
    spots: {
      'thai-gara': { pos: [-8.0, 0, 4.2], rotY: 0.9 },
      'chu-ba': { pos: [1.6, 0, 2.4], rotY: -0.7 },
      quan: { pos: [-4.2, 0, 2.2], rotY: 0 },
      'xe-khach': { pos: [7.8, 0, 3.4], rotY: 0 },
      'be-de': { pos: [-1.2, 0, 5.8], rotY: 0.5 },
    },
    cameras: {
      'toan-canh': { pos: [0, 5, 14], target: [0, 0.8, 3] },
      'xe-khach': { pos: [3, 2.4, 9.5], target: [7.5, 1.2, 3.2] },
    },
    defaultCamera: 'toan-canh',
    focusCenter: [0, 0, 3],
  },
  'san-nha': {
    id: 'san-nha',
    label: 'Sân nhà ở quê',
    spots: {
      'ngoai-cong': { pos: [0, 0, 7.2], rotY: Math.PI },
      cong: { pos: [0.6, 0, 5.2], rotY: Math.PI },
      'nguoi-choi': { pos: [0, 0, 2.6], rotY: Math.PI },
      'ghe-1': { pos: [-1.3, 0, -0.6], rotY: 0.5, seated: true },
      'ghe-2': { pos: [0, 0, -1.1], rotY: 0, seated: true },
      'ghe-3': { pos: [1.3, 0, -0.6], rotY: -0.5, seated: true },
      'goc-san': { pos: [2.6, 0, 1.2], rotY: -1.2 },
      'be-de': { pos: [-2.6, 0, 1.8], rotY: 1 },
      'cuoi-san': { pos: [3.4, 0, 3.2], rotY: -1.2 },
      /** Chỗ Bà Tám đứng quay livestream (chế độ đi lại): đi lại được, không phải chỗ ngồi. */
      'goc-ba-tam': { pos: [-3.2, 0, 3.6], rotY: 1.0 },
    },
    cameras: {
      // Đứng trong sân nhìn ra cổng: thấy người chơi đi vào, chó chạy ra đón.
      cong: { pos: [-2.4, 2.3, 1.0], target: [0.3, 0.7, 6.2] },
      san: { pos: [3.8, 3.2, 6.5], target: [0, 0.8, 0] },
    },
    defaultCamera: 'san',
    focusCenter: [0, 0, 1],
  },
};

export const SET_IDS: readonly string[] = Object.keys(SETS);

/** Phong cách miền của một vùng: Bắc, Trung, Nam (quyết định nhà, cổng, hoa, cây trong cảnh). */
export type RegionStyle = 'bac' | 'trung' | 'nam';

/** Vùng → phong cách miền. Chưa biết vùng thì mặc định miền Bắc. */
export function styleOfRegion(regionId: string): RegionStyle {
  if (regionId === 'da-nang') return 'trung';
  if (regionId === 'sai-gon') return 'nam';
  return 'bac';
}
