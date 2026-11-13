import { wrapAngle } from './movement';
import type { CameraPose, FollowCam, Vec2 } from './types';

/** Độ cao điểm nhìn trên mặt đất (m): ngang ngực/vai nhân vật. */
const LOOK_HEIGHT = 1.15;

/** Khoảng đệm giữa camera và tường (m). */
const CLIP_MARGIN = 0.3;

/** Khoảng cách ngang tối thiểu khi bị tường che (m): gần hơn nữa thì camera nằm trong người nhân vật. */
const MIN_HORIZ = 1.2;

/** Kẹp pitch để cos(pitch) không về 0 (camera ngay đỉnh đầu) hoặc camera nằm dưới đất. */
const MIN_PITCH = 0.05;
const MAX_PITCH = 1.45;

/** Tốc độ làm mượt mặc định (1/s): hằng số thời gian ~0.1 s. Camera trễ ~ speed / rate (chạy 4.2 m/s trễ ~0.4 m). */
const DEFAULT_SMOOTH_RATE = 10;

/**
 * Camera mặc định: thấp sau lưng, nhìn xuống ~15°, cách điểm nhìn 5.6 m (ngang ~5.4 m, cao thêm ~1.4 m,
 * tức mắt camera ở y ~2.59 m). Giữ dưới 2.75 m để chui lọt dưới xà cổng làng miền Bắc
 * (props.tsx VillageGate: xà ở y 2.75..3.25); cao hơn thì mái cổng che gần hết màn hình.
 * Đóng băng để lỡ sửa nhầm thì lỗi ngay; cần bản sao thì dùng { ...DEFAULT_CAM }.
 */
export const DEFAULT_CAM: FollowCam = Object.freeze({ yaw: 0, pitch: 0.26, dist: 5.6 });

/** Cộng góc kéo vào yaw (wrap về (-π, π]). `lookDelta` không hữu hạn thì bỏ qua. Trả bản mới. */
export function applyLook(cam: FollowCam, lookDelta: number): FollowCam {
  const delta = Number.isFinite(lookDelta) ? lookDelta : 0;
  return { yaw: wrapAngle(cam.yaw + delta), pitch: cam.pitch, dist: cam.dist };
}

/** Yaw để camera nằm sau lưng nhân vật có hướng `heading` (heading + π, wrap). Heading không hữu hạn coi như 0. */
export function yawBehind(heading: number): number {
  return wrapAngle((Number.isFinite(heading) ? heading : 0) + Math.PI);
}

/**
 * Tính vị trí camera bám góc nhìn thứ ba.
 * - Điểm nhìn = (player.x, 1.15, player.z).
 * - Khoảng cách ngang = dist * cos(pitch), độ cao thêm = dist * sin(pitch).
 * - Camera = điểm nhìn + (sin yaw * ngang, cao, cos yaw * ngang).
 * - Chống xuyên tường: `clip(origin, dir, maxLen)` trả khoảng cách tới vật che đầu tiên theo hướng `dir` (đơn vị)
 *   từ `origin`, hoặc >= maxLen nếu không có (không hữu hạn cũng coi là không có). maxLen = ngang + 0.3.
 *   Nếu bị che, khoảng cách ngang rút còn max(1.2, hit - 0.3) (không bao giờ dài hơn ban đầu),
 *   độ cao co theo cùng tỷ lệ nên góc pitch giữ nguyên.
 * - Giá trị không hữu hạn trong player/cam được thay bằng mặc định an toàn, không sinh NaN.
 */
export function computeCameraPose(
  player: Vec2,
  cam: FollowCam,
  clip: (origin: Vec2, dir: Vec2, maxLen: number) => number,
): CameraPose {
  const origin: Vec2 =
    Number.isFinite(player.x) && Number.isFinite(player.z) ? player : { x: 0, z: 0 };
  const yaw = Number.isFinite(cam.yaw) ? cam.yaw : DEFAULT_CAM.yaw;
  const pitch = Number.isFinite(cam.pitch)
    ? Math.min(MAX_PITCH, Math.max(MIN_PITCH, cam.pitch))
    : DEFAULT_CAM.pitch;
  const dist = Number.isFinite(cam.dist) && cam.dist > 0 ? cam.dist : DEFAULT_CAM.dist;

  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const horiz = dist * Math.cos(pitch);
  const height = dist * Math.sin(pitch);
  const maxLen = horiz + CLIP_MARGIN;

  let scale = 1;
  const hit = clip(origin, { x: sy, z: cy }, maxLen);
  if (Number.isFinite(hit) && hit < maxLen) {
    scale = Math.min(horiz, Math.max(MIN_HORIZ, hit - CLIP_MARGIN)) / horiz;
  }

  return {
    pos: [origin.x + sy * horiz * scale, LOOK_HEIGHT + height * scale, origin.z + cy * horiz * scale],
    lookAt: [origin.x, LOOK_HEIGHT, origin.z],
  };
}

