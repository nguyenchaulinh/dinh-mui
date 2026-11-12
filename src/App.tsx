import { useCallback, useMemo, useState } from 'react';
import { loadContent } from './content';
import { ALLOW_JUMP } from './debug';
import { afterStage, createGame, getEnding, pickBySeed } from './engine/engine';
import type { Content, GameState } from './engine/types';
import { RoamScreen } from './game/RoamScreen';
import { EndingCard, PauseCard, StageCard, TitleCard, type Context } from './screens/Cards';

/** Hạt giống ngẫu nhiên 31 bit từ bộ sinh số của trình duyệt (chỉ để bốc bối cảnh, không dùng cho bảo mật). */
function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] ?? 0) >>> 1;
}

/** Bốc ngẫu nhiên vai và thành phố cho một lượt chơi. */
function randomContext(content: Content): Context {
  const seed = newSeed();
  return {
    personaId: pickBySeed(content.personas.map((p) => p.id), seed, 'vai'),
    regionId: pickBySeed(content.regions.map((r) => r.id), seed, 'thanh-pho'),
  };
}

/** Thẻ nổi đang mở trên cảnh (null = đang chơi). */
type Overlay =
  | { kind: 'title' }
  | { kind: 'stage'; justFinished?: string }
  | { kind: 'pause' }
  | { kind: 'ending'; game: GameState };

interface Run {
  /** Đổi mỗi lần chơi lại để dựng lại cảnh từ đầu. */
  id: number;
  ctx: Context;
  stageIndex: number;
  /** State lúc vào chặng hiện tại. */
  game: GameState;
}

/**
 * Chỉ khi dev/bản đo: `?roam=san-nha&region=ha-noi&persona=moi-di-lam` vào thẳng bản đồ, bỏ qua thẻ mở đầu và thẻ chặng.
 * Giá trị lạ thì rơi về mục đầu thay vì để `createGame` ném lỗi làm trắng trang.
 */
function devJump(content: Content): Run | null {
  if (!ALLOW_JUMP) return null;
  const q = new URLSearchParams(window.location.search);
  const stageIndex = content.stages.findIndex((s) => s.mapId === q.get('roam'));
  if (stageIndex < 0) return null;
  const personaId = content.personas.find((p) => p.id === q.get('persona'))?.id ?? content.personas[0]!.id;
  const regionId = content.regions.find((r) => r.id === q.get('region'))?.id ?? content.regions[0]!.id;
  return { id: 0, ctx: { personaId, regionId }, stageIndex, game: createGame(content, personaId, regionId, 'Bạn') };
}

function newRun(content: Content, id: number, name: string): Run {
  const ctx = randomContext(content);
  return { id, ctx, stageIndex: 0, game: createGame(content, ctx.personaId, ctx.regionId, name) };
}

/**
 * Luồng màn hình (docs/07): cảnh 3D của chặng hiện tại luôn là nền; các màn mở đầu, thẻ chặng, tạm dừng, kết thúc
 * là thẻ nổi giữa màn hình. Bối cảnh (vai, thành phố) bốc ngẫu nhiên, người chơi chỉ nhập tên.
 */
export function App() {
  const content = useMemo(() => loadContent(), []);
  const [jump] = useState(() => devJump(content));
  const [run, setRun] = useState<Run>(() => jump ?? newRun(content, 0, ''));
  const [overlay, setOverlay] = useState<Overlay | null>(() => (jump ? null : { kind: 'title' }));
  const stage = content.stages[run.stageIndex]!;

  const onFinish = useCallback(
    (game: GameState) => {
      const step = afterStage(content, run.stageIndex, game);
      if ('next' in step) {
        setRun((r) => ({ ...r, stageIndex: step.next, game }));
        setOverlay({ kind: 'stage', justFinished: content.stages[run.stageIndex]!.title });
      } else {
        setOverlay({ kind: 'ending', game: step.end });
      }
    },
    [content, run.stageIndex],
  );

  const restart = useCallback(() => {
    setRun((r) => newRun(content, r.id + 1, r.game.playerName));
    setOverlay({ kind: 'stage' });
  }, [content]);

  const ending = overlay?.kind === 'ending' ? getEnding(content, overlay.game) : null;

  return (
    <>
      <RoamScreen
        key={`${run.id}:${stage.id}`}
        content={content}
        stage={stage}
        initialGame={run.game}
        active={overlay === null}
        onFinish={onFinish}
        onPause={() => setOverlay({ kind: 'pause' })}
      />
      {overlay?.kind === 'title' && (
        <TitleCard
          content={content}
          ctx={run.ctx}
          onStart={(name) => {
            setRun((r) => ({ ...r, game: { ...r.game, playerName: name } }));
            setOverlay({ kind: 'stage' });
          }}
        />
      )}
      {overlay?.kind === 'stage' && (
        <StageCard
          content={content}
          stage={stage}
          game={run.game}
          justFinished={overlay.justFinished}
          onEnter={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'pause' && <PauseCard onResume={() => setOverlay(null)} onRestart={restart} />}
      {overlay?.kind === 'ending' && ending && <EndingCard ending={ending} game={overlay.game} onReplay={restart} />}
    </>
  );
}
