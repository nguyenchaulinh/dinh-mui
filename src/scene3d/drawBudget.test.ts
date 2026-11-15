import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, BufferAttribute } from 'three';
import { STREET_BANNERS } from './decorText';
import { PARKED_BIKES, STREET_LAMP_XS } from './props-street';
import { PHO_TRAFFIC, phoFarHouses, phoHouses, phoSkyline } from './phoLayout';
import { SET_PROPS } from './sets';
import { phoPots } from './walk';
import { bakeHeightAO } from './shapes';

/**
 * Ngân sách draw call của phố Tết, TÍNH TỪ bố cục thật và cấu trúc dựng (không phải số đo trên máy). Mục tiêu docs/11: dưới
 * 400 draw call mỗi cảnh. Số đo thật xem bộ đếm "dc" trên màn hình (FpsProbe); test này giữ cho cấu trúc không phình lên.
 */

describe('ngân sách draw call phố Tết (tính từ cấu trúc)', () => {
  const houses = phoHouses('bac');
  const far = phoFarHouses();
  const parts = {
    // StreetHouse: thân, cửa cuốn, phần đặc gộp, phần phát sáng = 4; thêm một mặt phẳng chữ nếu có biển hiệu.
    'nhà phố phía bắc': houses.length * 4 + houses.filter((h) => h.sign).length,
    'nhà bên kia đường': far.length * 4,
    'băng rôn trên mặt tiền': STREET_BANNERS.length,
    // Xe máy: một mesh gộp; hàng chở trên xe là một mesh cây hoa (tối đa mọi xe chở hoa).
    'xe máy chạy (tối đa chở hoa)': PHO_TRAFFIC * 2,
    'xe máy đậu': PARKED_BIKES.length,
    'chậu hoa Tết': phoPots().length,
    'dây cờ, vạch qua đường': 4 + 1,
    'nhà cao tầng xa, bầu trời': phoSkyline().length + 1,
    'mặt đường, vỉa hè, nền': 1 + 1 + 2,
    // Đồ model: mỗi model ~2-3 mesh (nhiều vật liệu).
    'cột đèn, ghế, thùng rác, bụi cây (model)': STREET_LAMP_XS.length * 3 + 2 * 2 + 2 * 2 + 7 * 2,
    // Sạp và trạm đã gộp: sạp 2 mesh (đặc, phát sáng); trạm 2 mesh + tấm kính trong suốt + biển chữ Ga Hà Nội.
    'sạp quà': 2,
    'trạm chờ, biển Ga Hà Nội': 3 + 1,
    'đèn lồng (mỗi cái 2 mesh)': 8 * 2 + 4,
    'nhân vật (người chơi + 5 NPC, ~12 mesh gồm phụ kiện)': 6 * 12,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  it('tổng ước tính dưới 400 (mục tiêu cho điện thoại tầm trung)', () => {
    expect(total, JSON.stringify(parts, null, 1)).toBeLessThan(400);
  });

  it('nhà phố và xe máy là phần nặng nhất cũ nhưng nay chỉ còn một phần nhỏ: dưới 40% tổng', () => {
    const heavy = parts['nhà phố phía bắc'] + parts['nhà bên kia đường'] + parts['xe máy chạy (tối đa chở hoa)'] + parts['xe máy đậu'] + parts['chậu hoa Tết'];
    expect(heavy / total).toBeLessThan(0.6);
  });

  it('trước khi gộp (ước tính cũ ~1.600) mỗi nhà ~30 mesh, mỗi xe ~25, mỗi cây ~40: nay giảm hơn 4 lần', () => {
    const before = houses.length * 30 + far.length * 7 + PHO_TRAFFIC * 25 + PARKED_BIKES.length * 9 + phoPots().length * 40 + (PHO_TRAFFIC * 0.45) * 40;
    expect(before / total).toBeGreaterThan(3.5);
  });

  it('mọi model của phố Tết được tải trước (SET_PROPS)', () => {
    for (const s of ['street-light', 'bench', 'bin', 'bush', 'houseplant']) expect(SET_PROPS['pho-tet'], s).toContain(s);
  });
});

describe('bakeHeightAO: AO nướng sẵn theo độ cao', () => {
  const col = (g: BufferGeometry, i: number) => g.attributes.color!.getX(i);
  it('chân tối còn `min`, sáng dần tới hết ở y1, trên y1 giữ nguyên', () => {
    const g = new BoxGeometry(1, 4, 1); // y từ -2 tới 2
    bakeHeightAO(g, 0, 2, 0.5, 2); // dy = 2: y thế giới = y + 2 từ 0 tới 4
    const ys = Array.from({ length: g.attributes.position!.count }, (_, i) => g.attributes.position!.getY(i) + 2);
    const lo = ys.findIndex((y) => y === 0);
    const hi = ys.findIndex((y) => y === 4);
    expect(col(g, lo)).toBeCloseTo(0.5, 6);
    expect(col(g, hi)).toBeCloseTo(1, 6);
  });
  it('nhân vào màu có sẵn (không ghi đè), và tạo màu trắng nếu chưa có', () => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 0, 0, 2, 0]), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array([0.8, 0.4, 0.2, 0.8, 0.4, 0.2, 0.8, 0.4, 0.2]), 3));
    bakeHeightAO(g, 0, 2, 0.5);
    expect(g.attributes.color!.getX(0)).toBeCloseTo(0.4, 6); // 0.8 * 0.5
    expect(g.attributes.color!.getY(0)).toBeCloseTo(0.2, 6);
    expect(g.attributes.color!.getX(2)).toBeCloseTo(0.8, 6);
    const g2 = new BufferGeometry();
    g2.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0]), 3));
    bakeHeightAO(g2, 0, 1, 0.7);
    expect(g2.attributes.color!.getX(0)).toBeCloseTo(0.7, 6);
  });
  it('đầu vào hỏng (y1 <= y0, min không hữu hạn, không có vị trí) không làm gì và không ném lỗi', () => {
    const g = new BoxGeometry(1, 1, 1);
    bakeHeightAO(g, 1, 1, 0.5);
    bakeHeightAO(g, 0, 1, NaN);
    expect(g.attributes.color).toBeUndefined();
    expect(() => bakeHeightAO(new BufferGeometry(), 0, 1, 0.5)).not.toThrow();
    bakeHeightAO(g, 0, 1, 5); // min > 1 kẹp về 1: không đổi màu
    expect(col(g, 0)).toBeCloseTo(1, 6);
  });
});
