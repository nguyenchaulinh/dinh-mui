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
      // Chế độ đi lại (khớp PHO_TET trong walk.ts): vỉa hè bắc, sạp quà ở x = -3, trạm xe buýt ở x = 10.
      'sap-qua': { pos: [-3.0, 0, -2.5], rotY: 0 },
      'do-qua': { pos: [-4.5, 0, -2.4] },
      shipper: { pos: [2.6, 0, -2.5], rotY: Math.PI },
      'xe-om': { pos: [5.6, 0, -2.4], rotY: Math.PI },
      ben: { pos: [10, 0, -2.2], rotY: 0 },
      'len-xe': { pos: [12.2, 0, -2.4], rotY: Math.PI / 2 },
    },
  },
  'cuoi-nam': {
    id: 'cuoi-nam',
    label: 'Văn phòng / lớp học ngày cuối năm',
    spots: {
      tu: { pos: [4.1, 0, -1.6], rotY: -Math.PI / 2 },
      sep: { pos: [0.8, 0, -1.4], rotY: 0 },
      thu: { pos: [-4.9, 0, 1.5], rotY: Math.PI / 2 },
      co: { pos: [2.6, 0, -2.2], rotY: 0 },
      'lop-truong': { pos: [-1.0, 0, 2.4], rotY: Math.PI },
      // Đồ vật (khớp CUOI_NAM trong walk.ts): máy tính trên bàn 4, sạc trên bàn 1, hộp bánh trên quầy, áo ở móc, cửa.
      'ban-minh': { pos: [-2.2, 0, 0.15] },
      // Ghế của bạn sau bàn 4 (mặt ghế cao ~0.48 m), quay mặt vào bàn; điểm ngoài cửa để đi ra.
      'ghe-minh': { pos: [-2.2, 0, 0.72], rotY: Math.PI },
      'ngoai-cua': { pos: [7.2, 0, 2.2], rotY: Math.PI / 2 },
      'do-sac': { pos: [-3.6, 0, -2.55] },
      'do-qua': { pos: [5.3, 0, -2.6] },
      'do-ao': { pos: [5.3, 0, 0.4] },
      cua: { pos: [5.75, 0, 2.2] },
    },
  },
  /**
   * Trạm dừng chân trên quốc lộ (chặng Đường về). Quốc lộ chạy dọc trục x ở z từ -6 tới -2 (chỉ để nhìn); sân trạm ở phía
   * nam (z từ -1.2 tới 8.5) là nơi đi lại: quán bánh mì có mái, bàn ghế nhựa, xe khách đậu ở phía đông, xe cũ của anh họ ở
   * phía tây. Vật cản khớp walk-tram-dung.ts.
   */
  'tram-dung': {
    id: 'tram-dung',
    label: 'Trạm dừng chân trên quốc lộ',
    spots: {
      'thai-gara': { pos: [-8.0, 0, 4.2], rotY: 0.9 },
      'chu-ba': { pos: [1.6, 0, 2.4], rotY: -0.7 },
      quan: { pos: [-4.2, 0, 2.2], rotY: 0 },
      'do-banh-mi': { pos: [-4.2, 0, 3.8] },
      'xe-khach': { pos: [7.8, 0, 3.4], rotY: 0 },
      'be-de': { pos: [-1.2, 0, 5.8], rotY: 0.5 },
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
