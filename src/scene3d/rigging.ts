/**
 * Dữ liệu và luật thuần cho nhân vật có xương (model CC0 trong public/models, xem public/models/CREDITS.md).
 * Không import three/react để test node được; phần dựng hình ở Rigged.tsx.
 */

/** Các model có sẵn. Người: cùng bộ xương Quaternius 62 khớp; chó: Quaternius Shiba chỉnh dáng thành Pomeranian. */
export const CHARACTER_MODELS = [
  'nam-vest',
  'nam-tho',
  'nam-nong-dan',
  'nam-hoodie',
  'nu-thuong-ngay',
  'nu-cong-so',
  'nu-hoa-tai',
  'cho-pom',
] as const;
export type CharacterModel = (typeof CHARACTER_MODELS)[number];

export const isCharacterModel = (v: unknown): v is CharacterModel =>
  typeof v === 'string' && (CHARACTER_MODELS as readonly string[]).includes(v);

/**
 * Chiều cao tư thế gốc (đơn vị của file) của từng model, đo từ khung bao POSITION của mesh nhân với biến đổi các node
 * (xem `bindHeightFromGltf`; test kiểm tra lại với chính file). Không đo lúc chạy: Box3 trên SkinnedMesh trước khi
 * cập nhật ma trận xương cho số sai ~100 lần (node mesh của FBX2glTF có scale 100), làm nhân vật bé như một chấm.
 */
export const BIND_HEIGHT: Readonly<Record<CharacterModel, number>> = {
  'nam-vest': 1.857,
  'nam-tho': 1.866,
  'nam-nong-dan': 1.856,
  'nam-hoodie': 1.87,
  'nu-thuong-ngay': 1.852,
  'nu-cong-so': 1.842,
  'nu-hoa-tai': 1.883,
  'cho-pom': 3.096,
};

type Vec3 = [number, number, number];
interface GltfNode {
  children?: number[];
  mesh?: number;
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface GltfJson {
  nodes: GltfNode[];
  meshes: { primitives: { attributes: Record<string, number> }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
}

/** Ma trận 3x4 (hàng) của một node từ TRS. */
function trs(n: GltfNode): number[][] {
  const [tx, ty, tz] = (n.translation ?? [0, 0, 0]) as Vec3;
  const [x, y, z, w] = (n.rotation ?? [0, 0, 0, 1]) as [number, number, number, number];
  const [sx, sy, sz] = (n.scale ?? [1, 1, 1]) as Vec3;
  const r = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  return [0, 1, 2].map((i) => [r[i]![0]! * sx, r[i]![1]! * sy, r[i]![2]! * sz, [tx, ty, tz][i]!]);
}

function mul(a: number[][], b: number[][]): number[][] {
  return [0, 1, 2].map((i) => [0, 1, 2, 3].map((j) => a[i]![0]! * b[0]![j]! + a[i]![1]! * b[1]![j]! + a[i]![2]! * b[2]![j]! + (j === 3 ? a[i]![3]! : 0)));
}

/** Chiều cao tư thế gốc tính từ JSON của file glTF (dùng để kiểm tra BIND_HEIGHT). */
export function bindHeightFromGltf(j: GltfJson): number {
  const parent = new Map<number, number>();
  j.nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)));
  let lo = Infinity;
  let hi = -Infinity;
  j.nodes.forEach((n, i) => {
    if (n.mesh === undefined) return;
    let m = trs(n);
    for (let k = parent.get(i); k !== undefined; k = parent.get(k)) m = mul(trs(j.nodes[k]!), m);
    for (const p of j.meshes[n.mesh]!.primitives) {
      const a = j.accessors[p.attributes.POSITION!]!;
      const mn = a.min as Vec3;
      const mx = a.max as Vec3;
      for (const x of [mn[0], mx[0]]) for (const y of [mn[1], mx[1]]) for (const z of [mn[2], mx[2]]) {
        const wy = m[1]![0]! * x + m[1]![1]! * y + m[1]![2]! * z + m[1]![3]!;
        lo = Math.min(lo, wy);
        hi = Math.max(hi, wy);
      }
    }
  });
  return hi - lo;
}

