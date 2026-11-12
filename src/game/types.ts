/**
 * Hợp đồng chung cho chế độ điều khiển nhân vật (bước 1 trong docs/05-gameplay.md).
 * Mọi module trong src/game tuân theo các type và quy ước ở đây.
 *
 * QUY ƯỚC TOẠ ĐỘ (giống src/scene3d/registry.ts):
 * - Mặt đất là mặt phẳng XZ, trục y hướng lên, đơn vị ~ mét.
 * - Hướng `heading` / `rotY` (radian): vector tiến = (sin h, cos h) trên (x, z).
 *   rotY = 0 nghĩa là nhìn về +z. Figure dựng sẵn mặt hướng +z nên gán thẳng rotation.y = heading.
 * - Camera bám (FollowCam): `yaw` là góc của VỊ TRÍ camera quanh nhân vật:
 *   camera đặt tại target + (sin yaw, ·, cos yaw) * khoảng cách ngang.
 *   => hướng "tiến" theo màn hình = (-sin yaw, -cos yaw); hướng "phải" theo màn hình = (cos yaw, -sin yaw).
 *   Ví dụ yaw = 0: camera ở phía +z nhìn về -z; tiến = (0, -1), phải = (1, 0).
 *   Camera nằm sau lưng nhân vật có heading h khi yaw = h + π.
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** Vật cản trên mặt đất. */
export type Collider =
  | {
      kind: 'circle';
      x: number;
      z: number;
      r: number;
      id?: string;
      /** Có che camera không (tường nhà, cây to). Mặc định false. */
      blocksCamera?: boolean;
    }
  | {
      kind: 'box';
      /** Tâm hộp. */
      x: number;
      z: number;
      /** Nửa bề rộng theo trục x cục bộ, nửa bề sâu theo trục z cục bộ. */
      hw: number;
      hd: number;
      /** Góc xoay quanh trục y (radian), mặc định 0. */
      rotY?: number;
      id?: string;
      blocksCamera?: boolean;
    };

/** Hình chữ nhật giới hạn vùng đi được (người chơi không ra ngoài). */
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Vùng đi lại của một bộ cảnh theo một phong cách miền. */
export interface WalkArea {
  bounds: Bounds;
  colliders: Collider[];
  /** Điểm xuất phát của người chơi. */
  spawn: { x: number; z: number; rotY: number };
}

/** Đầu vào di chuyển đã chuẩn hoá: x = sang phải, y = tiến lên (theo màn hình), độ lớn 0..1. */
export interface MoveInput {
  x: number;
  y: number;
  run: boolean;
}

export interface MoverState {
  pos: Vec2;
  vel: Vec2;
  /** Hướng mặt hiện tại (radian), xem quy ước ở đầu file. */
  heading: number;
  /** Tốc độ hiện tại (m/s) = |vel|. */
  speed: number;
}

export interface MoveParams {
  walkSpeed: number;
  runSpeed: number;
  /** Gia tốc khi có đầu vào (m/s²). */
  accel: number;
  /** Giảm tốc khi thả tay (m/s²). */
  decel: number;
  /** Tốc độ xoay mặt theo hướng di chuyển (rad/s, xoay theo đường ngắn nhất). */
  turnRate: number;
}

export interface FollowCam {
  yaw: number;
  /** Góc ngẩng nhìn xuống (radian, > 0 là camera cao hơn nhân vật). */
  pitch: number;
  /** Khoảng cách từ camera tới điểm nhìn. */
  dist: number;
}

export interface CameraPose {
  pos: [number, number, number];
  lookAt: [number, number, number];
}

/**
 * Trạng thái đầu vào dùng chung giữa DOM (bàn phím, joystick) và vòng lặp khung hình.
 * Là object thường, thay đổi tại chỗ (không qua React state) để không re-render mỗi khung.
 */
export interface InputState {
  /** Từ joystick hoặc bàn phím, đã chuẩn hoá, độ lớn 0..1. */
  move: MoveInput;
  /** Tổng góc xoay camera (radian) tích luỹ từ thao tác kéo, vòng lặp đọc xong thì đặt về 0. */
  lookDelta: number;
  /** Tăng 1 mỗi lần bấm nút hành động (E / Space / nút trên màn hình). Dùng ở bước 2. */
  interactCount: number;
  /** true khi đang dùng cảm ứng (để hiện joystick). */
  touch: boolean;
}

/** Thông tin debug công bố ra `window.__dinhmui` khi URL có `?fps` (hoặc khi chạy dev). */
export interface DebugInfo {
  fps?: number;
  /** Số draw call và tam giác của khung gần nhất (renderer.info.render). */
  calls?: number;
  triangles?: number;
  /** Đang ở cảnh nào. */
  mode?: 'scene' | 'roam';
  setId?: string;
  /** Chỉ có ở chế độ đi lại. */
  player?: { x: number; z: number; speed: number; insideCollider: boolean };
  /** Chế độ đi lại: NPC đang trong tầm tương tác (key nhân vật) hoặc null. */
  nearby?: string | null;
  /** Đang nói chuyện với NPC nào (key) hoặc null. */
  talking?: string | null;
  /** Vị trí hiện tại của từng NPC (key -> x, z), để script đo kiểm tra NPC có đi lại. */
  npcs?: Record<string, { x: number; z: number }>;
}

declare global {
  interface Window {
    __dinhmui?: DebugInfo;
  }
}
