import { Html, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3, type Group, type PerspectiveCamera } from 'three';
import { DEBUG, publish } from '../debug';
import type { Look, ObjectModel } from '../engine/types';
import { Figure } from '../scene3d/Figure';
import type { PoseState } from '../scene3d/Rigged';
import { preloadModels } from '../scene3d/Rigged';
import { isCharacterModel } from '../scene3d/rigging';
import { FpsProbe } from '../scene3d/FpsProbe';
import { SETS } from '../scene3d/registry';
import { SetView, envOf } from '../scene3d/sets';
import { DEFAULT_CAM, applyLook, computeCameraPose, computeTalkPose, smoothPose, yawBehind, fovForAspect } from './camera';
import { clipRay, isBlocked, resolveMove } from './collision';
import { startAction, stepAction, type ActionRun, type ActionStep, type PlayerAction } from './action';
import { createAmbushState, stepAmbush, type ActiveAmbush, type AmbushState, type AmbusherRuntime } from './ambush';
import { findInteractable, type Target } from './interact';
import { guideArrow, type GuideArrow } from './guide';
import { bubbleSides, soloSide, type BubbleSide, type SpeechBubble } from './speech';
import type { InputController } from './input';
import { DEFAULT_MOVE, PLAYER_RADIUS, stepMover } from './movement';
import { DEFAULT_NPC, createNpcState, stepNpc, type NpcParams, type NpcState } from './npc';
import { buildRoamWorld, type MutCircle, type NpcRuntime, type RoamNpc, type World } from './roamWorld';
import type { CameraPose, Collider, FollowCam, MoveInput, MoverState, Vec2, WalkArea } from './types';

export type { RoamNpc } from './roamWorld';

/** Đồ vật trong cảnh: vị trí (đã tra từ spot), hình dựng, và trạng thái hiển thị. */
export interface RoamObject {
  /** Khoá tương tác, dạng `obj:<id>`. */
  key: string;
  x: number;
  z: number;
  model?: ObjectModel;
  /** Còn tương tác được (chưa nhặt/chưa dùng): hiện dấu vàng và nằm trong danh sách mục tiêu. */
  available: boolean;
  /** Đã nhặt: ẩn hình dựng. */
  taken: boolean;
  /** Chưa đủ điều kiện dùng (cửa chưa mở): dấu màu xám. */
  locked: boolean;
}

const NO_KEYS: readonly string[] = [];

/** Tầm với đồ vật (m): đồ nằm trên bàn/quầy nên cho với xa hơn NPC một chút. */
const OBJECT_REACH = 1.7;

export type { SpeechBubble } from './speech';

/**
 * Khi người chơi và NPC cùng có bong bóng: chiếu đầu hai người lên màn hình mỗi khung để chọn phía bung của từng
 * bong bóng (speech.ts, bubbleSides). Chỉ báo ra ngoài khi phía đổi, không render lại mỗi khung.
 */
function BubbleSideTracker({
  world,
  npcKey,
  onSides,
}: Readonly<{ world: World; npcKey: string; onSides: (s: { player: BubbleSide; npc: BubbleSide }) => void }>) {
  const camera = useThree((s) => s.camera);
  const prev = useRef<{ player: BubbleSide; npc: BubbleSide } | null>(null);
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const t = world.targets.find((x) => x.key === npcKey);
    if (!t) return;
    const px = v.set(world.player.x, 1.7, world.player.z).project(camera).x;
    const nx = v.set(t.x, 1.7, t.z).project(camera).x;
    const s = bubbleSides(px, nx, prev.current ?? undefined);
    if (!prev.current || s.player !== prev.current.player) {
      prev.current = s;
      onSides(s);
    }
  });
  return null;
}

