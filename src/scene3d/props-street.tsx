import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { Lantern } from './props';
import { mergeShapes } from './shapes';
import { buntingShapes, busStopShapes, crosswalkShapes, stallShapes } from './streetShapes';

/** Đạo cụ phố Tết (sạp quà, trạm xe buýt). Hình học khớp vùng đi lại PHO_TET trong walk.ts. */

type V3 = [number, number, number];

/** Hình gộp của sạp và trạm, dựng một lần dùng chung. */
const decoGeo = new Map<string, { solid: BufferGeometry; lit: BufferGeometry }>();
function decoGeometry(name: 'stall' | 'bus'): { solid: BufferGeometry; lit: BufferGeometry } {
  let g = decoGeo.get(name);
  if (!g) {
    const s = name === 'stall' ? stallShapes() : busStopShapes();
    g = { solid: mergeShapes(s.solid), lit: mergeShapes(s.lit) };
    decoGeo.set(name, g);
  }
  return g;
}

function MergedDeco({ name }: Readonly<{ name: 'stall' | 'bus' }>) {
  const g = useMemo(() => decoGeometry(name), [name]);
  return (
    <>
      <mesh geometry={g.solid}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} />
      </mesh>
      <mesh geometry={g.lit}>
        <meshBasicMaterial vertexColors />
      </mesh>
    </>
  );
}

/**
 * Sạp quà Tết sát nhà phố: quầy đỏ, mái che, giỏ quà, bao lì xì, biển, hai đèn lồng. Thân gộp 2 mesh (stallShapes). Vùng chiếm:
 * hộp rộng 2.6 x sâu 0.8 tại `position` (walk.ts PHO_TET.stall: hw 1.3, hd 0.4).
 */
export function GiftStall({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position}>
      <MergedDeco name="stall" />
      <Lantern position={[-1.25, 2.3, 0.7]} />
      <Lantern position={[1.25, 2.3, 0.7]} />
    </group>
  );
}

/**
 * Trạm chờ ở cuối phố: mái che, ghế chờ, cột biển. Vùng chiếm: ghế (walk.ts 'ghe-ben') và hai trụ. `position` là tâm ghế
 * chờ trên vỉa hè. Thân gộp 2 mesh (busStopShapes), cộng tấm lưng kính trong suốt.
 */
export function BusStop({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position}>
      <MergedDeco name="bus" />
      <mesh position={[0, 1.4, 0.55]}>
        <boxGeometry args={[2.2, 1.6, 0.05]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.45} flatShading />
      </mesh>
    </group>
  );
}

// ---------- Chi tiết đường phố (chỉ để nhìn, không có va chạm) ----------

export { AWNING, awningLowestY } from './houseShapes';

/**
 * Xe máy đậu sát lề đường bên kia đường (vỉa hè nam, người chơi không tới được): (x, z). Không đậu ở lề phía bắc vì
 * người chơi đi sát tới z = -1.7 với bán kính 0.35 nên thân sẽ chui vào xe. Đậu song song với lề (dài ~0.9 m theo trục x)
 * nên các xe cách nhau từ 1.05 m; cách làn xe gần nhất (z = 1.3) đủ xa và tránh cột đèn ở z = 2.7.
 */
export const PARKED_BIKES: readonly (readonly [number, number])[] = [
  [-6.4, 3.0],
  [-5.1, 3.0],
  [-0.4, 3.0],
  [5.6, 3.0],
  [6.9, 3.0],
  [11.5, 3.0],
];
/** Làn xe chạy gần lề nam nhất và các cột đèn bên kia đường (x), để test canh khoảng cách. */
export const FAR_LANE_Z = 1.3;
export const STREET_LAMP_XS = [-9, -3, 3, 9] as const;

/** Dây cờ Tết căng ngang đường, từ (x, y0, z0) tới (x, y1, z1). Treo cao nên không chắn tầm nhìn. Một mesh (streetShapes.ts). */
export function Bunting({ x, y0, y1, z0, z1, flags = 10 }: Readonly<{ x: number; y0: number; y1: number; z0: number; z1: number; flags?: number }>) {
  const geo = useMemo(() => mergeShapes(buntingShapes({ x, y0, y1, z0, z1, flags })), [x, y0, y1, z0, z1, flags]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading roughness={0.85} />
    </mesh>
  );
}

/** Vạch qua đường (các vạch song song với trục z, nằm trên lòng đường z -1.8..2.2). Một mesh. */
export function Crosswalk({ x }: Readonly<{ x: number }>) {
  const geo = useMemo(() => mergeShapes(crosswalkShapes(x)), [x]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading roughness={0.85} />
    </mesh>
  );
}
