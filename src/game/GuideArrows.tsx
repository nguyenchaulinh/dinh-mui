import type { GuideItem } from './RoamView';

/**
 * Mũi tên ở mép màn hình chỉ hướng tới NPC / đồ vật của việc đang cần làm khi nó ra khỏi khung nhìn (guide.ts).
 * Chỉ để nhìn (aria-hidden, không nhận chạm); danh sách việc ở góc trái đã là bản đọc được cho trình đọc màn hình.
 */
export function GuideArrows({ items }: Readonly<{ items: readonly GuideItem[] }>) {
  if (items.length === 0) return null;
  return (
    <div className="guides" aria-hidden="true">
      {items.map((g) => (
        <div key={g.key} className="guide" style={{ left: `${(g.x * 100).toFixed(1)}%`, top: `${(g.y * 100).toFixed(1)}%` }}>
          <span className="guide-chev" style={{ transform: `rotate(${g.angle.toFixed(3)}rad)` }}>
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path d="M12 3 L21 19 L12 14.5 L3 19 Z" fill="currentColor" stroke="rgb(31 20 16)" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          {g.dist > 0 && <span className="guide-dist">{g.dist} m</span>}
        </div>
      ))}
    </div>
  );
}
