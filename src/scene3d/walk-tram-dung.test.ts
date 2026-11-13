import { describe, expect, it } from 'vitest';
import { isBlocked, resolveMove } from '../game/collision';
import type { Bounds, Collider, WalkArea } from '../game/types';
import { SETS, type RegionStyle } from './registry';
import setSrc from './set-tram-dung.tsx?raw';
import { walkAreaFor, ROAM_SETS } from './walk';
import {
  ACTOR_R,
  BUS,
  CAR,
  COUNTER,
  PLAYER_R,
  QUAN_POSTS,
  ROOF,
  ROOF_MIN_Y,
  TABLES,
  TRAM_BOUNDS,
  buildTramDung,
} from './walk-tram-dung';

const STYLES: readonly RegionStyle[] = ['bac', 'trung', 'nam'];
const STEP = 0.25;
const EPS = 1e-9;
/** Bán kính chừa quanh mỗi điểm đứng của hợp đồng (NPC 0.42 + một chút). */
const SPOT_R = 0.45;

const SPOTS = SETS['tram-dung']!.spots;

function spotXZ(id: string): [number, number] {
  const s = SPOTS[id];
  if (!s) throw new Error(`Thiếu spot "${id}" trong registry`);
  return [s.pos[0], s.pos[2]];
}

function areaOf(style: RegionStyle): WalkArea {
  const area = walkAreaFor('tram-dung', style);
  if (!area) throw new Error('tram-dung phải có vùng đi lại');
  return area;
}

function colliderOf(area: WalkArea, id: string): Collider {
  const c = area.colliders.find((k) => k.id === id);
  if (!c) throw new Error(`Không có collider "${id}"`);
  return c;
}

function boxOf(area: WalkArea, id: string): Extract<Collider, { kind: 'box' }> {
  const c = colliderOf(area, id);
  if (c.kind !== 'box') throw new Error(`"${id}" phải là hộp`);
  return c;
}

/** Hộp bao theo trục của collider (kể cả hộp xoay). */
function aabb(c: Collider): Bounds {
  if (c.kind === 'circle') return { minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r };
  const rot = c.rotY ?? 0;
  const ex = Math.abs(Math.cos(rot)) * c.hw + Math.abs(Math.sin(rot)) * c.hd;
  const ez = Math.abs(Math.sin(rot)) * c.hw + Math.abs(Math.cos(rot)) * c.hd;
  return { minX: c.x - ex, maxX: c.x + ex, minZ: c.z - ez, maxZ: c.z + ez };
}

// ---------- Liên thông bằng engine va chạm thật (src/game/collision.ts) ----------

interface Grid {
  free: number;
  reached: number;
  /** Có ô nối với spawn nằm trong bán kính tol quanh điểm này không. */
  reachable: (x: number, z: number, tol: number) => boolean;
  /** Số ô nối với spawn có khoảng cách tới điểm trong [lo, hi]. */
  countRing: (x: number, z: number, lo: number, hi: number) => number;
}

/** Flood fill 4 hướng trên lưới STEP, xuất phát từ spawn, dùng isBlocked của engine. */
function flood(area: WalkArea, r: number): Grid {
  const bounds = area.bounds;
  const i0 = Math.ceil(bounds.minX / STEP - EPS);
  const i1 = Math.floor(bounds.maxX / STEP + EPS);
  const j0 = Math.ceil(bounds.minZ / STEP - EPS);
  const j1 = Math.floor(bounds.maxZ / STEP + EPS);
  const w = i1 - i0 + 1;
  const h = j1 - j0 + 1;
  const open = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  let free = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!isBlocked({ x: (i0 + i) * STEP, z: (j0 + j) * STEP }, r, area.colliders, bounds)) {
        open[j * w + i] = 1;
        free++;
      }
    }
  }
  const stack: number[] = [];
  const visit = (i: number, j: number): void => {
    if (i < 0 || j < 0 || i >= w || j >= h) return;
    const k = j * w + i;
    if (open[k] !== 1 || seen[k] === 1) return;
    seen[k] = 1;
    stack.push(k);
  };
  visit(Math.round(area.spawn.x / STEP) - i0, Math.round(area.spawn.z / STEP) - j0);
  let reached = 0;
  for (let k = stack.pop(); k !== undefined; k = stack.pop()) {
    reached++;
    const i = k % w;
    const j = (k - i) / w;
    visit(i + 1, j);
    visit(i - 1, j);
    visit(i, j + 1);
    visit(i, j - 1);
  }
  const countRing = (x: number, z: number, lo: number, hi: number): number => {
    let n = 0;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (seen[j * w + i] !== 1) continue;
        const d = Math.hypot((i0 + i) * STEP - x, (j0 + j) * STEP - z);
        if (d >= lo - EPS && d <= hi + EPS) n++;
      }
    }
    return n;
  };
  return { free, reached, reachable: (x, z, tol) => countRing(x, z, 0, tol) > 0, countRing };
}

