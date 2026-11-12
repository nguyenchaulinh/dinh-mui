import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '../debug';
import { applyEffects, choose, getView, pickScene, resolveCharacter } from '../engine/engine';
import {
  DODGE_MILESTONES,
  HIT_FLAG,
  completeQuests,
  dodgedFlag,
  mapGoalReached,
  objectiveDone,
  pettedFlag,
  questFlag,
  questProgress,
  talkedFlag,
  withFlag,
} from '../engine/quests';
import { STAT_KEYS, STAT_MAX, type Content, type GameState, type MapNpc, type Stage } from '../engine/types';
import { STAT_LABEL } from '../labels';
import { SETS, styleOfRegion } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import { buildNpcParams, getRoamMap } from './roamDemo';
import type { RoamNpc } from './RoamView';
import { TalkPanel, type Talk } from './TalkPanel';

const RoamView = lazy(() => import('./RoamView'));

/** Chờ (ms) sau khi xong nhiệm vụ đích / hết chỉ số để người chơi kịp đọc thông báo trước khi chuyển màn. */
const FINISH_DELAY_MS = 1800;

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
  /** Thông báo cùng nhóm thay thế nhau (câu hỏi vừa bắn không được đẩy mất thông báo quan trọng). */
  group?: string;
}

/**
 * Một chặng của game: người chơi đi lại trong bản đồ 3D, nói chuyện, né câu hỏi, làm nhiệm vụ.
 * Chặng xong khi nhiệm vụ đích của bản đồ hoàn thành hoặc một chỉ số về 0; lúc đó gọi `onFinish` với state cuối.
 */