/** Một bong bóng đứng một mình: chọn phía bung theo vị trí người nói trên màn hình (speech.ts, soloSide). */
function SoloSideTracker({
  world,
  subject,
  onSide,
}: Readonly<{ world: World; subject: string; onSide: (s: BubbleSide) => void }>) {
  const camera = useThree((s) => s.camera);
  const prev = useRef<BubbleSide>('center');
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    let x: number;
    let z: number;
    if (subject === 'player') {
      x = world.player.x;
      z = world.player.z;
    } else {
      const t = world.targets.find((k) => k.key === subject);
      if (!t) return;
      x = t.x;
      z = t.z;
    }
    const s = soloSide(v.set(x, 1.7, z).project(camera).x, prev.current);
    if (s !== prev.current) {
      prev.current = s;
      onSide(s);
    }
  });
  return null;
}

/** Một mũi tên chỉ hướng tới mục tiêu ngoài khung nhìn (xem guide.ts). */
export interface GuideItem extends GuideArrow {
  key: string;
  /** Khoảng cách từ người chơi (m, làm tròn). */
  dist: number;
}

/** Số mũi tên tối đa cùng lúc (gần nhất trước): nhiều hơn thì rối. */
const MAX_GUIDES = 3;

/**
 * Chiếu mục tiêu của việc đang cần làm lên màn hình mỗi khung; cái nào nằm ngoài khung thì có mũi tên ở mép (guide.ts).
 * Chỉ báo ra ngoài khi kết quả đổi đáng kể (làm tròn vị trí 1%, góc 3°, khoảng cách 1 m) và tối đa ~12 lần/giây,
 * nên không render lại mỗi khung.
 */
function GuideTracker({
  world,
  keys,
  onGuides,
}: Readonly<{ world: World; keys: readonly string[]; onGuides: (g: GuideItem[]) => void }>) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new Vector3(), []);
  const last = useRef({ sig: '', at: 0 });
  useEffect(() => {
    last.current = { sig: '', at: 0 };
    if (keys.length === 0) onGuides([]);
  }, [keys, onGuides]);
  useFrame(() => {
    if (keys.length === 0) return;
    const now = performance.now();
    if (now - last.current.at < 80) return;
    last.current.at = now;
    const aspect = size.width / Math.max(1, size.height);
    const out: GuideItem[] = [];
    for (const key of keys) {
      const t = world.targets.find((x) => x.key === key);
      if (!t) continue;
      v.set(t.x, 1.2, t.z).applyMatrix4(camera.matrixWorldInverse);
      const behind = v.z > 0; // camera nhìn theo -z của không gian camera
      v.set(t.x, 1.2, t.z).project(camera);
      const a = guideArrow(v.x, v.y, behind, aspect);
      if (a) out.push({ ...a, key, dist: Math.round(Math.hypot(t.x - world.player.x, t.z - world.player.z)) });
    }
    out.sort((p, q) => p.dist - q.dist);
    const top = out.slice(0, MAX_GUIDES);
    const sig = top.map((g) => `${g.key}|${g.x.toFixed(2)}|${g.y.toFixed(2)}|${Math.round((g.angle * 180) / Math.PI / 3)}|${g.dist}`).join(';');
    if (sig !== last.current.sig) {
      last.current.sig = sig;
      onGuides(top);
    }
  });
  return null;
}

/** Độ cao đặt bong bóng theo vóc dáng (m). */
function bubbleY(look: Look | undefined): number {
  if (look?.kind === 'dog') return 0.75;
  if (look?.build === 'kid') return 1.45;
  return 2.05;
}

function BubbleHtml({ b, y, side = 'center' }: Readonly<{ b: SpeechBubble; y: number; side?: BubbleSide }>) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[15, 0]} pointerEvents="none">
      <div className={`speech speech-${side}${b.alert ? ' speech-alert' : ''}`}>
        <span className="speech-name" style={{ color: b.color }}>
          {b.name}
        </span>
        <span className="speech-text">{b.text}</span>
      </div>
    </Html>
  );
}