// ---------- Đọc nguồn cảnh ----------

/** Thân (từ `{` sau `=>` tới `}` khớp) của mọi callback gọi bằng `call`. */
function callbackBodies(src: string, call: string): string[] {
  const out: string[] = [];
  for (let a = src.indexOf(call); a >= 0; a = src.indexOf(call, a + call.length)) {
    const arrow = src.indexOf('=> {', a);
    if (arrow < 0) continue;
    const open = arrow + 3;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        out.push(src.slice(open, i + 1));
        break;
      }
    }
  }
  return out;
}

// ---------- Test ----------

describe('tram-dung: đăng ký trong walk.ts', () => {
  it('có trong ROAM_SETS và walkAreaFor trả đúng kết quả của buildTramDung cho cả ba miền', () => {
    expect(ROAM_SETS).toContain('tram-dung');
    for (const style of STYLES) {
      const viaRegistry = walkAreaFor('tram-dung', style);
      expect(viaRegistry, style).not.toBeNull();
      expect(viaRegistry).toEqual(buildTramDung(style));
      // Cùng đầu vào trả cùng một object (cache).
      expect(walkAreaFor('tram-dung', style)).toBe(viaRegistry);
    }
  });

  it('vùng đi lại giống nhau cho ba miền (vật cản không đổi theo miền)', () => {
    const bac = areaOf('bac');
    for (const style of STYLES) expect(areaOf(style)).toEqual(bac);
  });
});

