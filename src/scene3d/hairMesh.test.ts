import { readFileSync } from 'node:fs';
import { type SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { describe, expect, it } from 'vitest';
import { HAIR_STYLES, hairShapes, hairShell } from './hair';
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

describe('tóc riêng trên đầu thật của model', () => {
  it.each(WITH_HAIR)('%s: tóc ôm sát sọ: mũ trên cách đỉnh sọ không quá 5 cm và không lọt vào trong sọ', async (model) => {
    const f = fitOf(model);
    const h = hairShell(f);
    const { skin } = await headPoints(model);
    const top = Math.max(...skin.filter((p) => p[1] > f.sTop - 0.12).map((p) => p[1]));
    expect(h.cy + h.ry, 'đỉnh mũ tóc = min(đỉnh tóc gốc, đỉnh sọ + 4 cm)').toBeCloseTo(Math.min(f.hy1, f.sTop + 0.04), 6);
    expect(f.hy1 - (h.cy + h.ry), `${model}: nón đặt theo hy1 lệch so với tóc`).toBeLessThan(0.02);
    expect(h.cy + h.ry - top, `${model}: tóc dày trên đỉnh sọ`).toBeLessThan(0.05);
    expect(h.cy + h.ry - top).toBeGreaterThan(0.005);
    // Đỉnh sọ phải nằm trong ellipsoid của tóc (không xuyên ra ngoài tóc).
    const inside = skin
      .filter((p) => p[1] > f.sTop - 0.03)
      .every((p) => ((p[0] / h.rx) ** 2 + ((p[1] - h.cy) / h.ry) ** 2 + ((p[2] - h.cz) / h.rz) ** 2) < 1.02);
    expect(inside, `${model}: sọ lòi ra ngoài tóc`).toBe(true);
  });

  it.each(WITH_HAIR)('%s: đường chân tóc ở trên lông mày, và tóc nằm sau mặt phẳng khuôn mặt ở độ cao mắt', async (model) => {
    const f = fitOf(model);
    const pts = await headPoints(model);
    const band = pts.all.filter((p) => p[1] > f.eyeY - 0.03 && p[1] < f.eyeY + 0.03 && Math.abs(p[0]) < 0.05);
    const face = Math.max(...band.map((p) => p[2]));
    const h = hairShell(f);
    // Mép dưới mũ trên ở phía mặt (z lớn nhất) phải cao hơn đỉnh lông mày.
    const rimY = h.cy + h.ry * Math.cos(h.thetaTop);
    expect(rimY, `${model}: chân tóc ${rimY.toFixed(3)} so với lông mày ${f.browTop}`).toBeGreaterThan(f.browTop + 0.015);
    for (const style of HAIR_STYLES.filter((s) => s !== 'bald')) {
      const g = mergeShapes(hairShapes(style, f));
      const pos = g.attributes.position!;
      let front = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - f.eyeY) < 0.03 && Math.abs(pos.getX(i)) < 0.08) front = Math.max(front, pos.getZ(i));
      }
      expect(front, `${model}/${style}: tóc ở độ cao mắt tới z = ${front.toFixed(3)}, mặt ở z = ${face.toFixed(3)}`).toBeLessThan(face);
    }
  });

  it.each(WITH_HAIR)('%s: tóc sau và hai bên che tới ngang mắt nhưng không thấp hơn mắt', (model) => {
    const f = fitOf(model);
    const h = hairShell(f);
    const rimBack = h.cy + h.ry * Math.cos(h.thetaBack);
    expect(rimBack).toBeCloseTo(f.eyeY, 3);
    expect(rimBack).toBeLessThan(h.cy + h.ry * Math.cos(h.thetaTop));
  });
});
