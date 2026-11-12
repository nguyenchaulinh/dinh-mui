import { STAT_KEYS, STAT_MAX, type Ending, type Stats } from '../engine/types';
import { DISCLAIMER, STAT_LABEL } from '../labels';

/** Màn kết thúc: danh hiệu của lượt chơi, chỉ số cuối, chơi lại. */
export function EndingScreen({
  ending,
  stats,
  onReplay,
}: Readonly<{ ending: Ending; stats: Stats; onReplay: () => void }>) {
  return (
    <main className="setup ending">
      <small>Danh hiệu Tết</small>
      <h2>{ending.title}</h2>
      <p>{ending.description}</p>
      <ul className="hud hud-static" aria-label="Chỉ số cuối">
        {STAT_KEYS.map((k) => (
          <li key={k}>
            <span>{STAT_LABEL[k]}</span>
            <meter min={0} max={STAT_MAX} low={25} high={70} optimum={100} value={stats[k]} />
          </li>
        ))}
      </ul>
      <button className="choice start" onClick={onReplay}>
        Chơi lại
      </button>
      <footer>{DISCLAIMER}</footer>
    </main>
  );
}
