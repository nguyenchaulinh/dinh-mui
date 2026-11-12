import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import type { Group } from 'three';

/** Đạo cụ low-poly dựng bằng code. Toạ độ y hướng lên, đơn vị ~ mét. */

type V3 = [number, number, number];

export function Mat({ c, e }: Readonly<{ c: string; e?: number }>) {
  return (
    <meshStandardMaterial
      color={c}
      flatShading
      roughness={0.85}
      emissive={e ? c : '#000000'}
      emissiveIntensity={e ?? 0}
    />
  );
}

/** Số giả ngẫu nhiên ổn định theo chỉ số (để cảnh không đổi mỗi lần render). */
export const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- Hoa Tết ----------

export type Blossom = 'dao' | 'mai' | 'quat';

const BLOSSOM_COLOR: Record<Blossom, string> = { dao: '#f472b6', mai: '#facc15', quat: '#f97316' };

/** Cụm hoa/quả: đào hồng, mai vàng, quất cam trên tán xanh. */
export function BlossomTree({ kind, scale = 1, position }: Readonly<{ kind: Blossom; scale?: number; position?: V3 }>) {
  const dots = useMemo(
    () =>
      Array.from({ length: kind === 'quat' ? 14 : 22 }, (_, i) => {
        const a = rnd(i) * Math.PI * 2;
        const r = 0.15 + rnd(i + 50) * 0.35;
        return [Math.cos(a) * r, 0.75 + rnd(i + 99) * 0.55, Math.sin(a) * r] as V3;
      }),
    [kind],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.24, 8]} />
        <Mat c="#92400e" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.6, 5]} />
        <Mat c="#57361f" />
      </mesh>
      {kind === 'quat' && (
        <mesh position={[0, 1.0, 0]}>
          <icosahedronGeometry args={[0.42, 0]} />
          <Mat c="#15803d" />
        </mesh>
      )}
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <icosahedronGeometry args={[kind === 'quat' ? 0.06 : 0.055, 0]} />
          <Mat c={BLOSSOM_COLOR[kind]} e={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Xe máy ----------

export function Motorbike({
  body = '#dc2626',
  shirt = '#1d4ed8',
  helmet = '#f8fafc',
  cargo,
}: Readonly<{ body?: string; shirt?: string; helmet?: string; cargo?: Blossom | 'box' }>) {
  return (
    <group>
      {[-0.45, 0.45].map((z) => (
        <mesh key={z} position={[0, 0.22, z]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.18, 0.06, 5, 10]} />
          <Mat c="#111827" />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.24, 0.24, 0.9]} />
        <Mat c={body} />
      </mesh>
      <mesh position={[0, 0.58, -0.12]}>
        <boxGeometry args={[0.26, 0.08, 0.5]} />
        <Mat c="#1f2937" />
      </mesh>
      <mesh position={[0, 0.78, 0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
        <Mat c="#9ca3af" />
      </mesh>
      {/* người lái */}
      <mesh position={[0, 0.9, -0.05]}>
        <cylinderGeometry args={[0.15, 0.19, 0.5, 6]} />
        <Mat c={shirt} />
      </mesh>
      <mesh position={[0, 1.28, -0.02]}>
        <icosahedronGeometry args={[0.2, 1]} />
        <Mat c={helmet} />
      </mesh>
      {cargo === 'box' && (
        <group position={[0, 0.85, -0.55]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.3, 0]} rotation={[0, i * 0.2, 0]}>
              <boxGeometry args={[0.5, 0.28, 0.4]} />
              <Mat c="#c08457" />
            </mesh>
          ))}
        </group>
      )}
      {cargo && cargo !== 'box' && <BlossomTree kind={cargo} scale={0.9} position={[0, 0.55, -0.55]} />}
    </group>
  );
}

/** Dòng xe máy chạy vòng trên một làn đường dọc trục x. */
export function Traffic({
  lanes,
  count,
  length = 40,
  cargoMix,
}: Readonly<{ lanes: { z: number; dir: 1 | -1; speed: number }[]; count: number; length?: number; cargoMix: Blossom[] }>) {
  const refs = useRef<(Group | null)[]>([]);
  const bikes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const lane = lanes[i % lanes.length]!;
        const palette = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0f172a'];
        const cargoRoll = rnd(i + 7);
        const cargo: Blossom | 'box' | undefined =
          cargoRoll < 0.45 ? cargoMix[i % cargoMix.length] : cargoRoll < 0.6 ? 'box' : undefined;
        return {
          lane,
          offset: rnd(i) * length,
          body: palette[i % palette.length]!,
          shirt: palette[(i + 3) % palette.length]!,
          cargo,
        };
      }),
    [lanes, count, length, cargoMix],
  );
  useFrame(({ clock }) => {
    bikes.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const d = (b.offset + clock.elapsedTime * b.lane.speed) % length;
      g.position.x = b.lane.dir * (d - length / 2);
      g.position.y = Math.abs(Math.sin(clock.elapsedTime * 9 + i)) * 0.015;
    });
  });
  return (
    <group>
      {bikes.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, 0, b.lane.z]}
          rotation={[0, b.lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          <Motorbike body={b.body} shirt={b.shirt} cargo={b.cargo} />
        </group>
      ))}
    </group>
  );
}

