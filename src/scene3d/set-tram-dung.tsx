import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Mat, rnd } from './props';
import { SETS, styleOfRegion, type RegionStyle } from './registry';
import {
  BARRIER,
  BIKES,
  BLOSSOMS,
  BUS,
  CAR,
  CART,
  CHU_BA,
  COUNTER,
  KUMQUAT,
  LAMPS,
  QUAN_POSTS,
  ROOF,
  SHELF,
  SIGN,
  TABLES,
  TIRES,
  DRUM,
} from './walk-tram-dung';

/**
 * Trạm dừng chân trên quốc lộ (chặng 4). Mặt đất là mặt phẳng XZ, y hướng lên, đơn vị mét.
 * Quốc lộ chạy dọc trục x ở z từ -6 tới -2 (chỉ để nhìn); sân trạm đi lại được ở phía nam.
 *
 * HIỆU NĂNG: toàn bộ hình tĩnh (đường, sân, quán, bàn ghế, xe khách đậu, xe hơi cũ, cây...) được gộp bằng
 * mergeGeometries thành 2 geometry màu theo đỉnh (một có ánh sáng, một phát sáng) = 2 draw call. Xe chạy trên
 * quốc lộ (18 xe, 6 kiểu) là 6 InstancedMesh dùng chung geometry gộp và material = 6 draw call. Không shadow map,
 * không tải ảnh/font/file, useFrame chỉ gán số vào ref có sẵn.
 *
 * Vị trí và kích thước của vật cản lấy từ hằng số trong walk-tram-dung.ts (cùng nguồn với collider).
 */

type V3 = readonly [number, number, number];
const ZERO: V3 = [0, 0, 0];
const HALF_PI = Math.PI / 2;

// ---------- Bộ gộp hình ----------

const tp = new Vector3();
const tq = new Quaternion();
const te = new Euler();
const ts = new Vector3();
const tm = new Matrix4();
const tc = new Color();

/** Hình mẫu đơn vị, dùng lại cho mọi bản sao (chỉ khác ma trận và màu). */
const baseCache = new Map<string, BufferGeometry>();
function base(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = baseCache.get(key);
  if (!g) {
    g = make().toNonIndexed();
    g.deleteAttribute('uv');
    baseCache.set(key, g);
  }
  return g;
}

/**
 * Gộp nhiều hình đơn giản (mỗi hình một màu phẳng, ghi vào thuộc tính color của đỉnh) thành một BufferGeometry.
 * `at` đặt một nhóm hình vào hệ toạ độ cục bộ (vị trí + xoay), lồng nhau được.
 */
class Batch {
  private readonly parts: BufferGeometry[] = [];
  private readonly mats: Matrix4[] = [new Matrix4()];

  private top(): Matrix4 {
    return this.mats[this.mats.length - 1]!;
  }

  at(pos: V3, rot: V3 | number, fn: () => void): void {
    const r: V3 = typeof rot === 'number' ? [0, rot, 0] : rot;
    const m = new Matrix4().compose(
      new Vector3(pos[0], pos[1], pos[2]),
      new Quaternion().setFromEuler(new Euler(r[0], r[1], r[2])),
      new Vector3(1, 1, 1),
    );
    this.mats.push(this.top().clone().multiply(m));
    fn();
    this.mats.pop();
  }

  private put(g: BufferGeometry, c: string, pos: V3, rot: V3, scale: V3): void {
    tm.compose(tp.set(pos[0], pos[1], pos[2]), tq.setFromEuler(te.set(rot[0], rot[1], rot[2])), ts.set(scale[0], scale[1], scale[2]));
    const geo = g.clone().applyMatrix4(this.top().clone().multiply(tm));
    tc.set(c);
    const n = geo.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = tc.r;
      col[i * 3 + 1] = tc.g;
      col[i * 3 + 2] = tc.b;
    }
    geo.setAttribute('color', new BufferAttribute(col, 3));
    this.parts.push(geo);
  }

  /** Hộp kích thước size, tâm pos. */
  box(c: string, size: V3, pos: V3, rot: V3 = ZERO): void {
    this.put(base('box', () => new BoxGeometry(1, 1, 1)), c, pos, rot, size);
  }

  /** Hình trụ (rTop khác rBottom thì là hình nón cụt; rTop = 0 là hình nón), cao h, tâm pos, trục y. */
  cyl(c: string, rTop: number, rBottom: number, h: number, pos: V3, rot: V3 = ZERO, seg = 8): void {
    const k = rTop / rBottom;
    this.put(base(`cyl:${seg}:${k.toFixed(3)}`, () => new CylinderGeometry(k, 1, 1, seg)), c, pos, rot, [rBottom, h, rBottom]);
  }

  /** Khối cầu thấp poly (ellipsoid nếu scale khác 1). */
  ico(c: string, r: number, pos: V3, scale: V3 = [1, 1, 1], detail = 0): void {
    this.put(base(`ico:${detail}`, () => new IcosahedronGeometry(1, detail)), c, pos, ZERO, [r * scale[0], r * scale[1], r * scale[2]]);
  }

  /** Tấm phẳng nằm ngang (mặt trên hướng lên), kích thước w (x) và d (z). */
  flat(c: string, w: number, d: number, pos: V3, rotY = 0): void {
    this.put(base('flat', () => new PlaneGeometry(1, 1).rotateX(-HALF_PI)), c, pos, [0, rotY, 0], [w, 1, d]);
  }

  /** Vòng xuyến bán kính R, tiết diện tube. Mặc định nằm trong mặt phẳng xy (nhìn dọc trục z). */
  ring(c: string, radius: number, tube: number, pos: V3, rot: V3 = ZERO): void {
    this.put(base(`tor:${(tube / radius).toFixed(3)}`, () => new TorusGeometry(1, tube / radius, 5, 12)), c, pos, rot, [radius, radius, radius]);
  }

  build(): BufferGeometry {
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    return g;
  }
}

// ---------- Đồ nhỏ: bàn ghế, hoa Tết, xe máy ----------

/** Ghế đẩu nhựa cao 0.42 m. */
function stool(b: Batch, x: number, z: number, c: string): void {
  b.cyl(c, 0.2, 0.17, 0.4, [x, 0.2, z]);
  b.cyl(c, 0.21, 0.21, 0.04, [x, 0.4, z]);
}

/** Bàn nhựa vuông 0.8 m (cao 0.72 m) có chai tương ớt, hộp giấy, hai ly trà; có dù thì cắm cột dù qua giữa bàn. */
function plasticTable(b: Batch, x: number, z: number, top: string, parasol: boolean): void {
  b.box(top, [0.8, 0.05, 0.8], [x, 0.7, z]);
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.34, 0.34]) b.box('#e5e7eb', [0.05, 0.68, 0.05], [x + dx, 0.34, z + dz]);
  b.cyl('#dc2626', 0.025, 0.03, 0.16, [x - 0.25, 0.8, z + 0.2]);
  b.box('#f8fafc', [0.14, 0.08, 0.1], [x + 0.22, 0.765, z - 0.22]);
  b.cyl('#fde68a', 0.035, 0.03, 0.08, [x + 0.1, 0.765, z + 0.15]);
  b.cyl('#fde68a', 0.035, 0.03, 0.08, [x - 0.1, 0.765, z - 0.05]);
  if (parasol) {
    b.cyl('#e5e7eb', 0.025, 0.025, 2.3, [x, 1.15, z]);
    b.cyl('#dc2626', 0.04, 1.25, 0.3, [x, 2.3, z], ZERO, 8);
    b.cyl('#fef3c7', 1.25, 1.25, 0.04, [x, 2.16, z], ZERO, 8);
  }
}

/**
 * Cây hoa Tết trong chậu: đào (hồng) miền Bắc, mai (vàng) miền Trung và Nam. Tự dựng để gộp được vào batch
 * (BlossomTree trong props.tsx tốn khoảng 24 draw call mỗi cây). Có lá, lì xì đỏ treo trên cành.
 */
