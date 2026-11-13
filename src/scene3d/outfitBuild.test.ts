import { readFileSync } from 'node:fs';
import { AnimationMixer, type Mesh, type Object3D, Quaternion, type SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { ACCESSORIES } from '../engine/types';
import { builtinOf, fitOf, propsFor } from './outfit';
import { attachProps } from './outfitBuild';
import { CHARACTER_MODELS } from './rigging';

const dir = new URL('../../public/models/', import.meta.url);
const HUMANS = CHARACTER_MODELS.filter((m) => m !== 'cho-pom');
const ALL = ACCESSORIES.filter((a) => a !== 'none');

async function load(model: string) {
  const buf = readFileSync(new URL(`${model}.glb`, dir));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  return { root: clone(gltf.scene), animations: gltf.animations };
}

/** Các khối phụ kiện (mesh không có xương) trong cây. */
function propMeshes(root: Object3D): Mesh[] {
  const out: Mesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && !(m as { isSkinnedMesh?: boolean }).isSkinnedMesh) out.push(m);
  });
  return out;
}

describe('phụ kiện gắn vào xương (model thật)', () => {
  it.each(HUMANS)('%s: ở tư thế gốc mọi khối nằm đúng toạ độ đã thiết kế (khung bind)', async (model) => {
    const { root } = await load(model);
    const parts = propsFor(ALL, fitOf(model));
    const handle = attachProps(root, parts);
    root.updateMatrixWorld(true);
    const world = propMeshes(root).map((m) => m.getWorldPosition(new Vector3()));
    const expected = parts.filter((p) => p.frame === 'bind').flatMap((p) => p.shapes.map((s) => new Vector3(...s.p)));
    expect(world.length).toBe(parts.reduce((n, p) => n + p.shapes.length, 0));
    for (const e of expected) {
      const near = Math.min(...world.map((w) => w.distanceTo(e)));
      expect(near, `${model}: khối ${e.toArray().join(',')} lệch ${near}`).toBeLessThan(2e-3);
    }
    handle.unmount();
    expect(propMeshes(root).length).toBe(0);
  });

  it.each(HUMANS)('%s: gắn / gỡ / gắn lại (StrictMode) không mất phụ kiện', async (model) => {
    const { root } = await load(model);
    const handle = attachProps(root, propsFor(['glasses', 'backpack', 'cup'], fitOf(model)));
    const n = propMeshes(root).length;
    expect(n).toBeGreaterThan(0);
    handle.unmount();
    expect(propMeshes(root).length).toBe(0);
    handle.mount();
    handle.mount(); // gắn hai lần không nhân đôi
    expect(propMeshes(root).length).toBe(n);
  });

  it.each(HUMANS)('%s: đang đi bộ, ly / điện thoại cầm tay vẫn thẳng đứng và kính ở phía trước mặt', async (model) => {
    const { root, animations } = await load(model);
    const fit = fitOf(model);
    const parts = propsFor(['cup', 'phone', 'glasses'], fit);
    attachProps(root, parts);
    const mixer = new AnimationMixer(root);
    const walk = animations.find((a) => a.name === 'Walk')!;
    expect(walk).toBeDefined();
    mixer.clipAction(walk).play();
    const up = new Vector3();
    const q = new Quaternion();
    const hand = propMeshes(root).filter((m) => m.parent && m.parent.parent && (m.parent.parent as { name: string }).name === 'WristR');
    expect(hand.length).toBeGreaterThan(0);
    for (let t = 0; t < 12; t++) {
      mixer.update(0.1);
      root.updateMatrixWorld(true);
      for (const m of hand) {
        m.getWorldQuaternion(q);
        up.set(0, 1, 0).applyQuaternion(q);
        expect(up.y, `${model} t=${t}: ${m.geometry.type} nằm ngang (up.y=${up.y.toFixed(2)})`).toBeGreaterThan(0.45); // tay đung đưa tối đa ~55° khi đi
      }
    }
    // Kính: ở phía +z của đầu (mặt quay +z) và cao hơn đáy đầu.
    const headY = fit.hy0;
    for (const m of propMeshes(root).filter((x) => x.geometry.type === 'TorusGeometry')) {
      const w = m.getWorldPosition(new Vector3());
      expect(w.z, `${model}: kính không ở phía trước mặt`).toBeGreaterThan(fit.hzf - 0.2);
      expect(w.y).toBeGreaterThan(headY);
    }
  });

  it('bỏ qua phụ kiện trùng với đồ có sẵn trong mesh (mũ của thợ / nông dân, cà vạt của vest)', () => {
    expect(propsFor(['hat', 'helmet', 'glasses'], fitOf('nam-tho'), undefined, builtinOf('nam-tho')).flatMap((p) => p.shapes).length).toBe(
      propsFor(['glasses'], fitOf('nam-tho')).flatMap((p) => p.shapes).length,
    );
    expect(propsFor(['tie'], fitOf('nam-vest'), undefined, builtinOf('nam-vest'))).toEqual([]);
    expect(propsFor(['tie'], fitOf('nam-hoodie'), undefined, builtinOf('nam-hoodie')).length).toBe(1);
  });

  it.each(HUMANS)('%s: số đo FIT khớp mesh thật (ngực, lưng, đỉnh đầu, mặt) trong sai số 3 cm', async (model) => {
    const { root } = await load(model);
    root.updateMatrixWorld(true);
    const f = fitOf(model);
    const pts: number[][] = [];
    const v = new Vector3();
    root.traverse((o) => {
      const sm = o as SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const pos = sm.geometry.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(sm.matrixWorld);
        pts.push([v.x, v.y, v.z]);
      }
    });
    const pick = (fn: (p: number[]) => boolean) => pts.filter(fn);
    const chestFront = Math.max(...pick((p) => p[1]! > f.ty1 - 0.3 && p[1]! < f.ty1 - 0.1 && Math.abs(p[0]!) < 0.1).map((p) => p[2]!));
    const back = Math.min(...pick((p) => p[1]! > f.ty1 - 0.45 && p[1]! < f.ty1 - 0.1 && Math.abs(p[0]!) < 0.1).map((p) => p[2]!));
    const top = Math.max(...pts.map((p) => p[1]!));
    expect(Math.abs(chestFront - f.tzf), `${model} ngực ${chestFront.toFixed(2)}`).toBeLessThan(0.03);
    expect(Math.abs(back - f.tzb), `${model} lưng ${back.toFixed(2)}`).toBeLessThan(0.03);
    expect(Math.abs(top - f.hy1), `${model} đỉnh đầu ${top.toFixed(2)}`).toBeLessThan(0.03);
    if (!builtinOf(model).has('hat')) {
      const eyeY = f.hy0 + 0.66 * (f.hy1 - f.hy0);
      const face = Math.max(...pick((p) => p[1]! > eyeY - 0.03 && p[1]! < eyeY + 0.03 && Math.abs(p[0]!) < 0.06).map((p) => p[2]!));
      expect(Math.abs(face - f.hzf), `${model} mặt ${face.toFixed(2)}`).toBeLessThan(0.03);
    }
  });
});
