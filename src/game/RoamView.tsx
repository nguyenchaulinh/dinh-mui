import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { publish } from '../debug';
import type { Look } from '../engine/types';
import { Figure, type Anim } from '../scene3d/Figure';
import { FpsProbe } from '../scene3d/FpsProbe';
import { SETS } from '../scene3d/registry';
import { SetView, envOf } from '../scene3d/sets';
import { actorCollider } from '../scene3d/walk';
import { DEFAULT_CAM, applyLook, computeCameraPose, smoothPose, yawBehind } from './camera';
import { clipRay, isBlocked, resolveMove } from './collision';
import type { InputController } from './input';
import { DEFAULT_MOVE, PLAYER_RADIUS, stepMover } from './movement';
import type { CameraPose, Collider, FollowCam, MoverState, Vec2, WalkArea } from './types';

export interface RoamNpc {
  key: string;
  look?: Look;
  /** Tên vị trí đứng trong set (xem registry.ts). */
  spot: string;
  anim?: Anim;
}

export interface RoamViewProps {
  setId: string;
  regionId: string;
  playerLook?: Look;
  npcs: RoamNpc[];
  area: WalkArea;
  controller: InputController;
  /** Báo FPS mỗi giây (hiện đồng hồ trên màn hình). */
  onFps?: (fps: number) => void;
}

/** Bóng giả dưới chân: rẻ hơn nhiều so với shadow map trên điện thoại. */
function BlobShadow({ r }: Readonly<{ r: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
      <circleGeometry args={[r, 12]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

const DEBUG_EVERY_MS = 250;

/**
 * Nâng điểm ngắm lên trên đầu nhân vật một chút: nhân vật lùi xuống nửa dưới màn hình,
 * nhường phần trên cho cảnh và người phía trước (vị trí camera không đổi).
 */
const AIM_LIFT = 0.45;

/** Bước mô phỏng tối đa (s); khung dài hơn thì chia thành nhiều bước (tối đa 4) để không đi chậm khi FPS thấp. */
const STEP = 0.05;
const MAX_STEPS = 4;

/** Người chơi: đọc đầu vào, chuyển động có va chạm, camera bám, đặt Figure theo vị trí. */
function Player({
  look,
  area,
  colliders,
  controller,
}: Readonly<{ look?: Look; area: WalkArea; colliders: readonly Collider[]; controller: InputController }>) {
  const camera = useThree((s) => s.camera);
  const group = useRef<Group>(null);
  const mover = useRef<MoverState>({
    pos: { x: area.spawn.x, z: area.spawn.z },
    vel: { x: 0, z: 0 },
    heading: area.spawn.rotY,
    speed: 0,
  });
  const cam = useRef<FollowCam>({ ...DEFAULT_CAM, yaw: yawBehind(area.spawn.rotY) });
  const pose = useRef<CameraPose | null>(null);
  const walkingRef = useRef(false);
  const [walking, setWalking] = useState(false);
  const lastPublish = useRef(0);

  const resolve = useCallback(
    (from: Vec2, delta: Vec2): Vec2 => resolveMove(from, delta, PLAYER_RADIUS, colliders, area.bounds),
    [colliders, area],
  );
  const clip = useCallback(
    (origin: Vec2, dir: Vec2, maxLen: number): number => clipRay(origin, dir, maxLen, colliders),
    [colliders],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    cam.current = applyLook(cam.current, controller.consumeLook());
    let m = mover.current;
    let left = Math.min(Number.isFinite(delta) ? delta : 0, STEP * MAX_STEPS);
    for (let i = 0; i < MAX_STEPS && left > 1e-6; i++) {
      const dt = Math.min(left, STEP);
      m = stepMover(m, controller.state.move, cam.current.yaw, DEFAULT_MOVE, dt, resolve);
      left -= dt;
    }
    mover.current = m;

    g.position.set(m.pos.x, 0, m.pos.z);
    g.rotation.y = m.heading;

    const next = computeCameraPose(m.pos, cam.current, clip);
    const p = smoothPose(pose.current, next, delta);
    pose.current = p;
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    camera.lookAt(p.lookAt[0], p.lookAt[1] + AIM_LIFT, p.lookAt[2]);

    const w = m.speed > 0.1;
    if (w !== walkingRef.current) {
      walkingRef.current = w;
      setWalking(w);
    }

    const now = performance.now();
    if (now - lastPublish.current > DEBUG_EVERY_MS) {
      lastPublish.current = now;
      publish({
        mode: 'roam',
        player: {
          x: m.pos.x,
          z: m.pos.z,
          speed: m.speed,
          insideCollider: isBlocked(m.pos, PLAYER_RADIUS - 0.02, colliders, area.bounds),
        },
      });
    }
  });

  return (
    <group ref={group} position={[area.spawn.x, 0, area.spawn.z]} rotation={[0, area.spawn.rotY, 0]}>
      <BlobShadow r={0.38} />
      <Figure look={look} anim={walking ? 'walk' : 'idle'} />
    </group>
  );
}

export default function RoamView({
  setId,
  regionId,
  playerLook,
  npcs,
  area,
  controller,
  onFps,
}: Readonly<RoamViewProps>) {
  const def = SETS[setId];
  const env = envOf(setId, regionId);
  const [dpr, setDpr] = useState(1.75);

  useEffect(() => setDpr(1.75), [setId]);
  useEffect(() => publish({ mode: 'roam', setId }), [setId]);

  // Vị trí NPC (theo spot của set) và vật cản của họ.
  const placed = useMemo(
    () =>
      npcs.flatMap((n) => {
        const spot = def?.spots[n.spot];
        return spot ? [{ ...n, spot, x: spot.pos[0], z: spot.pos[2] }] : [];
      }),
    [npcs, def],
  );
  const colliders = useMemo<Collider[]>(
    () => [...area.colliders, ...placed.map((n) => actorCollider(n.x, n.z))],
    [area, placed],
  );

  return (
    <Canvas
      dpr={[1, dpr]}
      camera={{ fov: 50, near: 0.1, far: 120, position: [area.spawn.x, 3, area.spawn.z + 5] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <color attach="background" args={[env.sky]} />
      <fog attach="fog" args={[env.sky, env.fog[0], env.fog[1]]} />
      <hemisphereLight args={['#ffffff', '#8d6e63', env.ambient]} />
      <directionalLight position={[6, 10, 5]} intensity={env.sun} color={env.sunColor} />

      <SetView setId={setId} regionId={regionId} />

      {placed.map((n, i) => (
        <group key={n.key} position={[n.x, 0, n.z]} rotation={[0, n.spot.rotY ?? 0, 0]}>
          {!n.spot.seated && <BlobShadow r={n.look?.kind === 'dog' || n.look?.build === 'kid' ? 0.25 : 0.35} />}
          <Figure look={n.look} anim={n.anim} seated={n.spot.seated} phase={i * 0.7} />
        </group>
      ))}

      <Player look={playerLook} area={area} colliders={colliders} controller={controller} />
      <FpsProbe onFps={onFps} />
    </Canvas>
  );
}