function blossomPot(b: Batch, style: RegionStyle, x: number, z: number, s: number, seed: number): void {
  const bloom = style === 'bac' ? '#f9a8d4' : '#facc15';
  const bloom2 = style === 'bac' ? '#f472b6' : '#fbbf24';
  b.cyl('#b45309', 0.28 * s, 0.19 * s, 0.42 * s, [x, 0.21 * s, z]);
  b.cyl('#92400e', 0.3 * s, 0.3 * s, 0.05 * s, [x, 0.44 * s, z]);
  b.cyl('#57361f', 0.04 * s, 0.06 * s, 0.9 * s, [x, 0.9 * s, z]);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + seed;
    const t = 0.75;
    const len = 0.65 * s;
    const dir: V3 = [Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t)];
    b.cyl('#57361f', 0.015 * s, 0.03 * s, len, [x + (dir[0] * len) / 2, 1.1 * s + (dir[1] * len) / 2, z + (dir[2] * len) / 2], [Math.sin(a) * t, 0, -Math.cos(a) * t], 5);
  }
  for (let i = 0; i < 26; i++) {
    const a = rnd(seed + i) * Math.PI * 2;
    const r = (0.12 + rnd(seed + i + 40) * 0.42) * s;
    const h = (1.25 + rnd(seed + i + 80) * 0.55) * s;
    b.ico(i % 3 === 0 ? bloom2 : bloom, 0.075 * s, [x + Math.cos(a) * r, h, z + Math.sin(a) * r]);
  }
  for (let i = 0; i < 7; i++) {
    const a = rnd(seed + i + 120) * Math.PI * 2;
    const r = (0.1 + rnd(seed + i + 160) * 0.35) * s;
    b.ico('#4d7c0f', 0.05 * s, [x + Math.cos(a) * r, (1.2 + rnd(seed + i + 200) * 0.5) * s, z + Math.sin(a) * r]);
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + seed + 0.6;
    const r = 0.38 * s;
    b.box('#dc2626', [0.07 * s, 0.11 * s, 0.012 * s], [x + Math.cos(a) * r, 1.15 * s, z + Math.sin(a) * r], [0, -a, 0]);
    b.box('#fde047', [0.03 * s, 0.03 * s, 0.014 * s], [x + Math.cos(a) * r, 1.17 * s, z + Math.sin(a) * r], [0, -a, 0]);
  }
}

/** Chậu quất: tán xanh tròn, quả cam. */
function kumquatPot(b: Batch, x: number, z: number, s: number): void {
  b.cyl('#b45309', 0.3 * s, 0.2 * s, 0.45 * s, [x, 0.22 * s, z]);
  b.cyl('#57361f', 0.04 * s, 0.05 * s, 0.4 * s, [x, 0.65 * s, z]);
  b.ico('#15803d', 0.48 * s, [x, 1.05 * s, z], [1, 0.9, 1], 1);
  for (let i = 0; i < 16; i++) {
    const a = rnd(300 + i) * Math.PI * 2;
    const e = (rnd(340 + i) - 0.3) * 1.6;
    const r = 0.5 * s;
    b.ico('#f97316', 0.06 * s, [x + Math.cos(a) * Math.cos(e) * r, 1.05 * s + Math.sin(e) * r * 0.9, z + Math.sin(a) * Math.cos(e) * r]);
  }
}

/** Xe máy đỗ (đầu xe hướng +z cục bộ). Kích thước 0.44 x 1.1 m khớp BIKE_HALF. */
function parkedBike(b: Batch, x: number, z: number, ry: number, c: string): void {
  b.at([x, 0, z], ry, () => {
    for (const zz of [-0.28, 0.28]) b.cyl('#111827', 0.27, 0.27, 0.09, [0, 0.27, zz], [0, 0, HALF_PI], 8);
    b.box(c, [0.2, 0.26, 0.5], [0, 0.5, 0]);
    b.box('#6b7280', [0.05, 0.6, 0.05], [0, 0.55, 0.3], [0.3, 0, 0]);
    b.box('#111827', [0.44, 0.04, 0.04], [0, 0.88, 0.36]);
    b.ico('#fef9c3', 0.06, [0, 0.8, 0.45]);
    b.box('#1f2937', [0.22, 0.09, 0.5], [0, 0.68, -0.12]);
    b.box(c, [0.18, 0.12, 0.24], [0, 0.58, -0.36]);
    b.box(c, [0.1, 0.04, 0.32], [0, 0.46, 0.3]);
  });
}

/** Cột đèn sân cao 5 m: đế, thân, cần chìa ra phía sân, đầu đèn. Chân đế 0.34 m khớp LAMP_R. */
function yardLamp(b: Batch, g: Batch, x: number, z: number, toward: number): void {
  b.box('#4b5563', [0.34, 0.5, 0.34], [x, 0.25, z]);
  b.cyl('#374151', 0.06, 0.08, 5, [x, 2.5, z], ZERO, 6);
  b.box('#374151', [0.9, 0.07, 0.07], [x + toward * 0.4, 5.0, z]);
  g.box('#fef3c7', [0.5, 0.1, 0.26], [x + toward * 0.85, 4.94, z]);
}

// ---------- Quán bánh mì ----------

/** Cao độ mặt dưới mái tôn tại z (mái nghiêng hạ dần về phía +z). */
function roofUnderY(z: number): number {
  return ROOF.y - ((z - (ROOF.minZ + ROOF.maxZ) / 2) * Math.sin(ROOF.tilt)) - ROOF.thick / 2;
}