function poseIsFinite(p: CameraPose): boolean {
  return (
    Number.isFinite(p.pos[0]) &&
    Number.isFinite(p.pos[1]) &&
    Number.isFinite(p.pos[2]) &&
    Number.isFinite(p.lookAt[0]) &&
    Number.isFinite(p.lookAt[1]) &&
    Number.isFinite(p.lookAt[2])
  );
}

/**
 * Làm mượt camera kiểu mũ: mỗi bước tiến một phần 1 - exp(-rate * dt) về `next`.
 * Độc lập tốc độ khung hình (nhiều bước nhỏ cho cùng kết quả như một bước lớn, khi `next` không đổi).
 * - prev null (hoặc hỏng, không hữu hạn): nhảy thẳng tới `next`.
 * - `next` không hữu hạn: giữ `prev` (bỏ qua khung hỏng).
 * - dt NaN hoặc <= 0: giữ `prev`. dt rất lớn (tab bị treo): gần như nhảy thẳng tới `next`.
 * - rate không hữu hạn hoặc <= 0: dùng mặc định.
 * Không đổi prev/next; luôn trả object mới trừ khi trả lại đúng `prev`/`next` ở các nhánh trên.
 */
export function smoothPose(
  prev: CameraPose | null,
  next: CameraPose,
  dt: number,
  rate: number = DEFAULT_SMOOTH_RATE,
): CameraPose {
  if (prev === null || !poseIsFinite(prev)) return next;
  if (!poseIsFinite(next)) return prev;
  if (!(dt > 0)) return prev;
  const r = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_SMOOTH_RATE;
  const a = 1 - Math.exp(-r * dt);
  return {
    pos: [
      prev.pos[0] + (next.pos[0] - prev.pos[0]) * a,
      prev.pos[1] + (next.pos[1] - prev.pos[1]) * a,
      prev.pos[2] + (next.pos[2] - prev.pos[2]) * a,
    ],
    lookAt: [
      prev.lookAt[0] + (next.lookAt[0] - prev.lookAt[0]) * a,
      prev.lookAt[1] + (next.lookAt[1] - prev.lookAt[1]) * a,
      prev.lookAt[2] + (next.lookAt[2] - prev.lookAt[2]) * a,
    ],
  };
}

/** Chiều cao mắt camera khi hội thoại (m): ngang tầm mắt người lớn, hơi cao hơn để thấy bong bóng trên đầu. */
export const TALK_CAM_Y = 1.6;
/**
 * Khung dọc cần thấy khi hội thoại (m): từ chân (0) tới đỉnh bong bóng thoại trên đầu (~2.5).
 * Vùng màn hình còn nhìn thấy (NDC dọc, -1 = đáy, 1 = đỉnh): dock lựa chọn che ~30% dưới nên từ -0.4 tới 0.92.
 */
export const TALK_FRAME = { bottom: 0, top: 2.5 } as const;
export const TALK_SCREEN = { bottom: -0.4, top: 0.92 } as const;

/** Góc nhìn dọc mặc định (độ) và giới hạn cho màn hình dọc. */
export const BASE_FOV = 50;
const MAX_PORTRAIT_FOV = 76;

/**
 * Góc nhìn dọc (độ) theo tỉ lệ màn hình. Màn ngang giữ 50°. Màn dọc (điện thoại) giữ 50° thì góc ngang chỉ còn ~25°
 * (thấy bề ngang chừng 2 m ở cách 5.6 m): người chơi gần như không thấy gì hai bên, NPC và đồ vật vừa ra khỏi khung là
 * mất dấu. Nên mở rộng góc dọc khi màn càng hẹp (tối đa 76°, tránh méo hình), góc ngang lên ~41° ở tỉ lệ 0.48.
 */
export function fovForAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1) return BASE_FOV;
  return Math.min(MAX_PORTRAIT_FOV, BASE_FOV + (1 - aspect) * 50);
}