for (const style of STYLES) {
  describe(`tram-dung / ${style}`, () => {
    const area = areaOf(style);
    const grid = flood(area, PLAYER_R);

    it('bounds khớp hợp đồng: x -12..12, z -1.2..8.5', () => {
      expect(area.bounds).toEqual({ minX: -12, maxX: 12, minZ: -1.2, maxZ: 8.5 });
      expect(area.bounds).toEqual(TRAM_BOUNDS);
    });

    it('spawn (-1, 7) quay về -z, trong bounds, không bị chặn (người chơi r 0.35 và r 0.45)', () => {
      const { x, z, rotY } = area.spawn;
      expect([x, z]).toEqual([-1, 7]);
      expect(Math.sin(rotY)).toBeCloseTo(0, 6);
      expect(Math.cos(rotY)).toBeCloseTo(-1, 6);
      const b = area.bounds;
      expect(x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ).toBe(true);
      expect(isBlocked({ x, z }, PLAYER_R, area.colliders, area.bounds)).toBe(false);
      expect(isBlocked({ x, z }, SPOT_R, area.colliders, area.bounds)).toBe(false);
    });

    it('mọi spot của hợp đồng (registry) trống trong bán kính 0.45, và tới được từ spawn', () => {
      expect(Object.keys(SPOTS).sort()).toEqual(['be-de', 'chu-ba', 'quan', 'thai-gara', 'xe-khach']);
      for (const id of Object.keys(SPOTS)) {
        const [x, z] = spotXZ(id);
        expect(isBlocked({ x, z }, SPOT_R, area.colliders, area.bounds), `spot ${id} bị chặn (r ${SPOT_R})`).toBe(false);
        expect(isBlocked({ x, z }, ACTOR_R, area.colliders, area.bounds), `spot ${id} bị chặn (NPC)`).toBe(false);
        expect(grid.reachable(x, z, 0.2), `không tới được spot ${id}`).toBe(true);
      }
    });

    it('tới được: phía nam quầy, phía nam xe khách, gần chú Ba, gần Thái Gara, gần dê con', () => {
      // Phía nam quầy: người chơi đứng nói chuyện với người bán bánh mì.
      expect(grid.reachable(-4.2, 3.8, 0.2), 'nam quầy').toBe(true);
      // Phía nam xe khách, trước cửa xe.
      expect(grid.reachable(7.8, 4.2, 0.2), 'nam xe khách').toBe(true);
      expect(grid.reachable(7.8, 3.4, 0.2), 'điểm lên xe').toBe(true);
      // Mỗi NPC có chỗ đứng trong tầm tương tác (2.1 m) và cách NPC ít nhất 0.9 m.
      for (const id of ['chu-ba', 'thai-gara', 'be-de', 'quan', 'xe-khach']) {
        const [x, z] = spotXZ(id);
        expect(grid.countRing(x, z, 0.9, 2.1), `chỗ đứng quanh ${id}`).toBeGreaterThanOrEqual(8);
      }
    });

    it('người chơi đứng được ở z >= 3.7 phía nam quầy (sát quầy mà không chui vào)', () => {
      for (const x of [-5.2, -4.2, -3.2]) {
        expect(isBlocked({ x, z: 3.7 }, PLAYER_R, area.colliders, area.bounds), `x=${x}`).toBe(false);
      }
    });

    it('không có túi kín: mọi ô đứng được đều nối với spawn', () => {
      expect(grid.free).toBeGreaterThan(900);
      expect(grid.reached).toBe(grid.free);
    });

    it('collider hợp lệ: id duy nhất, số hữu hạn, kích thước > 0', () => {
      const ids = new Set<string>();
      for (const c of area.colliders) {
        const vals = c.kind === 'circle' ? [c.x, c.z, c.r] : [c.x, c.z, c.hw, c.hd, c.rotY ?? 0];
        for (const v of vals) expect(Number.isFinite(v), c.id).toBe(true);
        if (c.kind === 'circle') expect(c.r, c.id).toBeGreaterThan(0);
        else {
          expect(c.hw, c.id).toBeGreaterThan(0);
          expect(c.hd, c.id).toBeGreaterThan(0);
        }
        expect(c.id, 'collider phải có id').toBeTruthy();
        expect(ids.has(c.id ?? ''), `trùng id ${c.id}`).toBe(false);
        ids.add(c.id ?? '');
      }
      expect(area.colliders.length).toBeGreaterThanOrEqual(20);
    });

    it('mọi collider nằm trong hoặc sát bounds (lan can được phép nhô ra phía quốc lộ)', () => {
      const b = area.bounds;
      for (const c of area.colliders) {
        // Lan can nằm ngay ngoài mép bắc của bounds (z = -1.4 so với minZ = -1.2): chỉ cần sát bounds.
        if (c.id === 'lan-can') {
          expect(aabb(c).maxZ).toBeLessThanOrEqual(b.minZ);
          expect(aabb(c).maxZ).toBeGreaterThan(b.minZ - 0.5);
          continue;
        }
        const a = aabb(c);
        // Giao với bounds.
        expect(a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ, `${c.id} ngoài bounds`).toBe(true);
        // Không nhô ra khỏi bounds quá 0.5 m.
        expect(a.minX, c.id).toBeGreaterThan(b.minX - 0.5);
        expect(a.maxX, c.id).toBeLessThan(b.maxX + 0.5);
        expect(a.minZ, c.id).toBeGreaterThan(b.minZ - 0.5);
        expect(a.maxZ, c.id).toBeLessThan(b.maxZ + 0.5);
      }
    });

    it('lan can chặn bước ra quốc lộ: không có chỗ đứng nào ở z < -1.2, đi thẳng lên bắc dừng ở mép sân', () => {
      const barrier = boxOf(area, 'lan-can');
      expect(barrier.z).toBeCloseTo(-1.4, 9);
      // Mỏng và phủ suốt trục x của sân.
      expect(barrier.hd).toBeLessThanOrEqual(0.2);
      expect(barrier.x - barrier.hw).toBeLessThanOrEqual(area.bounds.minX);
      expect(barrier.x + barrier.hw).toBeGreaterThanOrEqual(area.bounds.maxX);
      for (let x = area.bounds.minX; x <= area.bounds.maxX + EPS; x += 0.25) {
        for (let z = -3; z < -1.2; z += 0.1) {
          expect(isBlocked({ x, z }, 0, area.colliders, area.bounds), `(${x}, ${z.toFixed(1)})`).toBe(true);
        }
      }
      // Đi thẳng về phía quốc lộ từ giữa sân (x = 0.5 là khoảng trống, không trúng bàn ghế).
      const end = resolveMove({ x: 0.5, z: 5 }, { x: 0, z: -30 }, PLAYER_R, area.colliders, area.bounds);
      expect(end.z).toBeGreaterThanOrEqual(area.bounds.minZ + PLAYER_R - 1e-6);
      // Nới bounds ra tận quốc lộ thì chính lan can vẫn chặn (không dựa vào bounds).
      const open: Bounds = { ...area.bounds, minZ: -6 };
      const end2 = resolveMove({ x: 0.5, z: 0.2 }, { x: 0, z: -10 }, PLAYER_R, area.colliders, open);
      expect(end2.z).toBeGreaterThanOrEqual(-1.4 + barrier.hd + PLAYER_R - 1e-3);
    });

    it('mái tôn cao >= 2.4 m nên không có collider mái; cột mái thì có', () => {
      expect(ROOF_MIN_Y).toBeGreaterThanOrEqual(2.4);
      expect(area.colliders.some((c) => /^mai/.test(c.id ?? ''))).toBe(false);
      for (let i = 1; i <= QUAN_POSTS.length; i++) expect(colliderOf(area, `cot-quan-${i}`).kind).toBe('circle');
      // Dưới mái đi lại được: phía nam quầy.
      expect(grid.reachable(-4.2, 3.8, 0.2)).toBe(true);
      expect(ROOF.minZ).toBeLessThan(COUNTER.z - COUNTER.hd);
    });

    it('quầy bánh mì: hộp 3 m, phía nam điểm quan, mái che trùm lên', () => {
      const q = boxOf(area, 'quay-banh-mi');
      const [qx, qz] = spotXZ('quan');
      expect(q.hw * 2).toBeCloseTo(3, 6);
      expect(q.hd * 2).toBeLessThanOrEqual(0.8);
      expect(q.x).toBeCloseTo(qx, 6);
      expect(q.z - q.hd).toBeGreaterThanOrEqual(qz + SPOT_R - 1e-9);
      expect(q.z + q.hd).toBeLessThanOrEqual(3.4 + 1e-9);
      // Mái phủ quầy cả bề rộng lẫn bề sâu.
      expect(ROOF.minX).toBeLessThan(q.x - q.hw);
      expect(ROOF.maxX).toBeGreaterThan(q.x + q.hw);
      expect(ROOF.maxZ).toBeGreaterThan(q.z + q.hd);
    });

    it('xe khách: hộp 8 m ở phía đông, che camera; điểm lên xe cách xe >= 0.45 m', () => {
      const bus = boxOf(area, 'xe-khach');
      expect(bus.blocksCamera).toBe(true);
      expect(bus.hw * 2).toBeCloseTo(8, 6);
      expect(bus.x - bus.hw).toBeCloseTo(4, 6);
      expect(bus.x + bus.hw).toBeCloseTo(12, 6);
      const [sx, sz] = spotXZ('xe-khach');
      expect(bus.z + bus.hd).toBeLessThanOrEqual(sz - SPOT_R + 1e-9);
      expect(sx).toBeGreaterThan(bus.x - bus.hw);
      expect(sx).toBeLessThan(bus.x + bus.hw);
      // Vùng phía nam điểm lên xe (z >= 3.4) đứng được.
      for (const z of [3.4, 3.8, 4.2, 5, 6]) {
        expect(isBlocked({ x: 7.8, z }, PLAYER_R, area.colliders, area.bounds), `z=${z}`).toBe(false);
      }
      expect(BUS.h).toBeCloseTo(3.2, 6);
    });

    it('xe hơi cũ ở phía tây-nam của Thái Gara, thấp nên không che camera', () => {
      const car = colliderOf(area, 'xe-hoi-cu');
      expect(car.blocksCamera).toBe(false);
      expect(car.x).toBeLessThan(spotXZ('thai-gara')[0]);
      expect(car.z).toBeGreaterThan(spotXZ('thai-gara')[1]);
      expect(Math.hypot(car.x - CAR.x, car.z - CAR.z)).toBeLessThan(1e-9);
    });

    it('blocksCamera: chỉ xe khách che camera (vật khác thấp hoặc mảnh)', () => {
      for (const c of area.colliders) {
        if (c.id === 'xe-khach') expect(c.blocksCamera, c.id).toBe(true);
        else expect(c.blocksCamera, c.id).toBe(false);
      }
    });

    it('bàn ghế: ba bộ bàn, mỗi bộ bốn ghế, ghế không chồng lên bàn', () => {
      expect(TABLES).toHaveLength(3);
      for (const t of TABLES) {
        const table = boxOf(area, `ban-nhua-${t.id}`);
        expect([table.x, table.z]).toEqual([t.x, t.z]);
        expect(t.stools).toHaveLength(4);
        t.stools.forEach((_, i) => {
          const stool = colliderOf(area, `ghe-nhua-${t.id}${i + 1}`);
          if (stool.kind !== 'circle') throw new Error('ghế phải là vòng tròn');
          const dx = Math.max(Math.abs(stool.x - table.x) - table.hw, 0);
          const dz = Math.max(Math.abs(stool.z - table.z) - table.hd, 0);
          expect(Math.hypot(dx, dz), `${stool.id} chồng bàn`).toBeGreaterThanOrEqual(stool.r - 0.05);
        });
      }
    });

    it('không đặt vật cao chắn phía nam sân: không collider nào vượt z = 8.5', () => {
      for (const c of area.colliders) expect(aabb(c).maxZ, c.id).toBeLessThanOrEqual(8.5 + EPS);
    });
  });
}