/** Mái tôn + 4 cột, quầy bánh mì, kệ chai lọ, hộp đèn. `g` là batch phát sáng. */
function quan(b: Batch, g: Batch, style: RegionStyle): void {
  const tin = style === 'nam' ? '#7dd3fc' : style === 'trung' ? '#cbd5e1' : '#94a3b8';
  const rib = style === 'nam' ? '#38bdf8' : '#64748b';
  const rcx = (ROOF.minX + ROOF.maxX) / 2;
  const rcz = (ROOF.minZ + ROOF.maxZ) / 2;
  const rw = ROOF.maxX - ROOF.minX;
  const rd = ROOF.maxZ - ROOF.minZ;
  b.at([rcx, ROOF.y, rcz], [ROOF.tilt, 0, 0], () => {
    b.box(tin, [rw, ROOF.thick, rd], ZERO);
    for (let x = -rw / 2 + 0.2; x < rw / 2; x += 0.4) b.box(rib, [0.05, 0.035, rd], [x, ROOF.thick / 2 + 0.012, 0]);
    // Diềm trước màu đỏ viền vàng (đáy diềm vẫn cao hơn 2.4 m).
    b.box('#b91c1c', [rw + 0.08, 0.16, 0.05], [0, -0.04, rd / 2]);
    b.box('#facc15', [rw + 0.08, 0.025, 0.055], [0, -0.12, rd / 2]);
  });
  for (const [x, z] of QUAN_POSTS) {
    const h = roofUnderY(z) + 0.02;
    b.box('#9a3412', [0.14, h, 0.14], [x, h / 2, z]);
    b.box('#4b5563', [0.24, 0.05, 0.24], [x, 0.025, z]);
    b.box('#facc15', [0.15, 0.04, 0.15], [x, 1.4, z]);
  }

  // Quầy: thân gỗ, mặt gỗ sáng, mặt trước sơn đỏ có ổ bánh mì.
  const top = COUNTER.h;
  const cw = COUNTER.hw * 2;
  const cd = COUNTER.hd * 2;
  b.box('#92400e', [cw, top - 0.06, cd], [COUNTER.x, (top - 0.06) / 2, COUNTER.z]);
  b.box('#d6a45c', [cw + 0.06, 0.06, cd + 0.06], [COUNTER.x, top - 0.03, COUNTER.z]);
  const front = COUNTER.z + COUNTER.hd;
  b.box('#dc2626', [cw - 0.2, 0.55, 0.02], [COUNTER.x, 0.45, front + 0.005]);
  b.box('#facc15', [cw - 0.2, 0.04, 0.025], [COUNTER.x, 0.7, front + 0.006]);
  b.box('#facc15', [cw - 0.2, 0.04, 0.025], [COUNTER.x, 0.2, front + 0.006]);
  b.ico('#e8b86d', 0.2, [COUNTER.x, 0.45, front + 0.03], [1.8, 0.7, 0.25], 1);
  // Khay bánh mì: hai lớp ổ.
  const tray = COUNTER.x - 0.55;
  b.box('#a16207', [1.0, 0.04, 0.5], [tray, top + 0.02, COUNTER.z]);
  for (let i = 0; i < 5; i++) b.ico(i % 2 ? '#e8b86d' : '#f0c27b', 0.09, [tray - 0.4 + i * 0.2, top + 0.1, COUNTER.z], [1, 0.85, 2.3], 1);
  for (let i = 0; i < 4; i++) b.ico('#f0c27b', 0.085, [tray - 0.3 + i * 0.2, top + 0.2, COUNTER.z], [1, 0.85, 2.2], 1);
  // Bình trà, ly, lò than, bảng giá.
  const tea = COUNTER.x + 0.45;
  for (const dx of [0, 0.25]) {
    b.cyl('#dc2626', 0.1, 0.11, 0.32, [tea + dx, top + 0.16, COUNTER.z - 0.05]);
    b.cyl('#1f2937', 0.06, 0.1, 0.05, [tea + dx, top + 0.345, COUNTER.z - 0.05]);
    b.ring('#facc15', 0.07, 0.012, [tea + dx + 0.12, top + 0.2, COUNTER.z - 0.05], [0, HALF_PI, 0]);
  }
  for (let i = 0; i < 4; i++) b.cyl('#f8fafc', 0.04, 0.03, 0.07, [tea - 0.1 + i * 0.1, top + 0.035, COUNTER.z + 0.14]);
  const grill = COUNTER.x - 1.25;
  b.box('#374151', [0.34, 0.2, 0.34], [grill, top + 0.1, COUNTER.z]);
  g.box('#f97316', [0.26, 0.02, 0.26], [grill, top + 0.205, COUNTER.z]);
  b.ico('#d6a45c', 0.07, [grill, top + 0.25, COUNTER.z], [1, 0.8, 2.2], 1);
  const board = COUNTER.x + 1.15;
  b.at([board, top + 0.04, COUNTER.z + 0.08], [-0.18, 0, 0], () => {
    b.box('#14532d', [0.5, 0.4, 0.03], [0, 0.2, 0]);
    b.box('#b45309', [0.54, 0.04, 0.05], [0, 0.0, 0.0]);
    for (let i = 0; i < 3; i++) {
      b.box('#f8fafc', [0.26, 0.03, 0.01], [-0.07, 0.3 - i * 0.1, 0.02]);
      b.box('#fde047', [0.1, 0.03, 0.01], [0.15, 0.3 - i * 0.1, 0.02]);
    }
  });

  // Kệ chai lọ sau quầy, mặt kệ nhìn về phía nam.
  const sw = SHELF.hw * 2;
  const sd = SHELF.hd * 2;
  b.box('#78350f', [sw, SHELF.h, 0.06], [SHELF.x, SHELF.h / 2, SHELF.z - SHELF.hd + 0.03]);
  for (const sx of [-1, 1]) b.box('#78350f', [0.06, SHELF.h, sd], [SHELF.x + sx * (SHELF.hw - 0.03), SHELF.h / 2, SHELF.z]);
  const cols = ['#16a34a', '#dc2626', '#facc15', '#f8fafc', '#2563eb'];
  [0.04, 0.5, 1.0, 1.5, SHELF.h - 0.02].forEach((y, row) => {
    b.box('#92400e', [sw, 0.04, sd], [SHELF.x, y + 0.02, SHELF.z]);
    if (row === 0 || row === 4) return;
    for (let i = 0; i < 12; i++) {
      const c = cols[(i + row) % cols.length]!;
      b.cyl(c, 0.04, 0.05, 0.22 + rnd(i + row * 9) * 0.1, [SHELF.x - 1.5 + i * 0.27, y + 0.15, SHELF.z + 0.08]);
    }
  });
  b.box('#dc2626', [1.3, 0.26, 0.04], [SHELF.x, SHELF.h + 0.15, SHELF.z + 0.1]);
  b.box('#facc15', [1.34, 0.03, 0.045], [SHELF.x, SHELF.h + 0.03, SHELF.z + 0.1]);

  // Hộp đèn "bánh mì" trên mái, hướng ra sân: khung đỏ, mặt vàng phát sáng, vạch chữ giả, ổ bánh mì.
  const sz = ROOF.maxZ - 0.3;
  const sy = roofUnderY(sz) + ROOF.thick + 0.55;
  for (const dx of [-1.15, 1.15]) b.box('#4b5563', [0.06, 0.6, 0.06], [COUNTER.x + dx, sy - 0.3, sz]);
  b.box('#b91c1c', [2.9, 0.62, 0.12], [COUNTER.x, sy + 0.3, sz - 0.04]);
  g.box('#fde047', [2.76, 0.48, 0.05], [COUNTER.x, sy + 0.3, sz + 0.03]);
  for (let i = 0; i < 5; i++) b.box('#991b1b', [0.28 + (i % 2) * 0.1, 0.2, 0.03], [COUNTER.x - 0.25 + i * 0.38, sy + 0.3, sz + 0.06]);
  b.ico('#e8b86d', 0.24, [COUNTER.x - 1.1, sy + 0.3, sz + 0.08], [1.5, 0.8, 0.5], 1);
}

// ---------- Chú Ba livestream ----------

/** Hướng (rotY) từ điểm (ax, az) nhìn về điểm (bx, bz). */
function facing(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}

const CHU_BA_SPOT = SETS['tram-dung']!.spots['chu-ba']!.pos;
/** Hướng điện thoại trên gậy: quay màn hình về phía chú Ba. */
const PHONE_YAW = facing(CHU_BA.tripod.x, CHU_BA.tripod.z, CHU_BA_SPOT[0], CHU_BA_SPOT[2]);
/** Điện thoại ở độ cao 1.5 m; chấm LIVE nhấp nháy đặt lệch lên trên màn hình. */
const PHONE_Y = 1.5;

function livestream(b: Batch, g: Batch): void {
  const t = CHU_BA.table;
  // Bàn nhỏ có mã QR "chuyển khoản", hộp quyên góp, chai nước; ghế đẩu đỏ.
  b.box('#2563eb', [t.hw * 2, 0.04, t.hd * 2], [t.x, 0.65, t.z]);
  for (const dx of [-0.29, 0.29]) for (const dz of [-0.29, 0.29]) b.box('#e5e7eb', [0.045, 0.63, 0.045], [t.x + dx, 0.315, t.z + dz]);
  stool(b, CHU_BA.stool.x, CHU_BA.stool.z, '#dc2626');
  b.at([t.x - 0.1, 0.67, t.z + 0.05], [-0.15, 0.4, 0], () => {
    b.box('#f8fafc', [0.3, 0.38, 0.02], [0, 0.19, 0]);
    for (const [qx, qz] of [[-0.08, 0.28], [0.08, 0.28], [-0.08, 0.1]] as const) b.box('#111827', [0.07, 0.07, 0.015], [qx, qz, 0.012]);
    for (let i = 0; i < 9; i++) b.box('#111827', [0.03, 0.03, 0.015], [-0.07 + (i % 3) * 0.06 + 0.04, 0.05 + Math.floor(i / 3) * 0.05 + 0.02, 0.012]);
    b.box('#4b5563', [0.04, 0.2, 0.02], [0, 0.1, -0.03], [0.3, 0, 0]);
  });
  b.box('#dc2626', [0.2, 0.26, 0.16], [t.x + 0.18, 0.8, t.z - 0.12]);
  b.box('#facc15', [0.1, 0.025, 0.02], [t.x + 0.18, 0.88, t.z - 0.035]);
  b.cyl('#38bdf8', 0.04, 0.04, 0.2, [t.x + 0.22, 0.77, t.z + 0.18]);

  // Chân đế + gậy điện thoại cao 1.5 m, đèn vòng sáng phía sau điện thoại.
  const p = CHU_BA.tripod;
  b.at([p.x, 0, p.z], PHONE_YAW, () => {
    b.cyl('#374151', p.r - 0.01, p.r - 0.01, 0.05, [0, 0.025, 0]);
    b.cyl('#d1d5db', 0.016, 0.016, PHONE_Y - 0.05, [0, PHONE_Y / 2 + 0.01, 0], ZERO, 5);
    b.box('#111827', [0.085, 0.17, 0.014], [0, PHONE_Y, 0.0]);
    g.box('#bae6fd', [0.072, 0.15, 0.004], [0, PHONE_Y, 0.009]);
    g.ring('#fefce8', 0.17, 0.016, [0, PHONE_Y, -0.04]);
  });
}

