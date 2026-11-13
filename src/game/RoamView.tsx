import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  SRGBColorSpace,
  type Group,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type Sprite,
  type SpriteMaterial,
} from 'three';
import { DEBUG, publish } from '../debug';
import type { MapZone, Look, Traffic } from '../engine/types';
import { Figure } from '../scene3d/Figure';
import { FpsProbe } from '../scene3d/FpsProbe';
import { SETS } from '../scene3d/registry';
import { SetView, envOf } from '../scene3d/sets';
import { DEFAULT_CAM, applyLook, computeCameraPose, computeTalkPose, smoothPose, yawBehind } from './camera';
import { clipRay, isBlocked, resolveMove } from './collision';
import {
  MAX_BUBBLES,
  createBubbleState,
  stepBubbles,
  type BubbleState,
  type ShooterRuntime,
} from './bubbles';
import { findInteractable } from './interact';
import { LENS_GRACE, createLensState, stepLens, type LensParams, type LensState } from './lens';
import { safeSpot, trafficBikes, trafficHit, type BikeSpec } from './traffic';
import type { InputController } from './input';
import { DEFAULT_MOVE, PLAYER_RADIUS, stepMover } from './movement';
import { DEFAULT_NPC, createNpcState, stepNpc, type NpcParams, type NpcState } from './npc';
import { buildRoamWorld, type MutCircle, type NpcRuntime, type RoamNpc, type RoamStation, type World } from './roamWorld';
import type { CameraPose, Collider, FollowCam, MoveInput, MoverState, Vec2, WalkArea } from './types';

export type { RoamNpc, RoamStation } from './roamWorld';

/** Trạm tương tác cho một lần vẽ: chỉ hiện và dùng được khi `visible`. */
export interface RoamStationView extends RoamStation {
  visible: boolean;
}

export interface RoamViewProps {
  setId: string;
  regionId: string;
  playerLook?: Look;
  npcs: RoamNpc[];
  area: WalkArea;
  controller: InputController;
  /** Đang hội thoại: người chơi và NPC đứng yên (trừ người đang nói quay mặt về người chơi). */
  paused: boolean;
  /** NPC đang nói chuyện (hiện dấu chỉ trên đầu). */
  talkingKey: string | null;
  /** NPC trong tầm tương tác thay đổi (null = không có). Chỉ gọi khi giá trị đổi. */
  onNearby: (key: string | null) => void;
  /** Người chơi bấm tương tác khi có NPC trong tầm. */
  onInteract: (key: string) => void;
  /** NPC vừa bắn một bong bóng câu hỏi (để hiện chữ). */
  onShoot?: (key: string, text: string) => void;
  /** Người chơi né được một bong bóng. */
  onDodge?: (key: string) => void;
  /** Người chơi bị bong bóng trúng (bị kéo vào hội thoại). */
  onHit?: (key: string) => void;
  /** Trạm lấy đồ / dùng / lên xe (mục tiêu tương tác không phải người). */
  stations?: RoamStationView[];
  /** Vùng kích hoạt: báo khi người chơi bước vào/ra. */
  zones?: MapZone[];
  onZone?: (id: string, inside: boolean) => void;
  /** Dòng xe máy là mối nguy; bị quẹt thì báo ra ngoài và dịch người chơi về vỉa hè. */
  traffic?: Traffic;
  onBikeHit?: () => void;
  /** Ống kính livestream: bị quay đủ lâu, hoặc thoát được. */
  onLens?: (key: string, kind: 'recorded' | 'escaped') => void;
  /** Báo FPS mỗi giây (hiện đồng hồ trên màn hình). */
  onFps?: (fps: number) => void;
}

type Callbacks = Pick<
  RoamViewProps,
  'onNearby' | 'onInteract' | 'onShoot' | 'onDodge' | 'onHit' | 'onZone' | 'onBikeHit' | 'onLens'
>;

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

const IDLE_INPUT: Readonly<MoveInput> = Object.freeze({ x: 0, y: 0, run: false });

