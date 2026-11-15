import { useEffect, useMemo, useState } from 'react';
import { DoubleSide, FrontSide } from 'three';
import { fontsReady, loadFonts } from './fonts';
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
  double = false,
  uniform = false,
  grain = false,
}: Readonly<{ w: number; h: number; lines: readonly DecorLine[]; bg?: string | null; position: [number, number, number]; rotation?: [number, number, number]; /** Thấy được từ cả hai mặt (biển vuông góc phố). */ double?: boolean; /** Mọi dòng cùng một cỡ chữ (câu đối dọc). */ uniform?: boolean; /** Rắc hạt nhám lên nền (cần `bg`). */ grain?: boolean }>) {
  // Phông nạp lười: vẽ lần đầu bằng phông dự phòng, nạp xong thì vẽ lại bằng phông thật.
  const [fontsOk, setFontsOk] = useState(fontsReady());
  useEffect(() => {
    if (!fontsOk) void loadFonts().then(() => setFontsOk(true));
  }, [fontsOk]);
  const map = useMemo(() => labelTexture(lines, w, h, bg, undefined, { uniform, grain }), [lines, w, h, bg, uniform, grain, fontsOk]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} transparent={bg === null} toneMapped={false} side={double ? DoubleSide : FrontSide} />
    </mesh>
  );
}
