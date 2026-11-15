import {
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Bone,
} from 'three';
import { ANCHOR_BONE, type PropPart } from './outfit';
import { geometryOf } from './shapes';
import { sanitizeName } from './rigging';

/**
 * Dựng các khối của `outfit.ts` bằng three.js và gắn vào xương của một model đã clone (xem outfit.ts về khung toạ độ).
 *
 * Tư thế gốc của các model này đã có tay buông xuống (cẳng tay hướng xuống và hơi ra trước), nên khung `hang` cũng
 * song song với thế giới như khung `bind`, chỉ khác là toạ độ tính so với cổ tay.
 *
 * Xương của các model này có tỉ lệ thế giới 100 (cây xương nằm dưới node tỉ lệ 100, vị trí tính bằng mét), nên mỗi
 * nhóm khối nằm trong một `Group` bọc: tỉ lệ 1/100 để đơn vị trở về của file, và xoay ngược tư thế gốc của xương để
 * trục song song với thế giới. Đo lúc dựng từ ma trận thật nên không phụ thuộc trục riêng của từng model.
 */

function findBone(root: Object3D, name: string): Bone | undefined {
  const want = sanitizeName(name);
  let found: Bone | undefined;
  root.traverse((o) => {
    if (!found && (o as Bone).isBone && sanitizeName(o.name) === want) found = o as Bone;
  });
  return found;
}

/** Tay cầm điều khiển phụ kiện đã dựng: gắn / gỡ nhiều lần đều an toàn (React StrictMode chạy lại effect). */
export interface PropHandle {
  /** Gắn các nhóm vào xương (không làm gì nếu đã gắn). */
  mount: () => void;
  /** Tháo khỏi xương và giải phóng khối / vật liệu (three tự tạo lại tài nguyên GPU nếu gắn lại rồi vẽ tiếp). */
  unmount: () => void;
}

const NOOP_HANDLE: PropHandle = { mount: () => undefined, unmount: () => undefined };

/**
 * Dựng `parts` cho xương của `root` và gắn ngay (gọi `mount` sau đó để gắn lại). Phải gọi khi `root` chưa có cha hoặc
 * cha đang ở phép biến đổi đơn vị: ma trận thế giới của xương lúc đó được coi là so với `root`. Xương không tìm thấy thì
 * bỏ qua phần đó (không ném lỗi: model lạ vẫn chạy).
 */
export function attachProps(root: Object3D, parts: readonly PropPart[]): PropHandle {
  if (parts.length === 0) return NOOP_HANDLE;
  root.updateMatrixWorld(true);
  const disposables: { dispose: () => void }[] = [];
  const wrappers: { bone: Bone; group: Group }[] = [];
  const mats = new Map<string, Material>();
  const matOf = (c: string): Material => {
    let m = mats.get(c);
    if (!m) {
      m = new MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 });
      mats.set(c, m);
      disposables.push(m);
    }
    return m;
  };
  const pos = new Vector3();
  const quat = new Quaternion();
  const scl = new Vector3();

  for (const part of parts) {
    const bone = findBone(root, ANCHOR_BONE[part.anchor]);
    if (!bone) {
      console.warn(`Không tìm thấy xương ${ANCHOR_BONE[part.anchor]} để gắn phụ kiện.`);
      continue;
    }
    bone.matrixWorld.decompose(pos, quat, scl);
    const k = Math.abs(scl.x) > 1e-6 ? scl.x : 1;
    const group = new Group();
    group.scale.setScalar(1 / k);
    group.quaternion.copy(quat).invert();
    for (const sh of part.shapes) {
      const geo = geometryOf(sh);
      disposables.push(geo);
      const mesh = new Mesh(geo, matOf(sh.c));
      mesh.frustumCulled = false;
      if (part.frame === 'bind') mesh.position.set(sh.p[0] - pos.x, sh.p[1] - pos.y, sh.p[2] - pos.z);
      else mesh.position.set(sh.p[0], sh.p[1], sh.p[2]);
      if (sh.r) mesh.rotation.set(sh.r[0], sh.r[1], sh.r[2]);
      if (sh.k) mesh.scale.set(sh.k[0], sh.k[1], sh.k[2]);
      group.add(mesh);
    }
    wrappers.push({ bone, group });
  }

  const mount = (): void => {
    for (const { bone, group } of wrappers) if (group.parent !== bone) bone.add(group);
  };
  mount();
  return {
    mount,
    unmount: () => {
      for (const { bone, group } of wrappers) bone.remove(group);
      for (const d of disposables) d.dispose();
    },
  };
}
