import { rnd } from './rand';

/**
 * Bố cục các dãy nhà của phố Tết (hàm thuần): nhà phía bắc (có mặt tiền đi lại), nhà thấp bên kia đường, và dãy nhà cao
 * tầng ở xa. Tách khỏi `PhoTet` để đếm được số vật trong cảnh (ngân sách draw call, test drawBudget.test.ts).
 */

export interface PhoHouse {
  x: number;
  w: number;
  h: number;
  c: string;
  sign?: string;
  flag: boolean;
}

/** Nhà phía bắc từ x = -22 tới 22; `style` quyết định độ cao (miền Nam cao hơn) và cờ (chỉ miền Bắc). */
export function phoHouses(style: 'bac' | 'trung' | 'nam'): PhoHouse[] {
  const palette = ['#fde68a', '#fca5a5', '#a7f3d0', '#bfdbfe', '#fed7aa', '#e9d5ff', '#f5f5f4'];
  const out: PhoHouse[] = [];
  let x = -22;
  for (let i = 0; x < 22; i++) {
    const w = 2.4 + rnd(i) * 1.6;
    out.push({
      x: x + w / 2,
      w,
      h: (style === 'nam' ? 6 : 4.5) + rnd(i + 20) * 4,
      c: palette[i % palette.length]!,
      sign: rnd(i + 40) > 0.4 ? ['#dc2626', '#2563eb', '#16a34a', '#f59e0b'][i % 4] : undefined,
      flag: style === 'bac' && i % 2 === 0,
    });
    x += w + 0.05;
  }
  return out;
}

export interface FarHouse {
  x: number;
  w: number;
  h: number;
  c: string;
  sign: string;
}

/** Dãy nhà thấp bên kia đường, từ x = -24 tới 24. */
export function phoFarHouses(): FarHouse[] {
  const palette = ['#fde68a', '#fecaca', '#bbf7d0', '#bfdbfe', '#fed7aa', '#ddd6fe'];
  const out: FarHouse[] = [];
  let x = -24;
  for (let i = 0; x < 24; i++) {
    const w = 2.6 + rnd(i + 70) * 1.8;
    out.push({ x: x + w / 2, w, h: 3.4 + rnd(i + 90) * 2.8, c: palette[i % palette.length]!, sign: ['#2563eb', '#f59e0b', '#dc2626', '#16a34a'][(i + 1) % 4]! });
    x += w + 0.05;
  }
  return out;
}

export interface Tower {
  x: number;
  w: number;
  h: number;
  c: string;
}

/** Chín toà nhà cao ở xa phía sau dãy nhà phía bắc. */
export function phoSkyline(): Tower[] {
  return Array.from({ length: 9 }, (_, i) => ({
    x: -32 + i * 8 + rnd(i + 110) * 3,
    w: 4 + rnd(i + 130) * 3,
    h: 11 + rnd(i + 150) * 9,
    c: ['#cbd5e1', '#94a3b8', '#b6c2d3'][i % 3]!,
  }));
}

/** Số xe máy đang chạy trong dòng xe của phố Tết. */
export const PHO_TRAFFIC = 14;