/** NPC đang nói chuyện: đứng yên và quay mặt về phía người chơi. */
const FACE_PLAYER: Readonly<NpcParams> = Object.freeze({
  ...DEFAULT_NPC,
  behavior: 'stand',
  aware: 1e6,
  turnRate: 10,
});

function hashKey(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Người chơi: đọc đầu vào, chuyển động có va chạm, camera bám, tìm NPC trong tầm tương tác. */
function Player({
  look,
  area,
  colliders,
  controller,
  world,
  cbs,
  zones,
  traffic,
}: Readonly<{
  look?: Look;
  area: WalkArea;
  colliders: readonly Collider[];
  controller: InputController;
  world: World;
  cbs: { current: Callbacks };
  zones: readonly MapZone[];
  traffic?: Traffic;
}>) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
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
  const lastNearby = useRef<string | null>(null);
  const lastInteract = useRef(controller.state.interactCount);
  const insideZones = useRef<Set<string>>(new Set());
  const immuneUntil = useRef(0);
  const bikes = useMemo<BikeSpec[]>(() => (traffic ? trafficBikes(traffic) : []), [traffic]);

  const resolve = useCallback(
    (from: Vec2, delta: Vec2): Vec2 => resolveMove(from, delta, PLAYER_RADIUS, colliders, area.bounds),
    [colliders, area],
  );
  const clip = useCallback(
    (origin: Vec2, dir: Vec2, maxLen: number): number => clipRay(origin, dir, maxLen, colliders),
    [colliders],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    cam.current = applyLook(cam.current, controller.consumeLook());

    const input = world.paused ? IDLE_INPUT : controller.state.move;
    let m = mover.current;
    let left = Math.min(Number.isFinite(delta) ? delta : 0, STEP * MAX_STEPS);
    for (let i = 0; i < MAX_STEPS && left > 1e-6; i++) {
      const dt = Math.min(left, STEP);
      m = stepMover(m, input, cam.current.yaw, DEFAULT_MOVE, dt, resolve);
      left -= dt;
    }

    // Xe máy: bị quẹt thì dịch về vỉa hè gần nhất (không đứng trên lòng đường), báo ra ngoài để áp hình phạt.
    // Đang hội thoại thì xe vẫn chạy nhưng không quẹt (người chơi đứng yên chỉ vì đang nói chuyện).
    if (traffic && !world.paused) {
      const t = state.clock.elapsedTime;
      if (t >= immuneUntil.current && trafficHit(bikes, traffic, t, m.pos, PLAYER_RADIUS)) {
        const safe = safeSpot(traffic, traffic.safeNorthZ, traffic.safeSouthZ, m.pos);
        m = { ...m, pos: safe, vel: { x: 0, z: 0 }, speed: 0 };
        immuneUntil.current = t + 2; // ân hạn ngắn để không bị quẹt liên tiếp
        cbs.current.onBikeHit?.();
      }
    }

    // Vùng kích hoạt: báo khi bước vào/ra (RoamScreen xét điều kiện và bật cờ).
    for (const z of zones) {
      const inside =
        m.pos.x >= Math.min(z.x0, z.x1) &&
        m.pos.x <= Math.max(z.x0, z.x1) &&
        m.pos.z >= Math.min(z.z0, z.z1) &&
        m.pos.z <= Math.max(z.z0, z.z1);
      if (inside !== insideZones.current.has(z.id)) {
        if (inside) insideZones.current.add(z.id);
        else insideZones.current.delete(z.id);
        cbs.current.onZone?.(z.id, inside);
      }
    }

    // Tương tác: tìm NPC trong tầm; bấm nút thì quay mặt về NPC rồi báo ra ngoài.
    let key = world.paused ? null : findInteractable(m.pos, m.heading, world.targets);
    if (key === null && !world.paused && lastNearby.current !== null) {
      // Giữ mục tiêu cũ thêm một chút (hysteresis): NPC chạy lăng xăng khiến mục tiêu chớp tắt giữa các khung,
      // lời nhắc vẫn hiện mà phím bấm lại bị bỏ qua.
      const prev = world.targets.find((x) => x.key === lastNearby.current);
      if (prev) key = findInteractable(m.pos, m.heading, [prev], 0.5, 0.5);
    }
    const count = controller.state.interactCount;
    if (count !== lastInteract.current) {
      // Luôn cập nhật mốc (kể cả khi đang hội thoại) để lần bấm lúc đó không bị dồn lại.
      lastInteract.current = count;
      if (key !== null) {
        const t = world.targets.find((x) => x.key === key);
        // Dừng hẳn và quay mặt về NPC (không để đà chạy/xoay theo vận tốc kéo mặt đi chỗ khác).
        if (t) m = { ...m, vel: { x: 0, z: 0 }, speed: 0, heading: Math.atan2(t.x - m.pos.x, t.z - m.pos.z) };
        cbs.current.onInteract(key);
      }
    }
    if (key !== lastNearby.current) {
      lastNearby.current = key;
      cbs.current.onNearby(key);
      publish({ nearby: key });
    }
    // Đang hội thoại: giữ mặt hướng về người đang nói chuyện (stepMover vẫn giảm tốc và xoay theo vận tốc dư).
    const talkTarget = world.talkingKey ? world.targets.find((x) => x.key === world.talkingKey) : undefined;
    if (talkTarget) m = { ...m, heading: Math.atan2(talkTarget.x - m.pos.x, talkTarget.z - m.pos.z) };
    mover.current = m;

    world.player.x = m.pos.x;
    world.player.z = m.pos.z;
    world.playerCol.x = m.pos.x;
    world.playerCol.z = m.pos.z;

    g.position.set(m.pos.x, 0, m.pos.z);
    g.rotation.y = m.heading;

    // Đang hội thoại: camera chuyển sang góc dựng khung cả hai người ở nửa trên màn hình (khung thoại che nửa dưới).
    const persp = camera as PerspectiveCamera;
    let next: CameraPose;
    if (talkTarget) {
      next = computeTalkPose(m.pos, talkTarget, size.width / Math.max(1, size.height), (persp.fov * Math.PI) / 180, clip);
    } else {
      next = computeCameraPose(m.pos, cam.current, clip);
      // Nâng điểm ngắm TRƯỚC khi làm mượt: nếu cộng sau thì điểm ngắm nhảy tức thời lúc vào/ra hội thoại.
      next.lookAt[1] += AIM_LIFT;
    }
    const p = smoothPose(pose.current, next, delta);
    pose.current = p;
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    camera.lookAt(p.lookAt[0], p.lookAt[1], p.lookAt[2]);

    const w = m.speed > 0.1;
    if (w !== walkingRef.current) {
      walkingRef.current = w;
      setWalking(w);
    }

    const now = DEBUG ? performance.now() : 0;
    if (DEBUG && now - lastPublish.current > DEBUG_EVERY_MS) {
      lastPublish.current = now;
      const npcs: Record<string, { x: number; z: number }> = {};
      for (const t of world.targets) npcs[t.key] = { x: t.x, z: t.z };
      publish({
        mode: 'roam',
        talking: world.talkingKey,
        npcs,
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

const NO_ZONES: readonly MapZone[] = [];

/** Biểu tượng nổi xoay trên các trạm đang dùng được (kim cương vàng): để người chơi biết chỗ này tương tác được. */
function StationMarkers({ stations }: Readonly<{ stations: { key: string; x: number; z: number; visible: boolean }[] }>) {
  const refs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    stations.forEach((s, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = s.visible;
      g.rotation.y = clock.elapsedTime * 2;
      g.position.y = 2.1 + Math.sin(clock.elapsedTime * 3 + i) * 0.1;
    });
  });
  return (
    <group>
      {stations.map((s, i) => (
        <group
          key={s.key}
          position={[s.x, 2.1, s.z]}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <mesh>
            <octahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.7} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const MAX_SPRITES = MAX_BUBBLES;
const BUBBLE_Y = 1.5;

/**
 * Vẽ một bong bóng thoại (tròn trắng, viền đỏ, dấu "?" hoặc mã QR) lên canvas làm kết cấu; không cần tải gì từ mạng.
 * Mã QR chỉ là hình minh hoạ (ô vuông xen kẽ), không mã hoá gì.
 */
function makeBubbleTexture(icon: 'question' | 'qr'): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#b91c1c';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(64, 60, 48, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath(); // đuôi bóng thoại
    g.moveTo(44, 98);
    g.lineTo(34, 122);
    g.lineTo(70, 104);
    g.closePath();
    g.fill();
    g.fillStyle = '#b91c1c';
    if (icon === 'qr') {
      // Lưới 5x5 với ba "mắt" ở góc: nhìn là biết mã QR.
      const cell = 11;
      const ox = 64 - 2.5 * cell;
      const oy = 60 - 2.5 * cell;
      const on = [
        [1, 1, 1, 0, 1],
        [1, 0, 1, 1, 0],
        [1, 1, 1, 0, 1],
        [0, 1, 0, 1, 1],
        [1, 0, 1, 1, 1],
      ];
      on.forEach((row, r) => row.forEach((v, c) => v && g.fillRect(ox + c * cell, oy + r * cell, cell - 1, cell - 1)));
    } else {
      g.font = '700 74px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', 64, 64);
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace; // không đặt thì màu đỏ/trắng bị nhạt trên màn hình
  return tex;
}

/** Bong bóng câu hỏi bay về phía người chơi: mô phỏng (bubbles.ts) + vẽ bằng nhóm sprite dùng lại. */
function BubbleLayer({
  runtimes,
  world,
  obstacles,
  cbs,
}: Readonly<{
  runtimes: NpcRuntime[];
  world: World;
  obstacles: readonly Collider[];
  cbs: { current: Callbacks };
}>) {
  const sim = useRef<BubbleState>(createBubbleState(hashKey('bong-bong')));
  const sprites = useRef<(Sprite | null)[]>([]);
  const texQ = useMemo(() => makeBubbleTexture('question'), []);
  const texQr = useMemo(() => makeBubbleTexture('qr'), []);
  useEffect(
    () => () => {
      texQ.dispose();
      texQr.dispose();
    },
    [texQ, texQr],
  );

  const shooters = useMemo<ShooterRuntime[]>(
    () =>
      runtimes.flatMap((r) =>
        r.npc.shoots
          ? [{ key: r.npc.key, pos: r.target, ...r.npc.shoots }]
          : [],
      ),
    [runtimes],
  );

  useFrame((_, delta) => {
    if (shooters.length === 0) return;
    const r = stepBubbles(sim.current, delta, {
      player: world.player,
      playerRadius: PLAYER_RADIUS,
      shooters,
      obstacles,
      bounds: world.bounds,
      paused: world.paused,
    });
    sim.current = r.state;
    for (const b of r.events.spawned) cbs.current.onShoot?.(b.key, b.text);
    for (const b of r.events.dodged) cbs.current.onDodge?.(b.key);
    const hit = r.events.hit[0];
    if (hit) cbs.current.onHit?.(hit.key);

    const list = r.state.bubbles;
    for (let i = 0; i < MAX_SPRITES; i++) {
      const sp = sprites.current[i];
      if (!sp) continue;
      const b = list[i];
      sp.visible = b !== undefined;
      if (b) {
        sp.position.set(b.x, BUBBLE_Y + Math.sin(b.age * 9) * 0.08, b.z);
        const mat = sp.material as SpriteMaterial;
        const want = b.icon === 'qr' ? texQr : texQ;
        if (mat.map !== want) mat.map = want;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_SPRITES }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          visible={false}
          scale={[0.75, 0.75, 0.75]}
        >
          <spriteMaterial map={texQ} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Một NPC: chạy hành vi (đứng, lang thang, đuổi theo), cập nhật vị trí và vòng va chạm. */
/** Giữ hoạt ảnh "đang đi" thêm chừng này giây sau lần nhích cuối: NPC đuổi theo dừng/đi liên tục nên không để chớp. */
const MOVING_HOLD = 0.3;

/** Nón nhìn của ống kính: hình quạt phẳng trên mặt đất, hướng theo mặt NPC (con của nhóm NPC nên tự xoay theo). */
function LensCone({ params, state }: Readonly<{ params: LensParams; state: { current: LensState } }>) {
  const mat = useRef<MeshBasicMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    // Càng bị nhắm lâu càng đỏ và đậm: người chơi thấy "sắp bị quay" mà đi ra.
    const k = Math.min(1, state.current.held / params.holdSec);
    m.opacity = 0.2 + 0.4 * k;
    m.color.setRGB(1, 0.85 - 0.6 * k, 0.25 - 0.1 * k);
  });
  // Quạt nằm trong mặt phẳng XY của hình tròn, xoay -90° quanh x để nằm ngang; tâm quạt hướng +z (mặt NPC).
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <circleGeometry args={[params.range, 28, -Math.PI / 2 - params.halfAngle, params.halfAngle * 2]} />
      <meshBasicMaterial ref={mat} color="#fde047" transparent opacity={0.2} depthWrite={false} />
    </mesh>
  );
}

function NpcView({
  rt,
  world,
  index,
  talking,
  cbs,
}: Readonly<{ rt: NpcRuntime; world: World; index: number; talking: boolean; cbs: { current: Callbacks } }>) {
  const group = useRef<Group>(null);
  const state = useRef<NpcState>(createNpcState(rt.home, rt.spot.rotY ?? 0, hashKey(rt.npc.key)));
  const movingRef = useRef(false);
  const holdRef = useRef(0);
  const [moving, setMoving] = useState(false);
  const lensCfg = rt.npc.lens;
  const lensParams = useMemo<LensParams | null>(
    () =>
      lensCfg
        ? {
            range: lensCfg.range,
            halfAngle: (lensCfg.halfAngleDeg * Math.PI) / 180,
            holdSec: lensCfg.holdSec,
            restSec: lensCfg.restSec,
          }
        : null,
    [lensCfg],
  );
  // Mới vào cảnh có ân hạn ngắn: người chơi chưa kịp nhìn ra ống kính thì chưa bị quay.
  const lensState = useRef<LensState>({ ...createLensState(), rest: LENS_GRACE });

  const resolve = useCallback(
    (from: Vec2, delta: Vec2): Vec2 => resolveMove(from, delta, rt.radius, rt.obstacles, world.bounds),
    [rt, world],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const isTalking = world.talkingKey === rt.npc.key;
    // Đang hội thoại: chỉ người đang nói còn cử động (quay mặt về người chơi), còn lại đứng im.
    // Người ngồi thì không quay (ngồi mà xoay lưng lại bàn thì lạ, và sau đó không có chỗ quay về).
    if (!world.paused || isTalking) {
      state.current = stepNpc(
        isTalking && !rt.seated ? FACE_PLAYER : rt.npc.params,
        rt.home,
        state.current,
        world.player,
        delta,
        resolve,
      );
    }
    const s = state.current;
    if (rt.dynamic) {
      g.position.set(s.pos.x, 0, s.pos.z);
      rt.target.x = s.pos.x;
      rt.target.z = s.pos.z;
      (rt.col as MutCircle).x = s.pos.x;
      (rt.col as MutCircle).z = s.pos.z;
    }
    g.rotation.y = s.heading;
    if (lensParams) {
      const r = stepLens(lensState.current, delta, {
        params: lensParams,
        npc: s.pos,
        npcHeading: s.heading,
        player: world.player,
        paused: world.paused,
      });
      lensState.current = r.state;
      if (r.events.recorded) cbs.current.onLens?.(rt.npc.key, 'recorded');
      if (r.events.escaped) cbs.current.onLens?.(rt.npc.key, 'escaped');
    }
    if (rt.dynamic && s.moving && !world.paused) holdRef.current = MOVING_HOLD;
    else holdRef.current = Math.max(0, holdRef.current - delta);
    const mv = holdRef.current > 0 && !world.paused;
    if (mv !== movingRef.current) {
      movingRef.current = mv;
      setMoving(mv);
    }
  });

  const dog = rt.npc.look?.kind === 'dog';
  // Chó không có động tác đi: dùng nhảy chân sáo khi chạy.
  const anim = moving ? (dog ? 'dance' : 'walk') : 'idle';
  return (
    <group ref={group} position={[rt.home.x, 0, rt.home.z]} rotation={[0, rt.spot.rotY ?? 0, 0]}>
      {!rt.seated && <BlobShadow r={dog || rt.npc.look?.build === 'kid' ? 0.25 : 0.35} />}
      <Figure look={rt.npc.look} anim={anim} seated={rt.seated} speaking={talking} phase={index * 0.7} />
      {lensParams && <LensCone params={lensParams} state={lensState} />}
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
  paused,
  talkingKey,
  onNearby,
  onInteract,
  onShoot,
  onDodge,
  onHit,
  stations,
  zones,
  onZone,
  traffic,
  onBikeHit,
  onLens,
  onFps,
}: Readonly<RoamViewProps>) {
  const def = SETS[setId];
  const env = envOf(setId, regionId);
  const [dpr, setDpr] = useState(1.75);

  useEffect(() => setDpr(1.75), [setId]);
  useEffect(() => publish({ mode: 'roam', setId }), [setId]);

  // Dựng NPC lúc chạy: vị trí, vòng va chạm (cố định cho người ngồi/đứng, đổi tại chỗ cho người đi lại),
  // và danh sách vật cản riêng của từng NPC đi lại.
  // Danh sách trạm chỉ đổi khi cấu hình đổi (khoá + spot + tầm); `visible` đổi liên tục theo cờ nên tách riêng.
  const stationKey = (stations ?? []).map((s) => `${s.key}|${s.spot}|${s.reach ?? ''}`).join(';');
  const stationList = useMemo<RoamStation[]>(
    () => (stations ?? []).map((s) => ({ key: s.key, spot: s.spot, reach: s.reach })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stationKey],
  );
  const { world, runtimes, stationTargets, playerColliders } = useMemo(
    () => buildRoamWorld(npcs, def, area, stationList),
    [npcs, def, area, stationList],
  );

  // Đồng bộ trạng thái từ React xuống vòng lặp khung hình (đọc trong useFrame, không gây render lại).
  useEffect(() => {
    world.paused = paused;
    world.talkingKey = talkingKey;
  }, [world, paused, talkingKey]);
  // Trạm ẩn (chưa thoả điều kiện) thì tầm tương tác âm: không bao giờ chọn được.
  const visibleKey = (stations ?? []).map((s) => (s.visible ? '1' : '0')).join('');
  useEffect(() => {
    for (const t of stationTargets) {
      const st = (stations ?? []).find((s) => s.key === t.key);
      t.reach = st?.visible ? (st.reach ?? undefined) : -1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationTargets, visibleKey]);
  const cbs = useRef<Callbacks>({ onNearby, onInteract, onShoot, onDodge, onHit, onZone, onBikeHit, onLens });
  useEffect(() => {
    cbs.current = { onNearby, onInteract, onShoot, onDodge, onHit, onZone, onBikeHit, onLens };
  }, [onNearby, onInteract, onShoot, onDodge, onHit, onZone, onBikeHit, onLens]);
  const stationPositions = useMemo(
    () =>
      (stations ?? []).flatMap((s) => {
        const t = stationTargets.find((x) => x.key === s.key);
        return t ? [{ key: s.key, x: t.x, z: t.z, visible: s.visible }] : [];
      }),
    [stations, stationTargets],
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

      <SetView setId={setId} regionId={regionId} traffic={traffic} />

      {runtimes.map((rt, i) => (
        <NpcView key={rt.npc.key} rt={rt} world={world} index={i} talking={talkingKey === rt.npc.key} cbs={cbs} />
      ))}

      <StationMarkers stations={stationPositions} />

      <BubbleLayer runtimes={runtimes} world={world} obstacles={playerColliders} cbs={cbs} />

      <Player
        look={playerLook}
        area={area}
        colliders={playerColliders}
        controller={controller}
        world={world}
        cbs={cbs}
        zones={zones ?? NO_ZONES}
        traffic={traffic}
      />
      <FpsProbe onFps={onFps} />
    </Canvas>
  );
}
