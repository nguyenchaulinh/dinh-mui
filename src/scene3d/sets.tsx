import { useCallback, useMemo } from 'react';
import { BackSide, BufferAttribute, Color, SphereGeometry } from 'three';
import {
  Altar,
  Bamboo,
  BlossomTree,
  CoconutTree,
  CountryHouse,
  Feast,
  Lantern,
  Mat,
  Motorbike,
  Stool,
  TeaTable,
  Traffic,
  VillageGate,
  type Blossom,
  type Menu,
} from './props';
import { BANNER, BOARD_TEXT, CALENDAR, COUPLET_LEFT, COUPLET_RIGHT, OFFICE_MOTTO, SALE_POSTER, SCHEDULE_ROWS, SCHEDULE_TITLE, SCHOOL_MOTTO, STALL_SIGN, STATION_SIGN, STREET_BANNERS, shopSign } from './decorText';
import { OutsideStreet, Skyline } from './office-decor';
import { MergedShapes } from './Merged';
import { roomShapes } from './roomShapes';
import { Prop } from './Prop';
import { TextPlane } from './TextPlane';
import { TexMat } from './TexMat';
import { SETS, styleOfRegion } from './registry';
import { corkboardTexture, floorTexture, skyGradient, type FloorKind } from './textures';
import { BusStop, Bunting, Crosswalk, GiftStall, PARKED_BIKES, PowerLines, STREET_LAMP_XS } from './props-street';
import type { Shape } from './shapes';
import { PHO_TRAFFIC, phoFarHouses, phoHouses, phoSkyline } from './phoLayout';
import { StreetHouse } from './StreetHouse';
import { TramDung } from './set-tram-dung';
import { CUOI_NAM, PHO_TET, phoPots } from './walk';

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
  if (setId === 'tram-dung') return { sky: '#cfe3f2', fog: [20, 70], sun: 1.5, ambient: 0.75, sunColor: '#fff1c1' };
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

/** Màu đỉnh trời theo cảnh (chân trời lấy từ `envOf(...).sky`). Bán kính vòm nhỏ hơn mặt phẳng xa của camera (120). */
const SKY_ZENITH: Readonly<Record<string, string>> = {
  'cuoi-nam': '#9a7b68',
  'pho-tet': '#5f93d8',
  'tram-dung': '#5f93d8',
  'san-nha': '#5b4a7a',
};
const SKY_RADIUS = 100;

