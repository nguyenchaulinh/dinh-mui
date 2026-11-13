import { describe, expect, it } from 'vitest';
import credits from '../../public/models/CREDITS.md?raw';
import { PROP_MODELS, propOf, propOrigin, propScale, propSize } from './propModels';

const FILES = import.meta.glob('../../public/models/props/*.glb', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const fileOf = (slug: string) => FILES[`../../public/models/props/${slug}.glb`];

/** JSON ở đầu GLB (đếm ngoặc, bỏ qua chuỗi), cùng cách với rigging.test.ts. */
function glbJson(raw: string): any {
  const start = raw.indexOf('{');
  let depth = 0;
  let inStr = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return JSON.parse(raw.slice(start, i + 1));
  }
  throw new Error('không đọc được JSON của GLB');
}

type Mat = number[][];
const mul = (a: Mat, b: Mat): Mat => a.map((_, i) => b[0]!.map((__, j) => a[i]!.reduce((s, _v, k) => s + a[i]![k]! * b[k]![j]!, 0)));
function trs(n: any): Mat {
  if (n.matrix) {
    const m = n.matrix as number[];
    return [[m[0]!, m[4]!, m[8]!, m[12]!], [m[1]!, m[5]!, m[9]!, m[13]!], [m[2]!, m[6]!, m[10]!, m[14]!], [0, 0, 0, 1]];
  }
  const [x, y, z, w] = (n.rotation ?? [0, 0, 0, 1]) as number[];
  const s = (n.scale ?? [1, 1, 1]) as number[];
  const t = (n.translation ?? [0, 0, 0]) as number[];
  const R = [
    [1 - 2 * (y! * y! + z! * z!), 2 * (x! * y! - z! * w!), 2 * (x! * z! + y! * w!)],
    [2 * (x! * y! + z! * w!), 1 - 2 * (x! * x! + z! * z!), 2 * (y! * z! - x! * w!)],
    [2 * (x! * z! - y! * w!), 2 * (y! * z! + x! * w!), 1 - 2 * (x! * x! + y! * y!)],
  ];
  return [0, 1, 2].map((i) => [R[i]![0]! * s[0]!, R[i]![1]! * s[1]!, R[i]![2]! * s[2]!, t[i]!]).concat([[0, 0, 0, 1]]);
}

/** Hộp bao của mọi mesh theo trạng thái gốc (accessor min/max qua ma trận node). */
function bbox(j: any): { min: number[]; max: number[] } {
  const nodes = j.nodes as any[];
  const parent = new Map<number, number>();
  nodes.forEach((n, i) => (n.children ?? []).forEach((c: number) => parent.set(c, i)));
  const lo = [1e9, 1e9, 1e9];
  const hi = [-1e9, -1e9, -1e9];
  nodes.forEach((n, i) => {
    if (n.mesh === undefined) return;
    let M = trs(n);
    for (let k = parent.get(i); k !== undefined; k = parent.get(k)) M = mul(trs(nodes[k]), M);
    for (const pr of j.meshes[n.mesh].primitives) {
      const a = j.accessors[pr.attributes.POSITION];
      for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
        for (let r = 0; r < 3; r++) {
          const v = M[r]![0]! * cx + M[r]![1]! * cy + M[r]![2]! * cz + M[r]![3]!;
          lo[r] = Math.min(lo[r]!, v);
          hi[r] = Math.max(hi[r]!, v);
        }
      }
    }
  });
  return { min: lo, max: hi };
}

describe('model đồ đạc / cây cối CC0 (public/models/props)', () => {
  it('mỗi file có mục trong bảng và mỗi mục có file, slug không trùng', () => {
    const onDisk = Object.keys(FILES).map((p) => /\/([^/]+)\.glb$/.exec(p)![1]!).sort();
    expect(PROP_MODELS.map((p) => p.slug).sort()).toEqual(onDisk);
    expect(new Set(PROP_MODELS.map((p) => p.slug)).size).toBe(PROP_MODELS.length);
  });

  it.each(PROP_MODELS.map((p) => p.slug))('%s: đúng định dạng GLB, tự chứa (không extension, không texture ngoài), hộp bao khớp bảng', (slug) => {
    const raw = fileOf(slug)!;
    expect(raw.startsWith('glTF')).toBe(true);
    const j = glbJson(raw);
    expect(j.extensionsUsed ?? []).toEqual([]);
    for (const img of (j.images ?? []) as { uri?: string }[]) expect(img.uri === undefined || img.uri.startsWith('data:')).toBe(true);
    const p = propOf(slug)!;
    const b = bbox(j);
    for (let r = 0; r < 3; r++) {
      expect(Math.abs(b.min[r]! - p.min[r]!), `${slug} min[${r}]`).toBeLessThan(0.002);
      expect(Math.abs(b.max[r]! - p.max[r]!), `${slug} max[${r}]`).toBeLessThan(0.002);
    }
    for (let r = 0; r < 3; r++) expect(p.max[r]!).toBeGreaterThanOrEqual(p.min[r]!);
  });

  it('CREDITS.md ghi mỗi model: file, tác giả, trang poly.pizza, CC0', () => {
    expect(credits).toContain('CC0');
    for (const p of PROP_MODELS) {
      expect(credits, `props/${p.slug}.glb`).toContain(`props/${p.slug}.glb`);
      expect(credits, `${p.slug} trang`).toContain(`https://poly.pizza/m/${p.id}`);
      expect(credits).toContain(p.author);
      expect(p.id).toMatch(/^[A-Za-z0-9]{10}$/);
    }
  });

  it('kích thước thật theo đơn vị: đồ Kenney nhân đôi, Quaternius giữ nguyên; cỡ hợp lý', () => {
    const desk = propOf('desk')!;
    expect(desk.unit).toBe(2);
    const [w, h, d] = propSize(desk);
    expect(w).toBeGreaterThan(1.2);
    expect(w).toBeLessThan(1.7); // bàn ~1.4 m
    expect(h).toBeGreaterThan(0.65);
    expect(h).toBeLessThan(0.85);
    expect(d).toBeGreaterThan(0.6);
    expect(propOf('palm')!.unit).toBe(1);
    for (const p of PROP_MODELS) {
      const [sw, sh, sd] = propSize(p);
      expect(Math.max(sw, sh, sd), p.slug).toBeLessThan(12);
      expect(Math.max(sw, sh, sd), p.slug).toBeGreaterThan(0.05);
    }
  });

  it('propScale: ưu tiên cao, rồi rộng, rồi sâu; bỏ qua số hỏng; propOrigin đưa tâm đáy về gốc', () => {
    const p = propOf('bookcase')!;
    const [, h] = propSize(p);
    expect(propScale(p, { h: 1.7 })).toBeCloseTo(1.7 / h, 6);
    expect(propScale(p, { h: 1.7, w: 9 })).toBeCloseTo(1.7 / h, 6);
    expect(propScale(p, { w: 1 })).toBeCloseTo(1 / propSize(p)[0], 6);
    expect(propScale(p, { h: NaN, d: -1, s: 3 })).toBe(3);
    expect(propScale(p)).toBe(1);
    const o = propOrigin(p);
    expect(o[0] + (p.min[0] + p.max[0]) / 2).toBeCloseTo(0, 9);
    expect(o[1] + p.min[1]).toBeCloseTo(0, 9);
  });
});
