import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import type { Look } from '../engine/types';
import { Figure, type Anim } from './Figure';
import { SETS, type CameraShot, type SetDef } from './registry';
import { SetView, envOf } from './sets';

export interface StageActor {
  /** Khóa ổn định (id nhân vật gốc trong scene). */
  key: string;
  look?: Look;
  spot: string;
  anim?: Anim;
  speaking: boolean;
}

export interface Stage3DProps {
  setId: string;
  regionId: string;
  /** Góc máy dựng sẵn; thiếu thì bám người đang nói. */
  camera?: string;
  actors: StageActor[];
  /** Báo FPS mỗi giây (để đo trên điện thoại). */
  onFps?: (fps: number) => void;
}

/** Góc máy: dựng sẵn, hoặc đặt phía tâm cảnh nhìn về người nói, hoặc mặc định. */
function shotFor(def: SetDef, camera: string | undefined, actors: StageActor[]): CameraShot {
  if (camera && def.cameras[camera]) return def.cameras[camera]!;
  const speaker = actors.find((a) => a.speaking && def.spots[a.spot]);
  if (speaker) {
    const spot = def.spots[speaker.spot]!;
    const [sx, , sz] = spot.pos;
    const [cx, , cz] = def.focusCenter;
    let dx = cx - sx;
    let dz = cz - sz;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) {
      // Người nói đứng ngay tâm: nhìn theo hướng mặt của họ.
      dx = Math.sin(spot.rotY ?? 0);
      dz = Math.cos(spot.rotY ?? 0);
    } else {
      dx /= len;
      dz /= len;
    }
    // Xoay chéo 3/4 cho có chiều sâu; nhìn hơi thấp hơn đầu để người nói nằm ở
    // nửa trên màn hình (nửa dưới bị khung thoại che).
    const a = 0.45;
    const rx = dx * Math.cos(a) - dz * Math.sin(a);
    const rz = dx * Math.sin(a) + dz * Math.cos(a);
    const headY = spot.seated ? 1.15 : 1.4;
    return { pos: [sx + rx * 4.4, 2.6, sz + rz * 4.4], target: [sx, headY - 0.45, sz] };
  }
  return def.cameras[def.defaultCamera]!;
}

function CameraRig({ shot, snapKey }: Readonly<{ shot: CameraShot; snapKey: string }>) {
  const { camera } = useThree();
  const target = useRef(new Vector3(...shot.target));
  const wantPos = useMemo(() => new Vector3(...shot.pos), [shot]);
  const wantTarget = useMemo(() => new Vector3(...shot.target), [shot]);
  const lastSnap = useRef<string | null>(null);

  useFrame((_, delta) => {
    if (lastSnap.current !== snapKey) {
      // Đổi bộ cảnh: nhảy thẳng tới góc máy, không lướt xuyên tường.
      camera.position.copy(wantPos);
      target.current.copy(wantTarget);
      lastSnap.current = snapKey;
    } else {
      const k = 1 - Math.exp(-delta * 2.5);
      camera.position.lerp(wantPos, k);
      target.current.lerp(wantTarget, k);
    }
    camera.lookAt(target.current);
  });
  return null;
}

function FpsMeter({ onFps }: Readonly<{ onFps: (fps: number) => void }>) {
  const frames = useRef(0);
  const since = useRef(performance.now());
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - since.current >= 1000) {
      onFps(Math.round((frames.current * 1000) / (now - since.current)));
      frames.current = 0;
      since.current = now;
    }
  });
  return null;
}

/** Bóng giả dưới chân: rẻ hơn nhiều so với shadow map trên điện thoại. */
function BlobShadow({ r = 0.35 }: Readonly<{ r?: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
      <circleGeometry args={[r, 12]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

export default function Stage3DView({ setId, regionId, camera, actors, onFps }: Readonly<Stage3DProps>) {
  const def = SETS[setId];
  const [dpr, setDpr] = useState(1.75);
  const env = envOf(setId, regionId);
  const shot = def ? shotFor(def, camera, actors) : { pos: [0, 3, 6] as const, target: [0, 0, 0] as const };

  // Đổi set thì reset độ phân giải về mức cao, để PerformanceMonitor đo lại.
  useEffect(() => setDpr(1.75), [setId]);

  return (
    <Canvas
      dpr={[1, dpr]}
      camera={{ fov: 45, near: 0.1, far: 120, position: [...shot.pos] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <color attach="background" args={[env.sky]} />
      <fog attach="fog" args={[env.sky, env.fog[0], env.fog[1]]} />
      <hemisphereLight args={['#ffffff', '#8d6e63', env.ambient]} />
      <directionalLight position={[6, 10, 5]} intensity={env.sun} color={env.sunColor} />

      <SetView setId={setId} regionId={regionId} />

      {def &&
        actors.map((a, i) => {
          const spot = def.spots[a.spot];
          if (!spot) return null;
          const small = a.look?.kind === 'dog' || a.look?.build === 'kid';
          return (
            <group key={a.key} position={[...spot.pos]} rotation={[0, spot.rotY ?? 0, 0]}>
              {!spot.seated && <BlobShadow r={small ? 0.25 : 0.35} />}
              <Figure look={a.look} anim={a.anim} seated={spot.seated} speaking={a.speaking} phase={i * 0.7} />
            </group>
          );
        })}

      <CameraRig shot={shot} snapKey={setId} />
      {onFps && <FpsMeter onFps={onFps} />}
    </Canvas>
  );
}