// ---------- Phố ----------

/** Nhà ống: hẹp, cao, mặt tiền nhiều màu, ban công, biển hiệu, cờ đỏ. */
export function TubeHouse({
  w,
  h,
  c,
  sign,
  flag,
  position,
}: Readonly<{ w: number; h: number; c: string; sign?: string; flag?: boolean; position: V3 }>) {
  const floors = Math.max(2, Math.round(h / 1.6));
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 4]} />
        <Mat c={c} />
      </mesh>
      {Array.from({ length: floors - 1 }, (_, f) => (
        <group key={f} position={[0, 1.6 * (f + 1) + 0.6, 2.01]}>
          <mesh>
            <planeGeometry args={[w * 0.55, 0.8]} />
            <Mat c="#1e293b" />
          </mesh>
          <mesh position={[0, -0.45, 0.2]}>
            <boxGeometry args={[w * 0.8, 0.08, 0.4]} />
            <Mat c="#e5e7eb" />
          </mesh>
        </group>
      ))}
      {/* tầng trệt: cửa cuốn + biển hiệu */}
      <mesh position={[0, 0.8, 2.01]}>
        <planeGeometry args={[w * 0.8, 1.5]} />
        <Mat c="#9ca3af" />
      </mesh>
      {sign && (
        <mesh position={[0, 1.75, 2.08]}>
          <boxGeometry args={[w * 0.9, 0.35, 0.08]} />
          <Mat c={sign} e={0.25} />
        </mesh>
      )}
      {flag && (
        <group position={[w * 0.35, 2.6, 2.3]} rotation={[0, 0, -0.4]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 4]} />
            <Mat c="#d1d5db" />
          </mesh>
          <mesh position={[0.22, 0.55, 0]}>
            <planeGeometry args={[0.45, 0.3]} />
            <meshStandardMaterial color="#dc2626" side={2} />
          </mesh>
          <mesh position={[0.22, 0.55, 0.005]}>
            <circleGeometry args={[0.06, 5]} />
            <meshStandardMaterial color="#facc15" side={2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Lantern({ position, c = '#dc2626' }: Readonly<{ position: V3; c?: string }>) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.5 + position[0]) * 0.08;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, -0.25, 0]} scale={[1, 1.15, 1]}>
        <icosahedronGeometry args={[0.2, 1]} />
        <Mat c={c} e={0.5} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.1, 3]} />
        <Mat c="#facc15" />
      </mesh>
    </group>
  );
}

// ---------- Nhà ở quê ----------

/** Nhà mái ngói (Bắc), mái thấp (Trung), nhà có hiên rộng (Nam). */
export function CountryHouse({ style, position }: Readonly<{ style: 'bac' | 'trung' | 'nam'; position: V3 }>) {
  const wall = style === 'nam' ? '#fef3c7' : style === 'trung' ? '#fde68a' : '#f5f5f4';
  const roof = style === 'bac' ? '#b45309' : style === 'trung' ? '#9a3412' : '#7c2d12';
  const roofH = style === 'trung' ? 0.9 : 1.4;
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[7, 2.4, 3.6]} />
        <Mat c={wall} />
      </mesh>
      {/* mái: lăng trụ tam giác */}
      <mesh position={[0, 2.4 + roofH / 2, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
        <cylinderGeometry args={[0.01, 2.6, roofH, 4, 1, false, Math.PI / 4]} />
        <Mat c={roof} />
      </mesh>
      <mesh position={[0, 2.4 + roofH / 2, 0]} scale={[1.55, 1, 1]}>
        <cylinderGeometry args={[0.01, 2.6, roofH, 4, 1, false, Math.PI / 4]} />
        <Mat c={roof} />
      </mesh>
      {/* cửa gỗ, câu đối đỏ hai bên */}
      {[-1.6, 0, 1.6].map((x) => (
        <mesh key={x} position={[x, 1, 1.81]}>
          <planeGeometry args={[1.1, 1.9]} />
          <Mat c="#78350f" />
        </mesh>
      ))}
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.2, 1.82]}>
          <planeGeometry args={[0.22, 1.3]} />
          <Mat c="#dc2626" e={0.2} />
        </mesh>
      ))}
      {style === 'nam' && (
        <mesh position={[0, 2.35, 2.6]}>
          <boxGeometry args={[7.4, 0.1, 1.8]} />
          <Mat c={roof} />
        </mesh>
      )}
    </group>
  );
}