// ---------- Xe cũ của Thái Gara và đồ nghề ----------

/** Xe hơi cũ sơn vàng chanh, một cánh cửa thay bằng cánh xanh dương, nóc khác màu. Đầu xe là +z cục bộ. */
function oldCar(b: Batch): void {
  b.at([CAR.x, 0, CAR.z], CAR.rotY, () => {
    const paint = '#facc15';
    const glass = '#2a4f80';
    b.box(paint, [1.7, 0.55, 4.1], [0, 0.575, 0]);
    b.box(paint, [1.6, 0.1, 1.2], [0, 0.9, 1.4]);
    b.box(paint, [1.6, 0.1, 0.9], [0, 0.9, -1.5]);
    b.box(paint, [1.5, 0.5, 2.0], [0, 1.125, -0.15]);
    b.box('#e5e7eb', [1.4, 0.05, 1.8], [0, 1.4, -0.15]);
    b.box(glass, [1.38, 0.36, 0.03], [0, 1.13, 0.86]);
    b.box(glass, [1.38, 0.36, 0.03], [0, 1.13, -1.16]);
    for (const s of [-1, 1]) {
      b.box(glass, [0.03, 0.34, 0.7], [s * 0.76, 1.13, 0.35]);
      b.box(glass, [0.03, 0.34, 0.7], [s * 0.76, 1.13, -0.6]);
      b.box('#1f2937', [1.7, 0.14, 0.1], [0, 0.4, s * 2.05]);
      b.box(s > 0 ? '#fef9c3' : '#ef4444', [0.3, 0.14, 0.04], [-0.55, 0.7, s * 2.03]);
      b.box(s > 0 ? '#fef9c3' : '#ef4444', [0.3, 0.14, 0.04], [0.55, 0.7, s * 2.03]);
      for (const zz of [1.3, -1.3]) {
        b.cyl('#111827', 0.33, 0.33, 0.22, [s * 0.79, 0.33, zz], [0, 0, HALF_PI], 10);
        b.cyl('#9ca3af', 0.15, 0.15, 0.23, [s * 0.79, 0.33, zz], [0, 0, HALF_PI], 6);
      }
    }
    b.box('#3b82f6', [0.03, 0.46, 0.85], [0.86, 0.6, 0.35]);
    b.box('#a16207', [0.02, 0.2, 0.4], [-0.855, 0.65, -1.1]);
    b.box('#f8fafc', [0.4, 0.12, 0.02], [0, 0.45, 2.09]);
    b.box('#f8fafc', [0.5, 0.2, 0.02], [0.3, 1.1, 0.885]);
    b.box('#dc2626', [0.4, 0.07, 0.025], [0.3, 1.15, 0.89]);
    b.cyl('#9ca3af', 0.01, 0.01, 0.6, [0.6, 1.7, -1.0], [0.2, 0, -0.15], 4);
  });
}

/** Biển A "BÁN XE" (hai tấm dựa vào nhau) cạnh đầu xe; mặt nhìn ra sân. Khớp SIGN (0.8 x 0.3 m). */
function saleSign(b: Batch): void {
  b.at([SIGN.x, 0, SIGN.z], SIGN.rotY, () => {
    b.at([0, 0, -0.06], [0.2, 0, 0], () => b.box('#fbbf24', [0.78, 0.9, 0.03], [0, 0.45, 0]));
    b.at([0, 0, 0.06], [-0.2, 0, 0], () => {
      b.box('#f8fafc', [0.78, 0.9, 0.03], [0, 0.45, 0]);
      b.box('#dc2626', [0.6, 0.15, 0.02], [0, 0.66, 0.02]);
      b.box('#dc2626', [0.5, 0.09, 0.02], [0, 0.46, 0.02]);
      b.box('#1d4ed8', [0.36, 0.07, 0.02], [0, 0.28, 0.02]);
    });
  });
}

function tireStack(b: Batch): void {
  for (let i = 0; i < 3; i++) b.cyl('#1f2937', TIRES.r, TIRES.r, 0.2, [TIRES.x + (i === 1 ? 0.02 : 0), 0.1 + i * 0.2, TIRES.z], ZERO, 12);
  b.cyl('#6b7280', 0.2, 0.2, 0.02, [TIRES.x, 0.61, TIRES.z], ZERO, 8);
}

function drum(b: Batch): void {
  b.cyl('#2563eb', DRUM.r - 0.02, DRUM.r - 0.02, 0.85, [DRUM.x, 0.425, DRUM.z], ZERO, 10);
  for (const y of [0.2, 0.65]) b.cyl('#1d4ed8', DRUM.r, DRUM.r, 0.06, [DRUM.x, y, DRUM.z], ZERO, 10);
  b.cyl('#9ca3af', DRUM.r - 0.05, DRUM.r - 0.05, 0.03, [DRUM.x, 0.865, DRUM.z], ZERO, 10);
}

/** Xe nước mía: thân đỏ, máy ép, mía xanh, dù vàng ở độ cao > 2 m (đầu người đi qua dưới được). */
function juiceCart(b: Batch): void {
  b.at([CART.x, 0, CART.z], CART.rotY, () => {
    b.box('#dc2626', [CART.hw * 2, 0.62, CART.hd * 2], [0, 0.61, 0]);
    b.box('#fef3c7', [CART.hw * 2 + 0.04, 0.05, CART.hd * 2 + 0.04], [0, 0.945, 0]);
    b.box('#9ca3af', [0.34, 0.5, 0.3], [-0.28, 1.2, 0]);
    b.cyl('#4b5563', 0.07, 0.07, 0.3, [-0.28, 1.5, 0], [HALF_PI, 0, 0], 6);
    b.cyl('#a3e635', 0.09, 0.08, 0.26, [0.15, 1.09, 0.05], ZERO, 6);
    for (let i = 0; i < 5; i++) b.cyl('#65a30d', 0.022, 0.025, 1.0, [0.3 + i * 0.045, 1.5, -0.06 + (i % 2) * 0.1], [0.05 * (i - 2), 0, -0.12], 5);
    for (const sx of [-0.31, 0.31]) for (const sz of [-1, 1]) b.cyl('#111827', 0.24, 0.24, 0.05, [sx, 0.24, sz * 0.295], [HALF_PI, 0, 0], 8);
    b.cyl('#e5e7eb', 0.02, 0.02, 1.2, [0.38, 1.6, -0.2], ZERO, 5);
    b.cyl('#fbbf24', 0.04, 0.85, 0.28, [0.38, 2.2, -0.2], ZERO, 8);
  });
}

// ---------- Xe khách đậu ----------

/**
 * Xe khách đậu phía đông, đầu xe hướng tây. Thân 8 x 2.8 x 3.2 m (bánh nhô ra hai bên tới ±1.5 m nên vừa khít BUS.hd),
 * cửa mở ở mặt nam gần x = 7.8 (hố cửa tối + tấm cửa gấp + hai bậc lên xe thụt trong 0.1 m), hành lý và cành hoa trên nóc.
 */