/** Vòm trời chuyển sắc từ chân trời lên đỉnh, thay cho nền một màu. Không chịu sương mù, không ghi độ sâu. */
function SkyDome({ horizon, zenith }: Readonly<{ horizon: string; zenith: string }>) {
  const geo = useMemo(() => {
    const g = new SphereGeometry(SKY_RADIUS, 18, 12);
    const { horizon: h, top } = skyGradient(horizon, zenith, 0.6);
    const a = new Color(h);
    const b = new Color(top);
    const c = new Color();
    const pos = g.attributes.position!;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      c.copy(a).lerp(b, Math.pow(Math.max(0, pos.getY(i) / SKY_RADIUS), 0.65));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    return g;
  }, [horizon, zenith]);
  return (
    <mesh geometry={geo} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
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
  const houses = useMemo(() => phoHouses(s), [s]);
  const farHouses = useMemo(() => phoFarHouses(), []);
  const skyline = useMemo(() => phoSkyline(), []);
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
  // 20 vạch kẻ giữa đường và 9 toà nhà xa: gộp, mỗi nhóm một mesh.
  const roadShapes = useMemo(() => Array.from({ length: 20 }, (_, i): Shape => ({ g: 'plane', s: [1.6, 0.08], p: [-38 + i * 4, 0.02, 0.2], r: [-Math.PI / 2, 0, 0], c: '#f8fafc' })), []);
  const skylineShapes = useMemo(() => skyline.map((b): Shape => ({ g: 'box', s: [b.w, b.h, 4], p: [b.x, b.h / 2, -13], c: b.c })), [skyline]);
  // Độ cao đỉnh nhà phố phía bắc tại x (dây điện neo vào mặt tiền không lơ lửng trên nhà thấp).
  const houseTop = useCallback((x: number) => (houses.find((h) => Math.abs(x - h.x) <= h.w / 2)?.h ?? 4.5) + 0.24, [houses]);

  return (
    <group>
      <Ground c="#6b7280" />
      {/* lòng đường + vạch kẻ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.2]}>
        <planeGeometry args={[80, 4]} />
        <TexMat kind="asphalt" base="#3b4252" rx={20} ry={1} rough={0.95} />
      </mesh>
      <MergedShapes solid={roadShapes} />
      {/* vỉa hè hai bên */}
      {[
        { z: -2.6, d: 2.4 }, // vỉa hè bắc: mặt tiền z -3.8 tới lề z -1.4 (rộng bằng vùng đi lại)
        { z: 3.4, d: 1.8 },
      ].map(({ z, d }) => (
        <mesh key={z} position={[0, PHO_TET.sidewalkTop / 2, z]}>
          <boxGeometry args={[80, PHO_TET.sidewalkTop, d]} />
          <TexMat kind="pavers" base="#cbc5bb" rx={60} ry={2} />
        </mesh>
      ))}
      {/* nhà phố phía bắc (có mái hiên, câu đối, bồn nước...) và dãy nhà thấp bên kia đường; mỗi nhà 4 draw call (houseShapes.ts) */}
      {houses.map((h, i) => (
        <StreetHouse key={i} position={[h.x, 0, -5.8]} w={h.w} h={h.h} c={h.c} sign={h.sign} signLines={h.sign ? shopSign(i) : undefined} flag={h.flag} variant={i} shop={h.sign !== undefined} />
      ))}
      {/* băng rôn Tết treo trên mặt tiền ba căn rộng, giữa hai hàng cửa sổ (cao 2.7 .. 3.3 m, trên đầu người) */}
      {houses
        .filter((h) => h.w > 2.8)
        .filter((_, k) => k % 3 === 0)
        .slice(0, STREET_BANNERS.length)
        .map((h, k) => (
          <TextPlane key={`bn${k}`} w={Math.min(2.4, h.w - 0.3)} h={0.6} lines={STREET_BANNERS[k]!.lines} bg={STREET_BANNERS[k]!.bg} grain position={[h.x, 3.0, -3.76]} />
        ))}
      {farHouses.map((h, i) => (
        <StreetHouse key={`f${i}`} position={[h.x, 0, 7.3]} w={h.w} h={h.h} c={h.c} sign={h.sign} variant={i} shop={false} far />
      ))}
      {/* cột đèn (tay đèn vươn ra lòng đường), ghế đá, thùng rác và bụi cây trên vỉa hè bên kia đường */}
      {STREET_LAMP_XS.map((x) => (
        <Prop key={x} model="street-light" position={[x, PHO_TET.sidewalkTop, 2.7]} rotY={Math.PI} fit={{ h: 4.2 }} />
      ))}
      {[-1.6, 8.6].map((x) => (
        <Prop key={`b${x}`} model="bench" position={[x, PHO_TET.sidewalkTop, 3.9]} rotY={Math.PI} fit={{ w: 1.6 }} blob />
      ))}
      {[-7.8, 2.2].map((x) => (
        <Prop key={`t${x}`} model="bin" position={[x, PHO_TET.sidewalkTop, 3.9]} fit={{ h: 0.9 }} blob />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Prop key={`u${i}`} model={i % 3 === 1 ? 'houseplant' : 'bush'} position={[-10.5 + i * 3.6, PHO_TET.sidewalkTop, 4.35]} fit={{ h: i % 3 === 1 ? 0.7 : 0.8 }} />
      ))}
      {/* nhà cao tầng xa phía sau dãy nhà bắc, vạch kẻ giữa đường (đã gộp) */}
      <MergedShapes solid={skylineShapes} />
      <PowerLines houseTop={houseTop} />
      {/* dây cờ Tết căng ngang đường (treo cao), vạch qua đường, xe máy đậu sát lề */}
      {[-10, -4, 2, 8].map((x) => (
        <Bunting key={x} x={x} y0={4.9} y1={4.6} z0={-3.9} z1={5.4} />
      ))}
      <Crosswalk x={-1.5} />
      {PARKED_BIKES.map(([x, z], i) => (
        <group key={`p${i}`} position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Motorbike rider={false} body={['#dc2626', '#1d4ed8', '#16a34a', '#f59e0b'][i % 4]} />
        </group>
      ))}
      {/* cây hoa bày bán trên vỉa hè, đèn lồng */}
      {phoPots().map((p) => (
        <BlossomTree key={p.x} kind={p.kind === 'quat' ? 'quat' : blossom} position={[p.x, PHO_TET.sidewalkTop, p.z]} scale={0.9} />
      ))}
      <GiftStall position={[PHO_TET.stall.x, PHO_TET.sidewalkTop, PHO_TET.stall.z]} />
      {/* biển sạp (hướng ra phố) */}
      <Box p={[PHO_TET.stall.x, 2.78, PHO_TET.stall.z + 0.46]} s={[2.5, 0.42, 0.05]} c="#b91c1c" />
      <TextPlane w={2.4} h={0.36} lines={STALL_SIGN} position={[PHO_TET.stall.x, 2.78, PHO_TET.stall.z + 0.49]} />
      {/* biển Ga Hà Nội vuông góc phố, gắn vào mặt tiền và treo cao 3 m (trên đầu người đi, nên không cần vật cản) để người đi từ đầu phố thấy trước */}
      <group position={[PHO_TET.bus.x - 1.6, 0, -2.6]}>
        <Box p={[0, SIGN_Y, 0]} s={[0.07, 0.95, 2.35]} c="#1e3a8a" />
        <TextPlane w={2.2} h={0.82} lines={STATION_SIGN} double position={[0, SIGN_Y, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>
      <group position={[PHO_TET.bus.x, PHO_TET.sidewalkTop, PHO_TET.bus.z]} rotation={[0, Math.PI, 0]}>
        <BusStop position={[0, 0, 0]} />
      </group>
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
      <Traffic lanes={lanes} count={PHO_TRAFFIC} cargoMix={cargo} />
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
      <Floor kind="tile" base={s === 'bac' ? '#b8501c' : '#cfcac2'} w={9} d={8} z={0.5} />
      {/* hàng rào hai bên sân (ngoài vùng đi lại x = ±9 nên không cần vật cản), cây chuối và bụi cây sau hàng rào */}
      {[-1, 1].map((sx) =>
        [-5.9, 0, 5.9].map((z) => <Prop key={`${sx}${z}`} model="fence" position={[sx * 9.7, 0, z]} rotY={Math.PI / 2} fit={{ w: 5.9 }} />),
      )}
      {[-1, 1].map((sx) => (
        <group key={`g${sx}`}>
          <Prop model="banana" position={[sx * 11, 0, -2]} fit={{ h: 2.6 }} />
          <Prop model="banana" position={[sx * 11.6, 0, -0.6]} rotY={1.2} fit={{ h: 2.2 }} />
          <Prop model="bush" position={[sx * 10.8, 0, 3.4]} fit={{ h: 1 }} />
          <Prop model="bush" position={[sx * 11.2, 0, 7.4]} fit={{ h: 1.2 }} />
        </group>
      ))}
      <CountryHouse style={s} position={[0, 0, -3.6]} />
      <VillageGate style={s} position={[0, 0, 5.6]} />
      <TeaTable position={[0, 0, -0.4]} />
      {/* Ghế đẩu cho người ngồi quanh bàn trà (Cô Hai, Bác Cả, Bà Tám ngồi thật bằng xương). */}
      {(['ghe-1', 'ghe-2', 'ghe-3'] as const).map((k) => {
        const p = SETS['san-nha']!.spots[k]!.pos;
        return <Stool key={k} position={[p[0], 0, p[2]]} />;
      })}
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

/** AO nướng sẵn cho khối cố định của phòng: chân tường tối còn 80%, sáng dần tới 1.4 m. */
const ROOM_AO = { y1: 1.4, min: 0.8 } as const;

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

/** Độ cao tâm biển Ga Hà Nội (m): cạnh dưới 2.6 m, cao hơn đầu người chơi nên đi bên dưới được. */
export const SIGN_Y = 3.1;

/** Sàn lát (ván gỗ / gạch) vẽ bằng texture canvas; `tile` là cạnh ô lặp (m). */
function Floor({ kind, base, w, d, z, tile = 2 }: Readonly<{ kind: FloorKind; base: string; w: number; d: number; z: number; tile?: number }>) {
  const tex = useMemo(() => floorTexture(kind, base, w / tile, d / tile), [kind, base, w, d, tile]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
}

/** Mặt đất ngoài toà nhà: lát gạch (thay cho mảng nâu một màu lộ ra ngoài mép sàn). */
function PaverGround({ size = 160 }: Readonly<{ size?: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <TexMat kind="pavers" base="#8f897c" rx={size / 2.4} ry={size / 2.4} />
    </mesh>
  );
}

/** Bảng ghim giấy ghi chú: nền cork dán nhiều giấy màu (khung gỗ nằm trong khối gộp roomShapes.ts). */
function CorkBoard({ position, w, h }: Readonly<{ position: [number, number, number]; w: number; h: number }>) {
  const map = useMemo(() => corkboardTexture(), []);
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={map} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Mặt bàn cao (m) khi bàn 1.4 m rộng (bàn Kenney 0.38 x2 = 0.76, thu theo bề rộng). */
const DESK_TOP = 0.73;

/** Bàn + ghế phía sau (+z). Văn phòng: màn hình, bàn phím; lớp học: chồng sách, hộp bút. */
function Desk({ x, z, v }: Readonly<{ x: number; z: number; v: RoomVariant }>) {
  const { w, d, chairBack } = CUOI_NAM.desk;
  return (
    <group position={[x, 0, z]}>
      <Prop model="desk" fit={{ w }} blob />
      {v === 'van-phong' ? (
        <>
          <Prop model="monitor" position={[0, DESK_TOP, -d / 2 + 0.2]} rotY={Math.PI} fit={{ w: 0.52 }} />
          <Prop model="keyboard" position={[0, DESK_TOP, 0.08]} fit={{ w: 0.38 }} />
        </>
      ) : (
        <>
          <Prop model="books" position={[-0.4, DESK_TOP, -0.05]} fit={{ w: 0.3 }} />
          <Prop model="books" position={[0.45, DESK_TOP, 0.05]} rotY={0.7} fit={{ w: 0.26 }} />
        </>
      )}
      {/* ghế quay mặt vào bàn (-z). Model Kenney quay mặt về -z (tựa lưng ở +z) nên không cần xoay. */}
      <Prop model={v === 'van-phong' ? 'desk-chair' : 'chair'} position={[0, 0, chairBack]} fit={{ h: v === 'van-phong' ? 1.05 : 0.88 }} blob />
    </group>
  );
}

function CuoiNam({ regionId, variant }: Readonly<{ regionId: string; variant: RoomVariant }>) {
  const L = CUOI_NAM;
  const room = ROOM[variant];
  const s = styleOf(regionId);
  const depth = L.frontZ - L.wallBackZ;
  const midZ = (L.wallBackZ + L.frontZ) / 2;
  const b = L.bossDesk;
  // Tường, khung cửa, cửa sổ, máy lạnh, đồng hồ, khung bảng...: gộp thành 3 mesh (roomShapes.ts); AO làm tối chân tường.
  const fixed = useMemo(() => roomShapes(variant, room), [variant, room]);
  return (
    <group>
      <PaverGround />
      {/* khung cảnh bên ngoài: hai lớp nhà cao tầng phía sau tường sau, một dãy mỗi bên, phố có vạch kẻ ngoài cửa sổ trái */}
      <Skyline position={[0, 0, -18]} span={80} seed={1} haze="#e8c9b0" />
      <Skyline position={[0, 0, -34]} span={110} seed={2} haze="#e8c9b0" minH={16} maxH={36} />
      <Skyline position={[-21, 0, 0]} rotY={Math.PI / 2} span={70} seed={3} haze="#e8c9b0" />
      <Skyline position={[21, 0, 0]} rotY={-Math.PI / 2} span={70} seed={4} haze="#e8c9b0" />
      <OutsideStreet x0={-L.wallSideX - L.wallThick} />
      {Array.from({ length: 8 }, (_, i) => (
        <Prop key={`ob${i}`} model="bush" position={[-L.wallSideX - L.wallThick - 0.9, 0, -9 + i * 3.4]} fit={{ h: 1.1 }} />
      ))}
      {[-2.4, 5.6, 13].map((z) => (
        <Prop key={`ol${z}`} model="street-light" position={[-L.wallSideX - L.wallThick - 2.1, 0, z]} rotY={-Math.PI / 2} fit={{ h: 4.4 }} />
      ))}
      <Floor kind={variant === 'lop-hoc' ? 'wood' : 'tile'} base={variant === 'lop-hoc' ? '#b98b56' : room.floor} w={L.wallSideX * 2} d={depth + L.ext} z={midZ + L.ext / 2} />
      <MergedShapes solid={fixed.solid} lit={fixed.lit} glass={fixed.glass} ao={ROOM_AO} />
      {/* chữ trên băng rôn Tết và bảng (nền đã gộp ở trên) */}
      <TextPlane w={3.3} h={0.3} lines={BANNER} position={[-0.4, 2.56, L.wallBackZ + 0.056]} />
      <TextPlane w={2.4} h={1.0} lines={BOARD_TEXT[variant]} position={[-0.4, 1.55, L.wallBackZ + 0.056]} />
      {/* câu đối: khe giữa tủ sách (x tới -2.55) và khung bảng (từ x = -1.76) chỉ rộng 0.8 m nên vế trái nằm giữa khe */}
      {[
        { x: L.wall.coupletL.x, lines: COUPLET_LEFT },
        { x: L.wall.coupletR.x, lines: COUPLET_RIGHT },
      ].map((c) => (
        <TextPlane key={c.x} w={0.5} h={1.44} lines={c.lines} uniform position={[c.x, 1.7, L.wallBackZ + 0.062]} />
      ))}
      <TextPlane w={L.wall.plaque.w - 0.1} h={0.24} lines={variant === 'lop-hoc' ? SCHOOL_MOTTO : OFFICE_MOTTO} position={[L.wall.plaque.x, 2.05, L.wallBackZ + 0.05]} />
      <TextPlane w={0.6} h={0.86} lines={CALENDAR} bg="#fafaf5" position={[L.wall.calendar.x, 1.85, L.wallBackZ + 0.042]} />
      <CorkBoard position={[L.wall.cork.x, 1.85, L.wallBackZ + 0.04]} w={0.9} h={0.7} />
      {/* thời khóa biểu trên tường trái giữa các cửa sổ (khung ở trên) */}
      {variant === 'lop-hoc' && (
        <group position={[-L.wallSideX + 0.03, 1.7, -1.6]} rotation={[0, Math.PI / 2, 0]}>
          <TextPlane w={0.74} h={0.94} bg="#fff7ed" lines={[...SCHEDULE_TITLE, ...SCHEDULE_ROWS]} position={[0, 0, 0.018]} />
        </group>
      )}
      {/* áp phích "ưu đãi" giả trên tường phải, ngay trên tủ TV */}
      <TextPlane w={L.poster.w} h={L.poster.h} lines={SALE_POSTER[variant]} bg="#b91c1c" grain position={[L.wallSideX - 0.055, L.poster.y, L.poster.z]} rotation={[0, -Math.PI / 2, 0]} />
      {/* tủ TV sát tường phải phía sau quầy, TV chiếu chương trình Tết */}
      <Prop model="tv-cabinet" position={[L.tv.x, 0, L.tv.z]} rotY={Math.PI / 2} fit={{ w: L.tv.w }} blob />
      <Prop model="tv" position={[L.tv.x, 0.62, L.tv.z]} rotY={Math.PI / 2} fit={{ w: 0.95 }} />
      {L.desks.map((d, i) => (
        <Desk key={i} x={d.x} z={d.z} v={variant} />
      ))}
      {/* bàn sếp / bàn giáo viên */}
      <group position={[b.x, 0, b.z]}>
        <Prop model="table" fit={{ w: b.w }} blob />
        {variant === 'van-phong' ? (
          <>
            <Prop model="laptop" position={[0.3, 0.71, -0.05]} fit={{ w: 0.38 }} />
            <Prop model="books" position={[-0.6, 0.71, 0.05]} fit={{ w: 0.26 }} />
          </>
        ) : (
          <>
            <Prop model="plant-small" position={[-0.55, 0.71, 0]} fit={{ h: 0.25 }} />
            <Prop model="books" position={[0.4, 0.71, 0]} fit={{ w: 0.3 }} />
          </>
        )}
        <Prop model="desk-chair" position={[0, 0, -0.75]} rotY={Math.PI} fit={{ h: 1.1 }} blob />
      </group>
      {/* quầy pha cà phê / bàn liên hoan (đồ đặt trên quầy đã gộp ở trên) */}
      <group position={[L.counter.x, 0, L.counter.z]}>
        <Prop model="table" rotY={Math.PI / 2} fit={{ w: L.counter.d - 0.1 }} blob />
        {variant === 'van-phong' && <Prop model="coffee-machine" position={[0, 0.75, 0.5]} rotY={Math.PI / 2} fit={{ w: 0.34 }} />}
      </group>
      {/* móc áo, tủ sách sát tường sau, đèn đứng, thảm giữa hai hàng bàn */}
      <Prop model="coat-rack" position={[L.coatRack.x, 0, L.coatRack.z]} fit={{ h: 1.7 }} blob />
      {L.shelves.map((s, i) => (
        <Prop key={i} model={i % 2 === 0 ? 'bookcase' : 'bookcase-open'} position={[s.x, 0, s.z]} rotY={Math.PI} fit={{ w: s.w }} />
      ))}
      <Prop model="lamp-floor" position={[L.lamp.x, 0, L.lamp.z]} fit={{ h: 1.6 }} />
      <Prop model="rug" position={[-2.9, 0.02, -1.1]} fit={{ w: 3.0 }} />
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

/** Model đồ đạc / cây cối mỗi cảnh dùng (để tải trước, cảnh không hiện dần từng món). Có test đối chiếu với nguồn cảnh. */
export const SET_PROPS: Readonly<Record<string, readonly string[]>> = {
  'cuoi-nam': ['desk', 'desk-chair', 'chair', 'table', 'monitor', 'keyboard', 'books', 'laptop', 'plant-small', 'coffee-machine', 'coat-rack', 'bookcase', 'bookcase-open', 'lamp-floor', 'rug', 'tv', 'tv-cabinet', 'bush', 'street-light'],
  'pho-tet': ['street-light', 'bench', 'bin', 'bush', 'houseplant'],
  'san-nha': ['fence', 'banana', 'bush'],
};

function SceneOf({ setId, regionId, variant }: Readonly<{ setId: string; regionId: string; variant?: string }>) {
  switch (setId) {
    case 'cuoi-nam':
      return <CuoiNam regionId={regionId} variant={variant === 'lop-hoc' ? 'lop-hoc' : 'van-phong'} />;
    case 'pho-tet':
      return <PhoTet regionId={regionId} />;
    case 'san-nha':
      return <SanNha regionId={regionId} />;
    case 'nha-tren':
      return <NhaTren regionId={regionId} />;
    case 'tram-dung':
      return <TramDung regionId={regionId} />;
    default:
      return null;
  }
}

export function SetView({ setId, regionId, variant }: Readonly<{ setId: string; regionId: string; variant?: string }>) {
  const zenith = SKY_ZENITH[setId];
  return (
    <>
      {zenith && <SkyDome horizon={envOf(setId, regionId).sky} zenith={zenith} />}
      <SceneOf setId={setId} regionId={regionId} variant={variant} />
    </>
  );
}
