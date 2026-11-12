import { useMemo } from 'react';
import {
  Altar,
  Bamboo,
  BlossomTree,
  CoconutTree,
  CountryHouse,
  Feast,
  Lantern,
  Mat,
  Stool,
  TeaTable,
  Traffic,
  TubeHouse,
  VillageGate,
  rnd,
  type Blossom,
  type Menu,
} from './props';
import { SETS } from './registry';

/** Vùng → phong cách miền. Chưa biết vùng thì mặc định miền Bắc. */
export function styleOf(regionId: string): Menu {
  if (regionId === 'da-nang') return 'trung';
  if (regionId === 'sai-gon') return 'nam';
  return 'bac';
}

const BLOSSOM: Record<Menu, Blossom> = { bac: 'dao', trung: 'mai', nam: 'mai' };

/** Bầu trời, sương, nắng theo set và miền (Hà Nội mưa phùn xám, Sài Gòn nắng). */
export interface Env {
  sky: string;
  fog: [number, number];
  sun: number;
  ambient: number;
  sunColor: string;
}

export function envOf(setId: string, regionId: string): Env {
  const s = styleOf(regionId);
  if (setId === 'nha-tren') return { sky: '#3b1d12', fog: [12, 30], sun: 1.1, ambient: 0.75, sunColor: '#ffd8a8' };
  if (setId === 'san-nha') {
    // chập tối, ánh hoàng hôn
    return { sky: s === 'nam' ? '#f4a261' : '#c9846b', fog: [14, 40], sun: 1.2, ambient: 0.6, sunColor: '#ffc78a' };
  }
  if (s === 'bac') return { sky: '#b8c2cc', fog: [10, 38], sun: 0.9, ambient: 0.85, sunColor: '#e5e7eb' };
  if (s === 'trung') return { sky: '#a5d8ff', fog: [16, 50], sun: 1.4, ambient: 0.7, sunColor: '#fff4e0' };
  return { sky: '#8ecae6', fog: [18, 60], sun: 1.8, ambient: 0.65, sunColor: '#fff1c1' };
}

function Ground({ c, size = 80 }: Readonly<{ c: string; size?: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <Mat c={c} />
    </mesh>
  );
}

// ---------- Phố ngày 28 tháng Chạp ----------

function PhoTet({ regionId }: Readonly<{ regionId: string }>) {
  const s = styleOf(regionId);
  const blossom = BLOSSOM[s];
  const houses = useMemo(() => {
    const palette = ['#fde68a', '#fca5a5', '#a7f3d0', '#bfdbfe', '#fed7aa', '#e9d5ff', '#f5f5f4'];
    const out: { x: number; w: number; h: number; c: string; sign?: string; flag: boolean }[] = [];
    let x = -22;
    for (let i = 0; x < 22; i++) {
      const w = 2.4 + rnd(i) * 1.6;
      out.push({
        x: x + w / 2,
        w,
        h: (s === 'nam' ? 6 : 4.5) + rnd(i + 20) * 4,
        c: palette[i % palette.length]!,
        sign: rnd(i + 40) > 0.4 ? ['#dc2626', '#2563eb', '#16a34a', '#f59e0b'][i % 4] : undefined,
        flag: s === 'bac' && i % 2 === 0,
      });
      x += w + 0.05;
    }
    return out;
  }, [s]);
  const lanes = useMemo(
    () => [
      { z: -0.9, dir: 1 as const, speed: 2.6 },
      { z: -0.2, dir: 1 as const, speed: 2.1 },
      { z: 0.6, dir: -1 as const, speed: 2.4 },
      { z: 1.3, dir: -1 as const, speed: 1.8 },
    ],
    [],
  );
  const cargo = useMemo<Blossom[]>(() => [blossom, 'quat'], [blossom]);

  return (
    <group>
      <Ground c="#6b7280" />
      {/* lòng đường + vạch kẻ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.2]}>
        <planeGeometry args={[80, 4]} />
        <Mat c="#374151" />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-38 + i * 4, 0.02, 0.2]}>
          <planeGeometry args={[1.6, 0.08]} />
          <Mat c="#f8fafc" />
        </mesh>
      ))}
      {/* vỉa hè hai bên */}
      {[-2.9, 3.4].map((z) => (
        <mesh key={z} position={[0, 0.08, z]}>
          <boxGeometry args={[80, 0.16, 1.8]} />
          <Mat c="#d6d3d1" />
        </mesh>
      ))}
      {houses.map((h, i) => (
        <TubeHouse key={i} position={[h.x, 0, -5.8]} w={h.w} h={h.h} c={h.c} sign={h.sign} flag={h.flag} />
      ))}
      {/* cây hoa bày bán trên vỉa hè, đèn lồng */}
      {Array.from({ length: 9 }, (_, i) => (
        <BlossomTree key={i} kind={i % 3 === 2 ? 'quat' : blossom} position={[-9 + i * 2.2, 0.16, -3.2]} scale={0.9} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Lantern key={i} position={[-10 + i * 2.8, 3.3, -3.9]} />
      ))}
      {/* cột đèn giao thông */}
      <group position={[4.6, 0, 2.6]}>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3.2, 5]} />
          <Mat c="#111827" />
        </mesh>
        <mesh position={[0, 3.05, 0.1]}>
          <boxGeometry args={[0.22, 0.5, 0.15]} />
          <Mat c="#111827" />
        </mesh>
        <mesh position={[0, 3.18, 0.19]}>
          <sphereGeometry args={[0.06, 6, 4]} />
          <Mat c="#ef4444" e={2} />
        </mesh>
      </group>
      {s === 'nam' && <CoconutTree position={[-12, 0, 4.5]} />}
      <Traffic lanes={lanes} count={22} cargoMix={cargo} />
    </group>
  );
}