describe('set-tram-dung.tsx: nguồn cảnh', () => {
  it('dùng chung hằng số bố cục với walk-tram-dung.ts (không tự chép số)', () => {
    expect(setSrc).toMatch(/from '\.\/walk-tram-dung'/);
    const names = ['BARRIER', 'COUNTER', 'SHELF', 'ROOF', 'QUAN_POSTS', 'TABLES', 'CHU_BA', 'BUS', 'CAR', 'SIGN', 'BIKES', 'LAMPS', 'BLOSSOMS', 'CART'];
    for (const name of names) expect(setSrc, `cảnh phải dùng ${name}`).toMatch(new RegExp('(^|[^A-Za-z0-9_])' + name + '([^A-Za-z0-9_]|$)'));
  });

  it('chỉ dùng mã màu hex hợp lệ (#rrggbb)', () => {
    const lits = [...setSrc.matchAll(/['"]#([0-9A-Za-z]*)['"]/g)].map((m) => m[1] ?? '');
    expect(lits.length).toBeGreaterThan(50);
    for (const hex of lits) expect(hex, `#${hex}`).toMatch(/^[0-9a-fA-F]{6}$/);
  });

  it('an toàn và nhẹ: không shadow map, không mạng, không eval, không Math.random', () => {
    expect(setSrc).not.toMatch(/castShadow|receiveShadow|shadowMap/);
    expect(setSrc).not.toMatch(/\bfetch\(|XMLHttpRequest|https?:\/\/|useTexture|useGLTF|useLoader|TextureLoader|\beval\(|new Function\(/);
    expect(setSrc).not.toMatch(/Math\.random/);
  });

  it('useFrame và hàm đặt xe không cấp phát đối tượng mới mỗi khung (không `new`, không map/filter/spread mảng)', () => {
    const bodies = [...callbackBodies(setSrc, 'useFrame('), ...callbackBodies(setSrc, 'const place = ')];
    expect(bodies.length).toBeGreaterThanOrEqual(3);
    for (const body of bodies) {
      expect(body).not.toMatch(/\bnew\s/);
      expect(body).not.toMatch(/\.map\(|\.filter\(|\.slice\(|\[\.\.\./);
    }
  });

  it('ngân sách draw call: ít thẻ <mesh> trong JSX (hình tĩnh gộp thành vài geometry)', () => {
    const meshTags = (setSrc.match(/<(mesh|instancedMesh)[\s>]/g) ?? []).length;
    // Mỗi thẻ là >= 1 draw call; <instancedMesh> trong vòng lặp lặp theo số kiểu xe (6).
    expect(meshTags).toBeLessThanOrEqual(8);
    expect(setSrc).toMatch(/<instancedMesh/);
    expect(setSrc).toMatch(/mergeGeometries/);
  });
});
