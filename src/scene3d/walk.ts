import type { Bounds, Collider, WalkArea } from '../game/types';
import type { RegionStyle } from './registry';
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

/** Các bộ cảnh đã có dữ liệu đi lại. Thêm set mới thì thêm cả case trong walkAreaFor. */
export const ROAM_SETS: readonly string[] = ['san-nha', 'cuoi-nam', 'pho-tet', 'tram-dung'];

/** Chiều cao người chơi (m), khớp Figure: đầu ở y ~1.42 + bán kính đầu. */
const BODY_HEIGHT = 1.7;
/** Bán kính vòng tròn của NPC đứng yên. */
const ACTOR_RADIUS = 0.42;
/** Vị trí đặt collider khi toạ độ NPC không hợp lệ: xa mọi bounds nên không chặn gì. */
const INERT_POS = 1e6;

function circle(id: string, x: number, z: number, r: number, blocksCamera: boolean): Collider {
  return { kind: 'circle', id, x, z, r, blocksCamera };
}

function box(id: string, x: number, z: number, hw: number, hd: number, blocksCamera: boolean): Collider {
  return { kind: 'box', id, x, z, hw, hd, blocksCamera };
}

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

// ---------- Văn phòng / lớp học cuối năm (chặng 1) ----------

/**
 * Mặt bằng phòng 12 x 10 m (x -6..6, z -5..5), dàn cảnh hở phía trước (z = +5) để camera sau lưng không bị tường che,
 * cửa ra ở tường phải. NGUỒN DUY NHẤT cho cả hình dựng (sets.tsx: CuoiNam) lẫn vật cản bên dưới: sửa số ở đây thì
 * hình và va chạm đổi cùng nhau. Hai biến thể (văn phòng / lớp học) dùng chung mặt bằng, chỉ khác trang trí.
 */
export const CUOI_NAM = {
  /** Mặt trong của tường: sau (z), trái/phải (x). Tường dày 0.3, cao 3. */
  wallBackZ: -4.95,
  wallSideX: 5.95,
  wallThick: 0.3,
  wallHeight: 3,
  /** Mép trước của sàn (dàn cảnh hở). */
  frontZ: 4.7,
  /** Khe cửa trên tường phải, theo z. */
  door: { z0: 1.4, z1: 3.0 },
  /** Mặt bàn 1.4 x 0.75; ghế đặt sau bàn 0.55 m (phía +z). Bàn 1-2 hàng sau, bàn 3-4 hàng trước; bàn 4 là bàn của bạn. */
  desk: { w: 1.4, d: 0.75, chairBack: 0.55 },
  desks: [
    { x: -3.6, z: -2.6 },
    { x: -2.2, z: -2.6 },
    { x: -3.6, z: 0.2 },
    { x: -2.2, z: 0.2 },
  ],
  /** Bàn sếp / bàn giáo viên 1.8 x 0.8, ghế phía sau (gần tường). */
  bossDesk: { x: 2.6, z: -3.2, w: 1.8, d: 0.8 },
  /** Quầy pha cà phê / bàn liên hoan sát tường phải. */
  counter: { x: 5.3, z: -2.2, w: 0.9, d: 2.0 },
  /** Móc treo áo cạnh cửa. */
  coatRack: { x: 5.3, z: 0.4, r: 0.3 },
  /** Chậu quất góc sau trái, chậu đào/mai góc trước trái. */
  plants: [
    { x: -5.3, z: -4.3, r: 0.5 },
    { x: -5.3, z: 4.1, r: 0.45 },
  ],
} as const;

