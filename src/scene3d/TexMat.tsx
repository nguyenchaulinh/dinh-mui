import { useMemo } from 'react';
import { surfaceTexture, type SurfaceKind } from './textures';

/**
 * Vật liệu có texture bề mặt vẽ bằng canvas (tường trát, cửa cuốn, nhựa đường, gạch lát), thay cho `Mat` màu phẳng.
 * `rx`/`ry` là số lần lặp texture trên mặt phẳng; hộp lặp như nhau trên mọi mặt nên dùng cho bề mặt có hạt nhỏ.
 */
export function TexMat({ kind, base, rx = 1, ry = 1, rough = 0.92 }: Readonly<{ kind: SurfaceKind; base: string; rx?: number; ry?: number; rough?: number }>) {
  const map = useMemo(() => surfaceTexture(kind, base, rx, ry), [kind, base, rx, ry]);
  return <meshStandardMaterial map={map} roughness={rough} metalness={0} />;
}
