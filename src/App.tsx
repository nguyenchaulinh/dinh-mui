import { Suspense, lazy, useMemo, useState } from 'react';
import { loadContent } from './content';
import {
  advance,
  choose,
  createGame,
  getEnding,
  getView,
  resolveCharacter,
  type ChooseResult,
  type SceneView,
} from './engine/engine';
import { STAT_KEYS, STAT_MAX, type Content, type GameState, type StatKey, type Style } from './engine/types';
import type { StageActor } from './scene3d/Stage3DView';

const Stage3DView = lazy(() => import('./scene3d/Stage3DView'));

const STAT_LABEL: Record<StatKey, string> = {
  harmony: 'Hòa khí',
  stamina: 'Sức chịu đựng',
  wallet: 'Ví',
};

const STYLE_LABEL: Record<Style, string> = {
  kheo: 'Khéo',
  'that-tha': 'Thật thà',
  lay: 'Lầy',
  'phan-don': 'Phản đòn',
};

const DISCLAIMER = 'Mọi nhân vật và tình huống là hư cấu, chỉ để giải trí; không nhằm mô tả bất kỳ cá nhân nào.';

/** Hiện đồng hồ FPS khi chạy dev hoặc khi URL có ?fps (để đo trên điện thoại). */
const SHOW_FPS = import.meta.env.DEV || new URLSearchParams(window.location.search).has('fps');

function Setup({
  content,
  onStart,
}: Readonly<{ content: Content; onStart: (personaId: string, regionIds: string[]) => void }>) {
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const allIds = content.regions.map((r) => r.id);
  const allSelected = regionIds.length === allIds.length;
  const toggle = (id: string) =>
    setRegionIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <main className="setup">
      <h1>Đinh Mùi: Tết Mệt Phết</h1>
      <p>Bạn là ai?</p>
      {content.personas.map((p) => (
        <button key={p.id} className="choice" aria-pressed={personaId === p.id} onClick={() => setPersonaId(p.id)}>
          <strong>{p.name}</strong>
          <br />
          <small>{p.description}</small>
        </button>
      ))}
      <p>Xuất phát từ đâu? (chọn 1 hoặc nhiều)</p>
      {content.regions.map((r) => (
        <button key={r.id} className="choice" aria-pressed={regionIds.includes(r.id)} onClick={() => toggle(r.id)}>
          <strong>{r.city}</strong>
          <br />
          <small>{r.tagline}</small>
        </button>
      ))}
      <button className="choice" aria-pressed={allSelected} onClick={() => setRegionIds(allSelected ? [] : allIds)}>
        <strong>Cả {allIds.length} thành phố</strong>
      </button>
      <button
        className="choice start"
        disabled={!personaId || regionIds.length === 0}
        onClick={() => personaId && onStart(personaId, regionIds)}
      >
        Lên đường về quê
      </button>
      <footer>{DISCLAIMER}</footer>
    </main>
  );
}

/** Diễn viên của scene cho cảnh 3D, đã áp kill-switch, đánh dấu người đang nói. */
function actorsOf(content: Content, view: SceneView, speakerId: string | null): StageActor[] {
  return (view.scene.stage3d?.actors ?? []).map((a) => {
    const ch = resolveCharacter(content, a.characterId);
    return { key: a.characterId, look: ch.look, spot: a.spot, anim: a.anim, speaking: ch.id === speakerId };
  });
}

/**
 * Chỉ khi dev: nhảy thẳng vào một scene để xem cảnh, ví dụ
 * `?scene=mc-1&persona=moi-di-lam&region=ha-noi`. Bản build production bỏ qua.
 */
function devJump(content: Content): GameState | null {
  if (!import.meta.env.DEV) return null;
  const q = new URLSearchParams(window.location.search);
  const sceneId = q.get('scene');
  if (!sceneId || !content.scenes.some((s) => s.id === sceneId)) return null;
  const persona = q.get('persona') ?? content.personas[0]!.id;
  const region = q.get('region') ?? content.regions[0]!.id;
  return { ...createGame(content, persona, [region]), sceneId };
}

