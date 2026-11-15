import type { Accessory, Look } from '../engine/types';

/**
 * Phụ kiện low-poly gắn vào xương của nhân vật (hàm thuần, không import three/react, có test).
 *
 * Mỗi phụ kiện là vài khối hộp / trụ / cầu / nón / vòng, mô tả bằng dữ liệu. `Rigged.tsx` dựng chúng và gắn vào xương
 * tương ứng (đầu, ngực, cổ tay phải) nên chúng đi theo hoạt ảnh (gật đầu, đung đưa tay).
 *
 * Toạ độ (đơn vị của file model, ~mét, nhân vật quay mặt về +z, +x là bên trái của nhân vật):
 * - khung `bind` (đầu, ngực): toạ độ TUYỆT ĐỐI trong tư thế gốc; bộ dựng trừ đi vị trí xương rồi đặt vào khung song song
 *   với thế giới nên không cần biết trục riêng của xương. Số đo lấy từ trọng số xương của chính mesh (FIT).
 * - khung `hang` (cổ tay phải): so với cổ tay, y hướng lên như lúc tay buông thõng (tư thế gốc của các model đã buông
 *   tay), vật cầm nằm dưới cổ tay. Khi đi, tay đung đưa nên vật nghiêng theo (tối đa ~55°).
 */

export type Anchor = 'head' | 'chest' | 'handR';

/** Tên xương gắn vào (đã chuẩn hoá theo three.js, xem `sanitizeName`). */
export const ANCHOR_BONE: Readonly<Record<Anchor, string>> = { head: 'Head', chest: 'Chest', handR: 'WristR' };

export type ShapeKind = 'box' | 'cyl' | 'sphere' | 'cone' | 'torus';

/**
 * Một khối. Tham số `s` theo loại:
 * box [rộng, cao, sâu]; cyl [bán kính trên, bán kính dưới, cao, số cạnh]; sphere [bán kính, số cạnh ngang, số cạnh dọc,
 * phiStart, phiLength, thetaStart, thetaLength] (từ bán kính trở đi có thể bỏ); cone [bán kính, cao, số cạnh];
 * torus [bán kính vòng, bán kính ống, số cạnh ống, số đoạn, cung].
 */
export interface Shape {
  g: ShapeKind;
  s: readonly number[];
  p: readonly [number, number, number];
  /** Góc xoay Euler XYZ (rad). */
  r?: readonly [number, number, number];
  /** Co giãn theo từng trục (ví dụ bầu thìa). */
  k?: readonly [number, number, number];
  c: string;
}

export interface PropPart {
  anchor: Anchor;
  frame: 'bind' | 'hang';
  shapes: Shape[];
}

/** Số đo đầu và thân của model trong tư thế gốc. */
export interface Fit {
  /** Đáy và đỉnh đầu (y), nửa bề ngang, mặt sau và mặt trước (z). */
  hy0: number;
  hy1: number;
  hhw: number;
  hzb: number;
  hzf: number;
  /** Đáy và đỉnh thân, nửa bề ngang, lưng và ngực (z). */
  ty0: number;
  ty1: number;
  thw: number;
  tzb: number;
  tzf: number;
}

const MALE: Fit = { hy0: 1.57, hy1: 1.86, hhw: 0.12, hzb: -0.09, hzf: 0.18, ty0: 1.0, ty1: 1.56, thw: 0.145, tzb: -0.08, tzf: 0.18 };
const FEMALE: Fit = { hy0: 1.52, hy1: 1.84, hhw: 0.12, hzb: -0.1, hzf: 0.19, ty0: 1.12, ty1: 1.53, thw: 0.11, tzb: -0.02, tzf: 0.18 };

/** Đo từ file GLB (trọng số xương Head / Torso+Chest+Abdomen); nu-hoa-tai có thân như nam. */
export const FIT: Readonly<Record<string, Fit>> = {
  'nam-vest': MALE,
  'nam-tho': MALE,
  'nam-nong-dan': MALE,
  'nam-hoodie': MALE,
  'nu-hoa-tai': { ...MALE, hy1: 1.88, tzb: -0.05 },
  'nu-thuong-ngay': FEMALE,
  'nu-cong-so': FEMALE,
};