const TALK_MAX_DIST = 8;
/** Khoảng lùi tối thiểu (m) để đoạn chân -> đỉnh bong bóng (2.5 m, nhân 1.13 chừa lề) lọt vào vùng màn hình không bị dock che. */
const talkMinDist = (vf: number): number =>
  Math.max(2.8, (TALK_FRAME.top * 1.13) / ((TALK_SCREEN.top - TALK_SCREEN.bottom) * Math.tan(vf / 2)));
/** Camera hội thoại không đặt gần hơn mức này (m) trừ khi không còn chỗ nào: gần hơn thì hai người không lọt khung. */
const TALK_MIN_FREE = 2.2;
/** Một người coi là nằm trong khung ngang nếu lệch tâm không quá phần này của nửa góc nhìn ngang (tính theo tan). */
const FRAME_FILL = 0.92;
/**
 * Các độ xoay (rad) quanh hướng vuông góc đường nối mà camera được thử, để né vật cản khi chỗ chật. Tối đa ~40°:
 * xoay nhiều hơn thì camera nằm gần đường nối, hai người xếp thẳng hàng theo chiều sâu (cảnh nhìn từ sau lưng, NPC nhỏ xíu).
 */
const TALK_ANGLES = [0, 0.25, -0.25, 0.5, -0.5, 0.7, -0.7];

/**
 * Camera hội thoại: nhìn vào điểm giữa hai người từ một phía, lùi đủ xa để cả hai lọt vào chiều ngang màn hình
 * (điện thoại dọc hẹp nên phải lùi nhiều), căn khung dọc để từ chân tới đỉnh bong bóng nằm trên dock lựa chọn.
 *
 * Chỗ chật (văn phòng, lớp học đầy bàn ghế) thì một góc cố định hay đưa camera sát tường, nhìn vào khoảng trống giữa
 * hai người và cả hai ra ngoài khung. Nên THỬ nhiều góc (đổi phía, xoay quanh hướng vuông góc) và chọn góc tốt nhất:
 * người chơi trong khung > NPC trong khung > không bị vật cản che hai người > gần góc vuông > lùi xa. Nếu cả hai
 * không thể lọt khung thì ngắm vào người chơi (luôn thấy mình). Không có góc nào đủ chỗ thì dùng cách cũ: sát nhất 1.8 m.
 * `clip` như ở computeCameraPose. `aspect` = rộng/cao, `vfov` = góc nhìn dọc (rad). Đầu vào hỏng thì dùng giá trị an toàn.
 */
