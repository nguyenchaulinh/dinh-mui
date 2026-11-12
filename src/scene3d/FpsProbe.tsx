import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { DEBUG, publish } from '../debug';

/**
 * Đo FPS mỗi giây, báo lên `onFps` (nếu có) và công bố vào `window.__dinhmui`
 * (fps, draw call, tam giác) để script đo hiệu năng đọc. Không làm gì khi DEBUG tắt.
 */
export function FpsProbe({ onFps }: Readonly<{ onFps?: (fps: number) => void }>) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const since = useRef(performance.now());

  useFrame(() => {
    if (!DEBUG && !onFps) return;
    frames.current++;
    const now = performance.now();
    if (now - since.current < 1000) return;
    const fps = Math.round((frames.current * 1000) / (now - since.current));
    frames.current = 0;
    since.current = now;
    onFps?.(fps);
    publish({ fps, calls: gl.info.render.calls, triangles: gl.info.render.triangles });
  });
  return null;
}
