import type { Shape } from './shapes';

/**
 * Hình khối nhà phố (hàm thuần): cửa sổ có khung và bậu, biển hiệu, cờ, mái hiên sọc, câu đối, máy lạnh hoặc chậu cây
 * ban công, tường chắn mái, bồn nước, anten. Tách thành hai nhóm để gộp: `solid` (chịu ánh sáng) và `lit` (phát sáng:
 * biển hiệu, cửa sổ sáng đèn, chấm vàng câu đối). Thân tường (hộp có texture trát) và cửa cuốn (có texture gân) vẽ riêng.
 * Mặt tiền ở z = +2 cục bộ, chân nhà ở y = 0. Mỗi nhà là 4 draw call (thân, cửa cuốn, solid, lit) thay vì ~30.
 */

/** Mái hiên sọc trước cửa hàng: cạnh thấp nhất phải cao hơn đầu người vì mái nhô ra phía vỉa hè đi lại được. */
export const AWNING = { y: 2.2, tilt: 0.3, depth: 0.7, out: 0.45 } as const;
/** Chiều cao thấp nhất của mái hiên so với mặt đất (m). */
export const awningLowestY = (): number => AWNING.y - Math.sin(AWNING.tilt) * (AWNING.depth / 2) - 0.03;

const AWNING_COLORS = [
  ['#dc2626', '#f8fafc'],
  ['#2563eb', '#f8fafc'],
  ['#16a34a', '#fef3c7'],
] as const;

export interface HouseParams {
  w: number;
  h: number;
  /** Màu tường. */
  c: string;
  /** Màu biển hiệu (thiếu thì không có biển). */
  sign?: string;
  /** Cờ đỏ sao vàng cắm ở mặt tiền. */
  flag?: boolean;
  /** Quyết định ổn định các chi tiết (mái hiên, máy lạnh hay chậu cây, anten...). */
  variant: number;
  /** Cửa hàng: có mái hiên và câu đối. */
  shop: boolean;
  /** Nhà bên kia đường: ít chi tiết hơn (không ban công, mái hiên, máy lạnh), dùng cùng cửa sổ và biển hiệu. */
  far?: boolean;
}

export interface HouseShapes {
  solid: Shape[];
  lit: Shape[];
  floors: number;
}

export const houseFloors = (h: number, far = false): number => Math.max(2, Math.round(h / (far ? 1.7 : 1.6)));