export function computeTalkPose(
  player: Vec2,
  npc: Vec2,
  aspect: number,
  vfov: number,
  clip: (origin: Vec2, dir: Vec2, maxLen: number) => number,
): CameraPose {
  const px = Number.isFinite(player.x) ? player.x : 0;
  const pz = Number.isFinite(player.z) ? player.z : 0;
  const nx = Number.isFinite(npc.x) ? npc.x : px;
  const nz = Number.isFinite(npc.z) ? npc.z : pz;
  const mid: Vec2 = { x: (px + nx) / 2, z: (pz + nz) / 2 };

  const dx = nx - px;
  const dz = nz - pz;
  const sep = Math.hypot(dx, dz);
  // Hai người trùng nhau: lấy hướng +z làm đường nối.
  const ux = sep > 1e-6 ? dx / sep : 0;
  const uz = sep > 1e-6 ? dz / sep : 1;
  const sx = -uz;
  const sz = ux;

  const ar = Number.isFinite(aspect) && aspect > 0 ? Math.max(0.3, aspect) : 1;
  const vf = Number.isFinite(vfov) && vfov > 0.1 && vfov < 3 ? vfov : 0.87;
  const tanH = Math.tan(vf / 2) * ar; // tan(nửa góc ngang)
  const minDist = talkMinDist(vf);
  // Chiều ngang (màn dọc hẹp) cần lùi nhiều hơn chiều dọc; lấy cái lớn hơn, nhân 1.15 để chừa lề.
  const fit = (separation: number): number => (1.15 * (separation / 2 + 0.8)) / tanH;
  const wantFor = (separation: number): number => Math.min(TALK_MAX_DIST, Math.max(minDist, fit(separation)));
  const wantMid = wantFor(sep);
  const wantPlayer = wantFor(0);

  // Infinity = không có vật cản (như computeCameraPose); NaN hoặc âm = đầu vào hỏng, coi là bị chặn sát.
  const room = (aim: Vec2, d: Vec2, want: number): number => {
    const v = clip(aim, d, want + CLIP_MARGIN);
    return Number.isNaN(v) || v < 0 ? 0 : Math.min(v, want + CLIP_MARGIN);
  };

  interface Cand { cx: number; cz: number; aim: Vec2; dist: number; score: number }
  let best: Cand | null = null;

  const consider = (aim: Vec2, want: number, bx: number, bz: number, angle: number, bonus: number): void => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const dir: Vec2 = { x: bx * c - bz * s, z: bx * s + bz * c };
    const dist = Math.min(want, room(aim, dir, want) - CLIP_MARGIN);
    if (!(dist >= TALK_MIN_FREE)) return;
    const cx = aim.x + dir.x * dist;
    const cz = aim.z + dir.z * dist;
    const ax = -dir.x;
    const az = -dir.z; // trục nhìn nằm ngang: từ camera về điểm ngắm
    let score = bonus + dist * 4 - Math.abs(angle) * 25;
    let playerOffset = 0; // độ lệch tâm của người chơi (0 = giữa khung, 1 = mép), theo tỉ lệ tan
    let npcVisible = false;
    for (const [who, isPlayer, wVisible, wLos] of [[{ x: px, z: pz }, true, 1000, 150], [{ x: nx, z: nz }, false, 500, 80]] as const) {
      const vx = who.x - cx;
      const vz = who.z - cz;
      const fwd = vx * ax + vz * az;
      const off = fwd > 0.3 ? Math.abs(vx * az - vz * ax) / fwd / tanH : Infinity;
      if (off <= FRAME_FILL) {
        score += wVisible;
        if (isPlayer) playerOffset = off;
        else npcVisible = true;
      }
      const len = Math.hypot(vx, vz);
      if (len > 1e-6) {
        const hit = clip({ x: cx, z: cz }, { x: vx / len, z: vz / len }, len);
        // Chạm vật cản trước khi tới người đó (chừa 0.5 m vì người đứng sát bàn ghế): bị che.
        if (Number.isFinite(hit) && hit >= len - 0.5) score += wLos;
      }
    }
    // NPC ngoài khung: người chơi nằm sát mép kém hơn nằm giữa, nên ngắm vào người chơi thay vì điểm giữa.
    // (Khi cả hai cùng lọt khung thì không phạt, giữ khung điểm giữa.)
    if (!npcVisible) score -= 40 * playerOffset;
    if (best === null || score > best.score) best = { cx, cz, aim, dist, score };
  };

  for (const sign of [1, -1]) {
    for (const a of TALK_ANGLES) {
      consider(mid, wantMid, sign * sx, sign * sz, a, 0);
      // Ngắm vào người chơi: dùng khi hai người không thể cùng lọt khung (trừ điểm nhẹ để ưu tiên ngắm điểm giữa khi cả hai cùng lọt khung).
      if (sep > 1e-6) consider({ x: px, z: pz }, wantPlayer, sign * sx, sign * sz, a, -10);
    }
  }

  let aim: Vec2;
  let camX: number;
  let camZ: number;
  let dist: number;
  if (best !== null) {
    const b: Cand = best;
    aim = b.aim;
    camX = b.cx;
    camZ = b.cz;
    dist = b.dist;
  } else {
    // Không góc nào đủ chỗ: cách cũ, phía còn trống hơn, sát nhất 1.8 m.
    const farApart = fit(sep) > TALK_MAX_DIST;
    aim = farApart ? { x: px, z: pz } : mid;
    const want = farApart ? wantPlayer : wantMid;
    const a = room(aim, { x: sx, z: sz }, want);
    const b = room(aim, { x: -sx, z: -sz }, want);
    const sign = a >= b ? 1 : -1;
    dist = Math.min(want, Math.max(1.8, Math.max(a, b) - CLIP_MARGIN));
    camX = aim.x + sign * sx * dist;
    camZ = aim.z + sign * sz * dist;
  }

  // Đặt điểm giữa khung dọc (chân → đỉnh bong bóng) vào giữa vùng màn hình còn nhìn thấy (trên dock):
  // góc tới điểm đó trừ đi độ lệch của tâm vùng nhìn thấy so với tâm màn hình.
  const subjectY = (TALK_FRAME.bottom + TALK_FRAME.top) / 2;
  const bandCenter = (TALK_SCREEN.bottom + TALK_SCREEN.top) / 2;
  const pitch = Math.atan((subjectY - TALK_CAM_Y) / dist) - Math.atan(bandCenter * Math.tan(vf / 2));
  const ty = TALK_CAM_Y + dist * Math.tan(pitch);

  return { pos: [camX, TALK_CAM_Y, camZ], lookAt: [aim.x, ty, aim.z] };
}