export interface RoamViewProps {
  setId: string;
  regionId: string;
  /** Biến thể trang trí của bộ cảnh (ví dụ văn phòng / lớp học). */
  variant?: string;
  objects?: RoamObject[];
  playerLook?: Look;
  npcs: RoamNpc[];
  area: WalkArea;
  controller: InputController;
  /** Đang hội thoại: người chơi và NPC đứng yên (trừ người đang nói quay mặt về người chơi). */
  paused: boolean;
  /** NPC đang nói chuyện (hiện dấu chỉ trên đầu). */
  talkingKey: string | null;
  /** Bong bóng thoại đang hiện (trên đầu NPC hoặc người chơi). */
  bubbles?: SpeechBubble[];
  /** Hoạt cảnh nhân vật chính đang làm (ngồi vào máy tính, nhặt đồ, ra cửa), hoặc null. */
  action?: PlayerAction | null;
  /** Hoạt cảnh báo một mốc: ngồi xong, đã cầm đồ, xong hẳn. */
  onActionStep?: (id: number, step: ActionStep) => void;
  /** NPC trong tầm tương tác thay đổi (null = không có). Chỉ gọi khi giá trị đổi. */
  onNearby: (key: string | null) => void;
  /** Người chơi bấm tương tác khi có NPC trong tầm. */
  onInteract: (key: string) => void;
  /** Một NPC bắt đầu lao tới hỏi: hiện báo trước + vòng thời gian, chờ bấm NÉ. */
  onAmbush?: (a: ActiveAmbush) => void;
  /** Người chơi bấm NÉ đúng lúc. */
  onDodge?: (key: string) => void;
  /** Người chơi bị bắt (bấm sớm hoặc không bấm): bị kéo vào hội thoại. */
  onHit?: (key: string, early: boolean) => void;
  /** Báo FPS mỗi giây (hiện đồng hồ trên màn hình). */
  onFps?: (fps: number) => void;
  /** Khoá NPC / đồ vật cần chỉ hướng khi ra khỏi khung nhìn (rỗng thì không có mũi tên). */
  guideKeys?: readonly string[];
  onGuides?: (g: GuideItem[]) => void;
}

type Callbacks = Pick<RoamViewProps, 'onNearby' | 'onInteract' | 'onAmbush' | 'onDodge' | 'onHit' | 'onActionStep'>;

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