function parkedCoach(b: Batch, g: Batch, style: RegionStyle): void {
  const orange = '#f97316';
  const glass = '#2a4f80';
  const dark = '#111827';
  b.at([BUS.x, 0, BUS.z], 0, () => {
    b.box('#374151', [7.9, 0.3, 2.7], [0, 0.4, 0]);
    b.box(orange, [8, 0.8, 2.8], [0, 0.95, 0]);
    b.box('#f8fafc', [8, 0.15, 2.8], [0, 1.425, 0]);
    b.box(glass, [8, 1.2, 2.8], [0, 2.1, 0]);
    b.box(orange, [8, 0.4, 2.8], [0, 2.9, 0]);
    b.box('#f8fafc', [7.8, 0.1, 2.6], [0, 3.15, 0]);
    // Trụ giữa các ô kính hai bên (bỏ phía hố cửa mặt nam).
    for (let i = 0; i < 8; i++) {
      const x = -3.5 + i;
      b.box(orange, [0.12, 1.2, 0.04], [x, 2.1, -1.41]);
      if (Math.abs(x + 0.2) > 0.9) b.box(orange, [0.12, 1.2, 0.04], [x, 2.1, 1.41]);
    }
    // Cửa lên xe (mặt nam, gần x = 7.8 => x cục bộ -0.2): hố cửa tối, tấm cửa gấp, đèn trần, hai bậc.
    b.box(dark, [1.1, 2.0, 0.04], [-0.2, 1.45, 1.41]);
    b.box('#38bdf8', [0.45, 1.9, 0.03], [-1.0, 1.45, 1.425]);
    b.box(orange, [0.5, 0.06, 0.04], [-1.0, 2.43, 1.425]);
    g.box('#fde68a', [0.9, 0.06, 0.02], [-0.2, 2.38, 1.435]);
    b.box('#9ca3af', [1.0, 0.06, 0.12], [-0.2, 0.42, 1.44]);
    b.box('#9ca3af', [1.0, 0.06, 0.12], [-0.2, 0.92, 1.44]);
    // Cửa hành lý.
    // Giữa hai trục bánh, tránh hốc bánh và cửa lên xe.
    b.box('#c2410c', [1.1, 0.6, 0.03], [1.2, 0.95, 1.41]);
    for (const x of [-0.5, 1.0]) b.box('#c2410c', [1.1, 0.6, 0.03], [x, 0.95, -1.41]);
    // Đầu xe (phía tây): kính chắn gió, biển điểm đến, đèn pha, cản, biển số, gương.
    b.box(glass, [0.04, 1.4, 2.4], [-4.0, 2.0, 0]);
    b.box(dark, [0.03, 0.26, 1.5], [-4.015, 2.9, 0]);
    g.box('#fbbf24', [0.02, 0.12, 1.2], [-4.03, 2.9, 0]);
    for (const s of [-1, 1]) {
      g.box('#fef9c3', [0.04, 0.2, 0.4], [-4.02, 0.95, s * 0.95]);
      g.box('#ef4444', [0.03, 0.2, 0.3], [4.02, 0.95, s * 1.0]);
      b.box(dark, [0.08, 0.05, 0.2], [-3.85, 2.4, s * 1.45]);
      b.box(dark, [0.06, 0.4, 0.1], [-3.8, 2.2, s * 1.5]);
    }
    b.box('#1f2937', [0.08, 0.3, 2.7], [-4.0, 0.45, 0]);
    b.box('#f8fafc', [0.02, 0.16, 0.5], [-4.05, 0.7, 0]);
    b.box(dark, [0.025, 0.06, 0.3], [-4.06, 0.7, 0]);
    // Đuôi xe (phía đông).
    b.box(glass, [0.04, 1.0, 2.0], [4.0, 2.05, 0]);
    b.box('#f8fafc', [0.02, 0.16, 0.5], [4.05, 0.7, 0]);
    b.box(dark, [0.025, 0.06, 0.3], [4.06, 0.7, 0]);
    // Hốc bánh tối và bánh xe: hai trục.
    for (const x of [-2.6, 2.5]) {
      for (const s of [-1, 1]) {
        b.box(dark, [1.3, 0.75, 0.03], [x, 0.85, s * 1.41]);
        b.cyl('#1f2937', 0.5, 0.5, 0.26, [x, 0.5, s * 1.37], [HALF_PI, 0, 0], 10);
        b.cyl('#9ca3af', 0.22, 0.22, 0.27, [x, 0.5, s * 1.37], [HALF_PI, 0, 0], 6);
      }
    }
    // Băng rôn Tết đỏ dọc thân, nóc: máy lạnh, giá hành lý.
    for (const s of [-1, 1]) {
      b.box('#dc2626', [4.2, 0.26, 0.02], [1.4, 2.9, s * 1.405]);
      for (let i = 0; i < 7; i++) b.box('#fde047', [0.12, 0.12, 0.022], [-0.4 + i * 0.6, 2.9, s * 1.41]);
    }
    b.box('#e5e7eb', [1.8, 0.3, 1.3], [2.4, 3.35, 0]);
    b.box('#9ca3af', [0.6, 0.04, 0.6], [2.4, 3.52, 0]);
    b.box('#6b7280', [3.2, 0.05, 2.2], [-1.8, 3.25, 0]);
    const bag = ['#dc2626', '#2563eb', '#f8fafc', '#16a34a', '#facc15'];
    [-3.1, -2.3, -1.5, -0.7].forEach((x, i) => {
      b.box(bag[i % bag.length]!, [0.75, 0.5, 0.6 + (i % 2) * 0.3], [x, 3.52, (i % 2) * 0.5 - 0.25], [0, i * 0.15, 0]);
      b.box('#f8fafc', [0.77, 0.06, 0.62 + (i % 2) * 0.3], [x, 3.5, (i % 2) * 0.5 - 0.25], [0, i * 0.15, 0]);
    });
  });
  // Cành hoa Tết buộc trên nóc xe (đào/mai theo miền).
  b.at([0, 3.28, 0], 0, () => blossomPot(b, style, BUS.x + 0.5, BUS.z, 1.1, 31));
}

// ---------- Cây cối xa, đồng ruộng, nhà ven đường ----------

interface Look {
  grass: string;
  paddyA: string;
  paddyB: string;
  hill: string;
}

/** Màu đất, ruộng, đồi theo miền: Bắc xanh dịu, Trung nắng cát, Nam xanh tươi. */
const LOOK: Record<RegionStyle, Look> = {
  bac: { grass: '#86a85a', paddyA: '#a3c26b', paddyB: '#c2c77a', hill: '#7f9f86' },
  trung: { grass: '#c3b47c', paddyA: '#a9c27a', paddyB: '#d5c58a', hill: '#8a9a7b' },
  nam: { grass: '#8fbf5f', paddyA: '#84cc16', paddyB: '#a3d977', hill: '#6f9f8a' },
};

type TreeKind = 'round' | 'palm' | 'phi-lao' | 'bamboo';

function tree(b: Batch, kind: TreeKind, x: number, z: number, s: number, seed: number): void {
  if (kind === 'round') {
    b.cyl('#6b4a2b', 0.12 * s, 0.17 * s, 1.9 * s, [x, 0.95 * s, z], ZERO, 6);
    b.ico(rnd(seed) > 0.5 ? '#2f8a3a' : '#3b9a44', 1.1 * s, [x, 2.5 * s, z], [1, 0.9, 1], 1);
    b.ico('#4aa84f', 0.75 * s, [x + 0.45 * s, 3.1 * s, z + 0.2 * s], [1, 0.9, 1], 1);
  } else if (kind === 'palm') {
    b.cyl('#8b6b4a', 0.1 * s, 0.17 * s, 4.2 * s, [x - 0.1 * s, 2.1 * s, z], [0, 0, 0.05], 6);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7 + seed;
      b.at([x - 0.2 * s, 4.2 * s, z], a, () => b.box('#16a34a', [0.3 * s, 0.05 * s, 2.3 * s], [0, -0.35 * s, 1.0 * s], [0.5, 0, 0]));
    }
    for (let i = 0; i < 3; i++) b.ico('#78350f', 0.12 * s, [x - 0.2 * s + (i - 1) * 0.16 * s, 4.0 * s, z + 0.12 * s]);
  } else if (kind === 'phi-lao') {
    b.cyl('#6b4a2b', 0.08 * s, 0.14 * s, 2.0 * s, [x, 1.0 * s, z], ZERO, 6);
    b.cyl('#3f6212', 0, 1.0 * s, 5.0 * s, [x, 4.2 * s, z], ZERO, 7);
  } else {
    for (let i = 0; i < 6; i++) {
      const bx = x + (rnd(seed + i) - 0.5) * 1.4;
      const bz = z + (rnd(seed + i + 10) - 0.5) * 1.2;
      const h = (4 + rnd(seed + i + 20) * 2.5) * s;
      b.cyl('#65a30d', 0.04, 0.06, h, [bx, h / 2, bz], [(rnd(seed + i + 30) - 0.5) * 0.2, 0, (rnd(seed + i + 40) - 0.5) * 0.25], 5);
      b.cyl('#3f6212', 0, 0.45, 1.4, [bx, h, bz], ZERO, 5);
    }
  }
}