function buildCuoiNam(): WalkArea {
  const L = CUOI_NAM;
  const half = L.wallThick / 2;
  const sideHalfLen = (L.frontZ - L.wallBackZ) / 2 + half;
  const deskBox = (id: string, x0: number, x1: number, z: number): Collider => {
    // Gộp bàn liền nhau + ghế phía sau: z từ mép trước mặt bàn tới lưng ghế.
    const zMin = z - L.desk.d / 2;
    const zMax = z + L.desk.chairBack + 0.25;
    return box(id, (x0 + x1) / 2, (zMin + zMax) / 2, (x1 - x0) / 2, (zMax - zMin) / 2, false);
  };
  const row = (i: number, j: number) => {
    const a = L.desks[i]!;
    const b = L.desks[j]!;
    return deskBox(`ban-${i + 1}-${j + 1}`, Math.min(a.x, b.x) - L.desk.w / 2, Math.max(a.x, b.x) + L.desk.w / 2, a.z);
  };
  const b = L.bossDesk;
  // Bàn sếp: mặt bàn + ghế phía sau (về phía tường), tổng sâu ~1.3 m.
  const bossZMin = b.z - b.d / 2 - 0.55;
  const bossZMax = b.z + b.d / 2;
  const rightLowLen = L.door.z0 - (L.wallBackZ - L.wallThick);
  const rightHighLen = L.frontZ + L.wallThick - L.door.z1;
  const colliders: Collider[] = [
    box('tuong-sau', 0, L.wallBackZ - half, L.wallSideX + L.wallThick, half, true),
    box('tuong-trai', -L.wallSideX - half, (L.wallBackZ + L.frontZ) / 2, half, sideHalfLen, true),
    box('tuong-phai-1', L.wallSideX + half, L.door.z0 - rightLowLen / 2, half, rightLowLen / 2, true),
    box('tuong-phai-2', L.wallSideX + half, L.door.z1 + rightHighLen / 2, half, rightHighLen / 2, true),
    row(0, 1),
    row(2, 3),
    box('ban-sep', b.x, (bossZMin + bossZMax) / 2, b.w / 2, (bossZMax - bossZMin) / 2, false),
    box('quay', L.counter.x, L.counter.z, L.counter.w / 2, L.counter.d / 2, false),
    circle('moc-ao', L.coatRack.x, L.coatRack.z, L.coatRack.r, false),
    ...L.plants.map((p, i) => circle(`chau-${i + 1}`, p.x, p.z, p.r, false)),
  ];
  const bounds: Bounds = { minX: -L.wallSideX, maxX: L.wallSideX, minZ: L.wallBackZ, maxZ: L.frontZ };
  // Đứng giữa lối đi phía trước, quay mặt vào phòng (rotY = PI nhìn về -z).
  return { bounds, colliders, spawn: { x: 0.6, z: 3.6, rotY: Math.PI } };
}

// ---------- Phố Tết ngày 28 tháng Chạp (chặng Ra bến) ----------

/**
 * Chỉ đi lại trên vỉa hè bắc dọc mặt tiền nhà phố; lòng đường có xe máy chạy (chỉ để nhìn) nằm ngoài vùng đi lại.
 * NGUỒN DUY NHẤT cho hình dựng (sets.tsx: PhoTet, props-street.tsx) và vật cản bên dưới.
 * - Mặt tiền nhà phố z = -3.8 (nhà sâu 4, dựng tại z = -5.8). Vùng đi lại z từ -3.7 tới -1.7: làn xe đầu tiên ở z = -0.9
 *   (xe rộng 0.64 => mép -1.22) nên người chơi (r 0.35) không chạm xe.
 * - Sạp quà sát nhà phố; hàng chậu hoa/quất dọc mặt tiền, bỏ hai chậu ở chỗ sạp và chỗ trạm xe buýt.
 * - Trạm xe buýt ở mé đông: ghế chờ + hai trụ (mái ở độ cao 2.55 m nên đi qua bên dưới), cột biển ở đầu đông.
 */
export const PHO_TET = {
  bounds: { minX: -12.5, maxX: 13, minZ: -3.7, maxZ: -1.7 },
  /** Mặt vỉa hè (m): người đứng ở y = 0 nên vỉa hè dựng thấp, gần như ngang mặt đường. */
  sidewalkTop: 0.05,
  /** Nhà phố: tâm (z), nửa sâu; mặt tiền z = -3.8. */
  houses: { z: -5.8, hd: 2.0, hw: 24 },
  /** Sạp quà: tâm quầy, nửa rộng, nửa sâu. */
  stall: { x: -3.0, z: -3.4, hw: 1.3, hd: 0.4 },
  /** Hàng chậu: vị trí x = x0 + i * step; chậu cách sạp / trạm trong "skip" thì bỏ. */
  pots: { z: -3.2, x0: -9, step: 2.2, count: 9, skipNearStall: 1.9, skipNearBus: 1.8 },
  /** Trạm xe buýt: tâm ghế chờ; mái/lưng quay về phía nhà phố (nhóm xoay PI). */
  bus: { x: 10, z: -2.9, benchHw: 0.7, benchHd: 0.2, postDx: 1.1, postDz: -0.15, postR: 0.1, signDx: 2.0, signDz: 0.9, signR: 0.06 },
} as const;

