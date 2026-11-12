import type { JSX, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { normalizeStick, type InputController } from './input';
import './roam.css';

/** Radian xoay camera cho mỗi pixel kéo ngang (kéo sang phải thì camera quay sang trái). */
const LOOK_PER_PX = 0.006;
/** Bán kính hoạt động của joystick = tỉ lệ này * đường kính đế (knob không ra khỏi đế). */
const STICK_RADIUS_RATIO = 0.35;

type PointerEv = ReactPointerEvent<HTMLElement>;

/** Thiết bị cảm ứng: đã bật cờ ở controller, URL có `?touch`, hoặc con trỏ chính là ngón tay. */
function detectTouch(controller: InputController): boolean {
  if (controller.state.touch) return true;
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('touch')) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/** Bắt con trỏ về phần tử; bỏ qua lỗi nếu con trỏ đã hết hiệu lực. */
function capture(el: HTMLElement, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Con trỏ không còn hoạt động: không cần bắt.
  }
}

/** Còn đang giữ con trỏ `id` không (để bỏ qua ngón thứ hai, nhưng vẫn tự hồi phục nếu mất sự kiện nhả). */
function stillCaptured(el: HTMLElement, id: number): boolean {
  try {
    return el.hasPointerCapture(id);
  } catch {
    return false;
  }
}

const blockMenu = (e: { preventDefault: () => void }): void => e.preventDefault();

/**
 * Lớp điều khiển phủ trên canvas 3D: joystick ảo (trái), vùng kéo xoay camera (nửa phải),
 * nút hành động (phải dưới). Máy tính chỉ hiện dòng gợi ý. Mỗi thao tác theo pointerId riêng
 * nên joystick và xoay camera dùng cùng lúc được.
 *
 * Xếp lớp: `.roam-root` có z-index 0 và nằm trong luồng DOM, nên phải đặt SAU canvas và
 * TRƯỚC `.hud` (z-index mặc định) để ở trên cảnh 3D, dưới khung chỉ số.
 */
export function RoamControls({ controller }: Readonly<{ controller: InputController }>): JSX.Element | null {
  const [showTouch, setShowTouch] = useState(() => detectTouch(controller));
  const knobRef = useRef<HTMLDivElement>(null);
  /** Thao tác joystick đang theo dõi: tâm (cx, cy) và bán kính hoạt động r, tính một lần lúc chạm. */
  const joyRef = useRef<{ id: number; cx: number; cy: number; r: number } | null>(null);
  /** Thao tác kéo xoay đang theo dõi: x là toạ độ ngang của lần đo trước. */
  const lookRef = useRef<{ id: number; x: number } | null>(null);

  useEffect(() => {
    if (showTouch) controller.setTouch(true);
  }, [controller, showTouch]);

  // Đổi giữa chuột và ngón tay lúc đang chạy (vd bật giả lập thiết bị): hiện joystick khi con trỏ chính thành ngón tay.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (): void => {
      if (mq.matches) setShowTouch(true);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Gỡ: nhả joystick để nhân vật không tự đi tiếp sau khi màn điều khiển biến mất.
  useEffect(() => {
    return () => {
      joyRef.current = null;
      lookRef.current = null;
      controller.setStick(0, 0);
    };
  }, [controller]);

  const markTouch = (e: PointerEv): void => {
    if (e.pointerType !== 'touch') return;
    controller.setTouch(true);
    setShowTouch(true);
  };

  // ---------- Joystick ----------
  const moveKnob = (dx: number, dy: number, r: number): void => {
    const knob = knobRef.current;
    if (!knob) return;
    const len = Math.hypot(dx, dy);
    const k = len > r ? r / len : 1;
    knob.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`;
  };

  const updateStick = (e: PointerEv): void => {
    const j = joyRef.current;
    if (!j) return;
    const dx = e.clientX - j.cx;
    const dy = e.clientY - j.cy;
    const s = normalizeStick(dx, dy, j.r);
    controller.setStick(s.x, s.y);
    moveKnob(dx, dy, j.r);
  };

  const releaseStick = (e: PointerEv): void => {
    const j = joyRef.current;
    if (!j || e.pointerId !== j.id) return;
    joyRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = '';
    controller.setStick(0, 0);
  };

  const onJoyDown = (e: PointerEv): void => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const cur = joyRef.current;
    if (cur && cur.id !== e.pointerId && stillCaptured(el, cur.id)) return;
    const rect = el.getBoundingClientRect();
    const r = rect.width * STICK_RADIUS_RATIO;
    if (!(r > 0)) return;
    e.preventDefault();
    joyRef.current = { id: e.pointerId, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, r };
    capture(el, e.pointerId);
    markTouch(e);
    updateStick(e);
  };

  const onJoyMove = (e: PointerEv): void => {
    if (joyRef.current?.id === e.pointerId) updateStick(e);
  };

  // ---------- Kéo xoay camera ----------
  const onLookDown = (e: PointerEv): void => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const cur = lookRef.current;
    if (cur && cur.id !== e.pointerId && stillCaptured(el, cur.id)) return;
    e.preventDefault();
    lookRef.current = { id: e.pointerId, x: e.clientX };
    el.dataset.active = 'true';
    capture(el, e.pointerId);
    markTouch(e);
  };

  const onLookMove = (e: PointerEv): void => {
    const l = lookRef.current;
    if (!l || l.id !== e.pointerId) return;
    const dx = e.clientX - l.x;
    l.x = e.clientX;
    controller.addLook(-dx * LOOK_PER_PX);
  };

  const onLookEnd = (e: PointerEv): void => {
    const l = lookRef.current;
    if (!l || l.id !== e.pointerId) return;
    lookRef.current = null;
    delete e.currentTarget.dataset.active;
  };

  // ---------- Nút hành động ----------
  const onActionDown = (e: PointerEv): void => {
    if (e.button !== 0) return;
    // Không để nút nhận focus: phím Space/Enter sau đó không "bấm" lại nút này.
    e.preventDefault();
    markTouch(e);
    controller.pressInteract();
  };

  return (
    <div className="roam-root">
      <div
        className="roam-look"
        data-testid="roam-look"
        aria-hidden="true"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookEnd}
        onPointerCancel={onLookEnd}
        onLostPointerCapture={onLookEnd}
        onContextMenu={blockMenu}
      />
      {showTouch ? (
        <>
          <div
            className="roam-joystick"
            data-testid="roam-joystick"
            aria-hidden="true"
            onPointerDown={onJoyDown}
            onPointerMove={onJoyMove}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
            onLostPointerCapture={releaseStick}
            onContextMenu={blockMenu}
          >
            <div className="roam-knob" data-testid="roam-knob" ref={knobRef} />
          </div>
          <button
            type="button"
            className="roam-action"
            data-testid="roam-action"
            aria-label="Tương tác"
            onPointerDown={onActionDown}
            onContextMenu={blockMenu}
          >
            Tương tác
          </button>
        </>
      ) : (
        <p className="roam-hint">WASD hoặc phím mũi tên đi · Shift chạy · kéo chuột xoay · E tương tác</p>
      )}
    </div>
  );
}
