import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { Lantern, Mat, type Menu } from './props';

/** Đạo cụ cho các cảnh đi lại (phố Tết, nhà trên). Hình học khớp vùng đi lại trong walk-pho-tet.ts / walk-nha-tren.ts. */

type V3 = [number, number, number];

/**
 * Sạp quà Tết sát nhà phố: quầy đỏ, mái che, giỏ quà, bao lì xì, đèn lồng.
 * Vùng chiếm: hộp rộng 2.6 x sâu 0.8 tại `position` (walk-pho-tet.ts: 'sap-qua' hw 1.3, hd 0.4).
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

/**
 * Quầy bếp sát tường tây của nhà trên: nồi bốc khói, chồng đĩa, thớt. Vùng chiếm: hộp 0.9 (x) x 2.4 (z)
 * (walk-nha-tren.ts 'quay-bep'). `position` là tâm quầy.
 */
export function KitchenCounter({ position, menu }: Readonly<{ position: V3; menu: Menu }>) {
  const steam = useRef<Group>(null);
  useFrame(({ clock }) => {
    steam.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.4 + i / 4) % 1;
      m.position.y = t * 0.9;
      m.position.x = Math.sin(t * 7 + i) * 0.05;
      m.scale.setScalar(0.5 + t * 0.9);
    });
  });
  const lidColor = menu === 'nam' ? '#92400e' : menu === 'trung' ? '#b45309' : '#78350f';
  return (
    <group position={position}>
      <mesh position={[0, 0.475, 0]}>
        <boxGeometry args={[0.9, 0.95, 2.4]} />
        <Mat c="#78350f" />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <boxGeometry args={[1.0, 0.06, 2.5]} />
        <Mat c="#fde68a" />
      </mesh>
      {/* hai nồi */}
      {[-0.65, 0.2].map((z) => (
        <group key={z} position={[0, 1.0, z]}>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.28, 0.24, 0.34, 10]} />
            <Mat c="#9ca3af" />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.25, 0.28, 0.06, 10]} />
            <Mat c={lidColor} />
          </mesh>
        </group>
      ))}
      {/* khói */}
      <group ref={steam} position={[0, 1.45, -0.65]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.07, 5, 4]} />
            <meshStandardMaterial color="#e5e7eb" transparent opacity={0.35} />
          </mesh>
        ))}
      </group>
      {/* chồng đĩa + đĩa thức ăn */}
      <group position={[0, 1.0, 0.85]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.02 + i * 0.03, 0]}>
            <cylinderGeometry args={[0.2, 0.18, 0.025, 10]} />
            <Mat c="#f8fafc" />
          </mesh>
        ))}
      </group>
      <group position={[0, 1.0, -0.2]}>
        <mesh position={[0.05, 0.03, 0]}>
          <cylinderGeometry args={[0.2, 0.17, 0.03, 10]} />
          <Mat c="#f8fafc" />
        </mesh>
        <mesh position={[0.05, 0.1, 0]}>
          <boxGeometry args={[0.22, 0.1, 0.22]} />
          <Mat c={menu === 'nam' ? '#92400e' : '#fbcfe8'} />
        </mesh>
      </group>
    </group>
  );
}