function farHouse(b: Batch, x: number, z: number, wall: string, roof: string, w: number): void {
  b.box(wall, [w, 2.6, 4], [x, 1.3, z]);
  b.cyl(roof, 0, w * 0.78, 1.4, [x, 3.3, z], [0, Math.PI / 4, 0], 4);
  b.box('#78350f', [0.8, 1.6, 0.05], [x, 0.8, z + 2.03]);
  b.box('#2a4f80', [0.7, 0.6, 0.05], [x - w * 0.3, 1.6, z + 2.03]);
}

function scenery(b: Batch, style: RegionStyle): void {
  const look = LOOK[style];
  b.flat(look.grass, 240, 240, [0, -0.02, 0]);
  // Ruộng hai phía quốc lộ: dải xen kẽ hai màu, mương nước.
  for (let j = 0; j < 9; j++) {
    const z = -9.2 - j * 4.2;
    b.flat(j % 2 ? look.paddyA : look.paddyB, 240, 3.4, [0, -0.012, z]);
    b.flat('#7aa9a0', 240, 0.5, [0, -0.011, z + 2.1]);
  }
  for (let j = 0; j < 4; j++) b.flat(j % 2 ? look.paddyB : look.paddyA, 240, 3.4, [0, -0.012, 12.5 + j * 4.2]);
  // Đồi xa phía bắc.
  for (let i = 0; i < 6; i++) b.ico(look.hill, 12, [-60 + i * 24, 0, -70 - (i % 2) * 6], [1.9, 0.75, 1], 1);
  // Hàng cây hai lớp phía bắc quốc lộ, hai bên sân và phía nam (cách xa vùng đi lại).
  const kinds: Record<RegionStyle, TreeKind[]> = {
    bac: ['round', 'bamboo', 'round', 'round'],
    trung: ['phi-lao', 'round', 'palm', 'phi-lao'],
    nam: ['palm', 'palm', 'round', 'palm'],
  };
  const ks = kinds[style];
  for (let i = 0; i < 21; i++) tree(b, ks[i % ks.length]!, -52 + i * 5 + rnd(i) * 2.5, -9.6 - rnd(i + 30) * 2.5, 0.9 + rnd(i + 60) * 0.4, i * 7);
  for (let i = 0; i < 12; i++) tree(b, ks[(i + 1) % ks.length]!, -50 + i * 9 + rnd(i + 90) * 4, -20 - rnd(i + 120) * 10, 1.1 + rnd(i + 150) * 0.5, i * 11 + 3);
  for (let i = 0; i < 6; i++) {
    tree(b, ks[i % ks.length]!, -18 - rnd(i + 200) * 8, 2 + i * 2.6 + rnd(i + 230) * 2, 1 + rnd(i + 260) * 0.3, i * 5 + 1);
    tree(b, ks[(i + 2) % ks.length]!, 18 + rnd(i + 290) * 8, 2 + i * 2.6 + rnd(i + 320) * 2, 1 + rnd(i + 350) * 0.3, i * 5 + 2);
  }
  for (let i = 0; i < 10; i++) tree(b, ks[(i + 3) % ks.length]!, -30 + i * 6.5 + rnd(i + 380) * 3, 17 + rnd(i + 410) * 9, 1 + rnd(i + 440) * 0.4, i * 3 + 9);
  // Nhà ven đường bên kia quốc lộ.
  const walls = ['#fde68a', '#fca5a5', '#bfdbfe', '#fed7aa', '#d9f99d'];
  [-36, -22, 14, 30, 44].forEach((x, i) => farHouse(b, x, -15.5, walls[i % walls.length]!, i % 2 ? '#9a3412' : '#b45309', 5 + (i % 3)));
  // Cột điện bên kia quốc lộ, dây điện căng giữa các cột.
  for (let i = 0; i < 9; i++) {
    const x = -48 + i * 12;
    b.cyl('#78716c', 0.09, 0.13, 7.6, [x, 3.8, -7.4], ZERO, 6);
    b.box('#57534e', [1.5, 0.09, 0.09], [x, 7.1, -7.4]);
    if (i < 8) for (const dz of [-0.65, 0, 0.65]) b.box('#1f2937', [12, 0.02, 0.02], [x + 6, 6.95 - (dz === 0 ? 0.02 : 0), -7.4 + dz]);
  }
}

// ---------- Quốc lộ, lan can, sân trạm ----------

/** Quốc lộ z -6..-2: hai làn + dải phân cách rộng 0.8 m (làn bắc z -5.2 chạy về tây, làn nam z -2.8 chạy về đông). */
const LANE_FAR_Z = -5.2;
const LANE_NEAR_Z = -2.8;
const ROAD_X = 48;

function highway(b: Batch, g: Batch): void {
  b.flat('#374151', 240, 4, [0, 0, -4]);
  b.flat('#a8a29e', 240, 0.6, [0, 0, -1.7]);
  for (const z of [-5.92, -2.08]) b.flat('#f8fafc', 240, 0.12, [0, 0.006, z]);
  // Dải phân cách bê tông, bụi cây xanh, thỉnh thoảng có hoa giấy.
  b.box('#d1d5db', [240, 0.2, 0.8], [0, 0.1, -4]);
  for (let i = 0; i <= 32; i++) {
    const x = -ROAD_X + i * 3;
    b.ico(i % 4 === 1 ? '#be185d' : '#4d7c0f', 0.3, [x, 0.38, -4], [1.1, 0.8, 0.9]);
  }
  // Đèn đường trên dải phân cách: cột, hai cần chìa ra hai làn, đầu đèn phát sáng.
  for (let i = 0; i < 7; i++) {
    const x = -42 + i * 14;
    b.cyl('#4b5563', 0.05, 0.07, 6.5, [x, 3.25, -4], ZERO, 6);
    for (const s of [-1, 1]) {
      b.box('#4b5563', [0.06, 0.06, 1.5], [x, 6.45, -4 + s * 0.75]);
      g.box('#fef3c7', [0.5, 0.06, 0.25], [x, 6.38, -4 + s * 1.4]);
    }
  }
}

/** Lan can ống dọc mép quốc lộ (z = -1.4, cao BARRIER.h): hai thanh ngang, trụ mỗi 2 m, mắt phản quang. */
function guardRail(b: Batch): void {
  const h = BARRIER.h;
  for (const y of [h - 0.05, h * 0.55]) b.cyl('#f1f5f9', 0.03, 0.03, ROAD_X * 2, [0, y, BARRIER.z], [0, 0, HALF_PI], 5);
  for (let i = 0; i <= 48; i++) {
    const x = -ROAD_X + i * 2;
    b.box('#6b7280', [0.1, h, 0.1], [x, h / 2, BARRIER.z]);
    if (i % 3 === 0) b.box(i % 2 ? '#ef4444' : '#f8fafc', [0.1, 0.12, 0.02], [x, h - 0.2, BARRIER.z + 0.06]);
  }
}

/** Biển "TRẠM DỪNG CHÂN" bắc ngang trên lan can: bảng xanh viền trắng, chữ giả bằng các khối trắng, cốc trà và đèn lồng đỏ. */
function stationSign(b: Batch, g: Batch): void {
  const cx = 2.5;
  const z = -1.78;
  for (const dx of [-2.9, 2.9]) b.cyl('#6b7280', 0.09, 0.09, 4.2, [cx + dx, 2.1, z], ZERO, 6);
  b.box('#f8fafc', [6.0, 1.7, 0.1], [cx, 4.4, z - 0.03]);
  b.box('#15803d', [5.8, 1.5, 0.12], [cx, 4.4, z]);
  for (let i = 0; i < 14; i++) {
    if (i === 5 || i === 10) continue;
    const w = 0.16 + rnd(i + 5) * 0.14;
    b.box('#f8fafc', [w, 0.42, 0.03], [cx - 1.55 + i * 0.3 + 0.1, 4.55, z + 0.075]);
    if (rnd(i + 70) > 0.6) b.box('#fde047', [0.1, 0.06, 0.03], [cx - 1.55 + i * 0.3 + 0.1, 4.86, z + 0.075]);
  }
  for (let i = 0; i < 9; i++) b.box('#bbf7d0', [0.14 + rnd(i + 25) * 0.14, 0.16, 0.03], [cx - 1.0 + i * 0.28, 4.05, z + 0.075]);
  b.cyl('#f8fafc', 0.2, 0.15, 0.3, [cx - 2.35, 4.4, z + 0.09]);
  b.ring('#f8fafc', 0.12, 0.025, [cx - 2.15, 4.42, z + 0.09], [0, 0, 0]);
  for (const dx of [-3.0, 3.0]) {
    b.cyl('#facc15', 0.01, 0.01, 0.3, [cx + dx, 3.55, z + 0.1], ZERO, 3);
    g.ico('#dc2626', 0.22, [cx + dx, 3.25, z + 0.1], [1, 1.2, 1], 1);
  }
}

