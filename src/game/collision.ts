import type { Bounds, Collider, Vec2 } from './types';

/**
 * Va chạm 2D trên mặt phẳng XZ cho chế độ điều khiển nhân vật (bước 1 trong docs/05-gameplay.md).
 * Toàn bộ là hàm thuần, không import three/react nên chạy được trong môi trường node.
 *
 * QUY ƯỚC XOAY HỘP (khớp src/game/types.ts và `rotation.y` của three.js):
 *   Hộp có rotY = θ. Trong thế giới, trục z cục bộ chỉ về (sin θ, cos θ),
 *   trục x cục bộ chỉ về (cos θ, -sin θ).
 *   Thế giới -> cục bộ = xoay điểm (p - tâm) quanh trục y một góc -θ, với (dx, dz) = p - tâm:
 *     lx =  dx·cos θ - dz·sin θ
 *     lz =  dx·sin θ + dz·cos θ
 *   Cục bộ -> thế giới = xoay một góc +θ:
 *     dx =  lx·cos θ + lz·sin θ
 *     dz = -lx·sin θ + lz·cos θ
 *   Cùng công thức dùng cho vector hướng (chỉ xoay, không tịnh tiến).
 *
 * THUẬT TOÁN: chia nhỏ bước di chuyển, mỗi bước đẩy đường tròn ra khỏi các vật cản theo pháp tuyến
 * (nên thành phần tiếp tuyến của chuyển động được giữ lại, tức là trượt dọc vật cản).
 */

/** Khe hở giữ lại sau khi đẩy ra, để sai số làm tròn không bị báo thành "đang chạm". */
const SKIN = 1e-4;
/** Số vòng lặp tối đa khi giải nhiều vật cản chồng nhau (góc giữa hai hộp hội tụ sau 2-3 vòng). */
const MAX_ITER = 6;
/** Số bước con tối đa cho một lần gọi. Delta cực lớn bị cắt bớt thay vì tốn CPU hoặc xuyên tường. */
const MAX_SUBSTEPS = 512;
/** Độ dài bước con nhỏ nhất (khi bán kính bằng 0). */
const MIN_STEP = 0.01;
const EPS = 1e-12;

/**
 * Kết quả của probe(): pháp tuyến đơn vị theo hướng đẩy ra và độ lún.
 * Dùng chung một object ở mức module để vòng lặp nóng không cấp phát (an toàn vì code đồng bộ, không đệ quy).
 */
const hit = { nx: 0, nz: 0, depth: 0 };

function finite2(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b);
}

function isFiniteBounds(b: Bounds): boolean {
  return (
    Number.isFinite(b.minX) && Number.isFinite(b.maxX) && Number.isFinite(b.minZ) && Number.isFinite(b.maxZ)
  );
}

/** Bán kính không hợp lệ (NaN, Infinity, âm) coi như 0. */
function cleanRadius(radius: number): number {
  return Number.isFinite(radius) && radius > 0 ? radius : 0;
}

