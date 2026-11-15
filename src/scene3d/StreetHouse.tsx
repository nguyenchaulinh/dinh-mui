import { useMemo } from 'react';
import { BoxGeometry, DoubleSide, type BufferGeometry } from 'three';
import type { DecorLine } from './decorText';
import { houseShapes, type HouseParams } from './houseShapes';
import { TextPlane } from './TextPlane';
import { bakeHeightAO, mergeShapes } from './shapes';
import { TexMat } from './TexMat';

/**
 * Nhà phố một mặt tiền: thân tường (texture trát), cửa cuốn (texture gân), phần chi tiết đặc gộp một mesh, phần phát sáng
 * gộp một mesh: tổng 4 draw call mỗi nhà. Hình dựng ở `houseShapes.ts`. `far` quay mặt tiền về phía -z (nhà bên kia đường).
 */

/** AO nướng sẵn: chân nhà tối còn 70%, sáng dần tới hết ở độ cao 2.4 m (chân tường bẩn, khuất sáng). */
export const HOUSE_AO = { y0: 0, y1: 2.4, min: 0.7 } as const;

const cache = new Map<string, { solid: BufferGeometry; lit: BufferGeometry; body: BufferGeometry }>();

function geometriesOf(p: HouseParams): { solid: BufferGeometry; lit: BufferGeometry; body: BufferGeometry } {
  const key = JSON.stringify([p.w, p.h, p.c, p.sign ?? null, p.flag ?? false, p.variant, p.shop, p.far ?? false]);
  let g = cache.get(key);
  if (!g) {
    const s = houseShapes(p);
    const solid = mergeShapes(s.solid);
    bakeHeightAO(solid, HOUSE_AO.y0, HOUSE_AO.y1, HOUSE_AO.min);
    const body = new BoxGeometry(p.w, p.h, 4); // tâm ở giữa: y cục bộ + h/2 là độ cao so với chân nhà
    bakeHeightAO(body, HOUSE_AO.y0, HOUSE_AO.y1, HOUSE_AO.min, p.h / 2);
    g = { solid, lit: mergeShapes(s.lit), body };
    cache.set(key, g);
  }
  return g;
}

export function StreetHouse({ position, signLines, ...p }: Readonly<HouseParams & { position: [number, number, number]; /** Chữ trên biển hiệu (tên cửa hàng); cần `sign` để có biển. */ signLines?: readonly DecorLine[] }>) {
  const { w, h, c, far = false } = p;
  const geo = useMemo(() => geometriesOf(p), [p.w, p.h, p.c, p.sign, p.flag, p.variant, p.shop, p.far]); // eslint-disable-line react-hooks/exhaustive-deps
  const rx = Math.max(1, Math.round(w / 2));
  return (
    <group position={position} rotation={[0, far ? Math.PI : 0, 0]}>
      <mesh position={[0, h / 2, 0]} geometry={geo.body}>
        <TexMat kind="plaster" base={c} rx={rx} ry={Math.max(1, Math.round(h / 2))} vertexColors />
      </mesh>
      <mesh position={[0, 0.8, 2.01]}>
        <planeGeometry args={[w * 0.8, 1.5]} />
        <TexMat kind="shutter" base="#9ca3af" rx={Math.max(1, Math.round(w * 0.8))} ry={1} />
      </mesh>
      <mesh geometry={geo.solid}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} side={DoubleSide} />
      </mesh>
      <mesh geometry={geo.lit}>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      {p.sign && signLines && <TextPlane w={w * 0.86} h={0.29} lines={signLines} position={[0, 1.75, 2.125]} />}
    </group>
  );
}