export function houseShapes({ w, h, sign, flag, variant, shop, far = false }: HouseParams): HouseShapes {
  const solid: Shape[] = [];
  const lit: Shape[] = [];
  const floors = houseFloors(h, far);

  if (far) {
    for (let f = 0; f < floors - 1; f++) {
      const on = f % 2 === 0;
      (on ? lit : solid).push({ g: 'plane', s: [w * 0.55, 0.8], p: [0, 1.7 * (f + 1) + 0.7, 2.01], c: on ? '#fcd34d' : '#1e293b' });
    }
    if (sign) lit.push({ g: 'box', s: [w * 0.9, 0.35, 0.08], p: [0, 1.75, 2.08], c: sign });
    return { solid, lit, floors };
  }

  // Cửa sổ các tầng trên: khung trắng nhô ra, ô kính tối, bậu cửa.
  for (let f = 0; f < floors - 1; f++) {
    const y = 1.6 * (f + 1) + 0.6;
    solid.push(
      { g: 'box', s: [w * 0.55 + 0.1, 0.9, 0.02], p: [0, y, 2.004], c: '#f1f5f9' },
      { g: 'plane', s: [w * 0.55, 0.8], p: [0, y, 2.01], c: '#1e293b' },
      { g: 'box', s: [w * 0.8, 0.08, 0.4], p: [0, y - 0.45, 2.21], c: '#e5e7eb' },
    );
    // Cửa sổ sáng đèn đè lên ô kính ở hai tầng đầu.
    if (f < 2 && (f + variant) % 2 === 0) lit.push({ g: 'plane', s: [w * 0.5, 0.7], p: [0, y, 2.02], c: '#fcd34d' });
  }
  if (sign) lit.push({ g: 'box', s: [w * 0.9, 0.35, 0.08], p: [0, 1.75, 2.08], c: sign });
  if (flag) {
    const group = { p: [w * 0.35, 2.6, 2.3] as [number, number, number], r: [0, 0, -0.4] as [number, number, number] };
    solid.push(
      { g: 'cyl', s: [0.015, 0.015, 0.8, 4], p: [0, 0.3, 0], c: '#d1d5db', group },
      { g: 'plane', s: [0.45, 0.3], p: [0.22, 0.55, 0], c: '#dc2626', group },
      { g: 'circle', s: [0.06, 5], p: [0.22, 0.55, 0.005], c: '#facc15', group },
    );
  }

  // Ban công lồng sắt ("chuồng cọp", đặc trưng nhà phố Hà Nội) ở tầng hai của nhà có từ ba tầng, một nhà trong ba.
  if (floors >= 3 && variant % 3 === 1) balconyCage(solid, w, 1.6 * 2 + 0.6);

  if (shop) {
    const [c1, c2] = AWNING_COLORS[variant % AWNING_COLORS.length]!;
    const stripes = 4;
    const sw = (w * 0.85) / stripes;
    const awn = { p: [0, AWNING.y, 2 + AWNING.out] as [number, number, number], r: [AWNING.tilt, 0, 0] as [number, number, number] };
    for (let i = 0; i < stripes; i++) solid.push({ g: 'box', s: [sw, 0.05, AWNING.depth], p: [(i - (stripes - 1) / 2) * sw, 0, 0], c: i % 2 === 0 ? c1 : c2, group: awn });
    for (const s of [-1, 1]) {
      const g = { p: [s * (w * 0.4 + 0.12), 1.0, 2.03] as [number, number, number] };
      solid.push({ g: 'plane', s: [0.13, 1.0], p: [0, 0, 0], c: '#dc2626', group: g });
      for (const y of [-0.25, 0.05, 0.3]) lit.push({ g: 'plane', s: [0.05, 0.07], p: [0, y, 0.004], c: '#facc15', group: g });
    }
  }

  // Mái: tường chắn mái, bồn nước, và anten chảo ở một số nhà.
  solid.push({ g: 'box', s: [w + 0.06, 0.24, 0.24], p: [0, h + 0.12, 1.88], c: '#d6d3d1' });
  const tank = { p: [-w * 0.22, h, -0.4] as [number, number, number] };
  const even = variant % 2 === 0;
  solid.push(
    { g: 'cyl', s: [0.32, 0.32, 0.7, 10], p: [0, 0.5, 0], c: even ? '#2563eb' : '#e5e7eb', group: tank },
    { g: 'cone', s: [0.34, 0.16, 10], p: [0, 0.9, 0], c: even ? '#1d4ed8' : '#cbd5e1', group: tank },
    { g: 'box', s: [0.6, 0.16, 0.6], p: [0, 0.08, 0], c: '#78716c', group: tank },
  );
  if (variant % 3 === 0) {
    const dish = { p: [w * 0.3, h, 0.8] as [number, number, number], r: [0, 0, -0.5] as [number, number, number] };
    solid.push(
      { g: 'cyl', s: [0.015, 0.015, 0.7, 4], p: [0, 0.35, 0], c: '#9ca3af', group: dish },
      { g: 'cone', s: [0.2, 0.1, 10], p: [0, 0.72, 0.05], r: [0.9, 0, 0], c: '#f1f5f9', group: dish },
    );
  }
  if (even) {
    solid.push({ g: 'box', s: [0.5, 0.3, 0.26], p: [w * 0.3, 1.95, 2.14], c: '#d1d5db' }); // máy lạnh
  } else {
    const pot = { p: [w * 0.25, 1.6 + 0.6 - 0.45, 2.3] as [number, number, number] }; // chậu cây ban công
    solid.push(
      { g: 'cyl', s: [0.1, 0.08, 0.18, 6], p: [0, 0.09, 0], c: '#b45309', group: pot },
      { g: 'ico', s: [0.15, 0], p: [0, 0.27, 0], c: '#16a34a', group: pot },
      { g: 'ico', s: [0.06, 0], p: [0.06, 0.34, 0.05], c: variant % 4 === 1 ? '#f472b6' : '#facc15', group: pot },
    );
  }
  return { solid, lit, floors };
}

/** Độ nhô ra (m) của ban công lồng sắt so với mặt tiền; ở độ cao tầng hai (trên 2.9 m) nên nằm trên đầu người trên vỉa hè. */
export const BALCONY = { out: 0.55, h: 1.15 } as const;

/** Lồng sắt: sàn, khung trên, thanh đứng ở mặt trước và hai bên, thanh ngang giữa. `y` là độ cao tâm cửa sổ tầng đó. */
function balconyCage(solid: Shape[], w: number, y: number): void {
  const bw = w * 0.75;
  const z0 = 2.02;
  const zc = z0 + BALCONY.out / 2;
  const yb = y - 0.5; // sàn ngang bậu cửa
  const yt = yb + BALCONY.h;
  const iron = '#374151';
  solid.push(
    { g: 'box', s: [bw, 0.07, BALCONY.out], p: [0, yb, zc], c: '#9ca3af' },
    { g: 'box', s: [bw, 0.04, BALCONY.out], p: [0, yt, zc], c: iron },
    { g: 'box', s: [bw, 0.03, 0.03], p: [0, yb + BALCONY.h / 2, z0 + BALCONY.out], c: iron },
  );
  const bars = Math.max(4, Math.round(bw / 0.22));
  for (let i = 0; i <= bars; i++) solid.push({ g: 'box', s: [0.025, BALCONY.h, 0.025], p: [(i / bars - 0.5) * bw, yb + BALCONY.h / 2, z0 + BALCONY.out], c: iron });
  for (const sx of [-1, 1]) {
    for (let k = 0; k <= 2; k++) solid.push({ g: 'box', s: [0.025, BALCONY.h, 0.025], p: [sx * bw / 2, yb + BALCONY.h / 2, z0 + (k / 2) * BALCONY.out], c: iron });
    solid.push({ g: 'box', s: [0.03, 0.03, BALCONY.out], p: [sx * bw / 2, yb + BALCONY.h / 2, zc], c: iron });
  }
}