/** Kẹp v vào [min + r, max - r]. Nếu vùng co lại bị rỗng thì lấy trung điểm. */
function clampAxis(v: number, min: number, max: number, r: number): number {
  const lo = min + r;
  const hi = max - r;
  if (lo > hi) return (min + max) * 0.5;
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Đường tròn (px, pz, r) có lún vào vật cản c không. Nếu có: ghi pháp tuyến đẩy ra và độ lún vào `hit`, trả true.
 * "Lún" là chồng lấn thực sự (độ lún > 0); chạm đúng tiếp xúc thì chưa tính.
 */
function probe(px: number, pz: number, r: number, c: Collider): boolean {
  const dx = px - c.x;
  const dz = pz - c.z;

  if (c.kind === 'circle') {
    const rr = r + Math.abs(c.r);
    if (!Number.isFinite(rr)) return false;
    const d2 = dx * dx + dz * dz;
    if (!(d2 < rr * rr)) return false;
    const d = Math.sqrt(d2);
    if (d < EPS) {
      // Trùng tâm: chọn hướng cố định để kết quả ổn định.
      hit.nx = 1;
      hit.nz = 0;
    } else {
      hit.nx = dx / d;
      hit.nz = dz / d;
    }
    hit.depth = rr - d;
    return true;
  }

  const hw = Math.abs(c.hw);
  const hd = Math.abs(c.hd);
  // Loại nhanh: mọi điểm của hộp (kể cả xoay) cách tâm không quá hw + hd theo mỗi trục.
  const ext = hw + hd + r;
  if (Math.abs(dx) >= ext || Math.abs(dz) >= ext) return false;

  // Sang toạ độ cục bộ của hộp (công thức ở đầu file).
  const rot = c.rotY;
  let cos = 1;
  let sin = 0;
  let lx = dx;
  let lz = dz;
  if (rot !== undefined && rot !== 0) {
    cos = Math.cos(rot);
    sin = Math.sin(rot);
    lx = dx * cos - dz * sin;
    lz = dx * sin + dz * cos;
  }

  // Điểm gần tâm đường tròn nhất trên hộp.
  const cx = lx < -hw ? -hw : lx > hw ? hw : lx;
  const cz = lz < -hd ? -hd : lz > hd ? hd : lz;
  const ox = lx - cx;
  const oz = lz - cz;
  const d2 = ox * ox + oz * oz;

  let nlx: number;
  let nlz: number;
  let depth: number;
  if (d2 > 0) {
    // Tâm nằm ngoài hộp: đẩy theo hướng từ điểm gần nhất ra tâm.
    if (!(d2 < r * r)) return false;
    const d = Math.sqrt(d2);
    nlx = ox / d;
    nlz = oz / d;
    depth = r - d;
  } else {
    // Tâm nằm trong (hoặc đúng trên biên) hộp: đẩy ra mặt gần nhất.
    const gx = hw - Math.abs(lx);
    const gz = hd - Math.abs(lz);
    if (gx <= gz) {
      nlx = lx < 0 ? -1 : 1;
      nlz = 0;
      depth = gx + r;
    } else {
      nlx = 0;
      nlz = lz < 0 ? -1 : 1;
      depth = gz + r;
    }
    // Cũng loại luôn trường hợp NaN (so sánh với NaN luôn sai).
    if (!(depth > 0)) return false;
  }

  // Pháp tuyến cục bộ -> thế giới.
  hit.nx = nlx * cos + nlz * sin;
  hit.nz = -nlx * sin + nlz * cos;
  hit.depth = depth;
  return true;
}

/**
 * Đưa p về vị trí hợp lệ: ngoài mọi vật cản, trong bounds co lại r. Sửa p tại chỗ.
 * Trả true nếu vòng cuối không còn gì phải sửa (vị trí sạch), false nếu hết vòng lặp mà vẫn còn lún.
 */
function settle(p: Vec2, r: number, colliders: readonly Collider[], b: Bounds): boolean {
  for (let it = 0; it < MAX_ITER; it++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c !== undefined && probe(p.x, p.z, r, c)) {
        const push = hit.depth + SKIN;
        p.x += hit.nx * push;
        p.z += hit.nz * push;
        moved = true;
      }
    }
    const nx = clampAxis(p.x, b.minX, b.maxX, r);
    const nz = clampAxis(p.z, b.minZ, b.maxZ, r);
    if (nx !== p.x || nz !== p.z) {
      p.x = nx;
      p.z = nz;
      moved = true;
    }
    if (!moved) return true;
  }
  return false;
}

/**
 * Vị trí mới của đường tròn bán kính `radius` đi từ `from` thêm `delta`.
 *
 * - Trượt dọc vật cản (không dính tường), xử lý được góc giữa nhiều vật cản.
 * - Chia nhỏ bước khi |delta| > radius * 0.5 nên không xuyên vật cản mỏng. Delta dài hơn
 *   khoảng 512 bước con (vài chục mét với bán kính thông thường) bị cắt bớt.
 * - Tâm luôn nằm trong bounds co lại `radius`; nếu bounds nhỏ hơn 2 * radius thì lấy tâm bounds.
 * - Nếu `from` đã nằm trong vật cản thì bị đẩy ra theo hướng gần nhất.
 * - Nếu bị kẹp giữa hai vật cản không giải được thì đứng yên tại vị trí hợp lệ trước đó.
 * - `from` hoặc `delta` không hữu hạn: trả bản sao của `from` (hoặc tâm bounds nếu `from` cũng hỏng).
 *   `radius` không hợp lệ coi như 0. Không ném lỗi.
 *
 * Luôn trả object mới (không sửa `from`).
 */
