import { Lantern, Mat } from './props';

/** Đạo cụ phố Tết (sạp quà, trạm xe buýt). Hình học khớp vùng đi lại PHO_TET trong walk.ts. */

type V3 = [number, number, number];

/**
 * Sạp quà Tết sát nhà phố: quầy đỏ, mái che, giỏ quà, bao lì xì, đèn lồng.
 * Vùng chiếm: hộp rộng 2.6 x sâu 0.8 tại `position` (walk.ts PHO_TET.stall: hw 1.3, hd 0.4).
 */
export function GiftStall({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position}>
      {/* quầy */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.6, 0.9, 0.8]} />
        <Mat c="#b91c1c" />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[2.7, 0.06, 0.9]} />
        <Mat c="#fde68a" />
      </mesh>
      {/* cột + mái che (mái ở độ cao >= 2.3 m nên đi qua bên dưới) */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.25, 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 5]} />
          <Mat c="#78350f" />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0.1]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.4]} />
        <Mat c="#dc2626" />
      </mesh>
      <mesh position={[0, 2.35, 0.78]}>
        <boxGeometry args={[3.0, 0.14, 0.04]} />
        <Mat c="#facc15" />
      </mesh>
      {/* biển */}
      <mesh position={[0, 2.05, 0.35]}>
        <boxGeometry args={[1.6, 0.35, 0.05]} />
        <Mat c="#facc15" e={0.3} />
      </mesh>
      {/* giỏ quà trên quầy */}
      {(
        [
          [-0.95, '#16a34a'],
          [-0.35, '#2563eb'],
          [0.25, '#9333ea'],
          [0.85, '#f59e0b'],
        ] as const
      ).map(([x, c]) => (
        <group key={x} position={[x, 1.1, 0.05]}>
          <mesh>
            <boxGeometry args={[0.42, 0.28, 0.34]} />
            <Mat c={c} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <boxGeometry args={[0.46, 0.06, 0.06]} />
            <Mat c="#fef3c7" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <icosahedronGeometry args={[0.07, 0]} />
            <Mat c="#dc2626" e={0.2} />
          </mesh>
        </group>
      ))}
      {/* xấp bao lì xì */}
      <mesh position={[1.15, 1.02, 0.3]}>
        <boxGeometry args={[0.16, 0.1, 0.24]} />
        <Mat c="#dc2626" e={0.25} />
      </mesh>
      <Lantern position={[-1.25, 2.3, 0.7]} />
      <Lantern position={[1.25, 2.3, 0.7]} />
    </group>
  );
}

/**
 * Bến xe: mái che, ghế chờ, cột biển. Vùng chiếm: ghế (walk-pho-tet.ts 'ghe-ben') và hai trụ.
 * `position` là tâm ghế chờ trên vỉa hè nam.
 */
export function BusStop({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position}>
      {/* hai trụ + mái (cao 2.5 m) */}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 1.25, 0.15]}>
          <cylinderGeometry args={[0.07, 0.07, 2.5, 6]} />
          <Mat c="#475569" />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0.15]}>
        <boxGeometry args={[2.6, 0.1, 1.3]} />
        <Mat c="#1d4ed8" />
      </mesh>
      {/* tấm lưng */}
      <mesh position={[0, 1.4, 0.55]}>
        <boxGeometry args={[2.2, 1.6, 0.05]} />
        <meshStandardMaterial color="#bfdbfe" transparent opacity={0.45} flatShading />
      </mesh>
      {/* ghế chờ */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.4]} />
        <Mat c="#92400e" />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.44, 0.36]} />
          <Mat c="#57361f" />
        </mesh>
      ))}
      {/* cột biển BẾN XE */}
      <group position={[-2.0, 0, -0.9]}>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 5]} />
          <Mat c="#475569" />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <boxGeometry args={[0.9, 0.5, 0.06]} />
          <Mat c="#2563eb" e={0.3} />
        </mesh>
        <mesh position={[0, 2.6, 0.04]}>
          <boxGeometry args={[0.7, 0.12, 0.02]} />
          <Mat c="#f8fafc" />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Chi tiết đường phố (chỉ để nhìn, không có va chạm) ----------

