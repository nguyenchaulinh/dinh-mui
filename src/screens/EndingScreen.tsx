import { useEffect, useState } from 'react';
import { fontStack, loadFonts } from '../scene3d/fonts';
import { STAT_KEYS, STAT_MAX, type Ending, type GameState, type StatKey, type Stats } from '../engine/types';
import { STAT_LABEL, statLevel } from '../labels';
import { Fireworks, prefersReducedMotion } from '../ui/Fireworks';
import { Modal, StatIcon } from '../ui/ui';
import { endingLook, MAX_SCORE, countUp, starsFor, totalScore } from './endingView';
import { Footer } from './Footer';

/** Đếm số lên từ 0 tới `to` (trì hoãn `delay` giây); giảm chuyển động thì hiện luôn. */
function useCountUp(to: number, delay: number): number {
  const [v, setV] = useState(() => (prefersReducedMotion() ? Math.round(to) : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setV(Math.round(to));
      return undefined;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - t0) / 1000 - delay;
      setV(countUp(to, t));
      if (t < 0.9) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return v;
}

function Star({ on }: Readonly<{ on: boolean }>) {
  return (
    <svg viewBox="0 0 24 24" className={on ? 'star star-on' : 'star'} aria-hidden="true">
      <path d="M12 2.2l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17l-6 3.3 1.3-6.6L2.4 9.1l6.7-.8L12 2.2z" />
    </svg>
  );
}

/** Huy chương: vòng vàng, nền đỏ, sao theo điểm, hai dải lụa. */
function Medal({ stars }: Readonly<{ stars: 1 | 2 | 3 }>) {
  return (
    <div className="medal" role="img" aria-label={`${stars} trên 3 sao`}>
      <span className="medal-ribbon medal-ribbon-l" />
      <span className="medal-ribbon medal-ribbon-r" />
      <span className="medal-disc">
        <span className="medal-ring" />
        <span className="medal-stars">
          {[1, 2, 3].map((i) => (
            <Star key={i} on={i <= stars} />
          ))}
        </span>
      </span>
    </div>
  );
}

function StatTile({ k, value, index }: Readonly<{ k: StatKey; value: number; index: number }>) {
  const v = Math.max(0, Math.min(STAT_MAX, Math.round(value)));
  const shown = useCountUp(v, 0.5 + index * 0.15);
  return (
    <li className={`tile tile-${k} level-${statLevel(v)}`} style={{ animationDelay: `${0.45 + index * 0.12}s` }}>
      <StatIcon k={k} />
      <b className="tile-value">{shown}</b>
      <span className="tile-label">{STAT_LABEL[k]}</span>
      <span className="tile-bar" role="meter" aria-label={STAT_LABEL[k]} aria-valuemin={0} aria-valuemax={STAT_MAX} aria-valuenow={v}>
        <span className="tile-fill" style={{ width: `${(v / STAT_MAX) * 100}%`, animationDelay: `${0.5 + index * 0.15}s` }} />
      </span>
    </li>
  );
}

const statsOf = (s: Stats) => STAT_KEYS.map((k) => ({ k, v: s[k] }));

/**
 * Màn kết thúc: pháo hoa và giấy hoa rơi phía sau, thẻ viền vàng có dải lụa, huy chương sao, danh hiệu cỡ lớn chữ vàng, ba ô chỉ
 * số đếm lên, nút chơi lại. Giọng điệu (màu, độ hoành tráng) theo kết thúc (endingView.ts).
 */
export function EndingCard({ ending, game, onReplay }: Readonly<{ ending: Ending; game: GameState; onReplay: () => void }>) {
  useEffect(() => {
    void loadFonts();
  }, []);
  const look = endingLook(ending.id);
  const stars = starsFor(game.stats);
  const total = totalScore(game.stats);
  return (
    <Modal
      label="Kết thúc"
      className={`win win-${look.tone}`}
      scrimClassName="scrim-win"
      backdrop={<Fireworks intensity={look.intensity} palette={look.palette} />}
    >
      <div className="win-ribbon" style={{ fontFamily: fontStack('round') }}>
        <span>{look.ribbon}</span>
      </div>
      <p className="win-wish" style={{ fontFamily: fontStack('script'), color: look.glow }}>
        Chúc mừng năm mới!
      </p>
      <Medal stars={stars} />
      <p className="eyebrow win-eyebrow">Danh hiệu Tết của {game.playerName || 'bạn'}</p>
      <h2 className="win-title" style={{ fontFamily: fontStack('slab') }}>
        {ending.title}
      </h2>
      <p className="win-desc">{ending.description}</p>
      <ul className="tiles" aria-label="Chỉ số cuối cùng">
        {statsOf(game.stats).map(({ k, v }, i) => (
          <StatTile key={k} k={k} value={v} index={i} />
        ))}
      </ul>
      <p className="win-total">
        Tổng điểm <b>{total}</b>/{MAX_SCORE}
      </p>
      <p className="closing">Dù sao thì... vẫn phải về nhà.</p>
      <button className="btn btn-block btn-win" data-autofocus onClick={onReplay}>
        Chơi lại
      </button>
      <Footer />
    </Modal>
  );
}
