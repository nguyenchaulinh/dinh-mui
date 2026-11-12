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
    if (anim === 'talk' || anim === 'wave') return 'Sniff';
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
      return 'Talk';
    case 'cry':
      return 'Hit';
    default:
      return 'Idle';
  }
}

/**
 * Chỉnh dáng Shiba thành Pomeranian (cùng họ Spitz): bờm cổ phồng, đầu tròn hơi to, đuôi xù. Hệ số scale đặt lên
 * xương (hoạt ảnh chỉ đổi xoay/vị trí nên không ghi đè). Xương con nhận scale của cha: Head bù lại phần Neck1.
 */
export const POM_BONES: Readonly<Record<string, number>> = { Neck1: 1.28, Head: 0.9, Tail1: 1.45 };
/** Màu lông Pomeranian cam kem mặc định (nếu Look không ghi). */
export const POM_FUR = { main: '#e08a2e', light: '#f7e3c4' };
