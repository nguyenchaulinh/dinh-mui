import { useEffect, useRef } from 'react';

export interface QteView {
  /** Tên người đang lao tới. */
  name: string;
  warnSec: number;
  windowSec: number;
  /** performance.now() lúc bắt đầu báo trước. */
  startedAt: number;
}

/**
 * Báo trước + vòng thời gian cho lượt "bấm NÉ đúng lúc". Vòng ngoài thu nhỏ theo thời gian thật; khi nó chạm vòng
 * vàng ở giữa (còn <= windowSec giây) thì bấm NÉ là né được. Luật đếm giờ thật nằm ở ambush.ts (vòng lặp khung hình);
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
      if (ring.current) ring.current.style.transform = `scale(${Math.max(left, 0.02)})`;
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
        <span className="qte-target" style={{ transform: `scale(${target})` }} aria-hidden="true" />
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
