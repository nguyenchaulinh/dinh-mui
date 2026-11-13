import type { StatKey, Style } from './engine/types';

export const DISCLAIMER = 'Mọi nhân vật và tình huống là hư cấu, chỉ để giải trí; không nhằm mô tả bất kỳ cá nhân nào.';

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
