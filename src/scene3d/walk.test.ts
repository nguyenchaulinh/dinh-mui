import { describe, expect, it } from 'vitest';
import type { Collider, WalkArea } from '../game/types';
import propsSrc from './props.tsx?raw';
import { styleOfRegion, type RegionStyle } from './registry';
import setsSrc from './sets.tsx?raw';
import { actorCollider, ROAM_SETS, walkAreaFor } from './walk';

const STYLES: readonly RegionStyle[] = ['bac', 'trung', 'nam'];
/** Bằng PLAYER_RADIUS trong src/game/movement.ts. */
const PLAYER_R = 0.35;
/** Chiều cao người chơi (m). */
const BODY_H = 1.7;
const STEP = 0.25;
const EPS = 1e-9;

function areaOf(style: RegionStyle): WalkArea {
  const area = walkAreaFor('san-nha', style);
  if (!area) throw new Error('san-nha phải có vùng đi lại');
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

function circleOf(area: WalkArea, id: string): Extract<Collider, { kind: 'circle' }> {
  const c = colliderOf(area, id);
  if (c.kind !== 'circle') throw new Error(`"${id}" phải là vòng tròn`);
  return c;
}

// ---------- Va chạm tối giản (chỉ để kiểm tra liên thông) ----------

/** Khoảng cách từ điểm tới mép vật cản (0 nếu nằm trong). */
function distTo(c: Collider, x: number, z: number): number {
  if (c.kind === 'circle') return Math.max(0, Math.hypot(x - c.x, z - c.z) - c.r);
  const rot = c.rotY ?? 0;
  const dx = x - c.x;
  const dz = z - c.z;
  const lx = dx * Math.cos(rot) - dz * Math.sin(rot);
  const lz = dx * Math.sin(rot) + dz * Math.cos(rot);
  return Math.hypot(Math.max(Math.abs(lx) - c.hw, 0), Math.max(Math.abs(lz) - c.hd, 0));
}

/** Người bán kính r đứng tại (x, z) có hợp lệ không: trong bounds và không chạm vật cản nào. */
function isFree(area: WalkArea, x: number, z: number, r: number): boolean {
  const b = area.bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return false;
  return area.colliders.every((c) => distTo(c, x, z) >= r - EPS);
}

interface Grid {
  /** Số ô đứng được. */
  free: number;
  /** Số ô đứng được và nối với spawn. */
  reached: number;
  /** Có ô nối với spawn nằm trong bán kính tol quanh điểm này không. */
  reachable: (x: number, z: number, tol: number) => boolean;
}

/** Flood fill (4 hướng) trên lưới STEP, xuất phát từ spawn. */
function flood(area: WalkArea, r: number): Grid {
  const b = area.bounds;
  const i0 = Math.ceil(b.minX / STEP - EPS);
  const i1 = Math.floor(b.maxX / STEP + EPS);
  const j0 = Math.ceil(b.minZ / STEP - EPS);
  const j1 = Math.floor(b.maxZ / STEP + EPS);
  const w = i1 - i0 + 1;
  const h = j1 - j0 + 1;
  const open = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  let free = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (isFree(area, (i0 + i) * STEP, (j0 + j) * STEP, r)) {
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

  const reachable = (x: number, z: number, tol: number): boolean => {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (seen[j * w + i] === 1 && Math.hypot((i0 + i) * STEP - x, (j0 + j) * STEP - z) <= tol + EPS) return true;
      }
    }
    return false;
  };
  return { free, reached, reachable };
}

// ---------- Đọc số liệu từ mã nguồn cảnh ----------

/** Phần nguồn từ `from` tới trước `to`. */
function between(src: string, from: string, to?: string): string {
  const a = src.indexOf(from);
  if (a < 0) throw new Error(`Không thấy "${from}" trong nguồn: cảnh đã đổi, cập nhật walk.ts và test này.`);
  if (to === undefined) return src.slice(a);
  const b = src.indexOf(to, a + from.length);
  if (b < 0) throw new Error(`Không thấy "${to}" trong nguồn: cảnh đã đổi, cập nhật walk.ts và test này.`);
  return src.slice(a, b);
}

