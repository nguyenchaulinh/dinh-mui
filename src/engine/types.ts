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
 * - personas / regions: khớp ít nhất một (regions so với vùng của lượt chơi).
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

/**
 * Một cuộc hội thoại có lựa chọn. Không đứng một mình: scene chỉ chơi được khi một NPC trong bản đồ
 * (`MapNpc.action.sceneIds` hoặc `shoots.hitSceneIds`) gọi tới nó; validate bắt scene mồ côi.
 */
export interface Scene {
  id: string;
  characterId: string;
  line: string;
  lineByRegion?: ByRegion;
  /** Thoại phụ hiện kèm `line` (ví dụ Bé Dê chen vào), lọc theo điều kiện. */
  lines?: Line[];
  choices: Choice[];
  /** Nếu có, chỉ hiện với các persona này. */
  personas?: string[];
  /** Nếu có, chỉ hiện khi người chơi chọn ít nhất một vùng trong danh sách. */
  regions?: string[];
  /** Điều kiện bổ sung (cờ, lịch sử...). */
  if?: Condition;
}

/** Một chặng của hành trình = một bản đồ đi lại được. Thứ tự chặng = thứ tự mảng `Content.stages`. */
export interface Stage {
  id: string;
  title: string;
  /** Câu mở đầu hiện trên thẻ chặng trước khi vào bản đồ. */
  intro: string;
  /** Bản đồ đi lại của chặng này (`Content.maps`). */
  mapId: string;
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

/** Hành động khi tương tác với NPC trong chế độ đi lại. */
export type NpcAction =
  /** Nói chuyện: mở scene hội thoại đầu tiên hợp với persona/vùng trong `sceneIds`; xong thì `after` là câu nói lại. */
  | { kind: 'talk'; sceneIds: string[]; after: string }
  /** Vuốt ve / tặng quà: một câu và hiệu ứng chỉ số, chỉ có tác dụng một lần; sau đó `after`. */
  | { kind: 'pet'; line: string; effects: Effects; after: string };

/** NPC "bắn" bong bóng câu hỏi về phía người chơi: né được thì thoát, trúng thì bị kéo vào hội thoại. */
export interface Shooter {
  /** Chu kỳ bắn (giây). */
  everySec: number;
  /** Chỉ bắn khi người chơi cách trong khoảng này (m); gần hơn `minRange` thì không bắn. */
  range: number;
  minRange: number;
  /** Tốc độ bong bóng (m/s). */
  speed: number;
  /** Câu hỏi ngắn hiện thành dòng chữ khi bắn (chọn ngẫu nhiên). Dùng khi vai của người chơi không có danh sách riêng. */
  questions: string[];
  /** Câu hỏi theo vai (khoá = id persona) để bong bóng khớp với cảnh hội thoại khi bị trúng. */
  questionsByPersona?: Record<string, string[]>;
  /** Scene hội thoại khi bị trúng (scene đầu tiên hợp persona/vùng). */
  hitSceneIds: string[];
}

export type NpcBehavior = 'stand' | 'wander' | 'approach';

export interface MapNpc {
  /** Id nhân vật trong `characters` (cũng là khoá của NPC trên bản đồ). */
  characterId: string;
  /** Vị trí xuất phát = tên spot trong registry của set. */
  spot: string;
  behavior: NpcBehavior;
  speed?: number;
  leash?: number;
  aware?: number;
  stopDist?: number;
  /** Tầm tương tác (m); thiếu thì dùng mặc định. */
  reach?: number;
  /** Chữ trên nút tương tác, ví dụ "Nói chuyện". */
  prompt: string;
  action: NpcAction;
  shoots?: Shooter;
}

/** Một mục tiêu của nhiệm vụ; hoàn thành khi điều kiện `done` thoả (thường theo cờ tự sinh `talked:<npc>`...). */
export interface Objective {
  id: string;
  text: string;
  done: Condition;
}

export interface Quest {
  id: string;
  title: string;
  objectives: Objective[];
  /** Thưởng chỉ số khi hoàn thành (số nguyên). */
  reward?: Effects;
  /** Câu hiện khi hoàn thành. */
  rewardLine?: string;
}

/** Bản đồ chế độ đi lại: bộ cảnh 3D, người chơi, NPC và nhiệm vụ. */
export interface RoamMap {
  id: string;
  /** Id bộ cảnh 3D (registry.ts); phải có vùng đi lại (walk.ts). */
  setId: string;
  /** Nhân vật của người chơi. */
  playerId: string;
  npcs: MapNpc[];
  quests: Quest[];
  /** Nhiệm vụ cuối của bản đồ: hoàn thành thì chặng này xong (chặng cuối thì game kết thúc). */
  goalQuestId: string;
}

export interface Content {
  version: number;
  regions: Region[];
  personas: Persona[];
  /** Thứ tự chặng = thứ tự mảng; mỗi chặng trỏ tới một bản đồ. */
  stages: Stage[];
  characters: Character[];
  scenes: Scene[];
  tips: Tip[];
  /** Duyệt từ trên xuống, cái đầu tiên khớp thắng. Cái cuối phải là mặc định. */
  endings: Ending[];
  maps: RoamMap[];
}

export type Stats = Record<StatKey, number>;

export interface GameState {
  personaId: string;
  /** Vùng (thành phố) của lượt chơi này: quyết định giọng thoại và phong cách cảnh. */
  regionId: string;
  stats: Stats;
  flags: string[];
  /** Id các thẻ mẹo đã mở, theo thứ tự. */
  tipsSeen: string[];
  /** Các lựa chọn đã chọn, dạng "sceneId/choiceId", theo thứ tự. */
  history: string[];
  /** Có giá trị khi game đã kết thúc. */
  endingId: string | null;
}
