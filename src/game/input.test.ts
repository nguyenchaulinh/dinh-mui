import { describe, expect, it } from 'vitest';
import { InputController, keysToVector, normalizeStick } from './input';

const set = (...codes: string[]): ReadonlySet<string> => new Set(codes);

interface KeyInit {
  code: string;
  repeat?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  /** Giả phần tử đích (vd ô nhập chữ). */
  target?: { tagName?: string; isContentEditable?: boolean };
}

/** Tạo sự kiện bàn phím giả từ Event thật (không cần DOM), có preventDefault thật qua `cancelable`. */
function makeKey(type: 'keydown' | 'keyup', init: KeyInit): Event {
  const ev = new Event(type, { cancelable: true });
  Object.defineProperty(ev, 'code', { value: init.code });
  Object.defineProperty(ev, 'repeat', { value: init.repeat ?? false });
  Object.defineProperty(ev, 'shiftKey', { value: init.shiftKey ?? false });
  Object.defineProperty(ev, 'ctrlKey', { value: init.ctrlKey ?? false });
  if (init.target) Object.defineProperty(ev, 'target', { value: init.target });
  return ev;
}

/** Gắn controller vào EventTarget giả; trả về target (để dispatch) và hàm gỡ. */
function setup(): { c: InputController; target: EventTarget; detach: () => void } {
  const c = new InputController();
  const target = new EventTarget();
  const detach = c.attachKeyboard(target as unknown as Window);
  return { c, target, detach };
}

const down = (t: EventTarget, init: KeyInit): Event => {
  const ev = makeKey('keydown', init);
  t.dispatchEvent(ev);
  return ev;
};
const up = (t: EventTarget, init: KeyInit): Event => {
  const ev = makeKey('keyup', init);
  t.dispatchEvent(ev);
  return ev;
};

describe('keysToVector', () => {
  it('không phím nào thì đứng yên', () => {
    expect(keysToVector(set())).toEqual({ x: 0, y: 0 });
  });

  it('từng phím WASD: x phải dương, y tiến dương', () => {
    expect(keysToVector(set('KeyW'))).toEqual({ x: 0, y: 1 });
    expect(keysToVector(set('KeyS'))).toEqual({ x: 0, y: -1 });
    expect(keysToVector(set('KeyA'))).toEqual({ x: -1, y: 0 });
    expect(keysToVector(set('KeyD'))).toEqual({ x: 1, y: 0 });
  });

  it('phím mũi tên giống WASD', () => {
    expect(keysToVector(set('ArrowUp'))).toEqual({ x: 0, y: 1 });
    expect(keysToVector(set('ArrowDown'))).toEqual({ x: 0, y: -1 });
    expect(keysToVector(set('ArrowLeft'))).toEqual({ x: -1, y: 0 });
    expect(keysToVector(set('ArrowRight'))).toEqual({ x: 1, y: 0 });
  });

  it('đi chéo được chuẩn hoá về độ lớn 1', () => {
    const v = keysToVector(set('KeyW', 'KeyD'));
    expect(v.x).toBeCloseTo(Math.SQRT1_2, 10);
    expect(v.y).toBeCloseTo(Math.SQRT1_2, 10);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
    const w = keysToVector(set('ArrowDown', 'KeyA'));
    expect(w.x).toBeCloseTo(-Math.SQRT1_2, 10);
    expect(w.y).toBeCloseTo(-Math.SQRT1_2, 10);
  });

  it('hai phím đối nhau triệt tiêu', () => {
    expect(keysToVector(set('KeyA', 'KeyD'))).toEqual({ x: 0, y: 0 });
    expect(keysToVector(set('KeyW', 'KeyS'))).toEqual({ x: 0, y: 0 });
    expect(keysToVector(set('KeyA', 'ArrowRight'))).toEqual({ x: 0, y: 0 });
    // Một trục triệt tiêu, trục còn lại giữ nguyên độ lớn 1 (không bị chia chéo).
    expect(keysToVector(set('KeyA', 'KeyD', 'KeyW'))).toEqual({ x: 0, y: 1 });
  });

  it('WASD và mũi tên cùng hướng không cộng dồn', () => {
    expect(keysToVector(set('KeyW', 'ArrowUp'))).toEqual({ x: 0, y: 1 });
  });

  it('phím lạ không ảnh hưởng', () => {
    expect(keysToVector(set('KeyQ', 'ShiftLeft', 'Space'))).toEqual({ x: 0, y: 0 });
  });
});

