import type { Bounds, Collider, WalkArea } from '../game/types';
import type { RegionStyle } from './registry';
import { BODY_HEIGHT, box, circle } from './walkKit';
import { buildNhaTren } from './walk-nha-tren';
import { buildPhoTet } from './walk-pho-tet';
import { buildTramDung } from './walk-tram-dung';

/**
 * Dữ liệu vùng đi lại (bước 1 trong docs/05-gameplay.md). Thuần: chỉ import type, không đụng three/react,
 * để test node và vòng lặp khung hình dùng được.
 *
 * Mọi số liệu dưới đây là toạ độ THẾ GIỚI của hình học dựng trong sets.tsx (SanNha) và props.tsx,
 * đã cộng offset của group lồng nhau. Số dòng ghi trong comment là dòng tại thời điểm viết; nếu cảnh
 * đổi thì walk.test.ts (đọc thẳng sets.tsx/props.tsx) sẽ báo lệch.
 *
 * Chỉ vật chặn người cao ~BODY_HEIGHT ở mặt đất mới thành collider. Vật ở độ cao lớn hơn
 * (mái hiên, dầm cổng, tán cây, đèn lồng, mái nhà) thì để người đi qua bên dưới.
 */

/** Bán kính vòng tròn của NPC đứng yên. */
const ACTOR_RADIUS = 0.42;
/** Vị trí đặt collider khi toạ độ NPC không hợp lệ: xa mọi bounds nên không chặn gì. */
const INERT_POS = 1e6;


// ---------- Hình học dùng chung của sân nhà ----------

/**
 * Nhà: sets.tsx:157 `<CountryHouse position={[0, 0, -3.6]} />`;
 * props.tsx:264-265 thân nhà là hộp 7 x 2.4 x 3.6 đặt tại (0, 1.2, 0) cục bộ.
 * => x thế giới [-3.5, 3.5], z [-5.4, -1.8], cao 2.4 m.
 * Mái (y >= 2.4, props.tsx:268-276) và mái hiên kiểu Nam (props.tsx:290-293, y 2.3..2.4) nằm trên đầu: bỏ.
 * Cửa và câu đối là mặt phẳng dán lên tường (props.tsx:277-289): bỏ.
 */
const HOUSE = { x: 0, z: -3.6, hw: 3.5, hd: 1.8 };

/** Cổng làng: sets.tsx:158 `<VillageGate position={[0, 0, 5.6]} />`. */
const GATE_Z = 5.6;

/**
 * Bàn trà: sets.tsx:159 `<TeaTable position={[0, 0, -0.4]} />`;
 * props.tsx:382-383 mặt bàn là hộp 1.3 x 0.08 x 0.8 (chân nằm gọn trong mặt bàn).
 */
const TABLE = { x: 0, z: -0.4, hw: 0.65, hd: 0.4 };

/** Chậu hoa: props.tsx:47 `cylinderGeometry [0.18, 0.14, 0.24]` (bán kính miệng chậu 0.18, nhân scale). */
const POT_RADIUS = 0.18;
/** Chừa thêm để không thấy chậu lún vào người. */
const POT_MARGIN = 0.04;
/** Quất: props.tsx:55-56 quả cầu xanh icosahedron bán kính 0.42 tại y = 1.0 (nhân scale), chạm thân người. */
const QUAT_BALL_RADIUS = 0.42;

/** Đào/mai: sets.tsx:160 vị trí (-3.2, -1.2) scale 1.4. Chỉ chậu và thân, không tính tán hoa (các chấm nhỏ). */
function blossomPot(id: string, x: number, z: number, scale: number): Collider {
  return circle(id, x, z, POT_RADIUS * scale + POT_MARGIN, false);
}

/** Quất: sets.tsx:161 vị trí (3.2, -1.2) scale 1.2. Quả cầu xanh đặc ở độ cao 0.7..1.7 m nên chặn bằng cả bán kính cầu. */
function quatBall(id: string, x: number, z: number, scale: number): Collider {
  return circle(id, x, z, QUAT_BALL_RADIUS * scale, false);
}