export function Bamboo({ position, n = 7 }: Readonly<{ position: V3; n?: number }>) {
  return (
    <group position={position}>
      {Array.from({ length: n }, (_, i) => {
        const x = (rnd(i) - 0.5) * 1.4;
        const z = (rnd(i + 10) - 0.5) * 1.4;
        const h = 4 + rnd(i + 20) * 2.5;
        return (
          <group key={i} position={[x, 0, z]} rotation={[(rnd(i + 30) - 0.5) * 0.2, 0, (rnd(i + 40) - 0.5) * 0.25]}>
            <mesh position={[0, h / 2, 0]}>
              <cylinderGeometry args={[0.04, 0.06, h, 5]} />
              <Mat c="#65a30d" />
            </mesh>
            <mesh position={[0, h, 0]}>
              <coneGeometry args={[0.45, 1.4, 5]} />
              <Mat c="#3f6212" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function CoconutTree({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position} rotation={[0, 0, 0.12]}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 4.4, 6]} />
        <Mat c="#8b6b4a" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 4.4, 0]} rotation={[0.9, (i * Math.PI * 2) / 7, 0]}>
          <boxGeometry args={[0.25, 0.04, 2.2]} />
          <Mat c="#16a34a" />
        </mesh>
      ))}
    </group>
  );
}

export function VillageGate({ style, position }: Readonly<{ style: 'bac' | 'trung' | 'nam'; position: V3 }>) {
  if (style === 'bac') {
    return (
      <group position={position}>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 1.4, 0]}>
            <boxGeometry args={[0.6, 2.8, 0.6]} />
            <Mat c="#d6d3d1" />
          </mesh>
        ))}
        <mesh position={[0, 3.0, 0]}>
          <boxGeometry args={[3.6, 0.5, 0.8]} />
          <Mat c="#a8a29e" />
        </mesh>
        <mesh position={[0, 3.45, 0]}>
          <cylinderGeometry args={[0.01, 2.2, 0.5, 4, 1, false, Math.PI / 4]} />
          <Mat c="#b45309" />
        </mesh>
      </group>
    );
  }
  // Trung, Nam: cổng gỗ đơn giản
  return (
    <group position={position}>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]}>
          <boxGeometry args={[0.18, 1.8, 0.18]} />
          <Mat c="#92400e" />
        </mesh>
      ))}
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[2.6, 0.14, 0.18]} />
        <Mat c="#92400e" />
      </mesh>
    </group>
  );
}

export function TeaTable({ position }: Readonly<{ position: V3 }>) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.3, 0.08, 0.8]} />
        <Mat c="#78350f" />
      </mesh>
      {[
        [-0.55, -0.32],
        [0.55, -0.32],
        [-0.55, 0.32],
        [0.55, 0.32],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.2, z!]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <Mat c="#57361f" />
        </mesh>
      ))}
      <mesh position={[0, 0.54, 0]}>
        <icosahedronGeometry args={[0.1, 1]} />
        <Mat c="#e0f2fe" />
      </mesh>
      {[-0.25, -0.12, 0.15, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.49, 0.15]}>
          <cylinderGeometry args={[0.035, 0.025, 0.05, 6]} />
          <Mat c="#f8fafc" />
        </mesh>
      ))}
      <mesh position={[0.3, 0.47, -0.15]}>
        <cylinderGeometry args={[0.12, 0.1, 0.03, 8]} />
        <Mat c="#dc2626" />
      </mesh>
    </group>
  );
}

export function Stool({ position }: Readonly<{ position: V3 }>) {
  return (
    <mesh position={[position[0], 0.15, position[2]]}>
      <cylinderGeometry args={[0.2, 0.18, 0.3, 6]} />
      <Mat c="#dc2626" />
    </mesh>
  );
}

// ---------- Mâm cỗ ----------

export type Menu = 'bac' | 'trung' | 'nam';

