import { readFileSync } from 'node:fs';
import { type SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { hairShapes } from './hair';
import { builtinOf, fitOf } from './outfit';
import { CHARACTER_MODELS } from './rigging';
import { mergeShapes } from './shapes';

const dir = new URL('../../public/models/', import.meta.url);
const WITH_HAIR = CHARACTER_MODELS.filter((m) => m !== 'cho-pom' && !builtinOf(m).has('hat'));

type P3 = [number, number, number];
interface HeadPoints {
  skin: P3[];
  eye: P3[];
  all: P3[];
}

/** Đỉnh của phần đầu ở tư thế gốc, tách theo vật liệu: da, mắt (Eye hoặc Brown của hai model nữ), và tất cả. */
async function headPoints(model: string): Promise<HeadPoints> {
  const buf = readFileSync(new URL(`${model}.glb`, dir));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  const root = clone(gltf.scene);
  root.updateMatrixWorld(true);
  const v = new Vector3();
  const out: HeadPoints = { skin: [], eye: [], all: [] };
  root.traverse((o) => {
    const sm = o as SkinnedMesh;
    if (!sm.isSkinnedMesh || !/head/i.test(`${sm.name}/${sm.parent?.name ?? ''}`)) return;
    const mat = ((sm.material as { name?: string }).name ?? '').toLowerCase();
    const pos = sm.geometry.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(sm.matrixWorld);
      const p: P3 = [v.x, v.y, v.z];
      out.all.push(p);
      if (/skin/.test(mat)) out.skin.push(p);
      if (/^eye$|^brown$/.test(mat)) out.eye.push(p);
    }
  });
  return out;
}

describe('số đo sọ và mắt trong Fit khớp phần da và mắt của mesh thật', () => {
  it.each(WITH_HAIR)('%s: đỉnh sọ, bề ngang, mặt sau, mặt trước, độ cao mắt trong sai số 1.5 cm', async (model) => {
    const f = fitOf(model);
    const { skin, eye } = await headPoints(model);
    const head = skin.filter((p) => p[1] > f.sTop - 0.12); // bỏ cổ
    const max = (a: number[]) => Math.max(...a);
    const min = (a: number[]) => Math.min(...a);
    expect(Math.abs(max(head.map((p) => p[1])) - f.sTop), `${model} đỉnh sọ`).toBeLessThan(0.015);
    expect(Math.abs(max(head.map((p) => Math.abs(p[0]))) - f.sHW), `${model} nửa bề ngang`).toBeLessThan(0.015);
    expect(Math.abs(min(head.map((p) => p[2])) - f.sZb), `${model} sau`).toBeLessThan(0.015);
    expect(Math.abs(max(head.map((p) => p[2])) - f.sZf), `${model} trước`).toBeLessThan(0.015);
    const eyeMid = (min(eye.map((p) => p[1])) + max(eye.map((p) => p[1]))) / 2;
    expect(Math.abs(eyeMid - f.eyeY), `${model} mắt ${eyeMid.toFixed(3)}`).toBeLessThan(0.015);
  });
});

describe('búi tóc trên đầu thật của model', () => {
  it.each(WITH_HAIR)('%s: búi nằm sau mặt phẳng khuôn mặt ở độ cao mắt và chạm tóc gốc', async (model) => {
    const f = fitOf(model);
    const pts = await headPoints(model);
    const band = pts.all.filter((p) => p[1] > f.eyeY - 0.03 && p[1] < f.eyeY + 0.03 && Math.abs(p[0]) < 0.05);
    const face = Math.max(...band.map((p) => p[2]));
    const g = mergeShapes(hairShapes('bun', f));
    const pos = g.attributes.position!;
    let front = -Infinity;
    let lo = Infinity;
    for (let i = 0; i < pos.count; i++) {
      front = Math.max(front, pos.getZ(i));
      lo = Math.min(lo, pos.getY(i));
    }
    expect(front, `${model}: búi tới z = ${front.toFixed(3)}, mặt ở z = ${face.toFixed(3)}`).toBeLessThan(face);
    // Đáy búi phải thấp hơn đỉnh sọ, tức chìm vào tóc chứ không lơ lửng phía trên.
    expect(lo, `${model}: búi lơ lửng`).toBeLessThan(f.sTop);
  });
});