/**
 * Cổng làng theo miền.
 * - Bắc (props.tsx:345-347): hai cột đá 0.6 x 2.8 x 0.6 tại x = ±1.4. Dầm ngang (y 2.75..3.25, props.tsx:351-352)
 *   và mái cổng (y > 3.2) ở trên đầu: bỏ. Cột chỉ rộng 0.6 m nên KHÔNG che camera: nếu che thì chỉ cần đi ngang
 *   trục cột là camera sụt từ 5.4 m xuống 1.2 m rồi bung lại (giật), và còn bị làm mượt xuyên qua chính cột.
 * - Trung/Nam (props.tsx:365-367): hai trụ gỗ 0.18 x 1.8 x 0.18 tại x = ±1.1. Xà ngang (y 1.78..1.92, props.tsx:371-372)
 *   cao hơn người 1.7 m một chút: bỏ. Trụ mảnh nên không che camera.
 */
function gate(style: RegionStyle): Collider[] {
  if (style === 'bac') {
    return [box('cong-1', -1.4, GATE_Z, 0.3, 0.3, false), box('cong-2', 1.4, GATE_Z, 0.3, 0.3, false)];
  }
  return [box('cong-1', -1.1, GATE_Z, 0.09, 0.09, false), box('cong-2', 1.1, GATE_Z, 0.09, 0.09, false)];
}

// ---------- Tre ----------

/** Bản sao `rnd` của props.tsx:22-25 (props kéo theo three/react nên không import được ở đây). */
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Bán kính thân tre: props.tsx:310 `cylinderGeometry [0.04, 0.06, h]` (đáy lớn nhất 0.06). */
const BAMBOO_STALK_RADIUS = 0.06;
/** Chừa thêm một chút cho gọn. */
const BAMBOO_MARGIN = 0.03;

/**
 * Bụi tre: props.tsx:300-322. Mỗi thân i đặt tại ((rnd(i) - 0.5) * 1.4, (rnd(i + 10) - 0.5) * 1.4) quanh gốc group
 * và nghiêng theo Euler XYZ (rx, 0, rz) với rx = (rnd(i + 30) - 0.5) * 0.2, rz = (rnd(i + 40) - 0.5) * 0.25
 * quanh gốc thân nên chân thân không đổi, còn ở độ cao người thì thân lệch (-h sin rz, h cos rz sin rx).
 * Dùng một vòng tròn tâm tại gốc group, bán kính phủ chân và phần ngang đầu của mọi thân.
 * Phần ngọn (y >= 3.3 m) cao hơn đầu người nên không tính.
 */
function bambooClump(id: string, x: number, z: number, n: number): Collider {
  let far = 0;
  for (let i = 0; i < n; i++) {
    const bx = (rnd(i) - 0.5) * 1.4;
    const bz = (rnd(i + 10) - 0.5) * 1.4;
    const rx = (rnd(i + 30) - 0.5) * 0.2;
    const rz = (rnd(i + 40) - 0.5) * 0.25;
    const topX = bx - BODY_HEIGHT * Math.sin(rz);
    const topZ = bz + BODY_HEIGHT * Math.cos(rz) * Math.sin(rx);
    far = Math.max(far, Math.hypot(bx, bz), Math.hypot(topX, topZ));
  }
  return circle(id, x, z, far + BAMBOO_STALK_RADIUS + BAMBOO_MARGIN, true);
}

// ---------- Dừa (Nam) ----------

const COCONUT_TILT = 0.12;
const COCONUT_TRUNK_RADIUS = 0.16;

/**
 * Cây dừa: props.tsx:326-328 thân cylinder bán kính đáy 0.16, cao 4.4 m, group xoay z = 0.12 rad
 * nên thân ngả về -x: ở độ cao 1.7 m lệch sin(0.12) * 1.7 ~ 0.2 m. Một vòng tròn lệch nửa độ ngả về -x
 * phủ thân từ gốc tới ngang đầu. Tàu lá ở y ~4.4 m: bỏ. Thân mảnh (r ~0.27) nên không che camera (như cột cổng).
 */
function coconut(id: string, x: number, z: number): Collider {
  const lean = Math.sin(COCONUT_TILT) * BODY_HEIGHT;
  return circle(id, x - lean / 2, z, lean / 2 + COCONUT_TRUNK_RADIUS + 0.01, false);
}

// ---------- Dựng vùng đi lại ----------

