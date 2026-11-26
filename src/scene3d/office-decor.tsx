import { useEffect, useMemo } from 'react';
import { MergedShapes } from './Merged';
import type { Shape } from './shapes';
import { skylineGeometry, skylineTowers } from './skyline';
import { TexMat } from './TexMat';

/** Cảnh nền của lớp học / văn phòng: nhà cao tầng nhiều lớp, tường có ô cửa sổ thật, phố bên ngoài cửa sổ. */

type V3 = [number, number, number];

/**
 * Một dãy toà nhà dọc trục x cục bộ (dựng phía sau và hai bên phòng): mỗi toà một cao độ, màu pha sương, mặt tiền có cửa sổ
 * sáng đèn. Cả dãy là MỘT mesh (skyline.ts), màu từng toà nằm trong màu đỉnh.
 */
export function Skyline({ position, rotY = 0, span, seed, haze, minH = 10, maxH = 26 }: Readonly<{ position: V3; rotY?: number; span: number; seed: number; haze: string; minH?: number; maxH?: number }>) {
  const geo = useMemo(() => skylineGeometry(skylineTowers(span, seed, haze, minH, maxH)), [span, seed, haze, minH, maxH]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={position} rotation={[0, rotY, 0]}>
      <TexMat kind="facade" base="#ffffff" vertexColors />
    </mesh>
  );
}

/** Phố bên ngoài cửa sổ tường trái: vỉa hè lát gạch, làn đường nhựa có vạch, bụi cây, cột đèn. Chỉ để nhìn. */
export function OutsideStreet({ x0 }: Readonly<{ x0: number }>) {
  // 10 vạch kẻ đường gộp một mesh.
  const laneMarks = useMemo(
    () => Array.from({ length: 10 }, (_, i): Shape => ({ g: 'plane', s: [0.12, 2.2], p: [x0 - 5.2, 0.02, -22 + i * 5.2], r: [-Math.PI / 2, 0, 0], c: '#f8fafc' })),
    [x0],
  );
  // x0 là mặt ngoài của tường (âm). Vỉa hè rộng 2.2 m, rồi lòng đường rộng 6 m.
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x0 - 1.1, 0.012, 3]}>
        <planeGeometry args={[2.2, 60]} />
        <TexMat kind="pavers" base="#cbc5bb" rx={2} ry={24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x0 - 5.2, 0.012, 3]}>
        <planeGeometry args={[6, 60]} />
        <TexMat kind="asphalt" base="#3b4252" rx={3} ry={24} rough={0.95} />
      </mesh>
      <MergedShapes solid={laneMarks} />
    </group>
  );
}
