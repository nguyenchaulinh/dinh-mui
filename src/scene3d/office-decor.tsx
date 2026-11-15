import { useMemo } from 'react';
import { Mat, rnd } from './props';
import { TexMat } from './TexMat';
import { wallPiers, type WallOpening } from './wallPieces';
import { mixHex } from './textures';

/** Cảnh nền của lớp học / văn phòng: nhà cao tầng nhiều lớp, tường có ô cửa sổ thật, phố bên ngoài cửa sổ. */

type V3 = [number, number, number];

function B({ p, s, c, e }: Readonly<{ p: V3; s: V3; c: string; e?: number }>) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <Mat c={c} e={e} />
    </mesh>
  );
}

/** Một dãy toà nhà dọc trục x cục bộ (dựng phía sau và hai bên phòng): mỗi toà một cao độ, màu pha sương và mặt tiền có cửa sổ sáng đèn. */
export function Skyline({ position, rotY = 0, span, seed, haze, minH = 10, maxH = 26 }: Readonly<{ position: V3; rotY?: number; span: number; seed: number; haze: string; minH?: number; maxH?: number }>) {
  const towers = useMemo(() => {
    const out: { x: number; w: number; d: number; h: number; c: string }[] = [];
    let x = -span / 2;
    for (let i = 0; x < span / 2; i++) {
      const w = 4.5 + rnd(seed * 100 + i) * 3.5;
      const h = minH + rnd(seed * 100 + i + 40) * (maxH - minH);
      const base = ['#c7cdd6', '#b9c2cf', '#cfc5bb', '#b6bdc9', '#d2cbc2'][i % 5]!;
      out.push({ x: x + w / 2, w, d: 5 + rnd(seed * 100 + i + 70) * 2, h, c: mixHex(base, haze, 0.35) });
      x += w + 0.4 + rnd(seed * 100 + i + 90) * 1.2;
    }
    return out;
  }, [span, seed, haze, minH, maxH]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, 0]}>
          <boxGeometry args={[t.w, t.h, t.d]} />
          <TexMat kind="facade" base={t.c} rx={Math.max(1, Math.round(t.w / 8))} ry={Math.max(1, Math.round(t.h / 8))} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Tường chạy dọc trục z có ô cửa sổ thật (không phải vẽ lên mặt tường): dải dưới, dải trên và các trụ giữa các ô. Nhờ vậy
 * qua cửa sổ nhìn thấy phố bên ngoài. Vật cản (collider) của tường không đổi: vẫn là một khối liền.
 */
export function WindowedWall({ x, thick, z0, z1, h, sill, head, openings, color }: Readonly<{ x: number; thick: number; z0: number; z1: number; h: number; sill: number; head: number; openings: readonly WallOpening[]; color: string }>) {
  const piers = wallPiers(z0, z1, openings);
  const mid = (z0 + z1) / 2;
  return (
    <group>
      <B p={[x, sill / 2, mid]} s={[thick, sill, z1 - z0]} c={color} />
      <B p={[x, head + (h - head) / 2, mid]} s={[thick, h - head, z1 - z0]} c={color} />
      {piers.map(([a, b], i) => (
        <B key={i} p={[x, sill + (head - sill) / 2, (a + b) / 2]} s={[thick, head - sill, b - a]} c={color} />
      ))}
    </group>
  );
}

/** Phố bên ngoài cửa sổ tường trái: vỉa hè lát gạch, làn đường nhựa có vạch, bụi cây, cột đèn. Chỉ để nhìn. */
export function OutsideStreet({ x0 }: Readonly<{ x0: number }>) {
  // x0 là mặt ngoài của tường (âm). Vỉa hè rộng 2.2 m, rồi lòng đường rộng 6 m.
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x0 - 1.1, 0.012, 3]}>
        <planeGeometry args={[2.2, 60]} />
        <TexMat kind="pavers" base="#cbc5bb" rx={2} ry={24} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x0 - 5.2, 0.012, 3]}>
        <planeGeometry args={[6, 60]} />
        <TexMat kind="asphalt" base="#3b4252" rx={3} ry={24} rough={0.95} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x0 - 5.2, 0.02, -22 + i * 5.2]}>
          <planeGeometry args={[0.12, 2.2]} />
          <Mat c="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
}