function buildSanNha(style: RegionStyle): WalkArea {
  const colliders: Collider[] = [
    box('nha', HOUSE.x, HOUSE.z, HOUSE.hw, HOUSE.hd, true),
    ...gate(style),
    box('ban-tra', TABLE.x, TABLE.z, TABLE.hw, TABLE.hd, false),
    blossomPot('cay-hoa', -3.2, -1.2, 1.4),
    quatBall('cay-quat', 3.2, -1.2, 1.2),
  ];
  if (style === 'bac') {
    // sets.tsx:164-165 hai bụi tre; sets.tsx:166-169 ao làng: đĩa tròn bán kính 3 (circleGeometry 12 cạnh) tại (8, 8).
    colliders.push(bambooClump('tre-1', -6.5, 3, 7), bambooClump('tre-2', 6.5, 2, 9), circle('ao', 8, 8, 3, false));
  } else if (style === 'trung') {
    // sets.tsx:175 một bụi tre 5 thân. Ngọn núi (sets.tsx:176-178) ở z = -16, ngoài bounds nên không cần.
    colliders.push(bambooClump('tre-1', -6.5, 2, 5));
  } else {
    // sets.tsx:184-185 hai cây dừa; sets.tsx:186-189 kênh: mặt phẳng 60 x 3 tại (0, 9.5) => z [8, 11].
    colliders.push(coconut('dua-1', -6, 2), coconut('dua-2', 6.5, 0), box('kenh', 0, 9.5, 30, 1.5, false));
  }

  // Đủ rộng quanh sân và ra ngoài cổng (z = 5.6) gần 4 m; phía sau nhà (z < -4.8) không có gì để đi tới.
  const bounds: Bounds = { minX: -9, maxX: 9, minZ: -4.8, maxZ: 9.5 };
  // Trong sân gạch, cách cổng ~1.85 m, quay mặt vào nhà (rotY = PI nhìn về -z).
  return { bounds, colliders, spawn: { x: 0, z: 3.75, rotY: Math.PI } };
}

/** Bộ dựng vùng đi lại theo bộ cảnh. Thêm cảnh mới: viết walk-<cảnh>.ts rồi đăng ký ở đây. */
const BUILDERS: Readonly<Record<string, (style: RegionStyle) => WalkArea>> = {
  'san-nha': buildSanNha,
  'nha-tren': buildNhaTren,
  'pho-tet': buildPhoTet,
  'tram-dung': buildTramDung,
};

/** Các bộ cảnh đã có dữ liệu đi lại. */
export const ROAM_SETS: readonly string[] = Object.keys(BUILDERS);

const cache = new Map<string, WalkArea>();

/**
 * Vùng đi lại của một bộ cảnh theo phong cách miền, hoặc null nếu bộ cảnh chưa hỗ trợ đi lại.
 * Kết quả được lưu lại (cùng đầu vào trả cùng object): đừng sửa nó. Phong cách lạ rơi về miền Bắc
 * giống `styleOfRegion`.
 */
export function walkAreaFor(setId: string, style: RegionStyle): WalkArea | null {
  // Object.hasOwn: tên như "constructor" hay "__proto__" không được trúng thuộc tính của Object.prototype.
  if (!Object.hasOwn(BUILDERS, setId)) return null;
  const key: RegionStyle = style === 'trung' || style === 'nam' ? style : 'bac';
  const cacheKey = `${setId}:${key}`;
  let area = cache.get(cacheKey);
  if (!area) {
    area = BUILDERS[setId]!(key);
    cache.set(cacheKey, area);
  }
  return area;
}

/**
 * Collider của NPC đứng yên (vòng tròn r ~0.42, id "npc", không che camera).
 * Trả object mới mỗi lần gọi; NPC di chuyển thì giữ object và sửa x/z tại chỗ thay vì gọi lại mỗi khung hình.
 * Toạ độ NaN/Infinity thì đặt collider ở rất xa (không chặn gì), không để NaN lan vào va chạm.
 */
export function actorCollider(x: number, z: number): Collider {
  const ok = Number.isFinite(x) && Number.isFinite(z);
  return { kind: 'circle', id: 'npc', x: ok ? x : INERT_POS, z: ok ? z : INERT_POS, r: ACTOR_RADIUS, blocksCamera: false };
}
