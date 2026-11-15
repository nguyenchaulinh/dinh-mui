import { readFileSync } from 'node:fs';
import { type SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { HAIR_STYLES, hairShapes } from './hair';
import { builtinOf, fitOf } from './outfit';
import { CHARACTER_MODELS } from './rigging';
import { mergeShapes } from './shapes';

const dir = new URL('../../public/models/', import.meta.url);
const WITH_HAIR = CHARACTER_MODELS.filter((m) => m !== 'cho-pom' && !builtinOf(m).has('hat'));

/** Đỉnh của mesh nhân vật ở tư thế gốc, kèm mặt trước của khuôn mặt tại độ cao mắt. */
async function headData(model: string) {
  const buf = readFileSync(new URL(`${model}.glb`, dir));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  const root = clone(gltf.scene);
  root.updateMatrixWorld(true);
  const v = new Vector3();
  const pts: number[][] = [];
  root.traverse((o) => {
    const sm = o as SkinnedMesh;
    if (!sm.isSkinnedMesh) return;
    const pos = sm.geometry.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(sm.matrixWorld);
      pts.push([v.x, v.y, v.z]);
    }
  });
  return pts;
}

describe('tóc riêng trên đầu thật của model', () => {
  it.each(WITH_HAIR)('%s: ở độ cao mắt, tóc nằm sau mặt phẳng khuôn mặt (không che mắt, mũi)', async (model) => {
    const f = fitOf(model);
    const eyeY = f.hy0 + 0.66 * (f.hy1 - f.hy0);
    const pts = await headData(model);
    const band = pts.filter((p) => p[1]! > eyeY - 0.03 && p[1]! < eyeY + 0.03 && Math.abs(p[0]!) < 0.05);
    const face = Math.max(...band.map((p) => p[2]!));
    for (const style of HAIR_STYLES.filter((s) => s !== 'bald')) {
      const g = mergeShapes(hairShapes(style, f));
      const pos = g.attributes.position!;
      let front = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - eyeY) < 0.03 && Math.abs(pos.getX(i)) < 0.05) front = Math.max(front, pos.getZ(i));
      }
      expect(front, `${model}/${style}: tóc ở độ cao mắt tới z = ${front.toFixed(3)}, mặt ở z = ${face.toFixed(3)}`).toBeLessThan(face - 0.01);
    }
  });

  it.each(WITH_HAIR)('%s: mũ tóc bao được đỉnh đầu thật (mọi đỉnh đầu ở trên mắt nằm trong hoặc sát mũ tóc theo chiều ngang)', async (model) => {
    const f = fitOf(model);
    const pts = await headData(model);
    const top = pts.filter((p) => p[1]! > f.hy1 - 0.02 && p[2]! > f.hzb - 0.05 && p[2]! < f.hzf);
    expect(top.length).toBeGreaterThan(5);
    const cap = mergeShapes(hairShapes('short', f));
    cap.computeBoundingBox();
    const b = cap.boundingBox!;
    for (const p of top) {
      expect(p[0]!, model).toBeGreaterThanOrEqual(b.min.x - 0.02);
      expect(p[0]!, model).toBeLessThanOrEqual(b.max.x + 0.02);
    }
  });
});
