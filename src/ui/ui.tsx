import { useEffect, useRef, type ReactNode } from 'react';
import { STAT_KEYS, STAT_MAX, type Character, type StatKey, type Stats } from '../engine/types';
import { STAT_LABEL } from '../labels';

/**
 * Thành phần giao diện dùng chung (xem docs/07-thiet-ke-ui-ux.md). Chỉ vẽ, không giữ luật chơi.
 */

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

/** Màu nhấn của một nhân vật (màu áo), chỉ nhận mã hex hợp lệ; không có thì dùng màu đỏ chủ đạo. */
export function accentOf(ch: Character | null | undefined): string {
  const c = ch?.look?.outfit;
  return c && HEX.test(c) ? c : 'var(--red)';
}

// ---------- Biểu tượng (SVG nội tuyến, không dùng emoji) ----------

export function StatIcon({ k }: Readonly<{ k: StatKey }>) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  if (k === 'harmony') {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
    );
  }
  if (k === 'stamina') {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M13.5 2 4 13.5h6.2L9 22l10-12.5h-6.4L13.5 2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" fill="currentColor" />
      <path d="M4 7.5 12 12l8-4.5" fill="none" stroke="#fff8ec" strokeWidth="1.8" />
      <circle cx="12" cy="12.5" r="2" fill="#f5b82e" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

// ---------- Thanh chỉ số ----------

/** Ba thanh chỉ số có biểu tượng. Tự vẽ (không dùng `<meter>`) để mọi trình duyệt trông như nhau. */
export function StatBars({ stats, compact = false }: Readonly<{ stats: Stats; compact?: boolean }>) {
  return (
    <ul className={compact ? 'stats stats-compact' : 'stats'} aria-label="Chỉ số">
      {STAT_KEYS.map((k) => {
        const v = Math.max(0, Math.min(STAT_MAX, stats[k]));
        return (
          <li key={k} className={`stat stat-${k}`}>
            <StatIcon k={k} />
            <span className="stat-label">{STAT_LABEL[k]}</span>
            <span
              className="stat-bar"
              role="meter"
              aria-label={STAT_LABEL[k]}
              aria-valuemin={0}
              aria-valuemax={STAT_MAX}
              aria-valuenow={v}
            >
              <span className="stat-fill" style={{ width: `${(v / STAT_MAX) * 100}%` }} />
            </span>
            {!compact && <span className="stat-value">{v}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Nhãn ngắn trên HUD (in hoa, giống thanh trạng thái của game hành động). */
const SHORT: Record<StatKey, string> = { harmony: 'Hòa khí', stamina: 'Sức', wallet: 'Ví' };

/** Ba thanh chỉ số nhỏ nằm ngang cho HUD trong màn chơi. Chỉ số thấp (<= 25) thì nhấp nháy. */
export function HudMeters({ stats }: Readonly<{ stats: Stats }>) {
  return (
    <ul className="meters" aria-label="Chỉ số">
      {STAT_KEYS.map((k) => {
        const v = Math.max(0, Math.min(STAT_MAX, stats[k]));
        return (
          <li key={k} className={v <= 25 ? `meter meter-${k} meter-low` : `meter meter-${k}`}>
            <StatIcon k={k} />
            <span className="meter-body">
              <span className="meter-bar" role="meter" aria-label={STAT_LABEL[k]} aria-valuemin={0} aria-valuemax={STAT_MAX} aria-valuenow={v}>
                <span className="meter-fill" style={{ width: `${(v / STAT_MAX) * 100}%` }} />
              </span>
              <span className="meter-label">{SHORT[k]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Bảng tên người nói ----------

export function Nameplate({ ch, name, role }: Readonly<{ ch?: Character | null; name: string; role?: string }>) {
  return (
    <span className="nameplate">
      <span className="nameplate-name" style={{ background: accentOf(ch) }}>
        {name}
      </span>
      {role && <span className="nameplate-role">{role}</span>}
    </span>
  );
}

// ---------- Thẻ nổi giữa màn hình ----------

/**
 * Thẻ nổi giữa màn hình trên cảnh 3D đã làm mờ. Tự đưa focus vào phần tử có `data-autofocus` (hoặc nút đầu tiên)
 * để chơi được bằng bàn phím. `onClose` (nếu có) gắn với phím Esc.
 */
export function Modal({
  label,
  children,
  onClose,
  wide = false,
}: Readonly<{ label: string; children: ReactNode; onClose?: () => void; wide?: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const target = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('button, input');
    target?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim">
      <div ref={ref} className={wide ? 'modal modal-wide' : 'modal'} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
