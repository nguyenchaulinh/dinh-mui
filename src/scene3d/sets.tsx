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
import { SETS, styleOfRegion } from './registry';
import { CUOI_NAM } from './walk';

/** Vùng → phong cách miền. Chưa biết vùng thì mặc định miền Bắc (logic dùng chung ở registry.ts). */
export function styleOf(regionId: string): Menu {
  return styleOfRegion(regionId);
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
  if (setId === 'cuoi-nam') return { sky: '#f2c4a0', fog: [20, 48], sun: 1.0, ambient: 0.95, sunColor: '#fff1dc' };
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

// ---------- Văn phòng / lớp học cuối năm ----------

/** Biến thể trang trí của phòng: văn phòng (người đi làm) hoặc lớp học (sinh viên). Cùng mặt bằng CUOI_NAM. */
export type RoomVariant = 'van-phong' | 'lop-hoc';

const ROOM: Record<RoomVariant, { floor: string; wall: string; dado: string; desk: string; board: string; counter: string }> = {
  'van-phong': { floor: '#bfb8ad', wall: '#f1ece4', dado: '#d6cfc4', desk: '#f4f1ec', board: '#f8fafc', counter: '#9ca3af' },
  'lop-hoc': { floor: '#e2cfa8', wall: '#f6e7c1', dado: '#8fb996', desk: '#c08a52', board: '#1f4d3a', counter: '#d97706' },
};

function Box({ p, s, c, e }: Readonly<{ p: [number, number, number]; s: [number, number, number]; c: string; e?: number }>) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <Mat c={c} e={e} />
    </mesh>
  );
}

/** Bàn + ghế phía sau (+z). Văn phòng: màn hình; lớp học: chồng sách. */
function Desk({ x, z, v }: Readonly<{ x: number; z: number; v: RoomVariant }>) {
  const { w, d, chairBack } = CUOI_NAM.desk;
  const top = ROOM[v].desk;
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.74, 0]} s={[w, 0.05, d]} c={top} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Box key={`${sx}${sz}`} p={[sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06)]} s={[0.05, 0.72, 0.05]} c="#6b7280" />),
      )}
      {v === 'van-phong' ? (
        <>
          <Box p={[0, 1.0, -d / 2 + 0.12]} s={[0.55, 0.34, 0.03]} c="#111827" />
          <Box p={[0, 1.0, -d / 2 + 0.14]} s={[0.5, 0.29, 0.01]} c="#93c5fd" e={0.35} />
        </>
      ) : (
        <>
          <Box p={[-0.35, 0.8, -0.1]} s={[0.28, 0.08, 0.2]} c="#2563eb" />
          <Box p={[-0.33, 0.87, -0.08]} s={[0.26, 0.06, 0.19]} c="#dc2626" />
        </>
      )}
      {/* ghế */}
      <group position={[0, 0, chairBack]}>
        <Box p={[0, 0.45, 0]} s={[0.46, 0.06, 0.44]} c={v === 'van-phong' ? '#1f2937' : '#a16207'} />
        <Box p={[0, 0.75, 0.2]} s={[0.46, 0.5, 0.05]} c={v === 'van-phong' ? '#1f2937' : '#a16207'} />
        <Box p={[0, 0.22, 0]} s={[0.06, 0.44, 0.06]} c="#4b5563" />
      </group>
    </group>
  );
}