function Plate({ position, children }: Readonly<{ position: V3; children?: ReactNode }>) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.17, 0.03, 10]} />
        <Mat c="#f8fafc" />
      </mesh>
      <group position={[0, 0.02, 0]}>{children}</group>
    </group>
  );
}

function Bowl({ position, soup }: Readonly<{ position: V3; soup: string }>) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.16, 0.09, 0.14, 10, 1, true]} />
        <meshStandardMaterial color="#f8fafc" side={2} flatShading />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 10]} />
        <Mat c={soup} />
      </mesh>
    </group>
  );
}

function BanhChung() {
  return (
    <group position={[0, 0.07, 0]}>
      <mesh>
        <boxGeometry args={[0.26, 0.12, 0.26]} />
        <Mat c="#3f7d20" />
      </mesh>
      {[-0.06, 0.06].map((o) => (
        <group key={o}>
          <mesh position={[o, 0.001, 0]}>
            <boxGeometry args={[0.012, 0.125, 0.265]} />
            <Mat c="#f5f5dc" />
          </mesh>
          <mesh position={[0, 0.001, o]}>
            <boxGeometry args={[0.265, 0.125, 0.012]} />
            <Mat c="#f5f5dc" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BanhTet() {
  return (
    <group>
      {[-0.07, 0, 0.07].map((x, i) => (
        <group key={x} position={[x, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 10]} />
            <Mat c={i === 1 ? '#fef9c3' : '#3f7d20'} />
          </mesh>
          {/* nhân đậu xanh và thịt */}
          <mesh position={[0, 0.026, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.002, 8]} />
            <Mat c="#eab308" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Slices({ c, inner }: Readonly<{ c: string; inner?: string }>) {
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i * 1.25) * 0.09, 0.02 + i * 0.002, Math.sin(i * 1.25) * 0.09]}>
          <cylinderGeometry args={[0.06, 0.06, 0.025, 8]} />
          <Mat c={i % 2 && inner ? inner : c} />
        </mesh>
      ))}
    </group>
  );
}

function XoiGac() {
  return (
    <mesh position={[0, 0.04, 0]} scale={[1, 0.6, 1]}>
      <icosahedronGeometry args={[0.13, 1]} />
      <Mat c="#dc2626" e={0.1} />
    </mesh>
  );
}

function Rolls({ c }: Readonly<{ c: string }>) {
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[(i - 2) * 0.06, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.16, 6]} />
          <Mat c={c} />
        </mesh>
      ))}
    </group>
  );
}

function Eggs() {
  return (
    <group>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]} scale={[1, 1.25, 1]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          <Mat c="#fef3c7" />
        </mesh>
      ))}
    </group>
  );
}

