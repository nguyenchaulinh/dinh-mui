/** Schema nội dung + state của game. Nội dung (JSON) tuân theo các type này. */

export type StatKey = 'harmony' | 'stamina' | 'wallet';
export const STAT_KEYS: readonly StatKey[] = ['harmony', 'stamina', 'wallet'] as const;
export const STAT_MIN = 0;
export const STAT_MAX = 100;

/** Phong cách đáp: Khéo / Thật thà / Lầy / Phản đòn. */
export type Style = 'kheo' | 'that-tha' | 'lay' | 'phan-don';

/** Độ lệch chỉ số, số nguyên (có thể âm). */
export type Effects = Partial<Record<StatKey, number>>;

/** Văn bản thay theo thành phố: key là region id. Thiếu key thì dùng bản mặc định. */
export type ByRegion = Partial<Record<string, string>>;

/**
 * Điều kiện hiển thị. Mọi trường có mặt đều phải thỏa (AND).
 * - flags: phải có đủ các cờ; notFlags: không được có cờ nào.
 * - personas / regions: khớp ít nhất một.
 * - history: phải từng chọn đủ các lựa chọn dạng "sceneId/choiceId".
 */
export interface Condition {
  flags?: string[];
  notFlags?: string[];
  personas?: string[];
  regions?: string[];
  history?: string[];
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  /** Chỉ số khởi đầu, mặc định 50. */
  startStats?: Effects;
}

/** Thành phố người chơi xuất phát; từ đó đổ về các tỉnh quê ăn Tết. */
export interface Region {
  id: string;
  /** Tên thành phố, ví dụ "Hà Nội". */
  city: string;
  /** Mô tả ngắn hành trình về quê. */
  tagline: string;
}

export type Accessory =
  | 'none'
  | 'glasses'
  | 'hat'
  | 'scarf'
  | 'bowtie'
  | 'phone'
  | 'spoon'
  | 'cup'
  | 'headphones';

/** Tạo hình nhân vật 3D low-poly. Nhận diện qua màu và phụ kiện, không dựng mặt người thật. */
export interface Look {
  kind: 'goat' | 'human' | 'dog';
  skin?: string;
  hair?: string;
  hairStyle?: 'short' | 'bun' | 'long' | 'bald';
  outfit?: string;
  /** Tầm vóc: trẻ con thấp hơn, người già hơi khom. */
  build?: 'kid' | 'adult' | 'elder';
  accessory?: Accessory;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  look?: Look;
  /** Kill-switch: false thì engine thay bằng nhân vật `fallbackId`. */
  enabled: boolean;
  /** Nhân vật nhại người thật (để rà soát, tắt nhanh khi cần). */
  parody?: boolean;
  /** Bắt buộc khi `enabled === false`: nhân vật trung tính thay thế. */
  fallbackId?: string;
}

export interface Choice {
  id: string;
  style: Style;
  text: string;
  textByRegion?: ByRegion;
  effects: Effects;
  /** Phản ứng sau khi chọn. */
  reply: string;
  replyByRegion?: ByRegion;
  /** Thẻ "mẹo thật" hiện sau lựa chọn này. */
  tipId?: string;
  /** Ghi đè scene kế tiếp; mặc định theo `Scene.next`. */
  next?: string | null;
  /** Cờ bật lên khi chọn (dùng để rẽ nhánh về sau). */
  setFlags?: string[];
  /** Kết thúc game ngay sau lựa chọn này. */
  end?: boolean;
  /** Lựa chọn chỉ hiện khi thỏa điều kiện. */
  if?: Condition;
}

/** Một dòng thoại trong cắt cảnh. */
export interface Line {
  /** Người nói; thiếu thì dùng `Scene.characterId`. */
  characterId?: string;
  text: string;
  byRegion?: ByRegion;
  if?: Condition;
}

/** Diễn viên trong cảnh 3D: đứng ở vị trí `spot` của set, làm động tác `anim`. */
export interface Actor {
  characterId: string;
  spot: string;
  anim?: 'idle' | 'talk' | 'wave' | 'dance' | 'sit' | 'walk' | 'cry';
}

/** Chỉ đạo cảnh 3D, khai báo trong dữ liệu để khỏi viết code riêng cho từng đoạn. */
export interface Stage3D {
  /** Id bộ cảnh (xem `src/scene3d/registry.ts`). */
  set: string;
  /** Góc máy dựng sẵn của set; thiếu thì camera tự hướng vào người nói. */
  camera?: string;
  actors?: Actor[];
}

export interface Scene {
  id: string;
  stageId: string;
  /** 'dialog' (mặc định): có lựa chọn. 'cutscene': chỉ có thoại + nút Tiếp. */
  kind?: 'dialog' | 'cutscene';
  /** Cách trình bày lựa chọn: hội thoại thường, feed điện thoại, chia lì xì. */
  ui?: 'dialog' | 'feed' | 'lixi';
  characterId: string;
  line: string;
  lineByRegion?: ByRegion;
  /** Thoại cắt cảnh (sau `line`), lọc theo điều kiện. */
  lines?: Line[];
  choices: Choice[];
  /** null/undefined = hết chặng, sang chặng kế. */
  next?: string | null;
  /** Nếu có, chỉ hiện với các persona này. */
  personas?: string[];
  /** Nếu có, chỉ hiện khi người chơi chọn ít nhất một vùng trong danh sách. */
  regions?: string[];
  /** Điều kiện bổ sung (cờ, lịch sử...). */
  if?: Condition;
  stage3d?: Stage3D;
}

export interface Stage {
  id: string;
  title: string;
  intro: string;
  firstSceneId: string;
}

export interface Tip {
  id: string;
  text: string;
  /** Nguồn ngắn ghi cuối thẻ. */
  source: string;
}

export interface StatRange {
  min?: number;
  max?: number;
}

export interface Ending {
  id: string;
  title: string;
  description: string;
  /** Điều kiện chỉ số. */
  when?: Partial<Record<StatKey, StatRange>>;
  /** Phải có đủ các cờ này. */
  flags?: string[];
}

export interface Content {
  version: number;
  regions: Region[];
  personas: Persona[];
  /** Thứ tự chặng = thứ tự mảng. */
  stages: Stage[];
  characters: Character[];
  scenes: Scene[];
  tips: Tip[];
  /** Duyệt từ trên xuống, cái đầu tiên khớp thắng. Cái cuối phải là mặc định. */
  endings: Ending[];
}

export type Stats = Record<StatKey, number>;

export interface GameState {
  personaId: string;
  /** Các vùng đã chọn (1 hoặc nhiều; chọn nhiều thì mỗi scene lấy một vùng theo `seed`). */
  regionIds: string[];
  /** Hạt giống chọn biến thể vùng khi chọn nhiều vùng (không dùng cho bảo mật). */
  seed: number;
  sceneId: string | null;
  stats: Stats;
  flags: string[];
  /** Id các thẻ mẹo đã mở, theo thứ tự. */
  tipsSeen: string[];
  /** Các lựa chọn đã chọn, dạng "sceneId/choiceId", theo thứ tự. */
  history: string[];
  endingId: string | null;
}