export interface PhoPot {
  x: number;
  z: number;
  kind: 'hoa' | 'quat';
}

/** Hàng chậu trên vỉa hè (cũng dùng để dựng hình trong sets.tsx để hình và va chạm không lệch). */
export function phoPots(): PhoPot[] {
  const L = PHO_TET;
  const out: PhoPot[] = [];
  for (let i = 0; i < L.pots.count; i++) {
    const x = L.pots.x0 + i * L.pots.step;
    if (Math.abs(x - L.stall.x) < L.pots.skipNearStall) continue;
    if (Math.abs(x - L.bus.x) < L.pots.skipNearBus) continue;
    out.push({ x, z: L.pots.z, kind: i % 3 === 2 ? 'quat' : 'hoa' });
  }
  return out;
}

function buildPhoTet(): WalkArea {
  const L = PHO_TET;
  const colliders: Collider[] = [
    box('nha-pho', 0, L.houses.z, L.houses.hw, L.houses.hd, true),
    ...phoPots().map((p, i) => circle(`chau-${i + 1}`, p.x, p.z, p.kind === 'quat' ? 0.4 : 0.2, false)),
    box('sap-qua', L.stall.x, L.stall.z, L.stall.hw, L.stall.hd, false),
    box('ghe-ben', L.bus.x, L.bus.z, L.bus.benchHw, L.bus.benchHd, false),
    circle('tru-ben-1', L.bus.x - L.bus.postDx, L.bus.z + L.bus.postDz, L.bus.postR, false),
    circle('tru-ben-2', L.bus.x + L.bus.postDx, L.bus.z + L.bus.postDz, L.bus.postR, false),
    circle('cot-bien-ben', L.bus.x + L.bus.signDx, L.bus.z + L.bus.signDz, L.bus.signR, false),
  ];
  // Xuất phát ở đầu tây vỉa hè, quay mặt về phía đông (rotY = PI/2 nhìn về +x).
  return { bounds: { ...L.bounds }, colliders, spawn: { x: -11, z: -2.7, rotY: Math.PI / 2 } };
}

let phoTetCache: WalkArea | undefined;
const tramDungCache: Record<RegionStyle, WalkArea | undefined> = { bac: undefined, trung: undefined, nam: undefined };
let cuoiNamCache: WalkArea | undefined;

const cache: Record<RegionStyle, WalkArea | undefined> = { bac: undefined, trung: undefined, nam: undefined };

/**
 * Vùng đi lại của một bộ cảnh theo phong cách miền, hoặc null nếu bộ cảnh chưa hỗ trợ đi lại.
 * Kết quả được lưu lại (cùng đầu vào trả cùng object): đừng sửa nó. Phong cách lạ rơi về miền Bắc
 * giống `styleOfRegion`.
 */
export function walkAreaFor(setId: string, style: RegionStyle): WalkArea | null {
  switch (setId) {
    case 'san-nha': {
      const key: RegionStyle = style === 'trung' || style === 'nam' ? style : 'bac';
      return (cache[key] ??= buildSanNha(key));
    }
    case 'cuoi-nam':
      // Trong nhà: không đổi theo miền.
      return (cuoiNamCache ??= buildCuoiNam());
    case 'pho-tet':
      // Vật cản không đổi theo miền (miền chỉ đổi loại hoa trên chậu).
      return (phoTetCache ??= buildPhoTet());
    case 'tram-dung': {
      // Vùng đi lại giống nhau cho 3 miền (miền chỉ đổi chi tiết nhỏ), vẫn lưu theo phong cách để khỏi dựng lại.
      const key: RegionStyle = style === 'trung' || style === 'nam' ? style : 'bac';
      return (tramDungCache[key] ??= buildTramDung(key));
    }
    default:
      return null;
  }
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