describe('normalizeStick', () => {
  it('trong vùng chết thì bằng 0', () => {
    expect(normalizeStick(5, 5, 100)).toEqual({ x: 0, y: 0, mag: 0 });
    expect(normalizeStick(0, 0, 100)).toEqual({ x: 0, y: 0, mag: 0 });
    // Đúng ngưỡng 0.12 vẫn là 0.
    expect(normalizeStick(12, 0, 100).mag).toBe(0);
  });

  it('ngoài vùng chết co giãn lại để bắt đầu từ 0', () => {
    // 0.56 -> (0.56 - 0.12) / 0.88 = 0.5
    const s = normalizeStick(56, 0, 100);
    expect(s.mag).toBeCloseTo(0.5, 10);
    expect(s.x).toBeCloseTo(0.5, 10);
    expect(s.y).toBe(0);
    // Vừa qua vùng chết thì rất nhỏ nhưng dương.
    const t = normalizeStick(12.5, 0, 100);
    expect(t.mag).toBeGreaterThan(0);
    expect(t.mag).toBeLessThan(0.01);
  });

  it('kẹp độ lớn tối đa 1', () => {
    const s = normalizeStick(500, 0, 100);
    expect(s).toEqual({ x: 1, y: 0, mag: 1 });
    const d = normalizeStick(200, -200, 100);
    expect(d.mag).toBe(1);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 10);
  });

  it('đảo dấu y: kéo lên màn hình (dy âm) là tiến (y dương)', () => {
    expect(normalizeStick(0, -100, 100).y).toBe(1);
    expect(normalizeStick(0, 100, 100).y).toBe(-1);
    const s = normalizeStick(100, -100, 100);
    expect(s.x).toBeGreaterThan(0);
    expect(s.y).toBeGreaterThan(0);
    expect(s.x).toBeCloseTo(s.y, 10);
  });

  it('kết quả không có -0', () => {
    const s = normalizeStick(100, 0, 100);
    expect(Object.is(s.y, 0)).toBe(true);
    const t = normalizeStick(0, 100, 100);
    expect(Object.is(t.x, 0)).toBe(true);
  });

  it('radius <= 0 hoặc NaN thì trả 0', () => {
    const zero = { x: 0, y: 0, mag: 0 };
    expect(normalizeStick(50, 50, 0)).toEqual(zero);
    expect(normalizeStick(50, 50, -10)).toEqual(zero);
    expect(normalizeStick(50, 50, Number.NaN)).toEqual(zero);
    expect(normalizeStick(Number.NaN, 50, 100)).toEqual(zero);
    expect(normalizeStick(50, Number.POSITIVE_INFINITY, 100)).toEqual(zero);
    expect(normalizeStick(50, 50, Number.POSITIVE_INFINITY)).toEqual(zero);
  });

  it('vùng chết tuỳ chỉnh; giá trị hỏng rơi về mặc định', () => {
    expect(normalizeStick(25, 0, 100, 0.3).mag).toBe(0);
    expect(normalizeStick(65, 0, 100, 0.3).mag).toBeCloseTo(0.5, 10);
    expect(normalizeStick(30, 0, 100, 0).mag).toBeCloseTo(0.3, 10);
    expect(normalizeStick(56, 0, 100, Number.NaN).mag).toBeCloseTo(0.5, 10);
    // deadzone >= 1 được kẹp, không chia cho 0.
    const s = normalizeStick(100, 0, 100, 5);
    expect(Number.isFinite(s.mag)).toBe(true);
  });
});

