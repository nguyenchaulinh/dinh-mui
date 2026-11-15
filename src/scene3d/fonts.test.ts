import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_DECOR, STREET_BANNERS, SHOP_SIGN_COUNT, shopSign } from './decorText';
import { FONTS, FONT_ROLES, canvasFont, canvasWeight, fontStack, fontUrl, type FontRole } from './fonts';
import credits from '../../public/fonts/CREDITS.md?raw';

const fontsDir = new URL('../../public/fonts/', import.meta.url);

/** Tập mã ký tự có glyph trong file TTF (đọc bảng cmap, định dạng 4 và 12): chỉ để kiểm phủ ký tự. */
function glyphSet(role: FontRole): Set<number> {
  const raw = readFileSync(new URL(FONTS[role].file, fontsDir));
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const tables = dv.getUint16(4);
  let cmapOff = -1;
  for (let i = 0; i < tables; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
    if (tag === 'cmap') cmapOff = dv.getUint32(o + 8);
  }
  if (cmapOff < 0) throw new Error(`${FONTS[role].file}: không có bảng cmap`);
  const count = dv.getUint16(cmapOff + 2);
  let best = -1;
  let bestFmt = 0;
  for (let i = 0; i < count; i++) {
    const pid = dv.getUint16(cmapOff + 4 + i * 8);
    const eid = dv.getUint16(cmapOff + 6 + i * 8);
    const sub = cmapOff + dv.getUint32(cmapOff + 8 + i * 8);
    const fmt = dv.getUint16(sub);
    if (((pid === 3 && (eid === 1 || eid === 10)) || pid === 0) && (fmt === 4 || fmt === 12) && (best < 0 || fmt === 12)) {
      best = sub;
      bestFmt = fmt;
    }
  }
  const cps = new Set<number>();
  if (bestFmt === 12) {
    const groups = dv.getUint32(best + 12);
    for (let i = 0; i < groups; i++) {
      const s = dv.getUint32(best + 16 + i * 12);
      const e = dv.getUint32(best + 20 + i * 12);
      for (let c = s; c <= e; c++) cps.add(c);
    }
  } else {
    const segs = dv.getUint16(best + 6) / 2;
    const endO = best + 14;
    const startO = endO + segs * 2 + 2;
    const deltaO = startO + segs * 2;
    const rangeO = deltaO + segs * 2;
    for (let i = 0; i < segs; i++) {
      const end = dv.getUint16(endO + i * 2);
      const start = dv.getUint16(startO + i * 2);
      const delta = dv.getInt16(deltaO + i * 2);
      const range = dv.getUint16(rangeO + i * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g: number;
        if (range === 0) g = (c + delta) & 0xffff;
        else {
          g = dv.getUint16(rangeO + i * 2 + range + (c - start) * 2);
          if (g) g = (g + delta) & 0xffff;
        }
        if (g) cps.add(c);
      }
    }
  }
  return cps;
}

/** Mọi chữ cái tiếng Việt (có dấu), hoa và thường. */
const VIETNAMESE = 'ĂÂÊÔƠƯĐăâêôơưđ' + Array.from({ length: 0x1ef9 - 0x1ea0 + 1 }, (_, i) => String.fromCharCode(0x1ea0 + i)).join('');