/** Mâm đồng tròn với món theo vùng; bát đũa trước mỗi chỗ ngồi. */
export function Feast({ menu, seats }: Readonly<{ menu: Menu; seats: V3[] }>) {
  const ring = (i: number, n: number, r: number): V3 => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
  };
  const dishes: Record<Menu, ReactNode[]> = {
    bac: [
      <Plate key="bc" position={ring(0, 6, 0.42)}><BanhChung /></Plate>,
      <Plate key="gio" position={ring(1, 6, 0.42)}><Slices c="#fbcfe8" inner="#fce7f3" /></Plate>,
      <Plate key="xoi" position={ring(2, 6, 0.42)}><XoiGac /></Plate>,
      <Plate key="nem" position={ring(3, 6, 0.42)}><Rolls c="#d97706" /></Plate>,
      <Bowl key="mang" position={ring(4, 6, 0.42)} soup="#ca8a04" />,
      <Plate key="dua" position={ring(5, 6, 0.42)}><Slices c="#f8fafc" inner="#bbf7d0" /></Plate>,
      <Plate key="ga" position={[0, 0, 0]}><XoiGac /></Plate>,
    ],
    trung: [
      <Plate key="bt" position={ring(0, 6, 0.42)}><BanhTet /></Plate>,
      <Plate key="nc" position={ring(1, 6, 0.42)}><Rolls c="#fda4af" /></Plate>,
      <Plate key="tre" position={ring(2, 6, 0.42)}><Slices c="#fde68a" /></Plate>,
      <Plate key="dm" position={ring(3, 6, 0.42)}><Slices c="#fdba74" inner="#fef3c7" /></Plate>,
      <Bowl key="canh" position={ring(4, 6, 0.42)} soup="#a3e635" />,
      <Plate key="thit" position={ring(5, 6, 0.42)}><Slices c="#fecaca" inner="#fff7ed" /></Plate>,
      <Plate key="xoi" position={[0, 0, 0]}><XoiGac /></Plate>,
    ],
    nam: [
      <Plate key="bt" position={ring(0, 6, 0.42)}><BanhTet /></Plate>,
      <group key="kho" position={ring(1, 6, 0.42)}><Bowl position={[0, 0, 0]} soup="#92400e" /><Eggs /></group>,
      <Bowl key="kq" position={ring(2, 6, 0.42)} soup="#4d7c0f" />,
      <Plate key="kieu" position={ring(3, 6, 0.42)}><Slices c="#f8fafc" inner="#fecdd3" /></Plate>,
      <Plate key="lx" position={ring(4, 6, 0.42)}><Rolls c="#b91c1c" /></Plate>,
      <Plate key="dua" position={ring(5, 6, 0.42)}><Slices c="#fef9c3" /></Plate>,
      <Plate key="xoi" position={[0, 0, 0]}><XoiGac /></Plate>,
    ],
  };
  return (
    <group>
      {/* bàn thấp + mâm đồng */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.0, 0.9, 0.4, 14]} />
        <Mat c="#7c2d12" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.85, 0.82, 0.04, 20]} />
        <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.35} flatShading />
      </mesh>
      <group position={[0, 0.44, 0]}>{dishes[menu]}</group>
      {/* bát đũa trước từng chỗ */}
      {seats.map((p, i) => {
        const d = Math.hypot(p[0], p[2]) || 1;
        const at: V3 = [(p[0] / d) * 0.72, 0.46, (p[2] / d) * 0.72];
        return (
          <group key={i} position={at}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.06, 0.04, 0.06, 8]} />
              <Mat c="#f8fafc" />
            </mesh>
            <mesh position={[0.08, 0.005, 0]} rotation={[0, Math.atan2(p[0], p[2]), Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.22, 3]} />
              <Mat c="#78350f" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Bàn thờ: mâm ngũ quả, bát hương có khói, nến, câu đối. */
export function Altar({ position }: Readonly<{ position: V3 }>) {
  const smoke = useRef<Group>(null);
  useFrame(({ clock }) => {
    smoke.current?.children.forEach((m, i) => {
      const t = (clock.elapsedTime * 0.35 + i / 3) % 1;
      m.position.y = t * 0.8;
      m.position.x = Math.sin(t * 6 + i) * 0.04;
      m.scale.setScalar(0.4 + t);
    });
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.0, 1.1, 0.8]} />
        <Mat c="#7f1d1d" />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[2.1, 0.06, 0.9]} />
        <Mat c="#d4a017" />
      </mesh>
      {/* bát hương + khói */}
      <group position={[0, 1.15, 0.1]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.13, 0.1, 0.16, 8]} />
          <Mat c="#a16207" />
        </mesh>
        {[-0.03, 0, 0.03].map((x) => (
          <mesh key={x} position={[x, 0.25, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.22, 3]} />
            <Mat c="#dc2626" e={0.6} />
          </mesh>
        ))}
        <group ref={smoke} position={[0, 0.36, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.03, 5, 4]} />
              <meshStandardMaterial color="#e5e7eb" transparent opacity={0.35} />
            </mesh>
          ))}
        </group>
      </group>
      {/* mâm ngũ quả */}
      <group position={[-0.6, 1.15, 0.05]}>
        {[
          ['#facc15', 0, 0.12, 0, 0.1],
          ['#16a34a', -0.08, 0.06, 0.04, 0.07],
          ['#f97316', 0.09, 0.06, 0.02, 0.07],
          ['#dc2626', 0, 0.06, 0.1, 0.06],
        ].map(([c, x, y, z, r]) => (
          <mesh key={String(c)} position={[x as number, y as number, z as number]}>
            <icosahedronGeometry args={[r as number, 1]} />
            <Mat c={c as string} />
          </mesh>
        ))}
      </group>
      {/* nến */}
      {[0.55, 0.8].map((x) => (
        <group key={x} position={[x, 1.15, 0.1]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <Mat c="#dc2626" />
          </mesh>
          <mesh position={[0, 0.23, 0]}>
            <coneGeometry args={[0.02, 0.06, 5]} />
            <Mat c="#fde047" e={1.5} />
          </mesh>
        </group>
      ))}
      {/* câu đối */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.7, -0.3]}>
          <boxGeometry args={[0.3, 1.6, 0.04]} />
          <Mat c="#dc2626" e={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 2.3, -0.3]}>
        <boxGeometry args={[2.4, 0.4, 0.04]} />
        <Mat c="#dc2626" e={0.25} />
      </mesh>
    </group>
  );
}
