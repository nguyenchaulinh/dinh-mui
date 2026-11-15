import { useMemo } from 'react';
import { DoubleSide, type BufferGeometry } from 'three';
import { houseShapes, type HouseParams } from './houseShapes';
import { mergeShapes } from './shapes';
import { TexMat } from './TexMat';

/**
 * Nhà phố một mặt tiền: thân tường (texture trát), cửa cuốn (texture gân), phần chi tiết đặc gộp một mesh, phần phát sáng
 * gộp một mesh: tổng 4 draw call mỗi nhà. Hình dựng ở `houseShapes.ts`. `far` quay mặt tiền về phía -z (nhà bên kia đường).
 */

const cache = new Map<string, { solid: BufferGeometry; lit: BufferGeometry }>();

function geometriesOf(p: HouseParams): { solid: BufferGeometry; lit: BufferGeometry } {
  const key = JSON.stringify([p.w, p.h, p.c, p.sign ?? null, p.flag ?? false, p.variant, p.shop, p.far ?? false]);
  let g = cache.get(key);
  if (!g) {
    const s = houseShapes(p);
    g = { solid: mergeShapes(s.solid), lit: mergeShapes(s.lit) };
    cache.set(key, g);
  }
  return g;
}

export function StreetHouse({ position, ...p }: Readonly<HouseParams & { position: [number, number, number] }>) {
  const { w, h, c, far = false } = p;
  const geo = useMemo(() => geometriesOf(p), [p.w, p.h, p.c, p.sign, p.flag, p.variant, p.shop, p.far]); // eslint-disable-line react-hooks/exhaustive-deps
  const rx = Math.max(1, Math.round(w / 2));
  return (
    <group position={position} rotation={[0, far ? Math.PI : 0, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 4]} />
        <TexMat kind="plaster" base={c} rx={rx} ry={Math.max(1, Math.round(h / 2))} />
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
    </group>
  );
}
