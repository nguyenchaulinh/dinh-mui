import type { StatKey, Style } from './engine/types';

export const STAT_LABEL: Record<StatKey, string> = {
  harmony: 'Hòa khí',
  stamina: 'Sức chịu đựng',
  wallet: 'Ví',
};

export const STYLE_LABEL: Record<Style, string> = {
  kheo: 'Khéo',
  'that-tha': 'Thật thà',
  lay: 'Lầy',
  'phan-don': 'Phản đòn',
};

export const DISCLAIMER = 'Mọi nhân vật và tình huống là hư cấu, chỉ để giải trí; không nhằm mô tả bất kỳ cá nhân nào.';

/** Mức của một chỉ số: nguy hiểm (<= DANGER_MAX), trung bình, tự tin (>= CONFIDENT_MIN). */
export type StatLevel = 'danger' | 'medium' | 'confident';
export const DANGER_MAX = 25;
export const CONFIDENT_MIN = 60;

export function statLevel(v: number): StatLevel {
  if (!(v > DANGER_MAX)) return 'danger'; // gồm cả NaN: coi là nguy hiểm để không che mất cảnh báo
  return v >= CONFIDENT_MIN ? 'confident' : 'medium';
}

export const STAT_LEVEL_LABEL: Record<StatLevel, string> = {
  danger: 'nguy hiểm',
  medium: 'trung bình',
  confident: 'tự tin',
};