describe('InputController', () => {
  it('trạng thái ban đầu', () => {
    const c = new InputController();
    expect(c.state).toEqual({ move: { x: 0, y: 0, run: false }, lookDelta: 0, interactCount: 0, touch: false });
  });

  it('bàn phím cập nhật state.move tại chỗ (cùng một object)', () => {
    const { c, target } = setup();
    const move = c.state.move;
    down(target, { code: 'KeyW' });
    expect(c.state.move).toBe(move);
    expect(move).toEqual({ x: 0, y: 1, run: false });
    down(target, { code: 'KeyD' });
    expect(move.x).toBeCloseTo(Math.SQRT1_2, 10);
    expect(move.y).toBeCloseTo(Math.SQRT1_2, 10);
    up(target, { code: 'KeyW' });
    up(target, { code: 'KeyD' });
    expect(move).toEqual({ x: 0, y: 0, run: false });
  });

  it('joystick được ưu tiên hơn bàn phím, thả ra thì bàn phím quay lại', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyW' });
    c.setStick(1, 0);
    expect(c.state.move).toMatchObject({ x: 1, y: 0 });
    c.setStick(0, 0);
    expect(c.state.move).toMatchObject({ x: 0, y: 1 });
  });

  it('joystick yếu (độ lớn <= 0.05) bị bỏ qua, dùng bàn phím', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyA' });
    c.setStick(0.04, 0);
    expect(c.state.move).toMatchObject({ x: -1, y: 0 });
    c.setStick(0.06, 0);
    expect(c.state.move.x).toBeCloseTo(0.06, 10);
  });

  it('độ lớn joystick > 0.85 tự chạy, <= 0.85 thì đi bộ', () => {
    const c = new InputController();
    c.setStick(0.5, 0);
    expect(c.state.move.run).toBe(false);
    c.setStick(0.85, 0);
    expect(c.state.move.run).toBe(false);
    c.setStick(0, 0.9);
    expect(c.state.move.run).toBe(true);
    c.setStick(0, 0);
    expect(c.state.move.run).toBe(false);
  });

  it('setStick kẹp độ lớn về 1 và coi NaN/Infinity là 0', () => {
    const c = new InputController();
    c.setStick(1, 1);
    expect(Math.hypot(c.state.move.x, c.state.move.y)).toBeCloseTo(1, 10);
    c.setStick(Number.NaN, Number.POSITIVE_INFINITY);
    expect(c.state.move).toEqual({ x: 0, y: 0, run: false });
  });

  it('setRun bật/tắt chạy độc lập với joystick', () => {
    const c = new InputController();
    c.setRun(true);
    expect(c.state.move.run).toBe(true);
    c.setRun(false);
    expect(c.state.move.run).toBe(false);
  });

  it('giữ Shift thì chạy, nhả thì dừng chạy', () => {
    const { c, target } = setup();
    down(target, { code: 'ShiftLeft', shiftKey: true });
    expect(c.state.move.run).toBe(true);
    down(target, { code: 'KeyW', shiftKey: true });
    expect(c.state.move).toEqual({ x: 0, y: 1, run: true });
    up(target, { code: 'ShiftLeft', shiftKey: false });
    expect(c.state.move).toEqual({ x: 0, y: 1, run: false });
  });

  it('giữ cả hai Shift, nhả một bên vẫn chạy', () => {
    const { c, target } = setup();
    down(target, { code: 'ShiftLeft', shiftKey: true });
    down(target, { code: 'ShiftRight', shiftKey: true });
    up(target, { code: 'ShiftLeft', shiftKey: true });
    expect(c.state.move.run).toBe(true);
    up(target, { code: 'ShiftRight', shiftKey: false });
    expect(c.state.move.run).toBe(false);
  });

  it('pressInteract tăng interactCount', () => {
    const c = new InputController();
    c.pressInteract();
    c.pressInteract();
    expect(c.state.interactCount).toBe(2);
  });

  it('E / Space / Enter tăng interactCount, bỏ qua phím lặp', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyE' });
    expect(c.state.interactCount).toBe(1);
    down(target, { code: 'KeyE', repeat: true });
    down(target, { code: 'KeyE', repeat: true });
    expect(c.state.interactCount).toBe(1);
    up(target, { code: 'KeyE' });
    down(target, { code: 'Space' });
    down(target, { code: 'Enter' });
    expect(c.state.interactCount).toBe(3);
  });

  it('preventDefault cho phím điều khiển/Space, không đụng phím khác', () => {
    const { target } = setup();
    expect(down(target, { code: 'ArrowUp' }).defaultPrevented).toBe(true);
    expect(down(target, { code: 'Space' }).defaultPrevented).toBe(true);
    expect(down(target, { code: 'KeyW' }).defaultPrevented).toBe(true);
    expect(down(target, { code: 'Space', repeat: true }).defaultPrevented).toBe(true);
    expect(down(target, { code: 'KeyQ' }).defaultPrevented).toBe(false);
    expect(down(target, { code: 'Tab' }).defaultPrevented).toBe(false);
  });

  it('bỏ qua khi đang gõ trong input/textarea/contenteditable', () => {
    const { c, target } = setup();
    for (const t of [{ tagName: 'INPUT' }, { tagName: 'textarea' }, { tagName: 'DIV', isContentEditable: true }]) {
      const ev = down(target, { code: 'KeyW', target: t });
      expect(ev.defaultPrevented).toBe(false);
      down(target, { code: 'KeyE', target: t });
    }
    expect(c.state.move).toEqual({ x: 0, y: 0, run: false });
    expect(c.state.interactCount).toBe(0);
  });

  it('Space/Enter trên nút đang focus để trình duyệt kích hoạt nút, riêng E vẫn là hành động', () => {
    const { c, target } = setup();
    const btn = { tagName: 'BUTTON' };
    expect(down(target, { code: 'Space', target: btn }).defaultPrevented).toBe(false);
    expect(down(target, { code: 'Enter', target: btn }).defaultPrevented).toBe(false);
    expect(up(target, { code: 'Space', target: btn }).defaultPrevented).toBe(false);
    expect(c.state.interactCount).toBe(0);
    expect(down(target, { code: 'KeyE', target: btn }).defaultPrevented).toBe(true);
    expect(c.state.interactCount).toBe(1);
    // Phím di chuyển vẫn hoạt động khi nút có focus.
    down(target, { code: 'KeyW', target: btn });
    expect(c.state.move.y).toBe(1);
  });

  it('nhả phím vẫn được xử lý khi focus đã chuyển sang ô nhập chữ (không kẹt phím)', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyW' });
    up(target, { code: 'KeyW', target: { tagName: 'INPUT' } });
    expect(c.state.move.y).toBe(0);
  });

  it('không chặn phím tắt của trình duyệt (Ctrl+W)', () => {
    const { c, target } = setup();
    const ev = down(target, { code: 'KeyW', ctrlKey: true });
    expect(ev.defaultPrevented).toBe(false);
    expect(c.state.move.y).toBe(0);
  });

  it('blur và visibilitychange nhả hết phím đang giữ', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyW' });
    down(target, { code: 'ShiftLeft', shiftKey: true });
    expect(c.state.move).toEqual({ x: 0, y: 1, run: true });
    target.dispatchEvent(new Event('blur'));
    expect(c.state.move).toEqual({ x: 0, y: 0, run: false });
    down(target, { code: 'KeyD' });
    expect(c.state.move.x).toBe(1);
    target.dispatchEvent(new Event('visibilitychange'));
    expect(c.state.move.x).toBe(0);
  });

  it('addLook cộng dồn, consumeLook trả về rồi đặt về 0', () => {
    const c = new InputController();
    c.addLook(0.25);
    c.addLook(-0.1);
    expect(c.state.lookDelta).toBeCloseTo(0.15, 10);
    expect(c.consumeLook()).toBeCloseTo(0.15, 10);
    expect(c.state.lookDelta).toBe(0);
    expect(c.consumeLook()).toBe(0);
  });

  it('addLook bỏ qua NaN/Infinity', () => {
    const c = new InputController();
    c.addLook(0.5);
    c.addLook(Number.NaN);
    c.addLook(Number.POSITIVE_INFINITY);
    expect(c.consumeLook()).toBe(0.5);
  });

  it('setTouch ghi cờ cảm ứng', () => {
    const c = new InputController();
    c.setTouch(true);
    expect(c.state.touch).toBe(true);
    c.setTouch(false);
    expect(c.state.touch).toBe(false);
  });

  it('hàm gỡ do attachKeyboard trả về làm bàn phím hết tác dụng và nhả phím', () => {
    const { c, target, detach } = setup();
    down(target, { code: 'KeyW' });
    detach();
    expect(c.state.move.y).toBe(0);
    down(target, { code: 'KeyD' });
    down(target, { code: 'KeyE' });
    expect(c.state.move.x).toBe(0);
    expect(c.state.interactCount).toBe(0);
    // Gọi lại không lỗi.
    expect(() => detach()).not.toThrow();
  });

  it('dispose gỡ listener và nhả joystick, chạy, phím, góc xoay', () => {
    const { c, target } = setup();
    down(target, { code: 'KeyW' });
    c.setStick(1, 0);
    c.setRun(true);
    c.addLook(1);
    c.pressInteract();
    c.dispose();
    expect(c.state.move).toEqual({ x: 0, y: 0, run: false });
    expect(c.state.lookDelta).toBe(0);
    // interactCount là bộ đếm đơn điệu: không đặt lại.
    expect(c.state.interactCount).toBe(1);
    down(target, { code: 'KeyD' });
    down(target, { code: 'KeyE' });
    expect(c.state.move.x).toBe(0);
    expect(c.state.interactCount).toBe(1);
    expect(() => c.dispose()).not.toThrow();
  });
});