export const fitOf = (model: string): Fit => FIT[model] ?? MALE;

/**
 * Đồ đã có sẵn trong mesh của model (xem tên vật liệu trong file): thợ có mũ bảo hộ vàng (`Worker_Yellow` ở đầu), nông dân
 * có mũ (`Beige` ở đầu), vest có cà vạt (`Tie`). Thêm phụ kiện cùng loại sẽ bị chồng lên đồ có sẵn nên bỏ qua.
 */
export function builtinOf(model: string): ReadonlySet<Accessory> {
  if (model === 'nam-tho' || model === 'nam-nong-dan') return new Set<Accessory>(['hat', 'cap', 'helmet']);
  if (model === 'nam-vest') return new Set<Accessory>(['tie', 'bowtie']);
  return new Set<Accessory>();
}

/** Số phụ kiện tối đa được vẽ trên một nhân vật (nhiều hơn thì rối và tốn khối). */
export const MAX_ACCESSORIES = 4;

/** Danh sách phụ kiện của một Look: `accessory` + `accessories`, bỏ 'none' và trùng, cắt còn MAX_ACCESSORIES. */
export function accessoriesOf(look: Pick<Look, 'accessory' | 'accessories'> | undefined): Accessory[] {
  const out: Accessory[] = [];
  for (const a of [look?.accessory, ...(look?.accessories ?? [])]) {
    if (a !== undefined && a !== 'none' && !out.includes(a)) out.push(a);
  }
  return out.slice(0, MAX_ACCESSORIES);
}

