import { useCallback, useMemo, useState } from 'react';
import { loadContent } from './content';
import { ALLOW_JUMP } from './debug';
import { afterStage, createGame, getEnding, pickRegion } from './engine/engine';
import type { Content, GameState } from './engine/types';
import { RoamScreen } from './game/RoamScreen';
import { EndingScreen } from './screens/EndingScreen';
import { Setup, type Selection } from './screens/Setup';

/** Đang chơi chặng `stageIndex`, vào chặng với state `game`. */
interface Playing {
  stageIndex: number;
  game: GameState;
  /** Bỏ thẻ chặng (chỉ khi nhảy thẳng bằng URL lúc dev). */
  skipIntro?: boolean;
}

/**
 * Chỉ khi dev/bản đo: `?roam=san-nha&region=ha-noi&persona=moi-di-lam` vào thẳng bản đồ, bỏ qua màn chọn.
 * Giá trị lạ thì rơi về mục đầu thay vì để `createGame` ném lỗi làm trắng trang.
 */
function devJump(content: Content): Playing | null {
  if (!ALLOW_JUMP) return null;
  const q = new URLSearchParams(window.location.search);
  const stageIndex = content.stages.findIndex((s) => s.mapId === q.get('roam'));
  if (stageIndex < 0) return null;
  const persona = content.personas.find((p) => p.id === q.get('persona'))?.id ?? content.personas[0]!.id;
  const region = content.regions.find((r) => r.id === q.get('region'))?.id ?? content.regions[0]!.id;
  return { stageIndex, game: createGame(content, persona, region), skipIntro: true };
}

/** Hạt giống ngẫu nhiên 31 bit (chỉ để chọn thành phố khi tích nhiều, không dùng cho bảo mật). */
function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] ?? 0) >>> 1;
}

export function App() {
  const content = useMemo(() => loadContent(), []);
  const [selection, setSelection] = useState<Selection>({ personaId: null, regionIds: [] });
  const [playing, setPlaying] = useState<Playing | null>(() => devJump(content));
  /** Có giá trị khi lượt chơi đã kết thúc. */
  const [finished, setFinished] = useState<GameState | null>(null);

  const onFinish = useCallback(
    (game: GameState) => {
      const idx = playing?.stageIndex ?? 0;
      const step = afterStage(content, idx, game);
      if ('next' in step) setPlaying({ stageIndex: step.next, game });
      else {
        setPlaying(null);
        setFinished(step.end);
      }
    },
    [content, playing?.stageIndex],
  );

  if (playing) {
    const stage = content.stages[playing.stageIndex]!;
    return (
      <RoamScreen
        key={stage.id}
        content={content}
        stage={stage}
        initialGame={playing.game}
        skipIntro={playing.skipIntro}
        onFinish={onFinish}
        onExit={() => setPlaying(null)}
      />
    );
  }

  const ending = finished ? getEnding(content, finished) : null;
  if (finished && ending) {
    return <EndingScreen ending={ending} stats={finished.stats} onReplay={() => setFinished(null)} />;
  }

  return (
    <Setup
      content={content}
      selection={selection}
      onSelect={setSelection}
      onStart={(personaId, regionIds) =>
        setPlaying({
          stageIndex: 0,
          game: createGame(content, personaId, pickRegion(regionIds, newSeed(), 'luot-choi')),
        })
      }
    />
  );
}