describe('phông chữ (public/fonts)', () => {
  it('khai đủ năm vai trò, mỗi vai trò có file riêng, tên họ có tiền tố, trọng lượng và phông dự phòng', () => {
    expect(FONT_ROLES.sort()).toEqual(['display', 'hand', 'round', 'script', 'slab']);
    expect(new Set(FONT_ROLES.map((r) => FONTS[r].file)).size).toBe(5);
    for (const r of FONT_ROLES) {
      expect(FONTS[r].family, r).toMatch(/^DM /);
      expect(FONTS[r].fallback.length, r).toBeGreaterThan(5);
      expect(fontStack(r)).toContain(FONTS[r].family);
    }
  });

  it.each(FONT_ROLES)('%s: file TTF thật, có đủ 104 chữ cái tiếng Việt', (role) => {
    const raw = readFileSync(new URL(FONTS[role].file, fontsDir));
    const magic = (raw.buffer.slice(raw.byteOffset, raw.byteOffset + 4) as ArrayBuffer).byteLength === 4 ? new DataView(raw.buffer, raw.byteOffset, 4).getUint32(0) : 0;
    expect([0x00010000, 0x74727565], FONTS[role].file).toContain(magic);
    const g = glyphSet(role);
    const missing = [...VIETNAMESE].filter((ch) => !g.has(ch.codePointAt(0)!));
    expect(missing.join(''), `${FONTS[role].file} thiếu`).toBe('');
  });

  it('mọi ký tự của mọi dòng chữ trong game có glyph trong đúng phông của dòng đó (thiếu thì trình duyệt tráo phông xấu)', () => {
    const sets = Object.fromEntries(FONT_ROLES.map((r) => [r, glyphSet(r)])) as Record<FontRole, Set<number>>;
    for (const line of ALL_DECOR) {
      const role = line.font ?? 'round';
      const miss = [...line.text].filter((ch) => ch !== ' ' && !sets[role].has(ch.codePointAt(0)!));
      expect(miss.join(''), `"${line.text}" (${role}) thiếu glyph`).toBe('');
    }
  });

  it('CREDITS.md ghi từng file phông và giấy phép OFL đi kèm có thật', () => {
    expect(credits).toContain('SIL Open Font License');
    for (const r of FONT_ROLES) {
      expect(credits, FONTS[r].file).toContain(FONTS[r].file);
      const base = FONTS[r].file.split(/[-.]/)[0]!;
      const lic = readFileSync(new URL(`${base}.OFL.txt`, fontsDir));
      expect(lic.byteLength, `${base}.OFL.txt`).toBeGreaterThan(1000);
    }
  });

  it('chuỗi font canvas: đúng trọng lượng riêng của từng phông (không làm đậm giả), cỡ làm tròn và tối thiểu 1px', () => {
    expect(canvasWeight('display')).toBe('400');
    expect(canvasWeight('slab')).toBe('400');
    expect(canvasWeight('hand')).toBe('400');
    expect(canvasWeight('round')).toBe('800');
    expect(canvasWeight('script')).toBe('700');
    expect(canvasFont('display', 41.6)).toMatch(/^400 42px "DM Anton"/);
    expect(canvasFont('slab', -5)).toMatch(/^400 1px /);
  });

  it('đường dẫn tôn trọng base của Vite', () => {
    expect(fontUrl('display', '/')).toBe('/fonts/Anton-Regular.ttf');
    expect(fontUrl('display', '/dinh-mui')).toBe('/dinh-mui/fonts/Anton-Regular.ttf');
  });
});

describe('chữ trên banner và biển hiệu', () => {
  it('mọi dòng chỉ dùng phông đã khai, màu hợp lệ, viền và bóng đổ trong phạm vi hợp lý', () => {
    for (const l of ALL_DECOR) {
      expect(l.font === undefined || FONT_ROLES.includes(l.font), l.text).toBe(true);
      expect(l.color, l.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      if (l.stroke) {
        expect(l.stroke.w).toBeGreaterThan(0);
        expect(l.stroke.w).toBeLessThanOrEqual(0.3);
      }
      if (l.shadow) {
        expect(Math.abs(l.shadow.dx)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(l.shadow.dy)).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it('bộ chữ đa dạng: dùng cả năm phông, và băng rôn Tết dùng vàng chuyển sắc', () => {
    const used = new Set(ALL_DECOR.map((l) => l.font ?? 'round'));
    for (const r of FONT_ROLES) expect(used.has(r), `không dòng nào dùng phông ${r}`).toBe(true);
    expect(ALL_DECOR.some((l) => l.fill === 'gold')).toBe(true);
  });

  it('có ba băng rôn phố với nền hợp lệ; tên cửa hàng xoay vòng, không rỗng, không trùng liên tiếp', () => {
    expect(STREET_BANNERS).toHaveLength(3);
    for (const b of STREET_BANNERS) expect(b.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    const names = Array.from({ length: SHOP_SIGN_COUNT * 2 }, (_, i) => shopSign(i)[0]!.text);
    expect(names.slice(0, SHOP_SIGN_COUNT)).toEqual(names.slice(SHOP_SIGN_COUNT));
    expect(new Set(names).size).toBe(SHOP_SIGN_COUNT);
    expect(shopSign(-1)[0]!.text).toBe(shopSign(SHOP_SIGN_COUNT - 1)[0]!.text);
  });

  it('lời văn gốc và chỉ ở Hà Nội: không tên thương hiệu thật, không thành phố khác', () => {
    const all = ALL_DECOR.map((l) => l.text).join(' | ');
    for (const bad of ['Coca', 'Pepsi', 'Shopee', 'Grab', 'Tiki', 'Lazada', 'Sunsilk', 'Play Together', 'Đà Nẵng', 'Sài Gòn', 'Huế']) expect(all).not.toContain(bad);
  });
});