/** Mái hiên sọc trước cửa hàng: cạnh thấp nhất phải cao hơn đầu người chơi vì mái nhô ra phía vỉa hè đi lại được. */
export const AWNING = { y: 2.2, tilt: 0.3, depth: 0.7, out: 0.45 } as const;
/** Chiều cao thấp nhất của mái hiên so với mặt đất (m). */
export const awningLowestY = (): number => AWNING.y - Math.sin(AWNING.tilt) * (AWNING.depth / 2) - 0.03;

/**
 * Xe máy đậu sát lề đường bên kia đường (vỉa hè nam, người chơi không tới được): (x, z). Không đậu ở lề phía bắc vì
 * người chơi đi sát tới z = -1.7 với bán kính 0.35 nên thân sẽ chui vào xe. Đậu song song với lề (dài ~0.9 m theo trục x)
 * nên các xe cách nhau từ 1.05 m; cách làn xe gần nhất (z = 1.3) đủ xa và tránh cột đèn ở z = 2.7.
 */
export const PARKED_BIKES: readonly (readonly [number, number])[] = [
  [-6.4, 3.0],
  [-5.1, 3.0],
  [-0.4, 3.0],
  [5.6, 3.0],
  [6.9, 3.0],
  [11.5, 3.0],
];
/** Làn xe chạy gần lề nam nhất và các cột đèn bên kia đường (x), để test canh khoảng cách. */
export const FAR_LANE_Z = 1.3;
export const STREET_LAMP_XS = [-9, -3, 3, 9] as const;

const AWNING_COLORS = [
  ['#dc2626', '#f8fafc'],
  ['#2563eb', '#f8fafc'],
  ['#16a34a', '#fef3c7'],
] as const;

/**
 * Chi tiết mặt tiền một nhà phố (đặt cùng vị trí với `TubeHouse`, mặt tiền ở z = +2 cục bộ): cửa sổ sáng đèn, mái hiên
 * sọc (nhà có biển hiệu), câu đối đỏ hai bên cửa, máy lạnh hoặc chậu hoa ban công. `variant` quyết định ổn định.
 */
