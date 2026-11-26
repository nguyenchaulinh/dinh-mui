import { useEffect, useMemo } from 'react';
import { bakeHeightAO, mergeShapes, type Shape } from './shapes';

/** Mảng rỗng dùng chung làm mặc định: mặc định `= []` tạo mảng mới mỗi lần render và làm useMemo dựng lại hình. */
const NONE: readonly Shape[] = [];

/**
 * Vẽ các khối tĩnh đã gộp: một mesh đặc (chịu sáng), một mesh phát sáng (không chịu sáng) và một mesh kính trong suốt, thay
 * cho hàng chục `<mesh>`. `ao` làm tối chân (AO nướng sẵn vào màu đỉnh, không tốn draw call).
 */
export function MergedShapes({ solid, lit = NONE, glass = NONE, ao }: Readonly<{ solid: readonly Shape[]; lit?: readonly Shape[]; glass?: readonly Shape[]; ao?: { y1: number; min: number } }>) {
  const g = useMemo(() => {
    const s = mergeShapes(solid);
    if (ao) bakeHeightAO(s, 0, ao.y1, ao.min);
    return { solid: s, lit: mergeShapes(lit), glass: mergeShapes(glass) };
  }, [solid, lit, glass, ao]);
  useEffect(() => () => [g.solid, g.lit, g.glass].forEach((x) => x.dispose()), [g]);
  return (
    <>
      <mesh geometry={g.solid}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} />
      </mesh>
      {lit.length > 0 && (
        <mesh geometry={g.lit}>
          <meshBasicMaterial vertexColors />
        </mesh>
      )}
      {glass.length > 0 && (
        <mesh geometry={g.glass}>
          <meshStandardMaterial vertexColors transparent opacity={0.16} roughness={0.1} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}
