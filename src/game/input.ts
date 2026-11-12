import type { InputState } from './types';

/**
 * Đầu vào điều khiển nhân vật: bàn phím + joystick ảo + kéo xoay camera.
 * Module này KHÔNG đụng window/document khi import; chỉ đụng khi gọi `attachKeyboard`.
 * Quy ước trục (xem types.ts): x dương = sang phải, y dương = tiến lên.
 */

/** Joystick bị đẩy quá ngưỡng này thì được ưu tiên hơn bàn phím. */
const STICK_ACTIVE = 0.05;
/** Joystick đẩy quá ngưỡng này thì tự chạy. */
const STICK_RUN = 0.85;
/** Vùng chết mặc định của joystick (tỉ lệ theo bán kính). */
const DEFAULT_DEADZONE = 0.12;

const KEYS_RIGHT = ['KeyD', 'ArrowRight'] as const;
const KEYS_LEFT = ['KeyA', 'ArrowLeft'] as const;
const KEYS_UP = ['KeyW', 'ArrowUp'] as const;
const KEYS_DOWN = ['KeyS', 'ArrowDown'] as const;

/** Phím điều khiển di chuyển (cần preventDefault để trang không cuộn). */
const MOVE_CODES: ReadonlySet<string> = new Set([...KEYS_RIGHT, ...KEYS_LEFT, ...KEYS_UP, ...KEYS_DOWN]);
/** Phím hành động: E / Space / Enter. */
const INTERACT_CODES: ReadonlySet<string> = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter']);
const SHIFT_CODES = ['ShiftLeft', 'ShiftRight'] as const;

function hasAny(keys: ReadonlySet<string>, codes: readonly string[]): boolean {
  for (const c of codes) {
    if (keys.has(c)) return true;
  }
  return false;
}

/** Ghi vector bàn phím vào `out` (không cấp phát). */
function writeKeysVector(keys: ReadonlySet<string>, out: { x: number; y: number }): void {
  let x = (hasAny(keys, KEYS_RIGHT) ? 1 : 0) - (hasAny(keys, KEYS_LEFT) ? 1 : 0);
  let y = (hasAny(keys, KEYS_UP) ? 1 : 0) - (hasAny(keys, KEYS_DOWN) ? 1 : 0);
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  out.x = x;
  out.y = y;
}

/**
 * Đổi tập phím đang giữ (theo `event.code`) thành vector di chuyển.
 * WASD và phím mũi tên như nhau; x phải dương, y tiến dương; chéo chuẩn hoá về độ lớn 1;
 * hai phím đối nhau triệt tiêu.
 */
export function keysToVector(keys: ReadonlySet<string>): { x: number; y: number } {
  const out = { x: 0, y: 0 };
  writeKeysVector(keys, out);
  return out;
}

/**
 * Đổi độ lệch pixel của joystick (dx, dy tính từ tâm; dy dương = xuống màn hình)
 * thành vector chuẩn hoá: x phải dương, y TIẾN dương (đã đảo dấu dy), mag 0..1.
 * Trong vùng chết trả 0; ngoài vùng chết co giãn lại để bắt đầu từ 0; kẹp mag tối đa 1.
 * radius <= 0 hoặc đầu vào không hữu hạn thì trả 0 (không bao giờ sinh NaN).
 */
export function normalizeStick(
  dx: number,
  dy: number,
  radius: number,
  deadzone: number = DEFAULT_DEADZONE,
): { x: number; y: number; mag: number } {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0) {
    return { x: 0, y: 0, mag: 0 };
  }
  const dz = Number.isFinite(deadzone) ? Math.min(Math.max(deadzone, 0), 0.99) : DEFAULT_DEADZONE;
  const len = Math.hypot(dx, dy);
  const raw = len / radius;
  if (!Number.isFinite(raw) || raw <= dz || len === 0) return { x: 0, y: 0, mag: 0 };
  const mag = Math.min(1, (raw - dz) / (1 - dz));
  // `+ 0` đổi -0 thành +0 để kết quả sạch khi so sánh.
  return { x: (dx / len) * mag + 0, y: ((0 - dy) / len) * mag + 0, mag };
}

/** Phần tử đang nhận gõ chữ (input, textarea, select, contenteditable): không bắt phím game. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: unknown; isContentEditable?: unknown } | null;
  if (!el) return false;
  if (el.isContentEditable === true) return true;
  if (typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Phần tử tự xử lý Space/Enter (bấm nút, mở liên kết): để trình duyệt kích hoạt nó, không tính là hành động. */
function isActivatableTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: unknown } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY';
}

/** Phím kích hoạt phần tử đang focus (khác E: E không kích hoạt gì nên luôn là hành động). */
function isActivationKey(code: string): boolean {
  return code === 'Space' || code === 'Enter' || code === 'NumpadEnter';
}

export class InputController {
  /** Object mutable dùng chung với vòng lặp khung hình. */
  readonly state: InputState;

  private readonly keys = new Set<string>();
  private readonly keyVec = { x: 0, y: 0 };
  private readonly detachers = new Set<() => void>();
  private stickX = 0;
  private stickY = 0;
  private runForced = false;

  constructor() {
    this.state = {
      move: { x: 0, y: 0, run: false },
      lookDelta: 0,
      interactCount: 0,
      touch: false,
    };
  }

