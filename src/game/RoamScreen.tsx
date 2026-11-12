import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '../debug';
import { applyEffects, choose, createGame, getView, matches, resolveCharacter } from '../engine/engine';
import {
  DODGE_MILESTONES,
  HIT_FLAG,
  completeQuests,
  dodgedFlag,
  objectiveDone,
  pettedFlag,
  questFlag,
  questProgress,
  talkedFlag,
  withFlag,
} from '../engine/quests';
import { STAT_KEYS, STAT_MAX, type Content, type GameState, type MapNpc, type Scene } from '../engine/types';
import { STAT_LABEL } from '../labels';
import { SETS, styleOfRegion } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import { buildNpcParams, getRoamMap } from './roamDemo';
import type { RoamNpc } from './RoamView';
import { mergeChoice } from './talkMerge';
import { TalkPanel, type Talk } from './TalkPanel';

const RoamView = lazy(() => import('./RoamView'));

/** Scene đầu tiên trong danh sách hợp với persona/vùng của người chơi (câu hỏi khác nhau theo persona). */
function pickTalkScene(content: Content, game: GameState, ids: readonly string[]): Scene | null {
  for (const id of ids) {
    const s = content.scenes.find((x) => x.id === id);
    if (s && matches({ personas: s.personas, regions: s.regions }, game)) return s;
  }
  return null;
}

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
  /** Thông báo cùng nhóm thay thế nhau (câu hỏi vừa bắn không được đẩy mất thông báo quan trọng). */
  group?: string;
}

export function RoamScreen({
  content,
  mapId,
  regionId,
  personaId,
  onExit,
}: Readonly<{ content: Content; mapId: string; regionId: string; personaId: string; onExit: () => void }>) {
  const map = useMemo(() => getRoamMap(content, mapId), [content, mapId]);
  const controller = useMemo(() => new InputController(), []);
  const [fps, setFps] = useState<number | null>(null);
  /** Chỉ số, cờ, thẻ mẹo, lịch sử: dùng chung với engine hội thoại. Cảnh không tự chuyển trong chế độ đi lại. */
  const [game, setGame] = useState<GameState>(() => createGame(content, personaId, [regionId]));
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
  // Cập nhật dạng hàm (tính lại trên state mới nhất) để không ghi đè nhầm cờ vừa được bật ở nơi khác;
  // phép tính thuần và bất biến nên chạy lại (StrictMode) cũng ra cùng kết quả.
  useEffect(() => {
    if (!map) return;
    const r = completeQuests(map.quests, game);
    if (r.completed.length === 0) return;
    setGame((g) => completeQuests(map.quests, g).state);
    for (const q of r.completed) {
      if (announcedRef.current.includes(q.id)) continue;
      announcedRef.current.push(q.id);
      pushToast(`Hoàn thành: ${q.title}${q.rewardLine ? ` · ${q.rewardLine}` : ''}`, 'good', 4200);
    }
  }, [game, map, pushToast]);

  /** Đánh dấu đã tương tác xong với NPC (không lặp hội thoại) và bật cờ tương ứng cho nhiệm vụ. */
  const markDone = useCallback((key: string, flag: string) => {
    if (doneRef.current.includes(key)) return;
    doneRef.current = [...doneRef.current, key];
    setGame((g) => withFlag(g, flag));
  }, []);

  const onInteract = useCallback(
    (key: string) => {
      const spec = specOf(key);
      if (!spec) return;
      const speaker = resolveCharacter(content, key);
      if (talkRef.current !== null) return; // đã có hội thoại đang mở
      const sayAfter = () => setTalk({ kind: 'line', key, speaker, text: spec.action.after });

      if (doneRef.current.includes(key)) return sayAfter();

      if (spec.action.kind === 'pet') {
        const { effects, line } = spec.action;
        markDone(key, pettedFlag(key));
        setGame((g) => ({ ...g, stats: applyEffects(g.stats, effects) }));
        return setTalk({ kind: 'line', key, speaker, text: line });
      }

      const scene = pickTalkScene(content, game, spec.action.sceneIds);
      const state: GameState = { ...game, sceneId: scene?.id ?? null };
      const view = scene ? getView(content, state) : null;
      // Không có cảnh hợp, hoặc mọi lựa chọn đều bị ẩn: nói câu chào lại thay vì mở khung không có nút nào (kẹt).
      if (!view || view.choices.length === 0) return sayAfter();
      setTalk({ kind: 'choose', key, state, view });
    },
    [content, game, setTalk, markDone, specOf],
  );

  const onChoose = useCallback(
    (choiceId: string) => {
      if (talk?.kind !== 'choose') return;
      // Phản ứng và thẻ mẹo chỉ phụ thuộc lựa chọn; chỉ số/cờ thì áp lên state MỚI NHẤT (xem talkMerge.ts) để không xoá
      // cờ hit:1, dodged:n, thưởng nhiệm vụ... được cập nhật sau lúc mở hội thoại.
      const r = choose(content, talk.state, choiceId);
      setGame((g) => mergeChoice(content, talk.state, g, choiceId));
      // Bị bong bóng trúng thì không tính là "đã nói chuyện xong" (vẫn có thể chủ động lại nói chuyện).
      if (!talk.hit) markDone(talk.key, talkedFlag(talk.key));
      setTalk({ kind: 'reply', key: talk.key, speaker: talk.view.speaker, reply: r.reply ?? '', tip: r.tip });
    },
    [content, talk, setTalk, markDone],
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
    if (DODGE_MILESTONES.includes(n)) setGame((g) => withFlag(g, dodgedFlag(n)));
  }, [pushToast]);

  const onHit = useCallback(
    (key: string) => {
      if (talkRef.current !== null) return;
      const spec = specOf(key);
      if (!spec?.shoots) return;
      const speaker = resolveCharacter(content, key);
      const scene = pickTalkScene(content, game, spec.shoots.hitSceneIds);
      const state: GameState = { ...game, sceneId: scene?.id ?? null };
      const view = scene ? getView(content, state) : null;
      setGame((g) => withFlag(g, HIT_FLAG));
      pushToast('Trúng câu hỏi rồi!', 'bad', 1500);
      if (!view || view.choices.length === 0) {
        return setTalk({ kind: 'line', key, speaker, text: spec.action.after });
      }
      setTalk({ kind: 'choose', key, state, view, hit: true });
    },
    [content, game, setTalk, pushToast, specOf],
  );

  const spec = nearby && !talk ? specOf(nearby) : undefined;

  if (!map || !player) {
    return (
      <div className="game">
        <div className="loading">Không tìm thấy bản đồ "{mapId}".</div>
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
              paused={talk !== null}
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
        <span className="rs-title">Sân nhà · {region?.city ?? ''} (bản thử đi lại)</span>
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

      <div className={talk ? 'rs-toasts rs-toasts-high' : 'rs-toasts'} aria-live="polite">
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

      {talk && <TalkPanel talk={talk} onChoose={onChoose} onClose={() => setTalk(null)} />}
    </div>
  );
}