/** Đường dẫn file (tôn trọng `base` của Vite khi deploy ở thư mục con). */
export function modelUrl(model: CharacterModel, base = '/'): string {
  return `${base.endsWith('/') ? base : `${base}/`}models/${model}.glb`;
}

/** Bộ phận của model người (theo hậu tố tên mesh của Quaternius: Suit_Body, Casual_Legs...). */
export type Part = 'body' | 'legs' | 'feet' | 'head';

export function partOf(meshName: string): Part | null {
  const m = /_(Body|Legs|Feet|Head)(?:_\d+)?$/i.exec(meshName);
  return m ? (m[1]!.toLowerCase() as Part) : null;
}

/** Vai trò của một vật liệu khi đổi màu theo `Look`. `keep` = giữ màu gốc (mắt, giày, cà vạt, phụ kiện). */
export type MatRole = 'skin' | 'hair' | 'outfit' | 'pants' | 'fur' | 'fur-light' | 'keep';

/**
 * - Da: vật liệu tên "Skin".
 * - Tóc: tên có "Hair" hoặc "Moustache" (lông mày, mắt giữ nguyên).
 * - Chó: "Main" là lông chính, "Main_Light" là lông sáng ở ngực/mõm.
 * - Áo / quần: vật liệu CHIẾM NHIỀU NHẤT (ngoài da, tóc) của phần thân / phần chân.
 */
export function roleOf(materialName: string, part: Part | null, dominantInPart: boolean): MatRole {
  const n = materialName.toLowerCase();
  if (n === 'main') return 'fur';
  if (n === 'main_light') return 'fur-light';
  if (n.startsWith('skin')) return 'skin';
  if (n.includes('eye')) return 'keep';
  if (n.includes('hair') || n.includes('moustache')) return 'hair';
  if (dominantInPart && part === 'body') return 'outfit';
  if (dominantInPart && part === 'legs') return 'pants';
  return 'keep';
}

/** Chiều cao đứng (m) theo loại và vóc dáng. */
export function heightFor(kind: 'human' | 'dog' | 'goat', build?: 'kid' | 'adult' | 'elder'): number {
  if (kind === 'dog') return 0.38;
  if (build === 'kid') return 1.1;
  if (build === 'elder') return 1.58;
  return 1.65;
}

/** Hoạt ảnh của game (Figure) -> tên clip trong file GLB. */
export function clipFor(anim: string | undefined, kind: 'human' | 'dog' | 'goat'): string {
  if (kind === 'dog') {
    if (anim === 'walk' || anim === 'dance' || anim === 'run') return 'Run';
    if (anim === 'talk' || anim === 'wave' || anim === 'reach') return 'Sniff';
    return 'Idle';
  }
  switch (anim) {
    case 'walk':
      return 'Walk';
    case 'run':
      return 'Run';
    case 'wave':
      return 'Wave';
    case 'talk':
    case 'reach':
    case 'type':
      // "Interact" của Quaternius: đưa tay ra phía trước, dùng cho nhặt đồ, gõ máy tính.
      return 'Talk';
    case 'cry':
      return 'Hit';
    default:
      return 'Idle';
  }
}

/**
 * Pomeranian chân ngắn: thân hạ xuống POM_DROP (đơn vị của file, ~10% chiều cao), mỗi chân thu lại đúng phần đó.
 * Chân trước xoay quanh khớp FrontUpperLeg (cao POM_LEG.front so với bàn chân), chân sau quanh BackLeg (POM_LEG.back);
 * hai chân dài khác nhau nên hệ số khác nhau: s = 1 - POM_DROP / chiều dài chân. Test tính lại từ file GLB.
 */