/** Đoạn nguồn từ lần xuất hiện thứ `nth` của `open` tới hết `/>` đầu tiên sau đó. */
function tag(src: string, open: string, nth = 0): string {
  let a = -1;
  for (let k = 0; k <= nth; k++) {
    a = src.indexOf(open, a + 1);
    if (a < 0) throw new Error(`Không thấy "${open}" (lần ${nth + 1}): cảnh đã đổi, cập nhật walk.ts và test này.`);
  }
  const end = src.indexOf('/>', a);
  if (end < 0) throw new Error(`Thẻ "${open}" không đóng`);
  return src.slice(a, end + 2);
}

/** Các số đứng ngay sau `key` (tới ký tự ] hoặc } đầu tiên). */
function nums(text: string, key: string): number[] {
  const a = text.indexOf(key);
  if (a < 0) throw new Error(`Không thấy "${key}": cảnh đã đổi, cập nhật walk.ts và test này.`);
  const part = /^[^\]}]*/.exec(text.slice(a + key.length))?.[0] ?? '';
  return (part.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function at(list: readonly number[], k: number): number {
  const v = list[k];
  if (v === undefined) throw new Error(`Thiếu số thứ ${k} trong ${JSON.stringify(list)}`);
  return v;
}

/** Nguồn thật của cảnh: SanNha trong sets.tsx, các hàm đạo cụ trong props.tsx. */
const san = between(setsSrc, 'function SanNha', 'function NhaTren');
const houseFn = between(propsSrc, 'export function CountryHouse', 'export function Bamboo');
const bambooFn = between(propsSrc, 'export function Bamboo', 'export function CoconutTree');
const coconutFn = between(propsSrc, 'export function CoconutTree', 'export function VillageGate');
const gateFn = between(propsSrc, 'export function VillageGate', 'export function TeaTable');
const gateBac = between(gateFn, "style === 'bac'", '// Trung, Nam');
const gateOther = between(gateFn, '// Trung, Nam');
const tableFn = between(propsSrc, 'export function TeaTable', 'export function Stool');
const blossomFn = between(propsSrc, 'export function BlossomTree', '// ---------- Xe máy');
const lanternFn = between(propsSrc, 'export function Lantern', '// ---------- Nhà ở quê');

/** Vị trí (x, y, z) của lần xuất hiện thứ nth của thẻ `open` trong SanNha. */
function sanPos(open: string, nth = 0): [number, number, number] {
  const p = nums(tag(san, open, nth), 'position={[');
  return [at(p, 0), at(p, 1), at(p, 2)];
}

// ---------- Test ----------

describe('styleOfRegion', () => {
  it('đúng ba vùng và mặc định miền Bắc', () => {
    expect(styleOfRegion('da-nang')).toBe('trung');
    expect(styleOfRegion('sai-gon')).toBe('nam');
    expect(styleOfRegion('ha-noi')).toBe('bac');
    expect(styleOfRegion('khong-biet')).toBe('bac');
    expect(styleOfRegion('')).toBe('bac');
  });
});

describe('walkAreaFor', () => {
  it('null cho bộ cảnh chưa hỗ trợ đi lại', () => {
    for (const id of ['khong-co', 'bo-canh-la', '', 'constructor', '__proto__']) {
      expect(walkAreaFor(id, 'bac')).toBeNull();
    }
  });

  it('mỗi bộ cảnh trong ROAM_SETS có vùng đi lại cho cả ba miền', () => {
    expect(ROAM_SETS).toContain('san-nha');
    for (const setId of ROAM_SETS) {
      for (const style of STYLES) expect(walkAreaFor(setId, style), `${setId}/${style}`).not.toBeNull();
    }
  });

  it('cùng đầu vào trả cùng một object, phong cách lạ rơi về miền Bắc', () => {
    for (const style of STYLES) expect(walkAreaFor('san-nha', style)).toBe(walkAreaFor('san-nha', style));
    expect(walkAreaFor('san-nha', 'khong-co' as unknown as RegionStyle)).toBe(walkAreaFor('san-nha', 'bac'));
  });

  it('mỗi miền có đúng bộ vật cản mong đợi', () => {
    const ids = (s: RegionStyle): string[] => areaOf(s).colliders.map((c) => c.id ?? '').sort();
    const common = ['ban-tra', 'cay-hoa', 'cay-quat', 'cong-1', 'cong-2', 'nha'];
    expect(ids('bac')).toEqual([...common, 'ao', 'tre-1', 'tre-2'].sort());
    expect(ids('trung')).toEqual([...common, 'tre-1'].sort());
    expect(ids('nam')).toEqual([...common, 'dua-1', 'dua-2', 'kenh'].sort());
  });
});

describe('actorCollider', () => {
  it('vòng tròn r ~0.42 id "npc" đúng chỗ, không che camera', () => {
    const c = actorCollider(1.5, -2);
    expect(c).toMatchObject({ kind: 'circle', id: 'npc', x: 1.5, z: -2 });
    if (c.kind !== 'circle') throw new Error('phải là vòng tròn');
    expect(c.r).toBeGreaterThan(0.35);
    expect(c.r).toBeLessThan(0.5);
    expect(c.blocksCamera).toBe(false);
  });

  it('NaN/Infinity không lan ra collider: toạ độ hữu hạn và nằm ngoài mọi vùng đi lại', () => {
    for (const [x, z] of [
      [Number.NaN, 0],
      [0, Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY, Number.NaN],
    ] as const) {
      const c = actorCollider(x, z);
      if (c.kind !== 'circle') throw new Error('phải là vòng tròn');
      expect(Number.isFinite(c.x) && Number.isFinite(c.z) && Number.isFinite(c.r)).toBe(true);
      for (const style of STYLES) expect(isFree(areaOf(style), c.x, c.z, 0)).toBe(false);
      expect(Math.hypot(c.x, c.z)).toBeGreaterThan(1000);
    }
  });
});

for (const style of STYLES) {
  describe(`san-nha / ${style}`, () => {
    const area = areaOf(style);

    it('bounds hợp lệ', () => {
      const b = area.bounds;
      for (const v of [b.minX, b.maxX, b.minZ, b.maxZ]) expect(Number.isFinite(v)).toBe(true);
      expect(b.minX).toBeLessThan(b.maxX);
      expect(b.minZ).toBeLessThan(b.maxZ);
      // Có chỗ ra ngoài cổng (z = 5.6) hơn 3 m.
      expect(b.maxZ).toBeGreaterThan(5.6 + 3);
    });

    it('collider hợp lệ: số hữu hạn, kích thước > 0, id duy nhất, giao với bounds', () => {
      const ids = new Set<string>();
      for (const c of area.colliders) {
        const nums = c.kind === 'circle' ? [c.x, c.z, c.r] : [c.x, c.z, c.hw, c.hd, c.rotY ?? 0];
        for (const v of nums) expect(Number.isFinite(v), c.id).toBe(true);
        if (c.kind === 'circle') expect(c.r, c.id).toBeGreaterThan(0);
        else {
          expect(c.hw, c.id).toBeGreaterThan(0);
          expect(c.hd, c.id).toBeGreaterThan(0);
        }
        expect(c.id, 'collider phải có id').toBeTruthy();
        expect(ids.has(c.id ?? ''), `trùng id ${c.id}`).toBe(false);
        ids.add(c.id ?? '');
        // Vật cản hoàn toàn nằm ngoài vùng đi được là dữ liệu thừa.
        const reach = c.kind === 'circle' ? c.r : Math.hypot(c.hw, c.hd);
        const b = area.bounds;
        const dx = Math.max(b.minX - c.x, 0, c.x - b.maxX);
        const dz = Math.max(b.minZ - c.z, 0, c.z - b.maxZ);
        expect(Math.hypot(dx, dz), `${c.id} nằm ngoài bounds`).toBeLessThan(reach);
      }
    });

    it('spawn trong bounds, không nằm trong collider nào, đủ chỗ cho người, quay mặt về phía nhà', () => {
      const { x, z, rotY } = area.spawn;
      const b = area.bounds;
      expect(x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ).toBe(true);
      for (const c of area.colliders) expect(distTo(c, x, z), `spawn trong ${c.id}`).toBeGreaterThan(0);
      expect(isFree(area, x, z, PLAYER_R)).toBe(true);
      // Trong sân, trước cổng (z < 5.6) và gần cổng; nhìn về -z (nhà ở phía -z).
      expect(z).toBeLessThan(5.6);
      expect(z).toBeGreaterThan(5.6 - 3);
      expect(Math.sin(rotY)).toBeCloseTo(0, 6);
      expect(Math.cos(rotY)).toBeCloseTo(-1, 6);
    });

    it('liên thông (lưới 0.25 m, bán kính người 0.35): tới được cửa nhà, bàn trà, ngoài cổng', () => {
      const grid = flood(area, PLAYER_R);
      // Trước ba cửa nhà (cửa ở x = -1.6, 0, 1.6 sát tường z = -1.8).
      for (const x of [-1.6, 0, 1.6]) expect(grid.reachable(x, -1.25, 0.15), `cửa x=${x}`).toBe(true);
      // Bốn phía bàn trà, mỗi chỗ cách mép bàn dưới 0.7 m.
      const table = boxOf(area, 'ban-tra');
      for (const [x, z] of [
        [0, -1.25],
        [0, 0.5],
        [-1.25, -0.5],
        [1.25, -0.5],
      ] as const) {
        expect(distTo(table, x, z), `(${x}, ${z}) phải sát bàn`).toBeLessThan(0.7);
        expect(grid.reachable(x, z, 0.01), `cạnh bàn (${x}, ${z})`).toBe(true);
      }
      // Đứng được trong khung cổng và ở điểm cách cổng 2 m phía ngoài.
      for (const x of [-0.5, 0, 0.5]) expect(grid.reachable(x, 5.5, 0.01), `khung cổng x=${x}`).toBe(true);
      expect(grid.reachable(0, 5.6 + 2, 0.15)).toBe(true);
    });

    it('đi thẳng từ spawn xuyên qua cổng ra ngoài không vướng gì', () => {
      for (let z = area.spawn.z; z <= 5.6 + 2; z += 0.05) {
        expect(isFree(area, area.spawn.x, z, PLAYER_R), `z=${z.toFixed(2)}`).toBe(true);
      }
    });

    it('không có ô đứng được nào bị cô lập khỏi spawn (không có túi kín)', () => {
      const grid = flood(area, PLAYER_R);
      expect(grid.free).toBeGreaterThan(1000);
      expect(grid.reached).toBe(grid.free);
    });

    it('ghi cờ blocksCamera: vật cao lớn có, vật thấp không', () => {
      expect(colliderOf(area, 'nha').blocksCamera).toBe(true);
      expect(colliderOf(area, 'ban-tra').blocksCamera).toBe(false);
      expect(colliderOf(area, 'cay-hoa').blocksCamera).toBe(false);
      expect(colliderOf(area, 'cay-quat').blocksCamera).toBe(false);
      for (const c of area.colliders) {
        // Bụi tre rộng nên che camera; thân dừa và cột cổng mảnh thì không (tránh camera giật khi đi ngang trục).
        if (c.id?.startsWith('tre-')) expect(c.blocksCamera, c.id).toBe(true);
        if (c.id?.startsWith('dua-') || c.id?.startsWith('cong-')) expect(c.blocksCamera, c.id).toBe(false);
      }
    });
  });
}

/**
 * So khớp "nguồn sự thật": đọc thẳng sets.tsx/props.tsx (dạng văn bản), tính lại toạ độ thế giới
 * và đối chiếu với collider trong walk.ts. Cảnh đổi mà walk.ts không đổi theo thì test này đỏ.
 */
describe('khớp hình học dựng trong sets.tsx / props.tsx', () => {
  it('nhà: hộp thân nhà (sets.tsx CountryHouse + props.tsx CountryHouse) chạm đất và cao hơn người', () => {
    const [px, , pz] = sanPos('<CountryHouse');
    const body = tag(houseFn, '<mesh ', 0);
    const lp = nums(body, 'position={[');
    const size = nums(body, 'boxGeometry args={[');
    expect(at(lp, 1) - at(size, 1) / 2).toBeCloseTo(0, 6);
    expect(at(lp, 1) + at(size, 1) / 2).toBeGreaterThan(BODY_H);
    for (const style of STYLES) {
      const c = boxOf(areaOf(style), 'nha');
      expect(c.x).toBeCloseTo(px + at(lp, 0), 6);
      expect(c.z).toBeCloseTo(pz + at(lp, 2), 6);
      expect(c.hw).toBeCloseTo(at(size, 0) / 2, 6);
      expect(c.hd).toBeCloseTo(at(size, 2) / 2, 6);
    }
  });

  it('cổng làng: cột/trụ đúng vị trí và kích thước theo từng miền', () => {
    const [gx, , gz] = sanPos('<VillageGate');
    const cases: [RegionStyle, string][] = [
      ['bac', gateBac],
      ['trung', gateOther],
      ['nam', gateOther],
    ];
    for (const [style, part] of cases) {
      const xs = nums(part, '{[');
      const post = tag(part, '<mesh ', 0);
      const size = nums(post, 'boxGeometry args={[');
      const y = at(nums(post, 'position={['), 0);
      // Cột chạm đất và cao hơn người nên là vật cản.
      expect(y - at(size, 1) / 2, style).toBeCloseTo(0, 6);
      expect(y + at(size, 1) / 2, style).toBeGreaterThan(BODY_H);
      const area = areaOf(style);
      const left = boxOf(area, 'cong-1');
      const right = boxOf(area, 'cong-2');
      expect(left.x).toBeCloseTo(gx + at(xs, 0), 6);
      expect(right.x).toBeCloseTo(gx + at(xs, 1), 6);
      for (const c of [left, right]) {
        expect(c.z).toBeCloseTo(gz, 6);
        expect(c.hw).toBeCloseTo(at(size, 0) / 2, 6);
        expect(c.hd).toBeCloseTo(at(size, 2) / 2, 6);
      }
    }
  });

  it('bàn trà: hộp mặt bàn khớp vị trí và kích thước', () => {
    const [px, , pz] = sanPos('<TeaTable');
    const top = tag(tableFn, '<mesh ', 0);
    const lp = nums(top, 'position={[');
    const size = nums(top, 'boxGeometry args={[');
    expect(at(lp, 1) - at(size, 1) / 2).toBeLessThan(BODY_H);
    for (const style of STYLES) {
      const c = boxOf(areaOf(style), 'ban-tra');
      expect(c.x).toBeCloseTo(px + at(lp, 0), 6);
      expect(c.z).toBeCloseTo(pz + at(lp, 2), 6);
      expect(c.hw).toBeCloseTo(at(size, 0) / 2, 6);
      expect(c.hd).toBeCloseTo(at(size, 2) / 2, 6);
    }
  });

  it('đào/mai: vòng tròn nhỏ quanh chậu, đúng chỗ, không rộng bằng tán', () => {
    const [px, , pz] = sanPos('<BlossomTree kind={BLOSSOM[s]}');
    const scale = at(nums(tag(san, '<BlossomTree kind={BLOSSOM[s]}'), 'scale={'), 0);
    const potR = at(nums(tag(blossomFn, '<mesh ', 0), 'cylinderGeometry args={['), 0);
    for (const style of STYLES) {
      const c = circleOf(areaOf(style), 'cay-hoa');
      expect(c.x).toBeCloseTo(px, 6);
      expect(c.z).toBeCloseTo(pz, 6);
      expect(c.r).toBeGreaterThanOrEqual(potR * scale - EPS);
      expect(c.r).toBeLessThan(0.4);
    }
  });

  it('quất: vòng tròn phủ quả cầu xanh đặc (chạm độ cao người), đúng chỗ', () => {
    const [px, , pz] = sanPos('<BlossomTree kind="quat"');
    const scale = at(nums(tag(san, '<BlossomTree kind="quat"'), 'scale={'), 0);
    const ball = tag(blossomFn, "kind === 'quat' && (");
    const ballY = at(nums(ball, 'position={['), 1);
    const ballR = at(nums(ball, 'icosahedronGeometry args={['), 0);
    // Quả cầu có phần dưới thấp hơn đầu người nên phải chặn.
    expect((ballY - ballR) * scale).toBeLessThan(BODY_H);
    for (const style of STYLES) {
      const c = circleOf(areaOf(style), 'cay-quat');
      expect(c.x).toBeCloseTo(px, 6);
      expect(c.z).toBeCloseTo(pz, 6);
      expect(c.r).toBeGreaterThanOrEqual(ballR * scale - EPS);
      expect(c.r).toBeLessThan(ballR * scale + 0.05);
    }
  });

  it('tre: vòng tròn phủ hết chân và thân (đã nghiêng) của mọi cây trong bụi', () => {
    const sin = /Math\.sin\(i \* ([\d.]+) \+ ([\d.]+)\) \* ([\d.]+)/.exec(propsSrc);
    if (!sin) throw new Error('Không thấy công thức rnd trong props.tsx');
    const [k1, k2, k3] = [Number(sin[1]), Number(sin[2]), Number(sin[3])];
    const rnd = (i: number): number => {
      const v = Math.sin(i * k1 + k2) * k3;
      return v - Math.floor(v);
    };
    const spread = Number(/\(rnd\(i\) - 0\.5\) \* ([\d.]+)/.exec(bambooFn)?.[1]);
    const spreadZ = Number(/\(rnd\(i \+ 10\) - 0\.5\) \* ([\d.]+)/.exec(bambooFn)?.[1]);
    const tilt = /rotation=\{\[\(rnd\(i \+ 30\) - 0\.5\) \* ([\d.]+), 0, \(rnd\(i \+ 40\) - 0\.5\) \* ([\d.]+)\]\}/.exec(
      bambooFn,
    );
    const defaultN = Number(/n = (\d+)/.exec(bambooFn)?.[1]);
    if (!tilt || !Number.isFinite(spread) || !Number.isFinite(spreadZ) || !Number.isFinite(defaultN)) {
      throw new Error('Không đọc được thông số Bamboo từ props.tsx');
    }
    const tiltX = Number(tilt[1]);
    const tiltZ = Number(tilt[2]);
    const stalkR = 0.06; // cylinderGeometry [0.04, 0.06, h] trong Bamboo: bán kính đáy lớn nhất

    // Thứ tự trong SanNha: bụi 0, 1 là miền Bắc; bụi 2 là miền Trung.
    const clumps: [RegionStyle, string, number][] = [
      ['bac', 'tre-1', 0],
      ['bac', 'tre-2', 1],
      ['trung', 'tre-1', 2],
    ];
    for (const [style, id, nth] of clumps) {
      const t = tag(san, '<Bamboo', nth);
      const [px, , pz] = [0, 1, 2].map((k) => at(nums(t, 'position={['), k)) as [number, number, number];
      const nText = / n=\{(\d+)\}/.exec(t)?.[1];
      const n = nText === undefined ? defaultN : Number(nText);
      const c = circleOf(areaOf(style), id);
      expect(c.x).toBeCloseTo(px, 6);
      expect(c.z).toBeCloseTo(pz, 6);
      let farthest = 0;
      for (let i = 0; i < n; i++) {
        const bx = (rnd(i) - 0.5) * spread;
        const bz = (rnd(i + 10) - 0.5) * spreadZ;
        // Group xoay Euler XYZ (rx, 0, rz): điểm (0, h, 0) lệch (-h sin rz, h cos rz sin rx) so với gốc thân.
        const rx = (rnd(i + 30) - 0.5) * tiltX;
        const rz = (rnd(i + 40) - 0.5) * tiltZ;
        const topX = bx - BODY_H * Math.sin(rz);
        const topZ = bz + BODY_H * Math.cos(rz) * Math.sin(rx);
        const base = Math.hypot(bx, bz);
        farthest = Math.max(farthest, base);
        expect(base + stalkR, `${style}/${id} thân ${i} (chân)`).toBeLessThanOrEqual(c.r);
        expect(Math.hypot(topX, topZ) + stalkR, `${style}/${id} thân ${i} (ngang đầu)`).toBeLessThanOrEqual(c.r);
      }
      // Không phình quá mức so với bụi thật.
      expect(c.r).toBeLessThan(farthest + 0.4);
    }
  });

  it('dừa: vòng tròn phủ thân từ gốc tới ngang đầu, tính cả độ ngả', () => {
    const tilt = Number(/rotation=\{\[0, 0, ([\d.]+)\]\}/.exec(coconutFn)?.[1]);
    if (!Number.isFinite(tilt)) throw new Error('Không đọc được độ ngả của CoconutTree');
    const trunk = tag(coconutFn, '<mesh ', 0);
    const [rTop, rBottom, height] = [0, 1, 2].map((k) => at(nums(trunk, 'cylinderGeometry args={['), k)) as [
      number,
      number,
      number,
    ];
    // Độ cao thế giới BODY_H ứng với chiều dài dọc thân h = BODY_H / cos(tilt).
    const h = BODY_H / Math.cos(tilt);
    const rAtBody = rBottom + ((rTop - rBottom) * h) / height;
    for (const [id, nth] of [
      ['dua-1', 0],
      ['dua-2', 1],
    ] as const) {
      const [px, , pz] = sanPos('<CoconutTree', nth);
      const c = circleOf(areaOf('nam'), id);
      // Xoay z dương làm ngọn thân lệch về -x.
      expect(Math.hypot(c.x - px, c.z - pz) + rBottom, `${id} chân`).toBeLessThanOrEqual(c.r);
      expect(Math.hypot(c.x - (px - h * Math.sin(tilt)), c.z - pz) + rAtBody, `${id} ngang đầu`).toBeLessThanOrEqual(c.r);
    }
  });

  it('ao (Bắc) và kênh (Nam): đĩa tròn và mặt phẳng đúng vị trí, kích thước', () => {
    const pond = tag(san, '{/* ao làng */}');
    const [ox, , oz] = [0, 1, 2].map((k) => at(nums(pond, 'position={['), k)) as [number, number, number];
    const pondR = at(nums(pond, 'circleGeometry args={['), 0);
    const ao = circleOf(areaOf('bac'), 'ao');
    expect(ao.x).toBeCloseTo(ox, 6);
    expect(ao.z).toBeCloseTo(oz, 6);
    expect(ao.r).toBeGreaterThanOrEqual(pondR - EPS);

    const canal = tag(san, '{/* kênh rạch */}');
    const [kx, , kz] = [0, 1, 2].map((k) => at(nums(canal, 'position={['), k)) as [number, number, number];
    const planeSize = nums(canal, 'planeGeometry args={[');
    const kenh = boxOf(areaOf('nam'), 'kenh');
    expect(kenh.x).toBeCloseTo(kx, 6);
    expect(kenh.z).toBeCloseTo(kz, 6);
    expect(kenh.hw).toBeCloseTo(at(planeSize, 0) / 2, 6);
    expect(kenh.hd).toBeCloseTo(at(planeSize, 1) / 2, 6);
  });

  it('những vật KHÔNG thành collider đều nằm trên đầu người (dầm cổng, mái hiên, đèn lồng)', () => {
    // Dầm ngang cổng miền Bắc: mesh thứ 2 trong phần Bắc của VillageGate.
    const lintel = tag(gateBac, '<mesh ', 1);
    expect(at(nums(lintel, 'position={['), 1) - at(nums(lintel, 'boxGeometry args={['), 1) / 2).toBeGreaterThan(BODY_H);
    // Xà ngang cổng Trung/Nam: mesh thứ 2 trong phần còn lại.
    const beam = tag(gateOther, '<mesh ', 1);
    expect(at(nums(beam, 'position={['), 1) - at(nums(beam, 'boxGeometry args={['), 1) / 2).toBeGreaterThan(BODY_H);
    // Mái hiên miền Nam của nhà.
    const awning = tag(houseFn, "style === 'nam' && (");
    expect(at(nums(awning, 'position={['), 1) - at(nums(awning, 'boxGeometry args={['), 1) / 2).toBeGreaterThan(BODY_H);
    // Đèn lồng treo ở sân: tâm quả đèn + dịch cục bộ - bán kính theo trục y.
    const lanternY = at(sanPos('<Lantern'), 1);
    const globe = tag(lanternFn, '<mesh ', 0);
    const bottom =
      lanternY +
      at(nums(globe, 'position={['), 1) -
      at(nums(globe, 'icosahedronGeometry args={['), 0) * at(nums(globe, 'scale={['), 1);
    expect(bottom).toBeGreaterThan(BODY_H);
  });
});
