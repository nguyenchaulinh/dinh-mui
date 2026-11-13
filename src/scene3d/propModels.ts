/**
 * Model đồ đạc và cây cối CC0 trong public/models/props (nguồn, tác giả, giấy phép: public/models/CREDITS.md).
 * Hàm thuần, không import three/react. `min`/`max` là hộp bao của model theo đơn vị gốc của file, đo từ chính file
 * (có test đối chiếu lại), nên đặt tỉ lệ và gốc toạ độ được mà không phải đo lúc chạy.
 *
 * Hướng: model Kenney quay mặt về -z (tựa ghế, tựa sofa nằm ở phía +z), đo từ hình khối của chính file; muốn quay
 * mặt về +z thì rotY = PI.
 *
 * Đơn vị gốc: bộ Kenney Furniture Kit vẽ nhỏ khoảng một nửa so với người (bàn cao 0.38), nên `unit` = 2 để ra đúng cỡ
 * thật; bộ Quaternius vẽ theo mét nên `unit` = 1.
 */

export type PropAuthor = 'Kenney' | 'Quaternius';

export interface PropModel {
  /** Tên file không đuôi trong public/models/props. */
  slug: string;
  name: string;
  author: PropAuthor;
  /** Id trang model trên poly.pizza (https://poly.pizza/m/<id>). */
  id: string;
  /** Hệ số từ đơn vị gốc ra mét. */
  unit: number;
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

const f = (v: number): number => Math.round(v * 1000) / 1000;
const m = (slug: string, name: string, author: PropAuthor, id: string, min: [number, number, number], max: [number, number, number]): PropModel => ({
  slug, name, author, id, unit: author === 'Kenney' ? 2 : 1, min: [f(min[0]), f(min[1]), f(min[2])], max: [f(max[0]), f(max[1]), f(max[2])],
});

export const PROP_MODELS: readonly PropModel[] = [
  m('bamboo', 'Bamboo', 'Quaternius', 'xBPj13w3JQ', [-0.709, -0.017, -0.716], [0.747, 4.424, 0.832]),
  m('banana', 'Banana', 'Quaternius', 'ruOFtE0B6Z', [-0.707, -0.446, -0.193], [0.469, 0.958, 0.116]),
  m('bench', 'Bench', 'Quaternius', 'jLxjFxFRpw', [-0.332, -0.001, -0.081], [0.332, 0.314, 0.161]),
  m('bin', 'Trashcan', 'Quaternius', 'vlVx279xut', [-0.377, -0.000, -0.377], [0.377, 1.074, 0.377]),
  m('bookcase-open', 'Bookcase Open', 'Kenney', 'MTH8ZwnA27', [-0.400, 0.000, 0.000], [0.000, 0.880, 0.250]),
  m('bookcase', 'Bookcase Closed', 'Kenney', 'DO6AMMTYVI', [-0.400, 0.000, 0.000], [0.000, 0.850, 0.250]),
  m('books', 'Books', 'Kenney', 'M2cJ5sVUgJ', [-0.150, 0.000, 0.000], [0.000, 0.104, 0.094]),
  m('bush', 'Bush', 'Quaternius', 'ooG6CkLyE8', [-1.026, -0.289, -1.036], [1.043, 0.900, 1.030]),
  m('chair', 'Chair Modern Cushion', 'Kenney', 'KuTg9Uw3QC', [-0.200, -0.000, 0.000], [0.000, 0.460, 0.200]),
  m('coat-rack', 'Coat Rack Standing', 'Kenney', '8jXUm32dKW', [-0.136, 0.000, -0.136], [0.136, 0.770, 0.136]),
  m('coffee-machine', 'Kitchen Coffee Machine', 'Kenney', 'jBUiOz36vs', [-0.190, 0.000, 0.000], [0.000, 0.177, 0.240]),
  m('desk-chair', 'Desk Chair', 'Kenney', 'CKSz6PB1vO', [-0.335, 0.000, 0.000], [0.000, 0.608, 0.314]),
  m('desk', 'Desk', 'Kenney', '6PbVkqPzEU', [-0.724, 0.000, -0.012], [0.010, 0.384, 0.380]),
  m('doorway', 'Doorway', 'Kenney', 'NjrIKzZLYv', [-0.486, 0.000, -0.012], [0.000, 1.010, 0.101]),
  m('fence', 'Fence', 'Quaternius', 'e02PFKKhbr', [-2.945, -0.011, -0.083], [2.945, 1.086, 0.083]),
  m('houseplant', 'Houseplant', 'Quaternius', 'bfLOqIV5uP', [-0.538, 0.002, -0.586], [0.628, 0.883, 0.634]),
  m('keyboard', 'Computer Keyboard', 'Kenney', 'vsqTUPFSw6', [-0.282, 0.000, 0.000], [0.000, 0.028, 0.118]),
  m('lamp-floor', 'Lamp Square Floor', 'Kenney', 'YhhExKQQCs', [-0.120, 0.000, 0.000], [0.000, 0.860, 0.120]),
  m('laptop', 'Laptop', 'Kenney', 'GnbwSUiVty', [-0.264, 0.000, 0.000], [0.000, 0.162, 0.240]),
  m('monitor', 'Computer Screen', 'Kenney', 'V5Qo141OcB', [-0.393, -0.000, 0.000], [0.000, 0.294, 0.104]),
  m('palm', 'Palm Tree', 'Quaternius', 'P0tgwyXBgr', [-0.603, 0.004, -1.248], [2.033, 2.689, 1.329]),
  m('plant-small', 'Plant Small', 'Kenney', '4f6vwL8vo9', [-0.047, 0.000, -0.047], [0.047, 0.140, 0.047]),
  m('potted-plant', 'Potted Plant', 'Kenney', '23Dx9CC95C', [-0.106, 0.000, -0.121], [0.106, 0.654, 0.121]),
  m('radio', 'Radio', 'Kenney', 'ShNRjTDU3i', [-0.315, 0.000, 0.000], [0.000, 0.228, 0.097]),
  m('round-table', 'Round Table', 'Kenney', 'AXbvcMDC8j', [-0.693, -0.270, 0.000], [0.000, 0.097, 0.800]),
  m('rug', 'Rug Rectangle', 'Kenney', 'k5oJLb49gw', [-1.570, 0.000, 0.000], [0.000, 0.010, 0.920]),
  m('side-table', 'Side Table', 'Kenney', 'R7Iq0qPgdr', [-0.524, 0.000, -0.010], [0.010, 0.384, 0.210]),
  m('sofa', 'Lounge Sofa', 'Kenney', 'jMu2iCmGxU', [-0.980, 0.000, 0.000], [0.000, 0.460, 0.410]),
  m('stool', 'Stool Bar Square', 'Kenney', '2EwBIClO8u', [-0.209, 0.000, 0.041], [-0.056, 0.405, 0.189]),
  m('street-light', 'Street Light', 'Quaternius', 'nFwrlcLvM5', [-0.209, -0.008, -0.203], [0.209, 5.638, 1.883]),
  m('table', 'Table', 'Kenney', '41R2HTYj1O', [-0.841, 0.000, 0.000], [0.000, 0.327, 0.447]),
  m('trashcan', 'Trashcan', 'Kenney', 'eoC8NFaafh', [-0.104, -0.000, -0.122], [0.104, 0.428, 0.112]),
  m('tv-cabinet', 'Cabinet Television', 'Kenney', 'AL6wwiUgP3', [-0.800, 0.000, 0.000], [0.000, 0.310, 0.250]),
  m('tv', 'Television', 'Kenney', '9trLeWoBek', [-0.342, 0.000, -0.064], [0.342, 0.455, 0.064]),
  m('window', 'Wall Window', 'Kenney', 'qivZBDjfUM', [-1.000, 0.000, -0.020], [0.000, 1.290, 0.070]),
];

export type PropSlug = (typeof PROP_MODELS)[number]['slug'];

const BY_SLUG = new Map(PROP_MODELS.map((p) => [p.slug, p]));

export const propOf = (slug: string): PropModel | undefined => BY_SLUG.get(slug);

/** Kích thước (m) của model ở tỉ lệ `s` (nhân thêm vào `unit`). */
export function propSize(p: PropModel, s = 1): [number, number, number] {
  const k = p.unit * s;
  return [(p.max[0] - p.min[0]) * k, (p.max[1] - p.min[1]) * k, (p.max[2] - p.min[2]) * k];
}

/**
 * Tỉ lệ (nhân thêm vào `unit`) để model cao `h` mét, rộng `w` mét hoặc sâu `d` mét (ưu tiên h, rồi w, rồi d); không
 * truyền gì thì 1. Số không hợp lệ (<= 0, NaN) bị bỏ qua.
 */
export function propScale(p: PropModel, fit: { h?: number; w?: number; d?: number; s?: number } = {}): number {
  const ok = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;
  const [w, h, d] = propSize(p);
  if (ok(fit.h) && h > 0) return fit.h / h;
  if (ok(fit.w) && w > 0) return fit.w / w;
  if (ok(fit.d) && d > 0) return fit.d / d;
  return ok(fit.s) ? fit.s : 1;
}

/** Vị trí đặt gốc model để tâm đáy hộp bao nằm ở gốc toạ độ (đơn vị gốc của file, chưa nhân tỉ lệ). */
export const propOrigin = (p: PropModel): [number, number, number] => [-(p.min[0] + p.max[0]) / 2, -p.min[1], -(p.min[2] + p.max[2]) / 2];