export function RoamScreen({
  content,
  stage,
  initialGame,
  skipIntro = false,
  onFinish,
  onExit,
}: Readonly<{
  content: Content;
  stage: Stage;
  /** State lúc vào chặng (chỉ số, cờ mang từ chặng trước sang). */
  initialGame: GameState;
  /** Bỏ thẻ chặng ở đầu (chỉ để nhảy thẳng vào bản đồ khi dev/đo hiệu năng). */
  skipIntro?: boolean;
  onFinish: (game: GameState) => void;
  onExit: () => void;
}>) {
  const { personaId, regionId } = initialGame;
  const map = useMemo(() => getRoamMap(content, stage.mapId), [content, stage.mapId]);
  const controller = useMemo(() => new InputController(), []);
  const [fps, setFps] = useState<number | null>(null);
  /** Chỉ số, cờ, thẻ mẹo, lịch sử của lượt chơi. `gameRef` là bản đồng bộ: mọi cập nhật qua `commit`. */
  const [game, setGameState] = useState<GameState>(initialGame);
  const gameRef = useRef(game);
  const [introOpen, setIntroOpen] = useState(!skipIntro);
  const [nearby, setNearby] = useState<string | null>(null);
  const [talk, setTalkState] = useState<Talk | null>(null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Bản đồng bộ của talk/done: hai lần bấm E sát nhau (trước khi React kịp render lại) không được mở hai hội thoại
  // hay áp hiệu ứng hai lần. State chỉ để vẽ; quyết định dựa trên ref.
  const talkRef = useRef<Talk | null>(null);
  const doneRef = useRef<string[]>([]);
  const dodgedRef = useRef(0);
  const announcedRef = useRef<string[]>([]);
  const finishedRef = useRef(false);
  const toastId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const detach = controller.attachKeyboard();
    return () => {
      detach();
      controller.setStick(0, 0);
    };
  }, [controller]);
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  /** Cập nhật state từ bản mới nhất (không bao giờ ghi đè bằng ảnh chụp cũ). */
  const commit = useCallback((fn: (g: GameState) => GameState) => {
    const next = fn(gameRef.current);
    if (next === gameRef.current) return;
    gameRef.current = next;
    setGameState(next);
  }, []);

  const setTalk = useCallback((t: Talk | null) => {
    talkRef.current = t;
    setTalkState(t);
  }, []);

  const pushToast = useCallback((text: string, tone: Toast['tone'] = 'info', ms = 2400, group?: string) => {
    const id = ++toastId.current;
    setToasts((cur) => [...cur.filter((x) => group === undefined || x.group !== group).slice(-3), { id, text, tone, group }]);
    timers.current.push(
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), ms),
    );
  }, []);

  const specOf = useCallback((key: string): MapNpc | undefined => map?.npcs.find((n) => n.characterId === key), [map]);

  const area = useMemo(() => (map ? walkAreaFor(map.setId, styleOfRegion(regionId)) : null), [map, regionId]);
  const player = useMemo(() => (map ? resolveCharacter(content, map.playerId) : null), [content, map]);
  const region = content.regions.find((r) => r.id === regionId);
  const npcs = useMemo<RoamNpc[]>(
    () =>
      map
        ? map.npcs.flatMap((spec): RoamNpc[] => {
            const spot = SETS[map.setId]?.spots[spec.spot];
            if (!spot) return [];
            return [
              {
                key: spec.characterId,
                look: resolveCharacter(content, spec.characterId).look,
                spot: spec.spot,
                params: buildNpcParams(spec, spot.seated === true),
                reach: spec.reach,
                // Câu hỏi trên bong bóng theo vai của người chơi để khớp với cảnh hội thoại khi bị trúng.
                shoots: spec.shoots && {
                  ...spec.shoots,
                  questions: spec.shoots.questionsByPersona?.[personaId] ?? spec.shoots.questions,
                },
              },
            ];
          })
        : [],
    [content, map, personaId],
  );

  // Ghi nhận nhiệm vụ vừa hoàn thành (thưởng chỉ số, cờ quest:...), mỗi nhiệm vụ báo một lần.
  // Phép tính thuần và bất biến nên chạy lại (StrictMode) cũng ra cùng kết quả.
  useEffect(() => {
    if (!map) return;
    const r = completeQuests(map.quests, game);
    if (r.completed.length === 0) return;
    commit((g) => completeQuests(map.quests, g).state);
    for (const q of r.completed) {
      if (announcedRef.current.includes(q.id)) continue;
      announcedRef.current.push(q.id);
      pushToast(`Hoàn thành: ${q.title}${q.rewardLine ? ` · ${q.rewardLine}` : ''}`, 'good', 4200);
    }
  }, [game, map, commit, pushToast]);

  // Chặng xong: nhiệm vụ đích hoàn thành, hoặc một chỉ số về 0 (engine đã đặt `endingId`).
  // Chờ hội thoại đang mở đóng lại, rồi một nhịp ngắn để đọc thông báo, mới chuyển màn.
  const ended = game.endingId !== null || (map !== null && mapGoalReached(map, game));
  useEffect(() => {
    if (!ended || talk !== null) return;
    const t = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish(gameRef.current);
    }, FINISH_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [ended, talk, onFinish]);

  /** Đánh dấu đã tương tác xong với NPC (không lặp hội thoại) và bật cờ tương ứng cho nhiệm vụ. */
  const markDone = useCallback(
    (key: string, flag: string) => {
      if (doneRef.current.includes(key)) return;
      doneRef.current = [...doneRef.current, key];
      commit((g) => withFlag(g, flag));
    },
    [commit],
  );

  /** Mở hội thoại chọn câu đáp từ danh sách scene (scene đầu tiên hợp vai/vùng); null nếu không có gì để nói. */
  const openChoose = useCallback(
    (key: string, sceneIds: readonly string[], hit: boolean): boolean => {
      const g = gameRef.current;
      const scene = pickScene(content, g, sceneIds);
      if (!scene) return false;
      const view = getView(content, g, scene.id);
      // Mọi lựa chọn bị ẩn thì nói câu chào lại thay vì mở khung không có nút nào (kẹt).
      if (view.choices.length === 0) return false;
      setTalk({ kind: 'choose', key, sceneId: scene.id, view, hit });
      return true;
    },
    [content, setTalk],
  );

  const onInteract = useCallback(
    (key: string) => {
      const spec = specOf(key);
      if (!spec || talkRef.current !== null || gameRef.current.endingId !== null) return; // đã có hội thoại đang mở / game đã xong
      const speaker = resolveCharacter(content, key);
      const sayAfter = () => setTalk({ kind: 'line', key, speaker, text: spec.action.after });

      if (doneRef.current.includes(key)) return sayAfter();

      if (spec.action.kind === 'pet') {
        const { effects, line } = spec.action;
        markDone(key, pettedFlag(key));
        commit((g) => ({ ...g, stats: applyEffects(g.stats, effects) }));
        return setTalk({ kind: 'line', key, speaker, text: line });
      }
      if (!openChoose(key, spec.action.sceneIds, false)) sayAfter();
    },
    [content, specOf, setTalk, markDone, commit, openChoose],
  );

  const onChoose = useCallback(
    (choiceId: string) => {
      const t = talkRef.current;
      if (t?.kind !== 'choose' || gameRef.current.endingId !== null) return;
      // Áp lên state MỚI NHẤT: không xoá cờ hit:1, dodged:n, thưởng nhiệm vụ... cập nhật sau lúc mở hội thoại.
      const r = choose(content, gameRef.current, t.sceneId, choiceId);
      commit(() => r.state);
      // Bị bong bóng trúng thì không tính là "đã nói chuyện xong" (vẫn có thể chủ động lại nói chuyện).
      if (!t.hit) markDone(t.key, talkedFlag(t.key));
      setTalk({ kind: 'reply', key: t.key, speaker: t.view.speaker, reply: r.reply, tip: r.tip });
    },
    [content, commit, markDone, setTalk],
  );

  // ---- bong bóng câu hỏi ----
  const onShoot = useCallback(
    (key: string, text: string) => {
      pushToast(`${resolveCharacter(content, key).name}: ${text}`, 'info', 1800, 'shoot');
    },
    [content, pushToast],
  );

  const onDodge = useCallback(() => {
    dodgedRef.current += 1;
    const n = dodgedRef.current;
    pushToast(`Né được! (${n})`, 'good', 1200, 'dodge');
    if (DODGE_MILESTONES.includes(n)) commit((g) => withFlag(g, dodgedFlag(n)));
  }, [pushToast, commit]);

  const onHit = useCallback(
    (key: string) => {
      if (talkRef.current !== null || gameRef.current.endingId !== null) return;
      const spec = specOf(key);
      if (!spec?.shoots) return;
      commit((g) => withFlag(g, HIT_FLAG));
      pushToast('Trúng câu hỏi rồi!', 'bad', 1500);
      if (!openChoose(key, spec.shoots.hitSceneIds, true)) {
        setTalk({ kind: 'line', key, speaker: resolveCharacter(content, key), text: spec.action.after });
      }
    },
    [content, specOf, commit, pushToast, openChoose, setTalk],
  );

  const spec = nearby && !talk ? specOf(nearby) : undefined;

  if (!map || !player) {
    return (
      <div className="game">
        <div className="loading">Không tìm thấy bản đồ "{stage.mapId}".</div>
        <button className="rs-exit rs-solo-exit" onClick={onExit}>
          ← Thoát
        </button>
      </div>
    );
  }

  const progress = map.quests.map((q) => ({ q, ...questProgress(q, game), recorded: game.flags.includes(questFlag(q.id)) }));
  const doneCount = progress.filter((p) => p.recorded).length;

  return (
    <div className="game">
      <div className="viewport">
        {area ? (
          <Suspense fallback={<div className="loading">Đang dựng cảnh...</div>}>
            <RoamView
              setId={map.setId}
              regionId={regionId}
              playerLook={player.look}
              npcs={npcs}
              area={area}
              controller={controller}
              paused={talk !== null || introOpen || ended}
              talkingKey={talk?.key ?? null}
              onNearby={setNearby}
              onInteract={onInteract}
              onShoot={onShoot}
              onDodge={onDodge}
              onHit={onHit}
              onFps={DEBUG ? setFps : undefined}
            />
          </Suspense>
        ) : (
          <div className="loading">Cảnh này chưa hỗ trợ đi lại.</div>
        )}
        {DEBUG && fps !== null && <div className="fps">{fps} FPS</div>}
      </div>

      <div className="rs-top">
        <button className="rs-exit" onClick={onExit}>
          ← Thoát
        </button>
        <span className="rs-title">
          {stage.title} · {region?.city ?? ''}
        </span>
      </div>
      <ul className="hud hud-low" aria-label="Chỉ số">
        {STAT_KEYS.map((k) => (
          <li key={k}>
            <span>{STAT_LABEL[k]}</span>
            <meter min={0} max={STAT_MAX} low={25} high={70} optimum={100} value={game.stats[k]} />
          </li>
        ))}
      </ul>

      <button className="rs-quest-chip" aria-expanded={questsOpen} onClick={() => setQuestsOpen((o) => !o)}>
        Nhiệm vụ {doneCount}/{map.quests.length}
      </button>
      {questsOpen && (
        <section className="rs-quests" aria-label="Nhiệm vụ">
          {progress.map(({ q, done, total, recorded }) => (
            <div key={q.id} className={recorded ? 'rs-quest rs-quest-done' : 'rs-quest'}>
              <strong>
                {recorded ? '✓ ' : ''}
                {q.title}
                {!recorded && (
                  <small>
                    {' '}
                    ({done}/{total})
                  </small>
                )}
              </strong>
              {!recorded && (
                <ul>
                  {q.objectives.map((o) => (
                    <li key={o.id} className={objectiveDone(o, game) ? 'rs-obj-done' : ''}>
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      <RoamControls controller={controller} />

      <div className={talk || introOpen ? 'rs-toasts rs-toasts-high' : 'rs-toasts'} aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`rs-toast rs-toast-${t.tone}`}>
            {t.text}
          </p>
        ))}
      </div>

      {spec && (
        <button className="rs-prompt" onClick={() => controller.pressInteract()}>
          <kbd>E</kbd> {spec.prompt} {resolveCharacter(content, spec.characterId).name}
        </button>
      )}

      {introOpen && (
        <section className="panel">
          <div className="stage-card">
            <small>Chặng {content.stages.indexOf(stage) + 1}</small>
            <h2>{stage.title}</h2>
            <p>{stage.intro}</p>
            <button className="choice start" onClick={() => setIntroOpen(false)}>
              Vào cảnh
            </button>
          </div>
        </section>
      )}

      {talk && <TalkPanel talk={talk} onChoose={onChoose} onClose={() => setTalk(null)} />}
    </div>
  );
}