/** NPC đang lao tới hỏi: chạy thẳng tới chỗ người chơi, dừng sát trước mặt. */
const RUSH: Readonly<NpcParams> = Object.freeze({
  ...DEFAULT_NPC,
  behavior: 'approach',
  speed: 3.2,
  aware: 1e6,
  stopDist: 1.1,
  turnRate: 12,
});

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
  bubble,
  bubbleSide,
  action,
  area,
  colliders,
  controller,
  world,
  cbs,
}: Readonly<{
  look?: Look;
  bubble?: SpeechBubble;
  bubbleSide: BubbleSide;
  action: PlayerAction | null;
  area: WalkArea;
  colliders: readonly Collider[];
  controller: InputController;
  world: World;
  cbs: { current: Callbacks };
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
  type PAnim = 'idle' | 'walk' | 'run' | 'type' | 'reach';
  const walkingRef = useRef<PAnim>('idle');
  const [walking, setWalking] = useState<PAnim>('idle');
  const actionRef = useRef<PlayerAction | null>(action);
  actionRef.current = action;
  const runRef = useRef<ActionRun | null>(null);
  const posePlayer = useRef<PoseState>({ sit: 0, seatY: 0.48, nod: false });
  const lastPublish = useRef(0);
  const lastNearby = useRef<string | null>(null);
  const lastInteract = useRef(controller.state.interactCount);

  const resolve = useCallback(
    (from: Vec2, delta: Vec2): Vec2 => resolveMove(from, delta, PLAYER_RADIUS, colliders, area.bounds),
    [colliders, area],
  );
  const clip = useCallback(
    (origin: Vec2, dir: Vec2, maxLen: number): number => clipRay(origin, dir, maxLen, colliders),
    [colliders],
  );
  // Lúc nói chuyện góc máy đứng yên nên coi MỌI vật cản tĩnh (cột cổng, thân dừa, móc áo...) là vật che, để không
  // dựng khung hai người sau một cái cột. Khi đi lại thì không làm vậy (vật mảnh sẽ làm camera giật).
  const talkColliders = useMemo(
    () => colliders.filter((c) => c.id !== 'npc').map((c) => ({ ...c, blocksCamera: true })),
    [colliders],
  );
  const talkClip = useCallback(
    (origin: Vec2, dir: Vec2, maxLen: number): number => clipRay(origin, dir, maxLen, talkColliders),
    [talkColliders],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    cam.current = applyLook(cam.current, controller.consumeLook());

    // Hoạt cảnh (action.ts): nhân vật đi/ngồi/với tay theo kịch bản, khoá điều khiển.
    const act = actionRef.current;
    if (act && runRef.current?.id !== act.id) runRef.current = startAction(act);
    if (!act) runRef.current = null;
    let m = mover.current;
    let shoulder = false;
    let actAnim: PAnim | null = null;
    if (act && runRef.current) {
      const r = stepAction(runRef.current, act, m.pos, m.heading, delta, (k) => {
        const tg = world.targets.find((x) => x.key === k);
        return tg ? { x: tg.x, z: tg.z } : null;
      });
      runRef.current = r.run;
      m = { pos: r.frame.pos, vel: { x: 0, z: 0 }, heading: r.frame.heading, speed: 0 };
      posePlayer.current.sit = r.frame.sit;
      if (act.kind === 'sit') posePlayer.current.seatY = act.seatY;
      shoulder = r.frame.shoulder;
      actAnim = r.frame.anim;
      for (const s of r.emit) cbs.current.onActionStep?.(act.id, s);
    } else {
      posePlayer.current.sit = 0;
      const input = world.paused ? IDLE_INPUT : controller.state.move;
      let left = Math.min(Number.isFinite(delta) ? delta : 0, STEP * MAX_STEPS);
      for (let i = 0; i < MAX_STEPS && left > 1e-6; i++) {
        const dt = Math.min(left, STEP);
        m = stepMover(m, input, cam.current.yaw, DEFAULT_MOVE, dt, resolve);
        left -= dt;
      }
    }
    world.busy = act !== null;

    // Tương tác: tìm NPC trong tầm; bấm nút thì quay mặt về NPC rồi báo ra ngoài.
    // Đang có người lao tới hỏi: nút tương tác dùng để NÉ, không mở hội thoại.
    const blocked = world.paused || world.ambushKey !== null || world.busy;
    let key = blocked ? null : findInteractable(m.pos, m.heading, world.targets);
    if (key === null && !blocked && lastNearby.current !== null) {
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
    // Màn dọc (điện thoại) cần góc nhìn dọc rộng hơn: giữ 50° thì góc ngang chỉ ~25°, gần như không thấy gì hai bên.
    const fov = fovForAspect(size.width / Math.max(1, size.height));
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    let next: CameraPose;
    if (shoulder && act?.kind === 'sit') {
      // Ngồi ở máy tính: camera qua vai, nhìn vào màn hình.
      const fx = Math.sin(act.seat.rotY);
      const fz = Math.cos(act.seat.rotY);
      next = {
        pos: [act.seat.x - fx * 1.05 + fz * 0.35, 1.45, act.seat.z - fz * 1.05 - fx * 0.35],
        lookAt: [act.look.x, 0.85, act.look.z],
      };
    } else if (talkTarget) {
      next = computeTalkPose(m.pos, talkTarget, size.width / Math.max(1, size.height), (persp.fov * Math.PI) / 180, talkClip);
    } else {
      next = computeCameraPose(m.pos, cam.current, clip);
      // Nâng điểm ngắm TRƯỚC khi làm mượt: nếu cộng sau thì điểm ngắm nhảy tức thời lúc vào/ra hội thoại.
      next.lookAt[1] += AIM_LIFT;
    }
    const p = smoothPose(pose.current, next, delta);
    pose.current = p;
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    camera.lookAt(p.lookAt[0], p.lookAt[1], p.lookAt[2]);

    const w: PAnim = actAnim ?? (m.speed > 3 ? 'run' : m.speed > 0.1 ? 'walk' : 'idle');
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
      <Figure look={look} anim={walking} pose={posePlayer} />
      {bubble && <BubbleHtml b={bubble} y={bubbleY(look)} side={bubbleSide} />}
    </group>
  );
}

/**
 * Lượt "bấm NÉ đúng lúc" (ambush.ts): đếm giờ, đọc lần bấm nút tương tác, báo sự kiện ra ngoài.
 * Vòng thời gian và nút NÉ vẽ bằng DOM ở RoamScreen; ở đây chỉ chạy luật trong vòng lặp khung hình.
 */
function AmbushLayer({
  runtimes,
  world,
  controller,
  cbs,
}: Readonly<{ runtimes: NpcRuntime[]; world: World; controller: InputController; cbs: { current: Callbacks } }>) {
  const sim = useRef<AmbushState>(createAmbushState(hashKey('hoi-han')));
  const lastPress = useRef(controller.state.interactCount);
  const ambushers = useMemo<AmbusherRuntime[]>(
    () => runtimes.flatMap((r) => (r.npc.ambush ? [{ key: r.npc.key, pos: r.target, ...r.npc.ambush }] : [])),
    [runtimes],
  );

  useFrame((_, delta) => {
    const count = controller.state.interactCount;
    const pressed = count !== lastPress.current;
    lastPress.current = count;
    if (ambushers.length === 0) return;
    const r = stepAmbush(sim.current, delta, {
      player: world.player,
      ambushers,
      paused: world.paused || world.busy,
      press: pressed && sim.current.active !== null,
    });
    sim.current = r.state;
    world.ambushKey = r.state.active?.key ?? null;
    if (r.events.warned) cbs.current.onAmbush?.(r.events.warned);
    if (r.events.dodged) cbs.current.onDodge?.(r.events.dodged);
    if (r.events.hit) cbs.current.onHit?.(r.events.hit.key, r.events.hit.early);
  });
  return null;
}

/** Độ cao đặt hình dựng của đồ vật (mặt bàn, mặt quầy, móc áo). */
const MODEL_Y: Record<ObjectModel, number> = { laptop: 0.77, charger: 0.77, gift: 0.92, coat: 1.15, door: 0 };

function ObjectModelMesh({ model }: Readonly<{ model: ObjectModel }>) {
  switch (model) {
    case 'laptop':
      return (
        <group>
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.36, 0.024, 0.25]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
          <mesh position={[0, 0.13, -0.12]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.36, 0.24, 0.015]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.13, -0.11]} rotation={[-0.25, 0, 0]}>
            <planeGeometry args={[0.32, 0.2]} />
            <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case 'charger':
      return (
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.1, 0.06, 0.14]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      );
    case 'gift':
      return (
        <group>
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.3, 0.22, 0.3]} />
            <meshStandardMaterial color="#c0262d" />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.31, 0.23, 0.06]} />
            <meshStandardMaterial color="#f5b82e" />
          </mesh>
        </group>
      );
    case 'coat':
      return (
        <mesh position={[0.12, -0.25, 0]}>
          <boxGeometry args={[0.16, 0.6, 0.42]} />
          <meshStandardMaterial color="#7c2d12" />
        </mesh>
      );
    default:
      return null;
  }
}