/** Sân bê tông trạm: tấm lát có khe, bó vỉa, vạch dừng trước cửa xe khách, bụi cây thấp mép nam, vệt cỏ chỗ dê con. */
function yard(b: Batch, style: RegionStyle): void {
  b.flat('#c9ced6', 26, 11, [0, 0, 4.1]);
  for (let x = -12; x <= 12; x += 4) b.flat('#aeb6c2', 0.05, 11, [x, 0.006, 4.1]);
  for (const z of [0, 4, 8]) b.flat('#aeb6c2', 26, 0.05, [0, 0.006, z]);
  for (const s of [-1, 1]) b.box('#d6d3d1', [0.3, 0.12, 11], [s * 13.1, 0.06, 4.1]);
  b.box('#d6d3d1', [26.6, 0.12, 0.3], [0, 0.06, 9.75]);
  b.flat('#facc15', 8, 0.12, [BUS.x, 0.006, BUS.z + BUS.hd + 0.35]);
  b.flat('#f8fafc', 0.1, 3.2, [BUS.x - BUS.hw - 0.4, 0.006, BUS.z]);
  b.flat('#9ca3af', 1.4, 0.9, [CAR.x + 0.6, 0.006, CAR.z + 0.2], 0.3);
  // Ô đỗ xe máy/xe con phía nam sân: vạch trắng kẻ trên nền (không cản đường).
  for (let i = 0; i < 6; i++) b.flat('#f8fafc', 0.09, 2.6, [1.2 + i * 2.1, 0.006, 7.3]);
  b.flat('#f8fafc', 10.6, 0.09, [6.3, 0.006, 6.0]);
  const deSpot = SETS['tram-dung']!.spots['be-de']!.pos;
  b.flat('#86a85a', 1.5, 1.2, [deSpot[0], 0.007, deSpot[2]], 0.5);
  b.flat('#6f9a4a', 0.9, 0.7, [deSpot[0] + 0.25, 0.008, deSpot[2] - 0.1], -0.3);
  for (let i = 0; i < 19; i++) {
    const hedge = style === 'bac' ? '#3f7d32' : '#2f8a3a';
    b.ico(i % 5 === 2 ? '#ec4899' : hedge, 0.42, [-12.6 + i * 1.4, 0.3, 9.35], [1, 0.7, 0.8]);
  }
}

// ---------- Xe chạy trên quốc lộ ----------

interface VehicleSpec {
  kind: 'truck' | 'coach';
  a: string;
  b: string;
  c: string;
}

const SPECS: readonly VehicleSpec[] = [
  { kind: 'truck', a: '#2563eb', b: '#f1f5f9', c: '#dc2626' },
  { kind: 'truck', a: '#dc2626', b: '#fde68a', c: '#2563eb' },
  { kind: 'truck', a: '#15803d', b: '#94a3b8', c: '#facc15' },
  { kind: 'coach', a: '#f97316', b: '#fde047', c: '#dc2626' },
  { kind: 'coach', a: '#16a34a', b: '#fde047', c: '#dc2626' },
  { kind: 'coach', a: '#2563eb', b: '#e5e7eb', c: '#facc15' },
];

/** Bánh xe hai bên, trục x cục bộ. */
function wheels(b: Batch, zs: readonly number[], x: number, r: number): void {
  for (const z of zs) {
    for (const s of [-1, 1]) {
      b.cyl('#111827', r, r, 0.24, [s * x, r, z], [0, 0, HALF_PI], 10);
      b.cyl('#9ca3af', r * 0.45, r * 0.45, 0.25, [s * x, r, z], [0, 0, HALF_PI], 6);
    }
  }
}

/** Xe tải thùng (đầu xe +z cục bộ, dài ~5.2 m, rộng 1.5 m): vừa làn 1.6 m. */
function truckGeometry(s: VehicleSpec): BufferGeometry {
  const b = new Batch();
  b.box('#1f2937', [1.2, 0.25, 4.8], [0, 0.55, 0]);
  b.box(s.a, [1.4, 1.25, 1.4], [0, 1.33, 1.8]);
  b.box(s.a, [1.46, 0.06, 1.5], [0, 2.0, 1.8]);
  b.box('#2a4f80', [1.2, 0.55, 0.03], [0, 1.55, 2.51]);
  for (const sx of [-1, 1]) {
    b.box('#2a4f80', [0.03, 0.5, 0.8], [sx * 0.71, 1.55, 1.9]);
    b.box('#fef9c3', [0.25, 0.15, 0.04], [sx * 0.45, 0.85, 2.53]);
    b.box('#ef4444', [0.2, 0.15, 0.04], [sx * 0.55, 0.7, -2.4]);
  }
  b.box('#6b7280', [1.3, 0.3, 0.05], [0, 0.85, 2.52]);
  b.box('#374151', [1.45, 0.2, 0.1], [0, 0.5, 2.55]);
  b.box(s.b, [1.5, 1.6, 3.2], [0, 1.5, -0.75]);
  b.box(s.c, [1.52, 0.22, 3.22], [0, 1.25, -0.75]);
  wheels(b, [1.8, -1.1, -2.0], 0.68, 0.4);
  return b.build();
}

/** Xe khách chạy (đầu xe +z cục bộ, dài 6.4 m, rộng 1.5 m): thân màu a, dải nóc màu b, băng rôn Tết màu c. */
function coachGeometry(s: VehicleSpec): BufferGeometry {
  const b = new Batch();
  b.box('#374151', [1.4, 0.3, 6.2], [0, 0.45, 0]);
  b.box(s.a, [1.5, 0.6, 6.4], [0, 0.9, 0]);
  b.box('#f8fafc', [1.5, 0.1, 6.4], [0, 1.25, 0]);
  b.box('#2a4f80', [1.5, 0.7, 6.4], [0, 1.65, 0]);
  b.box(s.b, [1.5, 0.3, 6.4], [0, 2.15, 0]);
  for (let i = 0; i < 7; i++) b.box(s.a, [1.52, 0.7, 0.1], [0, 1.65, -2.7 + i * 0.9]);
  b.box(s.c, [1.52, 0.12, 2.4], [0, 2.15, -1.2]);
  b.box('#2a4f80', [1.3, 0.8, 0.03], [0, 1.55, 3.21]);
  b.box('#111827', [0.9, 0.14, 0.03], [0, 2.1, 3.21]);
  b.box('#fbbf24', [0.7, 0.07, 0.035], [0, 2.1, 3.215]);
  for (const sx of [-1, 1]) {
    b.box('#fef9c3', [0.25, 0.15, 0.04], [sx * 0.5, 0.8, 3.21]);
    b.box('#ef4444', [0.25, 0.15, 0.04], [sx * 0.5, 0.8, -3.21]);
  }
  b.box('#e5e7eb', [1.0, 0.25, 1.6], [0, 2.42, -0.5]);
  for (const z of [2.1, -1.9]) b.box('#111827', [1.52, 0.55, 1.0], [0, 0.7, z]);
  wheels(b, [2.1, -1.9], 0.69, 0.4);
  return b.build();
}

interface Vehicle {
  spec: number;
  z: number;
  dir: 1 | -1;
  offset: number;
  speed: number;
}

