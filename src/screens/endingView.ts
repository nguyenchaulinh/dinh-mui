import { STAT_KEYS, STAT_MAX, type Stats } from '../engine/types';

/**
 * Giao diện màn kết thúc (hàm thuần để test): giọng điệu theo kết thúc, số sao theo tổng chỉ số, đếm số lên. Không đổi luật chơi:
 * kết thúc nào xảy ra vẫn do engine quyết, đây chỉ là cách trình bày.
 */

export type Tone = 'ruc-ro' | 'am-ap' | 'song-sot' | 'hai-huoc';

export interface EndingLook {
  tone: Tone;
  /** Chữ trên dải lụa phía trên thẻ. */
  ribbon: string;
  /** Độ hoành tráng của pháo hoa. */
  intensity: 1 | 2 | 3;
  palette: readonly string[];
  /** Màu viền / ánh sáng của thẻ. */
  glow: string;
}

const PALETTES: Record<Tone, readonly string[]> = {
  'ruc-ro': ['#f6c343', '#ff4d4f', '#fff3c4', '#ff8a3d', '#ffffff'],
  'am-ap': ['#ff7aa2', '#ffb35c', '#f6c343', '#fff1e0', '#ff5f86'],
  'song-sot': ['#f6c343', '#7dd3fc', '#fff3c4', '#a7f3d0', '#ffffff'],
  'hai-huoc': ['#f6c343', '#42d4bf', '#ff6b6b', '#6fb2ff', '#a3e635', '#ffffff'],
};

const LOOKS: Record<Tone, Omit<EndingLook, 'palette'>> = {
  'ruc-ro': { tone: 'ruc-ro', ribbon: 'Xuất sắc', intensity: 3, glow: '#f6c343' },
  'am-ap': { tone: 'am-ap', ribbon: 'Ấm lòng', intensity: 3, glow: '#ff9aa8' },
  'song-sot': { tone: 'song-sot', ribbon: 'Về tới nhà', intensity: 2, glow: '#9bdcf8' },
  'hai-huoc': { tone: 'hai-huoc', ribbon: 'Một cái Tết khó quên', intensity: 2, glow: '#7be0cc' },
};

const TONE_BY_ENDING: Readonly<Record<string, Tone>> = {
  E8: 'ruc-ro',
  E7: 'ruc-ro',
  E6: 'am-ap',
  E4: 'am-ap',
  E9: 'song-sot',
  E1: 'hai-huoc',
  E2: 'hai-huoc',
  E3: 'hai-huoc',
};

/** Giọng điệu của một kết thúc (id lạ thì dùng "về tới nhà"). */
export function endingLook(endingId: string): EndingLook {
  const tone = TONE_BY_ENDING[endingId] ?? 'song-sot';
  return { ...LOOKS[tone], palette: PALETTES[tone] };
}

/** Tổng ba chỉ số đã kẹp trong [0, STAT_MAX]. */
export const totalScore = (s: Stats): number => STAT_KEYS.reduce((a, k) => a + Math.max(0, Math.min(STAT_MAX, Number.isFinite(s[k]) ? s[k] : 0)), 0);

export const MAX_SCORE = STAT_KEYS.length * STAT_MAX;

/** Số sao (1-3) theo tổng chỉ số: đã về tới nhà thì ít nhất một sao. */
export function starsFor(s: Stats): 1 | 2 | 3 {
  const t = totalScore(s);
  return t >= 180 ? 3 : t >= 110 ? 2 : 1;
}

/** Giá trị đếm lên tại thời điểm `t` giây (làm chậm dần lúc cuối), kết thúc đúng `to`. */
export function countUp(to: number, t: number, duration = 0.9): number {
  if (!Number.isFinite(to)) return 0;
  if (!(duration > 0) || t >= duration) return Math.round(to);
  if (t <= 0) return 0;
  const k = t / duration;
  return Math.round(to * (1 - (1 - k) ** 3));
}
