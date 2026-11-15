/**
 * Phông chữ dùng cho chữ vẽ trên canvas (biển hiệu, băng rôn, bảng): file ở public/fonts (OFL, nguồn và giấy phép ở
 * public/fonts/CREDITS.md), đều có đủ chữ cái tiếng Việt. Nạp lười bằng FontFace; chưa nạp xong hoặc nạp lỗi thì dùng phông
 * hệ thống dự phòng (không làm game lỗi). Phần bảng khai và chuỗi phông là hàm thuần để test.
 */

export type FontRole = 'display' | 'slab' | 'script' | 'round' | 'hand';

export interface FontDef {
  /** Tên họ phông đăng ký với trình duyệt (có tiền tố để không trùng phông cài trên máy). */
  family: string;
  /** Tên file trong public/fonts. */
  file: string;
  /** Trọng lượng khai cho FontFace ('400 700' với phông biến thể). */
  weight: string;
  /** Phông hệ thống dự phòng, theo thứ tự. */
  fallback: string;
}

export const FONTS: Readonly<Record<FontRole, FontDef>> = {
  /** Anton: chữ poster sắc cạnh, cho tiêu đề lớn và ưu đãi ("type as graphic"). */
  display: { family: 'DM Anton', file: 'Anton-Regular.ttf', weight: '400', fallback: 'Impact, "Arial Narrow", sans-serif' },
  /** Alfa Slab One: serif đậm kiểu retro, cho băng rôn Tết và câu đối. */
  slab: { family: 'DM Alfa Slab', file: 'AlfaSlabOne-Regular.ttf', weight: '400', fallback: 'Rockwell, Georgia, serif' },
  /** Dancing Script: chữ viết kiểu cọ, cho lời chúc. */
  script: { family: 'DM Dancing', file: 'DancingScript-Variable.ttf', weight: '400 700', fallback: '"Brush Script MT", "Segoe Script", cursive' },
  /** Be Vietnam Pro ExtraBold: sans tròn hiện đại, cho biển hiệu và dòng phụ. */
  round: { family: 'DM Be Vietnam', file: 'BeVietnamPro-ExtraBold.ttf', weight: '800', fallback: '"Trebuchet MS", Verdana, sans-serif' },
  /** Patrick Hand: chữ viết tay, cho bảng và ghi chú. */
  hand: { family: 'DM Patrick Hand', file: 'PatrickHand-Regular.ttf', weight: '400', fallback: '"Segoe Print", "Comic Sans MS", cursive' },
};

export const FONT_ROLES = Object.keys(FONTS) as FontRole[];

export const fontStack = (role: FontRole): string => `"${FONTS[role].family}", ${FONTS[role].fallback}`;

/**
 * Trọng lượng khai trên canvas: mỗi phông có đúng trọng lượng của nó (khai 'bold' cho phông chỉ có một nét sẽ bị làm đậm
 * giả, nhìn xấu); phông viết (script) dùng 700 cho nét cọ đậm.
 */
export const canvasWeight = (role: FontRole): string => (role === 'script' ? '700' : role === 'round' ? '800' : '400');

/** Chuỗi `font` cho canvas 2D. */
export const canvasFont = (role: FontRole, px: number): string => `${canvasWeight(role)} ${Math.max(1, Math.round(px))}px ${fontStack(role)}`;

export const fontUrl = (role: FontRole, base = '/'): string => `${base.endsWith('/') ? base : `${base}/`}fonts/${FONTS[role].file}`;

let loading: Promise<void> | null = null;
let ready = false;

/** Đã nạp xong (hoặc không thể nạp trong môi trường này). */
export const fontsReady = (): boolean => ready;

/** Nạp tất cả phông một lần. Luôn resolve (lỗi từng phông bị bỏ qua, dùng phông dự phòng). */
export function loadFonts(): Promise<void> {
  if (loading) return loading;
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') {
    ready = true;
    loading = Promise.resolve();
    return loading;
  }
  const base = import.meta.env.BASE_URL;
  loading = Promise.all(
    FONT_ROLES.map(async (role) => {
      const def = FONTS[role];
      try {
        const face = new FontFace(def.family, `url(${fontUrl(role, base)})`, { weight: def.weight });
        await face.load();
        document.fonts.add(face);
      } catch {
        // Dùng phông hệ thống dự phòng.
      }
    }),
  ).then(() => {
    ready = true;
  });
  return loading;
}
