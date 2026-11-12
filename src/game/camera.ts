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