  /**
   * Gắn bàn phím vào `target` (mặc định `window`). Trả hàm gỡ.
   * Shift = chạy; E / Space / Enter = hành động (chỉ khi keydown không lặp);
   * bỏ qua khi đang gõ trong input/textarea/contenteditable, khi có Ctrl/Alt/Meta
   * (không chặn phím tắt của trình duyệt) và khi Space/Enter đang kích hoạt một nút/liên kết có focus; mất focus hoặc ẩn tab thì nhả hết phím.
   */
  attachKeyboard(target?: Window): () => void {
    const t: Window = target ?? window;

    const syncShift = (e: KeyboardEvent, code: string | undefined): void => {
      // `shiftKey` là sự thật của trình duyệt: nhả Shift ở ngoài cửa sổ vẫn được cập nhật.
      if (e.shiftKey === true) {
        const isShiftKey = code === 'ShiftLeft' || code === 'ShiftRight';
        if (!isShiftKey && !hasAny(this.keys, SHIFT_CODES)) this.keys.add('ShiftLeft');
      } else if (e.shiftKey === false) {
        this.keys.delete('ShiftLeft');
        this.keys.delete('ShiftRight');
      }
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      // Giữ Cmd (macOS) làm trình duyệt không bắn keyup của phím khác: nhả hết để khỏi kẹt phím.
      if (e.metaKey) {
        releaseAll();
        return;
      }
      if (e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const code = e.code;
      if (typeof code !== 'string') return;
      const isMove = MOVE_CODES.has(code);
      const isInteract = INTERACT_CODES.has(code);
      const isShift = (SHIFT_CODES as readonly string[]).includes(code);
      if (!isMove && !isInteract && !isShift) return;
      if (isInteract && isActivationKey(code) && isActivatableTarget(e.target)) return;
      if (isMove || isInteract) e.preventDefault();
      syncShift(e, code);
      if (isInteract) {
        if (!e.repeat) this.pressInteract();
        this.recompute();
        return;
      }
      this.keys.add(code);
      this.recompute();
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      const code = e.code;
      // Luôn xử lý nhả phím (kể cả khi đang gõ chữ) để không kẹt phím.
      syncShift(e, typeof code === 'string' ? code : undefined);
      if (typeof code === 'string') {
        this.keys.delete(code);
        const activated = isActivationKey(code) && isActivatableTarget(e.target);
        if (!isTypingTarget(e.target) && !activated && (MOVE_CODES.has(code) || INTERACT_CODES.has(code))) {
          e.preventDefault();
        }
      }
      this.recompute();
    };

    const releaseAll = (): void => {
      this.keys.clear();
      this.recompute();
    };

    t.addEventListener('keydown', onKeyDown);
    t.addEventListener('keyup', onKeyUp);
    t.addEventListener('blur', releaseAll);
    t.addEventListener('visibilitychange', releaseAll);
    // Menu chuột phải mở ra thì keyup thường không tới trang: nhả hết phím để nhân vật không đi mãi.
    t.addEventListener('contextmenu', releaseAll);

    const detach = (): void => {
      if (!this.detachers.delete(detach)) return;
      t.removeEventListener('keydown', onKeyDown);
      t.removeEventListener('keyup', onKeyUp);
      t.removeEventListener('blur', releaseAll);
      t.removeEventListener('visibilitychange', releaseAll);
      t.removeEventListener('contextmenu', releaseAll);
      releaseAll();
    };
    this.detachers.add(detach);
    return detach;
  }

  /** Joystick ảo, x/y trong -1..1 (y tiến dương). Giá trị không hữu hạn coi là 0; độ lớn > 1 bị kẹp về 1. */
  setStick(x: number, y: number): void {
    let sx = Number.isFinite(x) ? x : 0;
    let sy = Number.isFinite(y) ? y : 0;
    const len = Math.hypot(sx, sy);
    if (len > 1) {
      sx /= len;
      sy /= len;
    }
    this.stickX = sx;
    this.stickY = sy;
    this.recompute();
  }

  /** Cộng dồn góc xoay camera (radian). Bỏ qua giá trị không hữu hạn. */
  addLook(deltaRadians: number): void {
    if (!Number.isFinite(deltaRadians)) return;
    this.state.lookDelta += deltaRadians;
  }

  pressInteract(): void {
    this.state.interactCount++;
  }

  setRun(run: boolean): void {
    this.runForced = run === true;
    this.recompute();
  }

  setTouch(touch: boolean): void {
    this.state.touch = touch === true;
  }

  /** Trả góc xoay tích luỹ rồi đặt về 0. */
  consumeLook(): number {
    const d = this.state.lookDelta;
    this.state.lookDelta = 0;
    return d;
  }

  /** Gỡ mọi listener bàn phím, nhả hết phím/joystick/chạy, xoá góc xoay chưa dùng. */
  dispose(): void {
    for (const detach of [...this.detachers]) detach();
    this.keys.clear();
    this.stickX = 0;
    this.stickY = 0;
    this.runForced = false;
    this.state.lookDelta = 0;
    this.recompute();
  }

  /** Tính lại state.move từ joystick, bàn phím và cờ chạy. Không cấp phát. */
  private recompute(): void {
    const move = this.state.move;
    const stickMag = Math.hypot(this.stickX, this.stickY);
    if (stickMag > STICK_ACTIVE) {
      move.x = this.stickX;
      move.y = this.stickY;
    } else {
      writeKeysVector(this.keys, this.keyVec);
      move.x = this.keyVec.x;
      move.y = this.keyVec.y;
    }
    move.run = hasAny(this.keys, SHIFT_CODES) || this.runForced || stickMag > STICK_RUN;
  }
}
