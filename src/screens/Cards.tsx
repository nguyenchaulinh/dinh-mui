import { useState } from 'react';
import { NAME_MAX, normalizeName } from '../engine/engine';
import { objectivesFor } from '../engine/quests';
import type { Content, Ending, GameState, Stage } from '../engine/types';
import { Modal, StatBars } from '../ui/ui';
import { Footer } from './Footer';

/** Bối cảnh của lượt chơi (bốc ngẫu nhiên): vai và thành phố. */
export interface Context {
  personaId: string;
  regionId: string;
}

/** Câu bối cảnh theo vai: "Năm nay bạn là ... ở ...". */
function contextLine(content: Content, ctx: Context) {
  const p = content.personas.find((x) => x.id === ctx.personaId);
  const r = content.regions.find((x) => x.id === ctx.regionId);
  const where = ctx.personaId === 'sinh-vien' ? 'học ở' : 'đi làm ở';
  return (
    <>
      Năm nay bạn là <strong>{p?.name.toLowerCase()}</strong>, {where} <strong>{r?.city}</strong>. Tết này phải về quê.
    </>
  );
}

/** Thẻ mở đầu: tên game, bối cảnh ngẫu nhiên, ô nhập tên, nút Lên đường. */
export function TitleCard({
  content,
  ctx,
  onStart,
}: Readonly<{ content: Content; ctx: Context; onStart: (name: string) => void }>) {
  const [raw, setRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const name = normalizeName(raw);
  const error = touched && raw.trim() !== '' && name === null;
  const submit = () => {
    setTouched(true);
    if (name) onStart(name);
  };
  return (
    <Modal label="Bắt đầu">
      <p className="eyebrow">Tết Đinh Mùi 2027</p>
      <h1 className="title">Đinh Mùi: Tết Mệt Phết</h1>
      <p className="lead">{contextLine(content, ctx)}</p>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="ten">Bạn tên gì?</label>
        <input
          id="ten"
          data-autofocus
          value={raw}
          maxLength={NAME_MAX * 2}
          autoComplete="off"
          spellCheck={false}
          placeholder="Ví dụ: Lan"
          aria-invalid={error}
          aria-describedby="ten-help"
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        <small id="ten-help" className={error ? 'help help-error' : 'help'}>
          {error ? `Chỉ dùng chữ, số, khoảng trắng và - ' . (tối đa ${NAME_MAX} ký tự)` : 'Họ hàng sẽ gọi bạn bằng tên này.'}
        </small>
        <button className="btn btn-block" type="submit" disabled={name === null}>
          Lên đường
        </button>
      </form>
      <Footer />
    </Modal>
  );
}

/** Thẻ chặng: số chặng, tên, câu dẫn, việc cần làm (theo vai), nút Vào cảnh. */
export function StageCard({
  content,
  stage,
  game,
  justFinished,
  onEnter,
}: Readonly<{ content: Content; stage: Stage; game: GameState; justFinished?: string; onEnter: () => void }>) {
  const map = content.maps.find((m) => m.id === stage.mapId);
  const goal = map?.quests.find((q) => q.id === map.goalQuestId);
  const index = content.stages.indexOf(stage);
  return (
    <Modal label={`Chặng ${index + 1}`}>
      {justFinished && <p className="done-badge">Xong chặng: {justFinished}</p>}
      <p className="eyebrow">
        Chặng {index + 1}/{content.stages.length}
      </p>
      <h2 className="title">{stage.title}</h2>
      <p className="lead">{stage.intro}</p>
      {goal && (
        <div className="todo">
          <p className="todo-title">Việc cần làm</p>
          <ul>
            {objectivesFor(goal, game).map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
        </div>
      )}
      <StatBars stats={game.stats} />
      <button className="btn btn-block" onClick={onEnter}>
        Vào cảnh
      </button>
    </Modal>
  );
}

/** Thẻ tạm dừng. */
export function PauseCard({ onResume, onRestart }: Readonly<{ onResume: () => void; onRestart: () => void }>) {
  return (
    <Modal label="Tạm dừng" onClose={onResume}>
      <h2 className="title">Tạm dừng</h2>
      <button className="btn btn-block" onClick={onResume}>
        Chơi tiếp
      </button>
      <button className="btn btn-ghost btn-block" onClick={onRestart}>
        Chơi lại từ đầu
      </button>
      <p className="help">Chơi lại sẽ bốc bối cảnh mới, giữ tên của bạn.</p>
    </Modal>
  );
}

/** Thẻ kết thúc: danh hiệu Tết của người chơi, chỉ số cuối, chơi lại. */
export function EndingCard({
  ending,
  game,
  onReplay,
}: Readonly<{ ending: Ending; game: GameState; onReplay: () => void }>) {
  return (
    <Modal label="Kết thúc">
      <p className="eyebrow">Danh hiệu Tết của {game.playerName || 'bạn'}</p>
      <h2 className="title title-ending">{ending.title}</h2>
      <p className="lead">{ending.description}</p>
      <StatBars stats={game.stats} />
      <p className="closing">Dù sao thì... vẫn phải về nhà.</p>
      <button className="btn btn-block" onClick={onReplay}>
        Chơi lại
      </button>
      <Footer />
    </Modal>
  );
}
