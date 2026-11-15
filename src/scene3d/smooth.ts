import type { Mesh, Object3D } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Làm mượt hình khối nhân vật: model low-poly có pháp tuyến phẳng từng mặt nên nhìn góc cạnh. Pháp tuyến "creased" làm
 * mượt các cạnh thoải hơn góc này và giữ nguyên các góc nhọn (cổ tay áo, mép giày), nên vẫn đúng phong cách low-poly.
 */
export const CREASE_ANGLE = (50 * Math.PI) / 180;

/**
 * Thay hình khối của mọi mesh trong `root` bằng bản có pháp tuyến mượt. Chạy một lần cho mỗi hình khối (đánh dấu trong
 * userData), nên gọi lại hoặc dùng chung `gltf.scene` giữa nhiều nhân vật đều an toàn. Giữ nguyên vị trí đỉnh và dữ liệu
 * xương (skinIndex, skinWeight), chỉ thay pháp tuyến và bỏ chỉ số đỉnh (mỗi đỉnh có pháp tuyến riêng).
 */
export function smoothOnce(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || m.geometry.userData.smoothed === true) return;
    const g = toCreasedNormals(m.geometry, CREASE_ANGLE);
    g.userData.smoothed = true;
    m.geometry = g;
  });
}
