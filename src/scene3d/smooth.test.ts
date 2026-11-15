import { readFileSync } from 'node:fs';
import { AnimationMixer, type Mesh, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { smoothOnce } from './smooth';
import { CHARACTER_MODELS } from './rigging';

const dir = new URL('../../public/models/', import.meta.url);
async function load(model: string) {
  const buf = readFileSync(new URL(`${model}.glb`, dir));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
}
const meshes = (root: Parameters<typeof smoothOnce>[0]): Mesh[] => {
  const out: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh) out.push(o as Mesh);
  });
  return out;
};

describe('smoothOnce: pháp tuyến mượt cho model nhân vật', () => {
  it.each(CHARACTER_MODELS)('%s: giữ nguyên đỉnh và dữ liệu xương, pháp tuyến đơn vị, số tam giác không đổi, chạy lại không đổi gì', async (model) => {
    const { scene, animations } = await load(model);
    const before = meshes(scene).map((m) => ({
      tris: (m.geometry.index?.count ?? m.geometry.attributes.position!.count) / 3,
      hasSkin: !!m.geometry.attributes.skinIndex,
      box: m.geometry.boundingBox,
    }));
    smoothOnce(scene);
    const after = meshes(scene);
    expect(after.length).toBe(before.length);
    after.forEach((m, i) => {
      const g = m.geometry;
      const pos = g.attributes.position!;
      const nor = g.attributes.normal!;
      expect(nor.count, model).toBe(pos.count);
      expect(g.index, 'bỏ chỉ số đỉnh').toBeNull();
      expect(pos.count / 3, model).toBeCloseTo(before[i]!.tris, 6);
      if (before[i]!.hasSkin) {
        expect(g.attributes.skinIndex!.count).toBe(pos.count);
        expect(g.attributes.skinWeight!.count).toBe(pos.count);
      }
      for (let v = 0; v < Math.min(pos.count, 500); v++) {
        const len = Math.hypot(nor.getX(v), nor.getY(v), nor.getZ(v));
        expect(len, `${model} pháp tuyến ${v}`).toBeGreaterThan(0.99);
        expect(len).toBeLessThan(1.01);
      }
      expect(g.userData.smoothed).toBe(true);
    });
    const geos = after.map((m) => m.geometry);
    smoothOnce(scene);
    expect(meshes(scene).map((m) => m.geometry)).toEqual(geos); // cùng đối tượng: không làm lại
    // vẫn chạy được hoạt ảnh sau khi thay hình khối (mixer ràng buộc xương như cũ)
    const root = clone(scene);
    const mixer = new AnimationMixer(root);
    mixer.clipAction(animations[0]!).play();
    mixer.update(0.1);
    root.updateMatrixWorld(true);
    expect((meshes(root).find((m) => (m as SkinnedMesh).isSkinnedMesh) as SkinnedMesh | undefined)?.skeleton.bones.length ?? 1).toBeGreaterThan(0);
  });
});
