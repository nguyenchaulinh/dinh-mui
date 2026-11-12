import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import credits from '../../public/models/CREDITS.md?raw';
import { CHARACTER_MODELS, clipFor, heightFor, isCharacterModel, modelUrl, partOf, roleOf } from './rigging';

/** Nội dung thô của các file GLB (đọc qua Vite, không cần API của node). */
const FILES = import.meta.glob('../../public/models/*.glb', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const fileOf = (m: string) => FILES[`../../public/models/${m}.glb`];

/** Lấy phần JSON ở đầu GLB: từ dấu `{` đầu tiên tới dấu `}` khớp (đếm ngoặc, bỏ qua chuỗi). */
function glbJson(raw: string): { animations?: { name: string }[]; asset?: { copyright?: string } } {
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

describe('model nhân vật trong public/models', () => {
  it('mọi model có file, đúng định dạng GLB, ghi rõ giấy phép CC0', () => {
    for (const m of CHARACTER_MODELS) {
      const raw = fileOf(m);
      expect(raw, m).toBeDefined();
      expect(raw!.startsWith('glTF'), m).toBe(true);
      expect(glbJson(raw!).asset?.copyright, m).toContain('CC0');
      expect(credits, m).toContain(`${m}.glb`);
    }
  });

  it('mọi clip mà game gọi tới đều có trong file', () => {
    for (const m of CHARACTER_MODELS) {
      const names = new Set((glbJson(fileOf(m)!).animations ?? []).map((a) => a.name));
      const kind = m.startsWith('cho-') ? 'dog' : 'human';
      for (const anim of ['idle', 'walk', 'run', 'talk', 'wave', 'cry', 'dance']) {
        expect(names.has(clipFor(anim, kind)), `${m}: ${anim} -> ${clipFor(anim, kind)}`).toBe(true);
      }
    }
  });

  it('nhân vật trong nội dung dùng model có thật (trừ Bé Dê dựng bằng code)', () => {
    for (const ch of loadContent().characters) {
      if (ch.look?.kind === 'goat') continue;
      expect(isCharacterModel(ch.look?.model), `${ch.id}: ${String(ch.look?.model)}`).toBe(true);
    }
  });
});

describe('luật đổi màu, chiều cao, hoạt ảnh', () => {
  it('nhận ra bộ phận theo tên mesh', () => {
    expect(partOf('Suit_Body')).toBe('body');
    expect(partOf('Casual_Legs_1')).toBe('legs');
    expect(partOf('Formad_Head')).toBe('head');
    expect(partOf('BaseHuman')).toBeNull();
  });

  it('vai trò vật liệu: da, tóc, áo/quần là vật liệu chiếm nhiều nhất, mắt và phụ kiện giữ nguyên', () => {
    expect(roleOf('Skin', 'head', false)).toBe('skin');
    expect(roleOf('Hair_Brown', 'head', false)).toBe('hair');
    expect(roleOf('Moustache', 'head', false)).toBe('hair');
    expect(roleOf('Eyebrows', 'head', false)).toBe('keep');
    expect(roleOf('Suit', 'body', true)).toBe('outfit');
    expect(roleOf('Tie', 'body', false)).toBe('keep');
    expect(roleOf('Grey', 'legs', true)).toBe('pants');
    expect(roleOf('Main', null, false)).toBe('fur');
    expect(roleOf('Main_Light', null, false)).toBe('fur-light');
  });

  it('chiều cao hợp lý và đường dẫn tôn trọng base', () => {
    expect(heightFor('human', 'kid')).toBeLessThan(heightFor('human', 'elder'));
    expect(heightFor('human', 'elder')).toBeLessThan(heightFor('human'));
    expect(heightFor('dog')).toBeLessThan(0.5);
    expect(modelUrl('cho-pom')).toBe('/models/cho-pom.glb');
    expect(modelUrl('cho-pom', '/dinh-mui')).toBe('/dinh-mui/models/cho-pom.glb');
  });
});