export const POM_DROP = 0.3;
export const POM_LEG = { front: 1.344, back: 1.615 } as const;
const legScale = (len: number) => Math.round((1 - POM_DROP / len) * 1000) / 1000;

/**
 * Chỉnh dáng Shiba thành Pomeranian (cùng họ Spitz): bờm cổ phồng, đầu tròn hơi to, đuôi xù, chân ngắn. Hệ số scale
 * đặt lên xương (hoạt ảnh chỉ đổi xoay/vị trí nên không ghi đè). Xương con nhận scale của cha: Head bù lại phần Neck1.
 */
export const POM_BONES: Readonly<Record<string, number>> = {
  Neck1: 1.28,
  Head: 0.9,
  Tail1: 1.45,
  'FrontUpperLeg.L': legScale(POM_LEG.front),
  'FrontUpperLeg.R': legScale(POM_LEG.front),
  'BackLeg.L': legScale(POM_LEG.back),
  'BackLeg.R': legScale(POM_LEG.back),
};
/** Màu lông Pomeranian mặc định: trắng tinh (lông chính hơi ngà để còn thấy khối, lông ngực/mõm trắng hẳn). */
export const POM_FUR = { main: '#f4f2ee', light: '#ffffff' };

/** Độ cao (trục y, đơn vị file) của một node theo tên trong tư thế gốc, tính từ JSON của glTF (để test). */
export function nodeWorldY(j: GltfJson, name: string): number {
  const parent = new Map<number, number>();
  j.nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)));
  const i = (j.nodes as (GltfNode & { name?: string })[]).findIndex((n) => n.name === name);
  if (i < 0) return Number.NaN;
  let m = trs(j.nodes[i]!);
  for (let k = parent.get(i); k !== undefined; k = parent.get(k)) m = mul(trs(j.nodes[k]!), m);
  return m[1]![3]!;
}

/**
 * Tư thế ngồi dựng bằng xương (bộ model không có hoạt ảnh ngồi). Xoay quanh trục ngang CỦA NHÂN VẬT (trục +X trong
 * khung của nhân vật, nhân vật nhìn về +Z), tính trong toạ độ thế giới sau mỗi lần cập nhật hoạt ảnh, vì trục cục bộ
 * của từng xương xoắn khác nhau và hoạt ảnh ghi đè hướng xương mỗi khung:
 * - đùi xoay `thigh` rad: (0,-1,0) quanh +X góc -90° thành (0,0,1) = duỗi ra trước;
 * - cẳng chân xoay `shin` rad: (0,0,1) quanh +X góc +90° thành (0,-1,0) = thõng xuống;
 * - hông hạ xuống còn cao hơn mặt ghế `HIP_ABOVE_SEAT` m.
 */
export const SIT_POSE = { thigh: -Math.PI / 2, shin: Math.PI / 2 } as const;
export const HIP_ABOVE_SEAT = 0.1;
/**
 * Tên node sau khi trình nạp glTF của three.js chuẩn hoá (PropertyBinding.sanitizeNodeName): khoảng trắng thành `_`,
 * bỏ `[ ] . : /`. Vì vậy xương "UpperLeg.L" trong file có tên "UpperLegL" lúc chạy: phải so theo tên đã chuẩn hoá,
 * nếu không sẽ không tìm thấy xương nào và tư thế ngồi lặng lẽ không có tác dụng.
 */
export function sanitizeName(name: string): string {
  return name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
}

/** Xương dùng cho tư thế (tên trong file của bộ xương Quaternius; so khớp qua `sanitizeName`). */
export const BONES = {
  hips: 'Hips',
  thighs: ['UpperLeg.L', 'UpperLeg.R'],
  shins: ['LowerLeg.L', 'LowerLeg.R'],
  head: 'Head',
} as const;

/** Xoay một vector quanh trục X một góc (để test kiểm tra chiều gập đúng). */
export function rotateX(v: readonly [number, number, number], angle: number): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