const DARK = '#111827';
const WHITE = '#f8fafc';
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Các khối của danh sách phụ kiện, theo số đo `fit`. `accent` (hex) thay màu mặc định của phụ kiện có màu nhấn. */
export function propsFor(list: readonly Accessory[], fit: Fit, accent?: string, skip?: ReadonlySet<Accessory>): PropPart[] {
  const parts: PropPart[] = [];
  const a = (def: string): string => (accent !== undefined && HEX.test(accent) ? accent : def);
  const { hy0, hy1, hhw, hzb, hzf, ty0, ty1, thw, tzb, tzf } = fit;
  const hcz = (hzb + hzf) / 2;
  const eyeY = hy0 + 0.66 * (hy1 - hy0);
  const neckZ = (tzb + tzf) / 2 + 0.01;
  const head = (shapes: Shape[]) => parts.push({ anchor: 'head', frame: 'bind', shapes });
  const chest = (shapes: Shape[]) => parts.push({ anchor: 'chest', frame: 'bind', shapes });
  const hand = (shapes: Shape[]) => parts.push({ anchor: 'handR', frame: 'hang', shapes });
  /** Hai dây đeo qua vai đặt phía trước ngực (balo, thùng giao hàng). */
  const straps = (c: string): Shape[] =>
    [-1, 1].map((s) => ({ g: 'box', s: [0.045, 0.3, 0.012], p: [s * thw * 0.55, ty1 - 0.17, tzf + 0.004], c }) as Shape);

  for (const kind of list) {
    if (skip?.has(kind)) continue;
    switch (kind) {
      case 'glasses':
        head([
          ...[-1, 1].map((s) => ({ g: 'torus', s: [0.036, 0.007, 4, 10], p: [s * 0.058, eyeY, hzf + 0.002], c: DARK }) as Shape),
          { g: 'box', s: [0.04, 0.008, 0.008], p: [0, eyeY + 0.012, hzf + 0.002], c: DARK },
          ...[-1, 1].map((s) => ({ g: 'box', s: [0.008, 0.008, 0.16], p: [s * (hhw + 0.004), eyeY + 0.01, hzf - 0.08], c: DARK }) as Shape),
        ]);
        break;
      case 'hat': // nón lá
        head([{ g: 'cone', s: [0.3, 0.15, 10], p: [0, hy1 + 0.01, hcz], c: '#e8c77a' }]);
        break;
      case 'cap': // mũ lưỡi trai
        head([
          { g: 'sphere', s: [hhw + 0.012, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2], p: [0, hy1 - 0.09, hcz], c: a('#dc2626') },
          { g: 'box', s: [0.17, 0.012, 0.11], p: [0, hy1 - 0.095, hzf + 0.03], r: [0.12, 0, 0], c: a('#dc2626') },
        ]);
        break;
      case 'helmet': // mũ bảo hiểm nửa đầu
        head([
          { g: 'sphere', s: [hhw + 0.035, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62], p: [0, hy1 - 0.14, hcz], c: a('#ef4444') },
          { g: 'box', s: [0.2, 0.012, 0.08], p: [0, hy1 - 0.12, hzf + 0.01], r: [0.15, 0, 0], c: a('#ef4444') },
        ]);
        break;
      case 'headphones':
        head([
          { g: 'torus', s: [hhw + 0.035, 0.011, 4, 14, Math.PI], p: [0, hy1 - 0.16, hcz], c: DARK },
          ...[-1, 1].map((s) => ({ g: 'cyl', s: [0.045, 0.045, 0.035, 8], p: [s * (hhw + 0.04), hy1 - 0.16, hcz], r: [0, 0, Math.PI / 2], c: a('#ef4444') }) as Shape),
        ]);
        break;
      case 'scarf':
        chest([
          { g: 'torus', s: [0.105, 0.04, 6, 12], p: [0, ty1 + 0.01, neckZ], r: [Math.PI / 2, 0, 0], c: WHITE },
          { g: 'box', s: [0.07, 0.2, 0.03], p: [0.05, ty1 - 0.09, tzf - 0.02], c: WHITE },
        ]);
        break;
      case 'bowtie':
        chest([
          { g: 'box', s: [0.05, 0.035, 0.015], p: [-0.03, ty1 - 0.02, tzf - 0.03], r: [0, 0, 0.35], c: a('#fbbf24') },
          { g: 'box', s: [0.05, 0.035, 0.015], p: [0.03, ty1 - 0.02, tzf - 0.03], r: [0, 0, -0.35], c: a('#fbbf24') },
          { g: 'box', s: [0.025, 0.025, 0.018], p: [0, ty1 - 0.02, tzf - 0.03], c: a('#b45309') },
        ]);
        break;
      case 'tie':
        chest([
          { g: 'box', s: [0.045, 0.04, 0.03], p: [0, ty1 - 0.05, tzf - 0.02], c: a('#b91c1c') },
          { g: 'box', s: [0.055, 0.27, 0.012], p: [0, ty1 - 0.2, tzf + 0.012], c: a('#b91c1c') },
        ]);
        break;
      case 'lanyard': // dây đeo + thẻ sinh viên / nhân viên
        chest([
          ...[-1, 1].map((s) => ({ g: 'box', s: [0.016, 0.24, 0.006], p: [s * 0.05, ty1 - 0.12, tzf + 0.006], r: [0, 0, s * 0.3], c: a('#2563eb') }) as Shape),
          { g: 'box', s: [0.075, 0.1, 0.007], p: [0, ty1 - 0.27, tzf + 0.012], c: WHITE },
          { g: 'box', s: [0.075, 0.03, 0.008], p: [0, ty1 - 0.235, tzf + 0.013], c: a('#2563eb') },
        ]);
        break;
      case 'apron': // tạp dề
        chest([
          { g: 'box', s: [thw * 2 + 0.04, 0.34, 0.016], p: [0, ty0 + 0.08, tzf + 0.008], c: a('#b45309') },
          { g: 'box', s: [0.22, 0.16, 0.016], p: [0, ty1 - 0.23, tzf + 0.012], c: a('#b45309') },
        ]);
        break;
      case 'backpack':
        chest([
          { g: 'box', s: [thw * 2 - 0.01, 0.4, 0.17], p: [0, ty1 - 0.27, tzb - 0.09], c: a('#1d4ed8') },
          { g: 'box', s: [thw * 2 - 0.09, 0.17, 0.05], p: [0, ty1 - 0.36, tzb - 0.2], c: a('#1d4ed8') },
          ...straps('#1f2937'),
        ]);
        break;
      case 'delivery': // thùng giao hàng sau lưng
        chest([
          { g: 'box', s: [0.4, 0.4, 0.36], p: [0, ty1 - 0.2, tzb - 0.18], c: a('#16a34a') },
          { g: 'box', s: [0.41, 0.04, 0.37], p: [0, ty1 - 0.01, tzb - 0.18], c: '#15803d' },
          { g: 'box', s: [0.2, 0.12, 0.004], p: [0, ty1 - 0.2, tzb - 0.362], c: WHITE },
          ...straps('#1f2937'),
        ]);
        break;
      case 'bag': // túi đeo chéo (laptop / xách)
        chest([
          { g: 'box', s: [0.3, 0.22, 0.09], p: [thw + 0.07, ty0 + 0.02, 0.04], c: a('#374151') },
          { g: 'box', s: [0.022, 0.6, 0.008], p: [0.02, ty1 - 0.27, tzf + 0.008], r: [0, 0, 0.54], c: a('#374151') },
        ]);
        break;
      case 'phone':
        hand([
          { g: 'box', s: [0.055, 0.1, 0.01], p: [0, -0.075, 0.045], c: DARK },
          { g: 'box', s: [0.046, 0.086, 0.002], p: [0, -0.075, 0.0505], c: '#60a5fa' },
        ]);
        break;
      case 'cup':
        hand([
          { g: 'cyl', s: [0.034, 0.027, 0.075, 8], p: [0, -0.085, 0.04], c: '#fef3c7' },
          { g: 'cyl', s: [0.031, 0.029, 0.03, 8], p: [0, -0.085, 0.04], c: a('#92400e') },
        ]);
        break;
      case 'spoon':
        hand([
          { g: 'cyl', s: [0.007, 0.007, 0.22, 4], p: [0, -0.1, 0.045], c: '#d1d5db' },
          { g: 'sphere', s: [0.035, 6, 4], p: [0, 0.03, 0.045], k: [1, 1.4, 0.4], c: '#e5e7eb' },
        ]);
        break;
      case 'megaphone': // loa cầm tay của tổ dân phố: loa nón loe về phía trước, thân và cán
        hand([
          { g: 'cyl', s: [0.04, 0.04, 0.1, 8], p: [0, -0.07, 0.05], r: [Math.PI / 2, 0, 0], c: a('#f59e0b') },
          { g: 'cone', s: [0.1, 0.18, 10], p: [0, -0.07, 0.17], r: [-Math.PI / 2, 0, 0], c: a('#f59e0b') },
          { g: 'cyl', s: [0.018, 0.018, 0.09, 6], p: [0, -0.12, 0.04], c: DARK },
        ]);
        break;
      case 'branch': // cành đào cầm tay: thân mảnh nghiêng, các bông hồng
        hand([
          { g: 'cyl', s: [0.009, 0.013, 0.36, 4], p: [0.02, 0.0, 0.05], r: [0, 0, -0.2], c: '#4a2e1a' },
          ...[
            [0.05, 0.14, 0.06],
            [-0.01, 0.1, 0.08],
            [0.08, 0.06, 0.04],
            [0.01, 0.18, 0.05],
            [0.06, 0.2, 0.08],
            [-0.02, 0.15, 0.03],
          ].map((p) => ({ g: 'sphere', s: [0.032, 5, 4], p: [p[0]!, p[1]!, p[2]!], c: '#f472b6' }) as Shape),
        ]);
        break;
      case 'folder': // tập hồ sơ / sổ
        hand([
          { g: 'box', s: [0.2, 0.27, 0.025], p: [0, -0.14, 0.07], r: [0.1, 0, 0], c: a('#b91c1c') },
          { g: 'box', s: [0.18, 0.25, 0.012], p: [0, -0.14, 0.085], r: [0.1, 0, 0], c: WHITE },
        ]);
        break;
      case 'none':
        break;
    }
  }
  return parts;
}
