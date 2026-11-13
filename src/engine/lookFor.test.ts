import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { lookFor } from './engine';
import type { Character, Content } from './types';
import { validateContent } from './validate';

const clone = (): Content => JSON.parse(JSON.stringify(loadContent())) as Content;
const ban = (c: Content): Character => c.characters.find((x) => x.id === 'ban')!;

describe('lookFor: trang phục theo vai', () => {
  it('ghi đè từng trường của look gốc, giữ phần còn lại', () => {
    const c = clone();
    const base = ban(c).look!;
    const sv = lookFor(ban(c), 'sinh-vien')!;
    expect(sv.model).toBe(base.model);
    expect(sv.outfit).not.toBe(base.outfit);
    expect(sv.accessories).toEqual(['backpack', 'lanyard']);
    expect(lookFor(ban(c), 'moi-di-lam')!.model).toBe('nam-vest');
  });
  it('vai không có ghi đè thì dùng look gốc; nhân vật không có lookByPersona cũng vậy', () => {
    const c = clone();
    expect(lookFor(ban(c), 'vai-la')).toBe(ban(c).look);
    const sep = c.characters.find((x) => x.id === 'sep')!;
    expect(lookFor(sep, 'sinh-vien')).toBe(sep.look);
  });
  it('mỗi vai của người chơi có trang phục riêng, khác nhau', () => {
    const c = clone();
    const looks = c.personas.map((p) => JSON.stringify(lookFor(ban(c), p.id)));
    expect(new Set(looks).size).toBe(c.personas.length);
  });
});

describe('validate look', () => {
  it('nội dung thật hợp lệ', () => {
    expect(validateContent(loadContent())).toEqual([]);
  });
  it('bắt phụ kiện lạ, quá 4 phụ kiện, màu sai và vai không tồn tại trong lookByPersona', () => {
    const c = clone();
    ban(c).look!.accessories = ['khong-co' as never];
    expect(validateContent(c).some((e) => e.includes('phụ kiện lạ'))).toBe(true);
    ban(c).look!.accessories = ['cap', 'glasses', 'tie', 'lanyard', 'bag'];
    expect(validateContent(c).some((e) => e.includes('tối đa 4'))).toBe(true);
    ban(c).look!.accessories = [];
    ban(c).look!.accent = 'do';
    expect(validateContent(c).some((e) => e.includes('accent'))).toBe(true);
    ban(c).look!.accent = undefined;
    ban(c).lookByPersona = { 'vai-ma': { accessories: ['cap'] } };
    expect(validateContent(c).some((e) => e.includes('vai-ma'))).toBe(true);
  });
});
