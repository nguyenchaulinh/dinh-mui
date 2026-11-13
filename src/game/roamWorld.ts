import type { Lens, Look, Serve, Shooter } from '../engine/types';
import type { SetDef, Spot } from '../scene3d/registry';
import { actorCollider } from '../scene3d/walk';
import type { Target } from './interact';
import { PLAYER_RADIUS } from './movement';
import type { NpcParams } from './npc';
import type { Collider, Vec2, WalkArea } from './types';

/**
 * Dựng thế giới chế độ đi lại từ danh sách NPC: vị trí, vòng va chạm, vật cản của từng NPC, vật cản của người chơi.
 * Hàm thuần (không import react/three) để test được.
 */

export interface RoamNpc {
  /** Id nhân vật (cũng là khoá của NPC). */
  key: string;
  look?: Look;
  /** Tên vị trí xuất phát trong set (xem registry.ts); spot.seated thì ngồi. */
  spot: string;
  params: NpcParams;
  /** Tầm tương tác riêng (m); thiếu thì mặc định. */
  reach?: number;
  /** Có thì NPC này bắn bong bóng câu hỏi về phía người chơi. */
  shoots?: Shooter;
  /** Có thì NPC này nhận vật phẩm người chơi cầm. */
  serve?: Serve;
  /** Có thì NPC này cầm điện thoại quay người chơi (nón nhìn). */
  lens?: Lens;
}

/** Trạm tương tác (không phải người): chỉ cần vị trí và tầm. */
export interface RoamStation {
  /** Khoá mục tiêu, dạng "station:<id>". */
  key: string;
  /** Tên spot trong set. */
  spot: string;
  reach?: number;
}

export type MutCircle = Extract<Collider, { kind: 'circle' }>;

/** Phần trạng thái dùng chung giữa người chơi và NPC, thay đổi tại chỗ mỗi khung (không qua React state). */
export interface World {
  player: Vec2;
  paused: boolean;
  talkingKey: string | null;
  bounds: WalkArea['bounds'];
  targets: Target[];
  playerCol: MutCircle;
}

export interface NpcRuntime {
  npc: RoamNpc;
  spot: Spot;
  home: Vec2;
  seated: boolean;
  /** Đi lại được (không ngồi, hành vi khác stand). */
  dynamic: boolean;
  radius: number;
  /** Vòng va chạm của NPC (dynamic thì thay đổi tại chỗ theo vị trí). */
  col: Collider;
  target: Target;
  /** Vật cản NPC này phải tránh (tường, bàn, người chơi, NPC khác); chỉ có khi dynamic. */
  obstacles: Collider[];
}

export interface BuiltWorld {
  /** Mục tiêu tương tác của các trạm (đã nằm trong world.targets); dùng để bật/tắt theo điều kiện. */
  stationTargets: Target[];
  world: World;
  runtimes: NpcRuntime[];
  /** Vật cản của NGƯỜI CHƠI: tường, đồ vật, NPC cố định (người ngồi). KHÔNG gồm NPC đi lại. */
  playerColliders: Collider[];
}

const DOG_RADIUS = 0.28;
const NPC_RADIUS = 0.36;

export function buildRoamWorld(
  npcs: readonly RoamNpc[],
  def: Pick<SetDef, 'spots'> | undefined,
  area: WalkArea,
  stations: readonly RoamStation[] = [],
): BuiltWorld {
  const playerCol: MutCircle = { kind: 'circle', id: 'player', x: area.spawn.x, z: area.spawn.z, r: PLAYER_RADIUS };

  const runtimes = npcs.flatMap((npc): NpcRuntime[] => {
    const spot = def?.spots[npc.spot];
    if (!spot) return [];
    const seated = spot.seated === true;
    const dynamic = !seated && npc.params.behavior !== 'stand';
    const radius = npc.look?.kind === 'dog' ? DOG_RADIUS : NPC_RADIUS;
    const home = { x: spot.pos[0], z: spot.pos[2] };
    const col: Collider = dynamic
      ? { kind: 'circle', id: `npc-${npc.key}`, x: home.x, z: home.z, r: radius }
      : actorCollider(home.x, home.z);
    return [
      {
        npc,
        spot,
        home,
        seated,
        dynamic,
        radius,
        col,
        target: { key: npc.key, x: home.x, z: home.z, reach: npc.reach },
        obstacles: [],
      },
    ];
  });

  const fixed = runtimes.filter((r) => !r.dynamic).map((r) => r.col);
  const moving = runtimes.filter((r) => r.dynamic).map((r) => r.col);
  for (const r of runtimes) {
    if (r.dynamic) r.obstacles = [...area.colliders, ...fixed, playerCol, ...moving.filter((c) => c !== r.col)];
  }

  // Trạm: chỉ là điểm tương tác (hình ảnh nằm trong set), không có vòng va chạm riêng.
  const stationTargets: Target[] = stations.flatMap((st) => {
    const spot = def?.spots[st.spot];
    return spot ? [{ key: st.key, x: spot.pos[0], z: spot.pos[2], reach: st.reach }] : [];
  });

  const world: World = {
    player: { x: area.spawn.x, z: area.spawn.z },
    paused: false,
    talkingKey: null,
    bounds: area.bounds,
    targets: [...runtimes.map((r) => r.target), ...stationTargets],
    playerCol,
  };

  // Người chơi KHÔNG va chạm với NPC đi lại (chó, Bin): nếu có thì NPC đỗ ở miệng hẻm cạnh bàn trà sẽ chặn
  // người chơi vĩnh viễn (NPC không nhường đường). NPC vẫn tránh người chơi nhờ `playerCol` trong vật cản của chúng,
  // nên bị đi xuyên thì tự được đẩy ra.
  return { world, runtimes, stationTargets, playerColliders: [...area.colliders, ...fixed] };
}