export function App() {
  const content = useMemo(() => loadContent(), []);
  const [state, setState] = useState<GameState | null>(() => devJump(content));
  /** Lựa chọn vừa chọn, chờ người chơi đọc phản ứng rồi bấm Tiếp. Giữ view của scene cũ. */
  const [pending, setPending] = useState<{ result: ChooseResult; view: SceneView } | null>(null);
  /** Bước thoại trong cắt cảnh: 0 = `line`, 1.. = `lines`. */
  const [step, setStep] = useState(0);
  /** Chặng đã hiện thẻ tên. */
  const [seenStages, setSeenStages] = useState<string[]>(() =>
    state ? content.stages.map((s) => s.id) : [],
  );
  const [fps, setFps] = useState<number | null>(null);

  if (!state) {
    return (
      <Setup
        content={content}
        onStart={(p, r) => {
          // Hạt giống chỉ để trộn biến thể vùng, không dùng cho bảo mật.
          setState(createGame(content, p, r, Math.floor(Math.random() * 1e9)));
          setSeenStages([]);
          setStep(0);
        }}
      />
    );
  }

  const liveView = getView(content, state);
  const view = pending?.view ?? liveView;
  const ending = getEnding(content, state);
  const shownStats = (pending?.result.state ?? state).stats;
  const stage = view ? content.stages.find((s) => s.id === view.scene.stageId) : undefined;
  const showStageCard = !pending && !!stage && !seenStages.includes(stage.id);

  // Ai đang nói lúc này (để camera và dấu chỉ bám theo).
  const steps = view ? [{ character: view.speaker, text: view.line }, ...view.lines] : [];
  const isCutscene = view?.scene.kind === 'cutscene';
  const current = isCutscene ? steps[Math.min(step, steps.length - 1)] : steps[0];
  const speakerId = current?.character.id ?? null;

  function next() {
    if (!state) return;
    if (pending) {
      setState(pending.result.state);
      setPending(null);
      setStep(0);
      return;
    }
    if (isCutscene && step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    if (isCutscene) {
      setState(advance(content, state));
      setStep(0);
    }
  }

  const stage3d = view?.scene.stage3d;

  return (
    <div className="game">
      <div className="viewport">
        {stage3d && view && (
          <Suspense fallback={<div className="loading">Đang dựng cảnh...</div>}>
            <Stage3DView
              setId={stage3d.set}
              regionId={view.regionId}
              camera={stage3d.camera}
              actors={actorsOf(content, view, speakerId)}
              onFps={SHOW_FPS ? setFps : undefined}
            />
          </Suspense>
        )}
        {SHOW_FPS && fps !== null && <div className="fps">{fps} FPS</div>}
      </div>

      <ul className="hud" aria-label="Chỉ số">
        {STAT_KEYS.map((k) => (
          <li key={k}>
            <span>{STAT_LABEL[k]}</span>
            <meter min={0} max={STAT_MAX} low={25} high={70} optimum={100} value={shownStats[k]} />
          </li>
        ))}
      </ul>

      <section className="panel">
        {showStageCard && stage && (
          <div className="stage-card">
            <small>Chặng {content.stages.indexOf(stage) + 1}</small>
            <h2>{stage.title}</h2>
            <p>{stage.intro}</p>
            <button className="choice start" onClick={() => setSeenStages([...seenStages, stage.id])}>
              Vào cảnh
            </button>
          </div>
        )}

        {!showStageCard && pending && view && (
          <>
            <p className="speaker">{view.speaker.name}</p>
            <p className="line">{pending.result.reply}</p>
            {pending.result.tip && (
              <aside className="tip">
                <strong>Mẹo thật:</strong> {pending.result.tip.text}
                <br />
                <small>Nguồn: {pending.result.tip.source}</small>
              </aside>
            )}
            <button className="choice start" onClick={next}>
              Tiếp
            </button>
          </>
        )}

        {!showStageCard && !pending && view && isCutscene && current && (
          <>
            <p className="speaker">{current.character.name}</p>
            <p className="line">{current.text}</p>
            <button className="choice start" onClick={next}>
              Tiếp
            </button>
          </>
        )}

        {!showStageCard && !pending && view && !isCutscene && (
          <>
            <p className="speaker">
              {view.speaker.name} <small>· {view.speaker.role}</small>
            </p>
            <p className="line">{view.line}</p>
            {view.lines.map((l, i) => (
              <p key={i} className="aside">
                <strong>{l.character.name}:</strong> {l.text}
              </p>
            ))}
            {view.choices.map((ch) => (
              <button
                key={ch.id}
                className="choice"
                onClick={() => setPending({ result: choose(content, state, ch.id), view })}
              >
                <small>{STYLE_LABEL[ch.style]}</small>
                <br />
                {ch.text}
              </button>
            ))}
          </>
        )}

        {!pending && ending && (
          <div className="ending">
            <small>Danh hiệu Tết</small>
            <h2>{ending.title}</h2>
            <p>{ending.description}</p>
            <button className="choice start" onClick={() => setState(null)}>
              Chơi lại
            </button>
            <footer>{DISCLAIMER}</footer>
          </div>
        )}
      </section>
    </div>
  );
}