export function resolveMove(
  from: Vec2,
  delta: Vec2,
  radius: number,
  colliders: readonly Collider[],
  bounds: Bounds,
): Vec2 {
  if (!isFiniteBounds(bounds)) {
    return finite2(from.x, from.z) ? { x: from.x, z: from.z } : { x: 0, z: 0 };
  }
  if (!finite2(from.x, from.z)) {
    return { x: (bounds.minX + bounds.maxX) * 0.5, z: (bounds.minZ + bounds.maxZ) * 0.5 };
  }
  const p: Vec2 = { x: from.x, z: from.z };
  const dx = delta.x;
  const dz = delta.z;
  if (!finite2(dx, dz)) return p;

  const r = cleanRadius(radius);

  // Đưa điểm xuất phát về hợp lệ trước (đẩy ra nếu đang nằm trong vật cản).
  let prevOk = settle(p, r, colliders, bounds);

  const len = Math.sqrt(dx * dx + dz * dz);
  if (!Number.isFinite(len)) return p;
  if (len > 0) {
    const stepMax = Math.max(r * 0.5, MIN_STEP);
    const total = Math.min(len, stepMax * MAX_SUBSTEPS);
    const n = Math.ceil(total / stepMax);
    const step = total / n;
    const sx = (dx / len) * step;
    const sz = (dz / len) * step;
    for (let i = 0; i < n; i++) {
      const prevX = p.x;
      const prevZ = p.z;
      p.x += sx;
      p.z += sz;
      if (settle(p, r, colliders, bounds)) {
        prevOk = true;
      } else if (prevOk) {
        // Kẹp giữa hai vật cản không giải được: đứng yên thay vì lọt vào trong.
        p.x = prevX;
        p.z = prevZ;
        break;
      }
    }
  }

  // Chốt chặn cuối: không bao giờ trả NaN ra ngoài.
  if (!finite2(p.x, p.z)) return { x: from.x, z: from.z };
  return p;
}

/**
 * true nếu đường tròn tại `pos` bán kính `radius` chồng lấn vật cản hoặc vượt bounds
 * (tâm phải nằm trong bounds co lại `radius`). Chỉ chạm tiếp xúc đúng một điểm thì chưa tính là bị chặn.
 * `pos` hoặc bounds không hữu hạn: trả true (từ chối khi dữ liệu hỏng).
 *
 * Dùng radius = 0 để hỏi "tâm có nằm trong vật cản không".
 */
export function isBlocked(pos: Vec2, radius: number, colliders: readonly Collider[], bounds: Bounds): boolean {
  if (!finite2(pos.x, pos.z) || !isFiniteBounds(bounds)) return true;
  const r = cleanRadius(radius);
  if (pos.x < bounds.minX + r || pos.x > bounds.maxX - r) return true;
  if (pos.z < bounds.minZ + r || pos.z > bounds.maxZ - r) return true;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c !== undefined && probe(pos.x, pos.z, r, c)) return true;
  }
  return false;
}

/** Khoảng cách từ gốc tia (đơn vị) tới đường tròn: 0 nếu gốc nằm trong, Infinity nếu không trúng. */
function rayCircle(ox: number, oz: number, ux: number, uz: number, cx: number, cz: number, cr: number): number {
  const rad = Math.abs(cr);
  if (!Number.isFinite(rad)) return Infinity;
  const mx = ox - cx;
  const mz = oz - cz;
  const cc = mx * mx + mz * mz - rad * rad;
  if (cc < 0) return 0;
  const b = mx * ux + mz * uz;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  // Gốc nằm ngoài nên hai nghiệm cùng dấu: t < 0 nghĩa là vật cản nằm sau lưng tia.
  return t >= 0 ? t : Infinity;
}