function CuoiNam({ regionId, variant }: Readonly<{ regionId: string; variant: RoomVariant }>) {
  const L = CUOI_NAM;
  const room = ROOM[variant];
  const s = styleOf(regionId);
  const depth = L.frontZ - L.wallBackZ;
  const midZ = (L.wallBackZ + L.frontZ) / 2;
  const wallW = L.wallSideX * 2 + L.wallThick * 2;
  const h = L.wallHeight;
  const b = L.bossDesk;
  const doorLow = L.door.z0 - (L.wallBackZ - L.wallThick);
  const doorHigh = L.frontZ + L.wallThick - L.door.z1;
  const doorX = L.wallSideX + L.wallThick / 2;
  return (
    <group>
      <Ground c="#6b5b4f" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, midZ]}>
        <planeGeometry args={[L.wallSideX * 2, depth]} />
        <Mat c={room.floor} />
      </mesh>
      {/* tường sau + chân tường */}
      <Box p={[0, h / 2, L.wallBackZ - L.wallThick / 2]} s={[wallW, h, L.wallThick]} c={room.wall} />
      <Box p={[0, 0.45, L.wallBackZ + 0.01]} s={[wallW - 0.6, 0.9, 0.02]} c={room.dado} />
      {/* tường trái có cửa sổ nhìn ra phố */}
      <Box p={[-L.wallSideX - L.wallThick / 2, h / 2, midZ]} s={[L.wallThick, h, depth + L.wallThick]} c={room.wall} />
      {[-2.8, -0.4, 2.0].map((z) => (
        <Box key={z} p={[-L.wallSideX + 0.01, 1.7, z]} s={[0.02, 1.0, 1.4]} c="#bfe3ff" e={0.5} />
      ))}
      {/* tường phải, chừa khe cửa */}
      <Box p={[doorX, h / 2, L.door.z0 - doorLow / 2]} s={[L.wallThick, h, doorLow]} c={room.wall} />
      <Box p={[doorX, h / 2, L.door.z1 + doorHigh / 2]} s={[L.wallThick, h, doorHigh]} c={room.wall} />
      <Box p={[doorX, 2.35, (L.door.z0 + L.door.z1) / 2]} s={[L.wallThick, 1.3, L.door.z1 - L.door.z0]} c={room.wall} />
      {/* khung cửa + biển "Lối ra" */}
      {[L.door.z0, L.door.z1].map((z) => (
        <Box key={z} p={[doorX - 0.16, 0.85, z]} s={[0.06, 1.7, 0.08]} c="#7c4a2a" />
      ))}
      <Box p={[doorX - 0.17, 1.95, (L.door.z0 + L.door.z1) / 2]} s={[0.04, 0.22, 0.7]} c="#16a34a" e={0.6} />
      {/* bảng trắng / bảng đen và băng rôn Tết trên tường sau */}
      <Box p={[-0.4, 1.55, L.wallBackZ + 0.03]} s={[2.6, 1.1, 0.04]} c={room.board} />
      <Box p={[-0.4, 2.55, L.wallBackZ + 0.03]} s={[3.6, 0.36, 0.03]} c="#c0262d" />
      <Box p={[-0.4, 2.55, L.wallBackZ + 0.05]} s={[3.3, 0.06, 0.01]} c="#f5b82e" e={0.3} />
      {L.desks.map((d, i) => (
        <Desk key={i} x={d.x} z={d.z} v={variant} />
      ))}
      {/* bàn sếp / bàn giáo viên */}
      <group position={[b.x, 0, b.z]}>
        <Box p={[0, 0.75, 0]} s={[b.w, 0.08, b.d]} c={variant === 'van-phong' ? '#7c4a2a' : '#a16207'} />
        <Box p={[0, 0.37, 0.3]} s={[b.w - 0.1, 0.72, 0.06]} c={variant === 'van-phong' ? '#5b3720' : '#854d0e'} />
        {variant === 'van-phong' ? (
          <Box p={[0.3, 1.0, -0.15]} s={[0.6, 0.36, 0.03]} c="#111827" />
        ) : (
          <Box p={[-0.5, 0.88, 0]} s={[0.14, 0.18, 0.14]} c="#f472b6" />
        )}
        <Box p={[0, 0.5, -0.75]} s={[0.5, 1.0, 0.45]} c="#1f2937" />
      </group>
      {/* quầy pha cà phê / bàn liên hoan */}
      <group position={[L.counter.x, 0, L.counter.z]}>
        <Box p={[0, 0.45, 0]} s={[L.counter.w, 0.9, L.counter.d]} c={room.counter} />
        {variant === 'van-phong' ? (
          <>
            <Box p={[0, 1.1, 0.6]} s={[0.35, 0.4, 0.3]} c="#374151" />
            <Box p={[0, 1.15, -0.1]} s={[0.25, 0.5, 0.25]} c="#bae6fd" e={0.2} />
          </>
        ) : (
          ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'].map((c, i) => <Box key={c} p={[0, 1.03, -0.7 + i * 0.32]} s={[0.12, 0.26, 0.12]} c={c} />)
        )}
      </group>
      {/* móc áo */}
      <group position={[L.coatRack.x, 0, L.coatRack.z]}>
        <Box p={[0, 0.85, 0]} s={[0.06, 1.7, 0.06]} c="#5b3720" />
        <Box p={[0, 0.03, 0]} s={[0.5, 0.06, 0.5]} c="#5b3720" />
      </group>
      <BlossomTree kind="quat" position={[L.plants[0].x, 0, L.plants[0].z]} scale={1.1} />
      <BlossomTree kind={BLOSSOM[s]} position={[L.plants[1].x, 0, L.plants[1].z]} scale={1.0} />
      {/* Phòng không có trần (dàn cảnh hở cho camera): đèn lồng treo sát tường sau, hai bên băng rôn, không lơ lửng giữa phòng. */}
      <Lantern position={[-2.6, 2.35, L.wallBackZ + 0.3]} />
      <Lantern position={[1.8, 2.35, L.wallBackZ + 0.3]} />
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

export function SetView({ setId, regionId, variant }: Readonly<{ setId: string; regionId: string; variant?: string }>) {
  switch (setId) {
    case 'cuoi-nam':
      return <CuoiNam regionId={regionId} variant={variant === 'lop-hoc' ? 'lop-hoc' : 'van-phong'} />;
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
