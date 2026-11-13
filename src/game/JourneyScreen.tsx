import { useCallback, useMemo, useRef, useState } from 'react';
import { createGame, pickEnding, sceneRegion } from '../engine/engine';
import { STAT_KEYS, STAT_MIN, type Content, type GameState, type Stats } from '../engine/types';
import { DISCLAIMER, STAT_LABEL } from '../labels';
import { carryOver } from './journey';
import { RoamScreen } from './RoamScreen';

/**
 * Hành trình nhiều chặng (nội dung: `journey` trong v1.json): chơi lần lượt từng bản đồ đi lại,
 * mang theo chỉ số, cờ và thẻ mẹo qua các chặng, kết thúc bằng danh hiệu Tết.
 *
 * Trạng thái chính (`game`) giữ ĐỦ các vùng người chơi chọn. Mỗi chặng chỉ chơi với MỘT vùng
 * (`sceneRegion` theo hạt giống và id chặng): cảnh 3D, giọng thoại và biến thể đều dùng chung vùng đó,
 * rồi sau chặng ta trả danh sách vùng đầy đủ về trạng thái chính.
 */

export interface JourneyScreenProps {
  content: Content;
  personaId: string;
  regionIds: readonly string[];
  /** Chặng bắt đầu (0 = từ đầu). Giá trị ngoài khoảng thì kẹp lại. */
  startStep?: number;
  /** Hạt giống chọn vùng cho từng chặng khi chọn nhiều vùng (không dùng cho bảo mật). */
  seed?: number;
  onExit: () => void;
}

type Phase = 'card' | 'play' | 'end';

/** Có chỉ số nào chạm đáy không (hết sức, hết tiền, hết hòa khí): chuyến về quê dừng ngay. */
function isDepleted(stats: Stats): boolean {
  return STAT_KEYS.some((k) => stats[k] <= STAT_MIN);
}

export function JourneyScreen({ content, personaId, regionIds, startStep = 0, seed = 0, onExit }: Readonly<JourneyScreenProps>) {
  const steps = content.journey?.steps ?? [];
  const [index, setIndex] = useState(() => Math.min(Math.max(0, Math.floor(Number.isFinite(startStep) ? startStep : 0)), Math.max(0, steps.length - 1)));
  const [game, setGame] = useState<GameState>(() => createGame(content, personaId, regionIds, seed));
  const [phase, setPhase] = useState<Phase>('card');
  const [depleted, setDepleted] = useState(false);
  /** Trạng thái mới nhất của chặng đang chơi (không đưa vào state để khỏi vẽ lại mỗi lần đổi chỉ số). */
  const latest = useRef<GameState>(game);
  const allRegions = useMemo(() => [...regionIds], [regionIds]);

  const step = steps[index];

  const onGameChange = useCallback(
    (g: GameState) => {
      latest.current = { ...g, regionIds: allRegions };
      if (isDepleted(g.stats)) {
        setGame(latest.current);
        setDepleted(true);
        setPhase('end');
      }
    },
    [allRegions],
  );

  const onFinish = useCallback(
    (g: GameState) => {
      const merged = carryOver(content, steps[index] ?? { mapId: '' }, g, allRegions);
      latest.current = merged;
      setGame(merged);
      if (index + 1 < steps.length) {
        setIndex(index + 1);
        setPhase('card');
      } else {
        setPhase('end');
      }
    },
    [allRegions, content, index, steps],
  );

  if (!step) {
    return (
      <main className="journey">
        <section className="journey-card">
          <h2>Chưa có hành trình</h2>
          <p>Nội dung chưa khai báo hành trình đi lại.</p>
          <button className="choice start" onClick={onExit}>
            Về màn chọn vai
          </button>
        </section>
      </main>
    );
  }

  if (phase === 'card') {
    return (
      <main className="journey">
        <section className="journey-card stage-card" aria-label="Chặng mới">
          <small>
            Chặng {index + 1} / {steps.length}
          </small>
          <h2>{step.title}</h2>
          <p>{step.intro}</p>
          <button className="choice start" onClick={() => setPhase('play')}>
            Vào cảnh
          </button>
          <button className="choice" onClick={onExit}>
            <small>Thoát về màn chọn vai</small>
          </button>
        </section>
      </main>
    );
  }

  if (phase === 'end') {
    const final = depleted ? latest.current : game;
    const ending = pickEnding(content, final.stats, final.flags);
    const tips = final.tipsSeen.flatMap((id) => content.tips.filter((t) => t.id === id));
    return (
      <main className="journey">
        <section className="journey-card ending" aria-label="Kết thúc">
          <small>Danh hiệu Tết</small>
          <h2>{ending.title}</h2>
          <p>{ending.description}</p>
          {depleted && <p className="journey-note">Một chỉ số đã chạm đáy nên chuyến về quê dừng giữa chừng.</p>}
          <ul className="journey-stats" aria-label="Chỉ số cuối cùng">
            {STAT_KEYS.map((k) => (
              <li key={k}>
                <strong>{final.stats[k]}</strong>
                <span>{STAT_LABEL[k]}</span>
              </li>
            ))}
          </ul>
          {tips.length > 0 && (
            <>
              <p>
                <strong>Mẹo thật bạn đã gặp</strong>
              </p>
              <ul className="journey-tips">
                {tips.map((t) => (
                  <li key={t.id}>
                    {t.text}
                    <br />
                    <small>Nguồn: {t.source}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!depleted && content.journey?.epilogue && <p className="journey-note">{content.journey.epilogue}</p>}
          <button className="choice start" onClick={onExit}>
            Chơi lại
          </button>
          <footer>{DISCLAIMER}</footer>
        </section>
      </main>
    );
  }

  const stepRegion = sceneRegion(game, step.id);
  return (
    <RoamScreen
      key={step.id}
      content={content}
      mapId={step.mapId}
      regionId={stepRegion}
      personaId={personaId}
      initialGame={{ ...game, regionIds: [stepRegion] }}
      title={step.title}
      finishQuests={step.finish}
      outro={step.outro}
      onGameChange={onGameChange}
      onFinish={onFinish}
      onExit={() => {
        if (window.confirm('Thoát sẽ mất tiến độ của hành trình này. Thoát thật không?')) onExit();
      }}
    />
  );
}