/** Chiều dài vòng lặp (m): xe chạy từ -60 tới 60 rồi quay lại đầu (ngoài tầm nhìn, trong sương). */
const ROAD_LOOP = 120;
const LANE_COUNT = 9;
/** Mỗi làn một tốc độ chung và khoảng cách đầu xe ~13 m (xe dài tối đa 6.4 m) nên xe cùng làn không chồng nhau. */
const LANES: readonly { z: number; dir: 1 | -1; speed: number; mix: readonly number[]; shift: number }[] = [
  { z: LANE_NEAR_Z, dir: 1, speed: 8, mix: [3, 0, 4, 1, 5, 2, 3, 0, 4], shift: 0 },
  { z: LANE_FAR_Z, dir: -1, speed: 6.5, mix: [2, 5, 1, 3, 0, 4, 2, 5, 1], shift: 6 },
];

/** Xe gom theo kiểu: mỗi kiểu là một InstancedMesh (1 draw call) dù có bao nhiêu xe. */
const BY_SPEC: readonly (readonly Vehicle[])[] = SPECS.map((_, s) =>
  LANES.flatMap((lane, li) =>
    lane.mix.flatMap((spec, i): Vehicle[] =>
      spec === s
        ? [{ spec, z: lane.z, dir: lane.dir, offset: i * (ROAD_LOOP / LANE_COUNT) + lane.shift + (rnd(i * 5 + li) - 0.5) * 3, speed: lane.speed }]
        : [],
    ),
  ),
);

function Traffic() {
  const geos = useMemo(() => SPECS.map((s) => (s.kind === 'truck' ? truckGeometry(s) : coachGeometry(s))), []);
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }), []);
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new Object3D(), []);

  /** Đặt mọi xe theo thời gian t (giây). Chỉ gán số vào object dùng lại, không cấp phát. */
  const place = (t: number): void => {
    for (let s = 0; s < BY_SPEC.length; s++) {
      const im = refs.current[s];
      const list = BY_SPEC[s];
      if (!im || !list) continue;
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (!v) continue;
        dummy.position.set(v.dir * ((v.offset + t * v.speed) % ROAD_LOOP - ROAD_LOOP / 2), Math.abs(Math.sin(t * 8 + i + s)) * 0.012, v.z);
        dummy.rotation.y = v.dir * HALF_PI;
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  };
  useLayoutEffect(() => {
    place(0);
  }, []);
  useFrame(({ clock }) => place(clock.elapsedTime));

  return (
    <group>
      {BY_SPEC.map((list, s) => (
        <instancedMesh
          key={s}
          ref={(el) => {
            refs.current[s] = el;
          }}
          args={[geos[s], mat, list.length]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

// ---------- Ghép cảnh ----------

/** Chi tiết Tết nhỏ theo miền: cờ đỏ sao vàng (Bắc, Trung) trên nóc quán, chùm bánh tét treo dưới mái (Trung, Nam). */
function festive(b: Batch, style: RegionStyle): void {
  if (style !== 'nam') {
    const [px, pz] = QUAN_POSTS[1]!;
    b.cyl('#d1d5db', 0.02, 0.02, 1.5, [px, 3.55, pz], ZERO, 5);
    b.box('#dc2626', [0.9, 0.6, 0.02], [px + 0.46, 3.95, pz]);
    b.cyl('#facc15', 0.14, 0.14, 0.025, [px + 0.46, 3.95, pz + 0.012], [HALF_PI, 0, 0], 5);
  }
  if (style !== 'bac') {
    for (let i = 0; i < 3; i++) {
      const x = COUNTER.x - 0.9 + i * 0.9;
      b.cyl('#facc15', 0.008, 0.008, 0.3, [x, roofUnderY(0.9) - 0.15, 0.9], ZERO, 3);
      for (let k = 0; k < 2; k++) {
        b.cyl('#16a34a', 0.06, 0.06, 0.3, [x, roofUnderY(0.9) - 0.4 - k * 0.12, 0.9], [0, 0, HALF_PI * 0.2 * (k ? 1 : -1)], 6);
      }
    }
  }
}

function buildStatic(style: RegionStyle): { solid: BufferGeometry; glow: BufferGeometry; lanterns: BufferGeometry } {
  const b = new Batch();
  const g = new Batch();
  scenery(b, style);
  highway(b, g);
  guardRail(b);
  stationSign(b, g);
  yard(b, style);
  quan(b, g, style);
  festive(b, style);
  TABLES.forEach((t, i) => {
    plasticTable(b, t.x, t.z, i % 2 ? '#2563eb' : '#dc2626', t.parasol);
    t.stools.forEach(([x, z], k) => stool(b, x, z, (i + k) % 2 ? '#2563eb' : '#dc2626'));
  });
  livestream(b, g);
  oldCar(b);
  saleSign(b);
  tireStack(b);
  drum(b);
  BIKES.forEach((k, i) => parkedBike(b, k.x, k.z, k.rotY, i ? '#2563eb' : '#dc2626'));
  LAMPS.forEach(([x, z], i) => yardLamp(b, g, x, z, i ? -1 : 1));
  BLOSSOMS.forEach((p, i) => blossomPot(b, style, p.x, p.z, p.scale, 5 + i * 17));
  kumquatPot(b, KUMQUAT.x, KUMQUAT.z, KUMQUAT.scale);
  juiceCart(b);
  parkedCoach(b, g, style);
  return { solid: b.build(), glow: g.build(), lanterns: lanternRow() };
}

/** Vị trí treo hàng đèn lồng: mép nam mái quán. */
const LANTERN_Z = ROOF.maxZ - 0.15;
const LANTERN_Y = roofUnderY(LANTERN_Z);

/** Hàng đèn lồng đỏ treo dưới diềm mái: hình dựng quanh điểm treo (y, z = 0) để đu đưa quanh trục x. */
function lanternRow(): BufferGeometry {
  const l = new Batch();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = ROOF.minX + 0.55 + i * ((ROOF.maxX - ROOF.minX - 1.1) / (n - 1));
    l.cyl('#facc15', 0.008, 0.008, 0.14, [x, -0.07, 0], ZERO, 3);
    l.cyl('#facc15', 0.06, 0.08, 0.04, [x, -0.16, 0], ZERO, 6);
    l.ico('#dc2626', 0.17, [x, -0.34, 0], [1, 1.2, 1], 1);
    l.cyl('#facc15', 0.012, 0.012, 0.16, [x, -0.56, 0], ZERO, 3);
  }
  return l.build();
}

/** Đèn lồng đu đưa nhẹ (cả hàng một mesh, quay quanh trục x tại điểm treo). Phát sáng, không cần ánh sáng. */
function Lanterns({ geometry }: Readonly<{ geometry: BufferGeometry }>) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (m) m.rotation.x = Math.sin(clock.elapsedTime * 1.3) * 0.1;
  });
  return (
    <mesh ref={ref} geometry={geometry} position={[0, LANTERN_Y, LANTERN_Z]}>
      <meshBasicMaterial vertexColors />
    </mesh>
  );
}

/** Đèn LIVE đỏ nhấp nháy trên điện thoại của chú Ba. */
function LiveDot() {
  const ref = useRef<Mesh>(null);
  const p = CHU_BA.tripod;
  useFrame(({ clock }) => {
    const m = ref.current;
    if (m) m.visible = Math.floor(clock.elapsedTime * 1.6) % 2 === 0;
  });
  return (
    <mesh ref={ref} position={[p.x + Math.sin(PHONE_YAW) * 0.02, PHONE_Y + 0.12, p.z + Math.cos(PHONE_YAW) * 0.02]}>
      <sphereGeometry args={[0.03, 6, 4]} />
      <Mat c="#ef4444" e={2} />
    </mesh>
  );
}

/** Trạm dừng chân trên quốc lộ: hình tĩnh gộp 2 draw call, 18 xe chạy gom 6 InstancedMesh (6 draw call), đèn lồng và đèn LIVE (2 draw call). */
export function TramDung({ regionId }: Readonly<{ regionId: string }>) {
  const style = styleOfRegion(regionId);
  const { solid, glow, lanterns } = useMemo(() => buildStatic(style), [style]);
  return (
    <group>
      <mesh geometry={solid}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <Lanterns geometry={lanterns} />
      <Traffic />
      <LiveDot />
    </group>
  );
}