// ---------- Sân nhà ở quê ----------

function SanNha({ regionId }: Readonly<{ regionId: string }>) {
  const s = styleOf(regionId);
  return (
    <group>
      <Ground c={s === 'trung' ? '#e7d8b0' : s === 'nam' ? '#9fbf6f' : '#86a85a'} />
      {/* sân gạch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]}>
        <planeGeometry args={[9, 8]} />
        <Mat c={s === 'bac' ? '#c2410c' : '#d6d3d1'} />
      </mesh>
      <CountryHouse style={s} position={[0, 0, -3.6]} />
      <VillageGate style={s} position={[0, 0, 5.6]} />
      <TeaTable position={[0, 0, -0.4]} />
      <BlossomTree kind={BLOSSOM[s]} position={[-3.2, 0, -1.2]} scale={1.4} />
      <BlossomTree kind="quat" position={[3.2, 0, -1.2]} scale={1.2} />
      {s === 'bac' && (
        <>
          <Bamboo position={[-6.5, 0, 3]} />
          <Bamboo position={[6.5, 0, 2]} n={9} />
          {/* ao làng */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, 8]}>
            <circleGeometry args={[3, 12]} />
            <meshStandardMaterial color="#4a7c8c" roughness={0.2} />
          </mesh>
        </>
      )}
      {s === 'trung' && (
        <>
          <Bamboo position={[-6.5, 0, 2]} n={5} />
          <mesh position={[0, 3, -16]}>
            <coneGeometry args={[9, 6, 6]} />
            <Mat c="#4d7c0f" />
          </mesh>
        </>
      )}
      {s === 'nam' && (
        <>
          <CoconutTree position={[-6, 0, 2]} />
          <CoconutTree position={[6.5, 0, 0]} />
          {/* kênh rạch */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 9.5]}>
            <planeGeometry args={[60, 3]} />
            <meshStandardMaterial color="#5b8a72" roughness={0.2} />
          </mesh>
        </>
      )}
      <Lantern position={[-1.6, 2.3, -1.7]} />
      <Lantern position={[1.6, 2.3, -1.7]} />
    </group>
  );
}

// ---------- Nhà trên: mâm cơm tất niên ----------

function NhaTren({ regionId }: Readonly<{ regionId: string }>) {
  const s = styleOf(regionId);
  const seats = useMemo(
    () =>
      Object.entries(SETS['nha-tren']!.spots)
        .filter(([k]) => k.startsWith('ghe-'))
        .map(([, v]) => [v.pos[0], v.pos[1], v.pos[2]] as [number, number, number]),
    [],
  );
  return (
    <group>
      {/* sàn gạch, tường, cột gỗ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <Mat c="#b45309" />
      </mesh>
      <mesh position={[0, 2, -4.5]}>
        <boxGeometry args={[12, 4, 0.2]} />
        <Mat c="#fde68a" />
      </mesh>
      {[-6, 6].map((x) => (
        <mesh key={x} position={[x, 2, 0]}>
          <boxGeometry args={[0.2, 4, 12]} />
          <Mat c="#fef3c7" />
        </mesh>
      ))}
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} position={[x, 2, -4.2]}>
          <cylinderGeometry args={[0.16, 0.16, 4, 8]} />
          <Mat c="#78350f" />
        </mesh>
      ))}
      <Altar position={[0, 0, -3.8]} />
      <BlossomTree kind={BLOSSOM[s]} position={[-4.4, 0, -3.4]} scale={1.5} />
      <BlossomTree kind="quat" position={[4.4, 0, -3.4]} scale={1.3} />
      <Lantern position={[0, 3.6, -1]} />
      {/* TV chiếu chương trình Tết */}
      <group position={[5.6, 1.3, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.4, 0.85, 0.08]} />
          <Mat c="#111827" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[1.28, 0.74]} />
          <Mat c="#f97316" e={0.8} />
        </mesh>
      </group>
      {seats.map((p, i) => (
        <Stool key={i} position={p} />
      ))}
      <Feast menu={s} seats={seats} />
    </group>
  );
}

export function SetView({ setId, regionId }: Readonly<{ setId: string; regionId: string }>) {
  switch (setId) {
    case 'pho-tet':
      return <PhoTet regionId={regionId} />;
    case 'san-nha':
      return <SanNha regionId={regionId} />;
    case 'nha-tren':
      return <NhaTren regionId={regionId} />;
    default:
      return null;
  }
}
