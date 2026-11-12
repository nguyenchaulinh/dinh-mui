import { useEffect, useRef } from 'react';

export interface QteView {
  /** Tên người đang lao tới. */
  name: string;
  warnSec: number;
  windowSec: number;
  /** performance.now() lúc bắt đầu báo trước. */
  startedAt: number;
}

/** Đường kính (px) của nút NÉ và của vòng lúc bắt đầu. Vòng co từ OUTER về sát mép nút (BTN), không chui vào sau nút. */
const BTN = 64;
const OUTER = 150;
/** Đường kính vòng khi còn lại phần `left` (0..1) thời gian. */
export const ringDiameter = (left: number): number => BTN + (OUTER - BTN) * Math.max(0, Math.min(1, left));

/**
 * Báo trước + vòng thời gian cho lượt "bấm NÉ đúng lúc". Vòng ngoài thu nhỏ theo thời gian thật; khi nó chạm vạch
 * vàng (còn <= windowSec giây) thì bấm NÉ là né được. Cả vòng lẫn vạch vàng luôn lớn hơn nút nên không bị nút che. Luật đếm giờ thật nằm ở ambush.ts (vòng lặp khung hình);
 * ở đây chỉ vẽ (cập nhật trực tiếp style, không render lại React mỗi khung).
 */
export function DodgeQte({ qte, onPress }: Readonly<{ qte: QteView; onPress: () => void }>) {
  const ring = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const target = qte.windowSec / qte.warnSec;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const left = Math.max(0, 1 - (performance.now() - qte.startedAt) / 1000 / qte.warnSec);
      if (ring.current) {
        const d = `${ringDiameter(left)}px`;
        ring.current.style.width = d;
        ring.current.style.height = d;
      }
      if (wrap.current) wrap.current.dataset.hot = left <= target ? 'true' : 'false';
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [qte, target]);
  return (
    <>
      <p className="banner banner-warn" role="alert">
        ⚠ {qte.name} đang tới! Chuẩn bị NÉ!
      </p>
      <div ref={wrap} className="qte" data-hot="false">
        <span className="qte-target" style={{ width: ringDiameter(target), height: ringDiameter(target) }} aria-hidden="true" />
        <span ref={ring} className="qte-ring" aria-hidden="true" />
        <button
          className="qte-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            onPress();
          }}
        >
          NÉ!
        </button>
        <small className="qte-hint">bấm khi vòng chạm vạch vàng · phím E / Space</small>
      </div>
    </>
  );
}