/** Đồ vật: hình dựng (nếu chưa nhặt) và dấu tương tác xoay phía trên (vàng: dùng được, xám: chưa mở). */
/** Thời gian (s) món đồ vừa nhặt bay vào người chơi rồi biến mất. */
const FLY_TIME = 0.45;

function ObjectView({ obj, world }: Readonly<{ obj: RoamObject; world: World }>) {
  const marker = useRef<Group>(null);
  const model = useRef<Group>(null);
  const y = obj.model ? MODEL_Y[obj.model] : 0;
  /** Lúc bắt đầu bay (giây đồng hồ cảnh), null = chưa nhặt hoặc đã bay xong. */
  const flyFrom = useRef<number | null>(null);
  const [gone, setGone] = useState(obj.taken);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = marker.current;
    if (m) {
      m.rotation.y = t * 1.6;
      m.position.y = y + 0.55 + Math.sin(t * 2.4) * 0.06;
    }
    const g = model.current;
    if (!g || gone) return;
    if (obj.taken && flyFrom.current === null) flyFrom.current = t;
    if (flyFrom.current === null) return;
    // Bay từ chỗ cũ vào ngực người chơi, nhỏ dần.
    const k = Math.min(1, (t - flyFrom.current) / FLY_TIME);
    const e = k * k * (3 - 2 * k);
    g.position.set((world.player.x - obj.x) * e, y + (1.1 - y) * e + Math.sin(k * Math.PI) * 0.25, (world.player.z - obj.z) * e);
    g.scale.setScalar(1 - 0.7 * e);
    if (k >= 1) setGone(true);
  });
  return (
    <group position={[obj.x, 0, obj.z]}>
      {obj.model && !gone && (
        <group ref={model} position={[0, y, 0]}>
          <ObjectModelMesh model={obj.model} />
        </group>
      )}
      {obj.available && (
        <group ref={marker} position={[0, y + 0.55, 0]}>
          <mesh>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial
              color={obj.locked ? '#9ca3af' : '#f5b82e'}
              emissive={obj.locked ? '#4b5563' : '#f5b82e'}
              emissiveIntensity={0.6}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Một NPC: chạy hành vi (đứng, lang thang, đuổi theo), cập nhật vị trí và vòng va chạm. */
/** Giữ hoạt ảnh "đang đi" thêm chừng này giây sau lần nhích cuối: NPC đuổi theo dừng/đi liên tục nên không để chớp. */
const MOVING_HOLD = 0.3;

function NpcView({
  rt,
  world,
  index,
  talking,
  bubble,
  bubbleSide = 'center',
}: Readonly<{ rt: NpcRuntime; world: World; index: number; talking: boolean; bubble?: SpeechBubble; bubbleSide?: BubbleSide }>) {
  const group = useRef<Group>(null);
  const state = useRef<NpcState>(createNpcState(rt.home, rt.spot.rotY ?? 0, hashKey(rt.npc.key)));
  const movingRef = useRef(false);
  const holdRef = useRef(0);
  const [moving, setMoving] = useState(false);
  // Người ngồi (ghế đẩu quanh bàn trà, cao ~0.3 m) ngồi thật bằng xương; ai đang nói thì gật đầu.
  const npcPose = useRef<PoseState>({ sit: rt.seated ? 1 : 0, seatY: 0.3, nod: false });
  npcPose.current.nod = talking;

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
      const rushing = world.ambushKey === rt.npc.key && rt.dynamic;
      state.current = stepNpc(
        isTalking && !rt.seated ? FACE_PLAYER : rushing ? RUSH : rt.npc.params,
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
      <Figure look={rt.npc.look} anim={anim} seated={rt.seated} speaking={talking} phase={index * 0.7} pose={npcPose} />
      {bubble && <BubbleHtml b={bubble} y={rt.seated ? bubbleY(rt.npc.look) - 0.5 : bubbleY(rt.npc.look)} side={bubbleSide} />}
    </group>
  );
}

export default function RoamView({
  setId,
  regionId,
  variant,
  objects = [],
  playerLook,
  npcs,
  area,
  controller,
  paused,
  talkingKey,
  bubbles = [],
  action = null,
  onActionStep,
  onNearby,
  onInteract,
  onAmbush,
  onDodge,
  onHit,
  onFps,
  guideKeys = NO_KEYS,
  onGuides,
}: Readonly<RoamViewProps>) {
  const def = SETS[setId];
  const env = envOf(setId, regionId);
  const [dpr, setDpr] = useState(1.75);

  useEffect(() => setDpr(1.75), [setId]);
  // Tải trước model có xương của mọi người trong cảnh (song song, thay vì lần lượt khi từng người hiện ra).
  useEffect(() => {
    preloadModels([playerLook?.model, ...npcs.map((n) => n.look?.model)].filter(isCharacterModel));
  }, [playerLook, npcs]);
  useEffect(() => publish({ mode: 'roam', setId }), [setId]);

  // Dựng NPC lúc chạy: vị trí, vòng va chạm (cố định cho người ngồi/đứng, đổi tại chỗ cho người đi lại),
  // và danh sách vật cản riêng của từng NPC đi lại.
  const { world, runtimes, playerColliders } = useMemo(() => buildRoamWorld(npcs, def, area), [npcs, def, area]);
  // Hai người cùng nói (người chơi + một NPC): bong bóng bung ra hai phía ngược nhau. Một người nói: ở giữa.
  const playerBubble = bubbles.find((b) => b.key === 'player');
  const npcBubble = bubbles.find((b) => b.key !== 'player');
  const both = playerBubble !== undefined && npcBubble !== undefined;
  const [sides, setSides] = useState<{ player: BubbleSide; npc: BubbleSide }>({ player: 'left', npc: 'right' });
  const [solo, setSolo] = useState<BubbleSide>('center');
  const soloSubject = both ? null : (npcBubble?.key ?? (playerBubble ? 'player' : null));
  // Mục tiêu tương tác = NPC (vị trí đổi tại chỗ mỗi khung) + đồ vật còn dùng được (đứng yên).
  const npcTargets = useMemo<Target[]>(() => runtimes.map((r) => r.target), [runtimes]);
  useEffect(() => {
    world.targets = [
      ...npcTargets,
      ...objects.filter((o) => o.available).map((o) => ({ key: o.key, x: o.x, z: o.z, reach: OBJECT_REACH })),
    ];
  }, [world, npcTargets, objects]);

  // Đồng bộ trạng thái từ React xuống vòng lặp khung hình (đọc trong useFrame, không gây render lại).
  useEffect(() => {
    world.paused = paused;
    world.talkingKey = talkingKey;
  }, [world, paused, talkingKey]);
  const cbs = useRef<Callbacks>({ onNearby, onInteract, onAmbush, onDodge, onHit, onActionStep });
  useEffect(() => {
    cbs.current = { onNearby, onInteract, onAmbush, onDodge, onHit, onActionStep };
  }, [onNearby, onInteract, onAmbush, onDodge, onHit, onActionStep]);

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

      <SetView setId={setId} regionId={regionId} variant={variant} />

      {objects.map((o) => (
        <ObjectView key={o.key} obj={o} world={world} />
      ))}

      {runtimes.map((rt, i) => (
        <NpcView
          key={rt.npc.key}
          rt={rt}
          world={world}
          index={i}
          talking={talkingKey === rt.npc.key}
          bubble={bubbles.find((b) => b.key === rt.npc.key)}
          bubbleSide={both ? sides.npc : solo}
        />
      ))}

      <AmbushLayer runtimes={runtimes} world={world} controller={controller} cbs={cbs} />
      {both && <BubbleSideTracker world={world} npcKey={npcBubble.key} onSides={setSides} />}
      {soloSubject && <SoloSideTracker world={world} subject={soloSubject} onSide={setSolo} />}
      {onGuides && <GuideTracker world={world} keys={guideKeys} onGuides={onGuides} />}

      <Player
        look={playerLook}
        action={action}
        bubble={playerBubble}
        bubbleSide={both ? sides.player : solo}
        area={area}
        colliders={playerColliders}
        controller={controller}
        world={world}
        cbs={cbs}
      />
      <FpsProbe onFps={onFps} />
    </Canvas>
  );
}
