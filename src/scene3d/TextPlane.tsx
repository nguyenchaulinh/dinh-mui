import { useMemo } from 'react';
import { labelTexture } from './textures';
import type { DecorLine } from './decorText';

/**
 * Mặt phẳng dán chữ (băng rôn, bảng, lịch). Dùng vật liệu không phụ thuộc ánh sáng để chữ luôn đọc được.
 * `w`/`h` là kích thước mặt phẳng (m); `bg` null thì trong suốt (chữ đè lên mảng nền có sẵn).
 */
export function TextPlane({
  w,
  h,
  lines,
  bg = null,
  position,
  rotation,
}: Readonly<{ w: number; h: number; lines: readonly DecorLine[]; bg?: string | null; position: [number, number, number]; rotation?: [number, number, number] }>) {
  const map = useMemo(() => labelTexture(lines, w, h, bg), [lines, w, h, bg]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} transparent={bg === null} toneMapped={false} />
    </mesh>
  );
}