export function ShopFront({ w, h, variant, shop, position }: Readonly<{ w: number; h: number; variant: number; shop: boolean; position: V3 }>) {
  const floors = Math.max(2, Math.round(h / 1.6));
  const [c1, c2] = AWNING_COLORS[variant % AWNING_COLORS.length]!;
  const stripes = 4;
  const sw = (w * 0.85) / stripes;
  return (
    <group position={position}>
      {/* cửa sổ sáng đèn (đè lên cửa sổ tối của TubeHouse) */}
      {Array.from({ length: Math.min(2, floors - 1) }, (_, f) =>
        (f + variant) % 2 === 0 ? (
          <mesh key={f} position={[0, 1.6 * (f + 1) + 0.6, 2.02]}>
            <planeGeometry args={[w * 0.5, 0.7]} />
            <Mat c="#fcd34d" e={0.7} />
          </mesh>
        ) : null,
      )}
      {shop && (
        <group position={[0, AWNING.y, 2 + AWNING.out]} rotation={[AWNING.tilt, 0, 0]}>
          {Array.from({ length: stripes }, (_, i) => (
            <mesh key={i} position={[(i - (stripes - 1) / 2) * sw, 0, 0]}>
              <boxGeometry args={[sw, 0.05, AWNING.depth]} />
              <Mat c={i % 2 === 0 ? c1 : c2} />
            </mesh>
          ))}
        </group>
      )}
      {/* câu đối đỏ hai bên cửa */}
      {shop &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (w * 0.4 + 0.12), 1.0, 2.03]}>
            <mesh>
              <planeGeometry args={[0.13, 1.0]} />
              <Mat c="#dc2626" e={0.15} />
            </mesh>
            {[-0.25, 0.05, 0.3].map((y) => (
              <mesh key={y} position={[0, y, 0.004]}>
                <planeGeometry args={[0.05, 0.07]} />
                <Mat c="#facc15" e={0.3} />
              </mesh>
            ))}
          </group>
        ))}
      {variant % 2 === 0 ? (
        <mesh position={[w * 0.3, 1.6 + 0.35, 2.14]}>
          <boxGeometry args={[0.5, 0.3, 0.26]} />
          <Mat c="#d1d5db" />
        </mesh>
      ) : (
        <group position={[w * 0.25, 1.6 + 0.6 - 0.45, 2.3]}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 0.18, 6]} />
            <Mat c="#b45309" />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <icosahedronGeometry args={[0.15, 0]} />
            <Mat c="#16a34a" />
          </mesh>
          <mesh position={[0.06, 0.34, 0.05]}>
            <icosahedronGeometry args={[0.06, 0]} />
            <Mat c={variant % 4 === 1 ? '#f472b6' : '#facc15'} e={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

const FLAG_COLORS = ['#dc2626', '#facc15', '#f97316'] as const;

/** Dây cờ Tết căng ngang đường, từ (x, y0, z0) tới (x, y1, z1). Treo cao nên không chắn tầm nhìn. */
export function Bunting({ x, y0, y1, z0, z1, flags = 10 }: Readonly<{ x: number; y0: number; y1: number; z0: number; z1: number; flags?: number }>) {
  const dy = y1 - y0;
  const dz = z1 - z0;
  const len = Math.hypot(dy, dz);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, (y0 + y1) / 2, (z0 + z1) / 2]} rotation={[Math.atan2(dz, dy), 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, len, 3]} />
        <Mat c="#6b7280" />
      </mesh>
      {Array.from({ length: flags }, (_, i) => {
        const t = (i + 0.5) / flags;
        return (
          <mesh key={i} position={[0, y0 + dy * t - 0.14, z0 + dz * t]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.11, 0.24, 3]} />
            <Mat c={FLAG_COLORS[i % FLAG_COLORS.length]!} e={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Vạch qua đường (các vạch song song với trục z, nằm trên lòng đường z -1.8..2.2). */
export function Crosswalk({ x }: Readonly<{ x: number }>) {
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x + i * 0.85, 0.025, 0.2]}>
          <planeGeometry args={[0.45, 3.5]} />
          <Mat c="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
}

/** Dãy nhà phố bên kia đường (thấp chi tiết hơn nhà phía bắc: chỉ thân, biển hiệu, cửa cuốn, cửa sổ). */
export function FarShop({ w, h, c, sign, position }: Readonly<{ w: number; h: number; c: string; sign: string; position: V3 }>) {
  const floors = Math.max(2, Math.round(h / 1.7));
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 4]} />
        <Mat c={c} />
      </mesh>
      <mesh position={[0, 0.8, 2.01]}>
        <planeGeometry args={[w * 0.8, 1.5]} />
        <Mat c="#9ca3af" />
      </mesh>
      <mesh position={[0, 1.75, 2.08]}>
        <boxGeometry args={[w * 0.9, 0.35, 0.08]} />
        <Mat c={sign} e={0.25} />
      </mesh>
      {Array.from({ length: floors - 1 }, (_, f) => (
        <mesh key={f} position={[0, 1.7 * (f + 1) + 0.7, 2.01]}>
          <planeGeometry args={[w * 0.55, 0.8]} />
          <Mat c={f % 2 === 0 ? '#fcd34d' : '#1e293b'} e={f % 2 === 0 ? 0.5 : 0} />
        </mesh>
      ))}
    </group>
  );
}
