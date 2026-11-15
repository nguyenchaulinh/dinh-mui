import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Color,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Khối low-poly mô tả bằng dữ liệu, và hàm GỘP nhiều khối thành MỘT geometry có màu theo đỉnh (một draw call thay vì
 * hàng chục). Dùng cho nhà phố, xe máy, hoa Tết, dây cờ: những thứ có nhiều chi tiết nhỏ mà không đổi hình sau khi dựng.
 */

export type ShapeKind = 'box' | 'cyl' | 'sphere' | 'cone' | 'torus' | 'ico' | 'plane' | 'circle';

/**
 * Một khối. Tham số `s` theo loại:
 * box [rộng, cao, sâu]; cyl [bán kính trên, bán kính dưới, cao, số cạnh]; sphere [bán kính, số cạnh ngang, số cạnh dọc,
 * phiStart, phiLength, thetaStart, thetaLength] (từ bán kính trở đi có thể bỏ); cone [bán kính, cao, số cạnh];
 * torus [bán kính vòng, bán kính ống, số cạnh ống, số đoạn, cung]; ico [bán kính, mức chia]; plane [rộng, cao];
 * circle [bán kính, số cạnh].
 */
export interface Shape {
  g: ShapeKind;
  s: readonly number[];
  p: readonly [number, number, number];
  /** Góc xoay Euler XYZ (rad). */
  r?: readonly [number, number, number];
  /** Co giãn theo từng trục. */
  k?: readonly [number, number, number];
  /** Màu hex #rrggbb. */
  c: string;
  /** Nhóm bao ngoài (như `<group position rotation>` trong JSX): khối được đặt trong hệ toạ độ của nhóm này. */
  group?: { p?: readonly [number, number, number]; r?: readonly [number, number, number] };
}

export function geometryOf(sh: Shape): BufferGeometry {
  const s = sh.s;
  switch (sh.g) {
    case 'box':
      return new BoxGeometry(s[0], s[1], s[2]);
    case 'cyl':
      return new CylinderGeometry(s[0], s[1], s[2], s[3] ?? 8);
    case 'sphere':
      return new SphereGeometry(s[0], s[1] ?? 8, s[2] ?? 6, s[3], s[4], s[5], s[6]);
    case 'cone':
      return new ConeGeometry(s[0], s[1], s[2] ?? 8);
    case 'torus':
      return new TorusGeometry(s[0], s[1], s[2] ?? 6, s[3] ?? 12, s[4]);
    case 'ico':
      return new IcosahedronGeometry(s[0], s[1] ?? 0);
    case 'plane':
      return new PlaneGeometry(s[0], s[1]);
    case 'circle':
      return new CircleGeometry(s[0], s[1] ?? 8);
  }
}

/**
 * AO nướng sẵn theo độ cao: nhân màu đỉnh với hệ số tăng tuyến tính từ `min` ở y = `y0` tới 1 ở y = `y1` (tối ở chân, sáng
 * ở trên), như chân tường bẩn và khuất sáng. Sửa tại chỗ, tạo thuộc tính `color` (trắng) nếu chưa có; `dy` cộng vào y của
 * đỉnh trước khi tính (hình có gốc không ở chân). Không tốn thêm draw call. Đầu vào hỏng thì không làm gì.
 */
export function bakeHeightAO(g: BufferGeometry, y0: number, y1: number, min: number, dy = 0): void {
  const pos = g.attributes.position;
  if (!pos || !(y1 > y0) || !Number.isFinite(min)) return;
  const floor = Math.min(1, Math.max(0, min));
  let col = g.attributes.color;
  if (!col) {
    col = new BufferAttribute(new Float32Array(pos.count * 3).fill(1), 3);
    g.setAttribute('color', col);
  }
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) + dy - y0) / (y1 - y0)));
    const f = floor + (1 - floor) * t;
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
  }
  col.needsUpdate = true;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Gộp các khối thành một geometry không chỉ số, có thuộc tính `color` (tuyến tính, như `material.color`). Dùng với vật liệu
 * `vertexColors`. Màu hỏng thành xám trung tính (không ném lỗi). Danh sách rỗng trả geometry rỗng.
 */
export function mergeShapes(shapes: readonly Shape[]): BufferGeometry {
  if (shapes.length === 0) return new BufferGeometry();
  const parts: BufferGeometry[] = [];
  const m = new Matrix4();
  const mg = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const pos = new Vector3();
  const sc = new Vector3();
  const col = new Color();
  for (const sh of shapes) {
    let g = geometryOf(sh);
    if (g.index) {
      const ni = g.toNonIndexed();
      g.dispose();
      g = ni;
    }
    g.deleteAttribute('uv');
    e.set(sh.r?.[0] ?? 0, sh.r?.[1] ?? 0, sh.r?.[2] ?? 0);
    q.setFromEuler(e);
    pos.set(sh.p[0], sh.p[1], sh.p[2]);
    sc.set(sh.k?.[0] ?? 1, sh.k?.[1] ?? 1, sh.k?.[2] ?? 1);
    m.compose(pos, q, sc);
    if (sh.group) {
      e.set(sh.group.r?.[0] ?? 0, sh.group.r?.[1] ?? 0, sh.group.r?.[2] ?? 0);
      q.setFromEuler(e);
      pos.set(sh.group.p?.[0] ?? 0, sh.group.p?.[1] ?? 0, sh.group.p?.[2] ?? 0);
      mg.compose(pos, q, sc.set(1, 1, 1));
      m.premultiply(mg);
    }
    g.applyMatrix4(m);
    col.set(HEX.test(sh.c) ? sh.c : '#808080');
    const n = g.attributes.position!.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new BufferAttribute(arr, 3));
    parts.push(g);
  }
  const out = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  if (!out) throw new Error('mergeShapes: các khối không cùng thuộc tính, không gộp được');
  return out;
}