/**
 * Khoảng cách từ gốc tia (đơn vị) tới hộp (có thể xoay): 0 nếu gốc nằm trong, Infinity nếu không trúng.
 * Dùng phương pháp slab trong toạ độ cục bộ của hộp.
 */
function rayBox(ox: number, oz: number, ux: number, uz: number, c: Extract<Collider, { kind: 'box' }>): number {
  const hw = Math.abs(c.hw);
  const hd = Math.abs(c.hd);
  let lx = ox - c.x;
  let lz = oz - c.z;
  let ldx = ux;
  let ldz = uz;
  const rot = c.rotY;
  if (rot !== undefined && rot !== 0) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const tx = lx * cos - lz * sin;
    lz = lx * sin + lz * cos;
    lx = tx;
    const tdx = ldx * cos - ldz * sin;
    ldz = ldx * sin + ldz * cos;
    ldx = tdx;
  }
  // Hộp hỏng (NaN/Infinity trong toạ độ, kích thước hoặc góc xoay) bị bỏ qua, không được coi là trúng.
  if (!finite2(lx, lz) || !finite2(hw, hd)) return Infinity;

  let tNear = -Infinity;
  let tFar = Infinity;
  if (Math.abs(ldx) < EPS) {
    if (Math.abs(lx) >= hw) return Infinity;
  } else {
    const inv = 1 / ldx;
    let t1 = (-hw - lx) * inv;
    let t2 = (hw - lx) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tNear) tNear = t1;
    if (t2 < tFar) tFar = t2;
  }
  if (Math.abs(ldz) < EPS) {
    if (Math.abs(lz) >= hd) return Infinity;
  } else {
    const inv = 1 / ldz;
    let t1 = (-hd - lz) * inv;
    let t2 = (hd - lz) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tNear) tNear = t1;
    if (t2 < tFar) tFar = t2;
  }

  // tFar <= 0: hộp nằm sau lưng tia (hoặc gốc đúng trên biên và tia đi ra ngoài).
  if (tNear > tFar || tFar <= 0) return Infinity;
  return tNear > 0 ? tNear : 0;
}

/**
 * Khoảng cách từ `origin` theo hướng `dir` (vector đơn vị trên XZ) tới vật cản ĐẦU TIÊN có
 * `blocksCamera === true`, hoặc `maxLen` nếu không có. Không bao giờ vượt `maxLen`.
 * Chỉ xét collider có blocksCamera. Nếu `origin` đã nằm trong vật cản như vậy thì trả 0.
 * Trả đúng khoảng cách tới bề mặt, người gọi tự trừ khe hở cho camera.
 *
 * `dir` được chuẩn hoá lại nếu lệch khỏi độ dài 1. Đầu vào hỏng (origin/dir không hữu hạn,
 * dir bằng 0, maxLen không hữu hạn hoặc <= 0) trả 0 để camera ép sát nhân vật thay vì xuyên tường.
 */
export function clipRay(origin: Vec2, dir: Vec2, maxLen: number, colliders: readonly Collider[]): number {
  if (!Number.isFinite(maxLen) || !(maxLen > 0)) return 0;
  if (!finite2(origin.x, origin.z) || !finite2(dir.x, dir.z)) return 0;
  let ux = dir.x;
  let uz = dir.z;
  const dl = Math.sqrt(ux * ux + uz * uz);
  if (!Number.isFinite(dl) || !(dl > 1e-9)) return 0;
  if (Math.abs(dl - 1) > 1e-6) {
    ux /= dl;
    uz /= dl;
  }

  let best = maxLen;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c === undefined || c.blocksCamera !== true) continue;
    const t =
      c.kind === 'circle'
        ? rayCircle(origin.x, origin.z, ux, uz, c.x, c.z, c.r)
        : rayBox(origin.x, origin.z, ux, uz, c);
    if (t < best) best = t;
  }
  return best;
}
