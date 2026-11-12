import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '../debug';
import { applyEffects, choose, getView, pickScene, resolveCharacter } from '../engine/engine';
import {
  completeQuests,
  dodgeFlags,
  dueEvent,
  eventFlag,
  forPersona,
  hitFlag,
  mapGoalReached,
  objectDoneFlag,
  objectUnlocked,
  objectiveDone,
  objectivesFor,
  pettedFlag,
  questFlag,
  questProgress,
  talkedFlag,
  withFlag,
  withFlags,
} from '../engine/quests';
import type { Content, GameState, MapNpc, MapObject, Stage } from '../engine/types';
import { SETS, styleOfRegion } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { PauseIcon, StatBars } from '../ui/ui';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import { buildNpcParams, getRoamMap } from './roamDemo';
import type { RoamNpc, RoamObject } from './RoamView';
import { TalkPanel, type Talk } from './TalkPanel';

const RoamView = lazy(() => import('./RoamView'));

/** Chờ (ms) sau khi xong nhiệm vụ đích / hết chỉ số để người chơi kịp đọc thông báo trước khi chuyển màn. */
const FINISH_DELAY_MS = 1800;

const OBJ = 'obj:';
const EV = 'ev:';

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
  /** Thông báo cùng nhóm thay thế nhau (câu hỏi vừa bắn không được đẩy mất thông báo quan trọng). */
  group?: string;
}

/**
 * Một chặng: người chơi đi lại trong bản đồ 3D, nói chuyện, dùng/nhặt đồ, né câu hỏi, gặp sự kiện, làm nhiệm vụ.
 * Chặng xong khi nhiệm vụ đích hoàn thành hoặc game kết thúc (một chỉ số về 0, hoặc lựa chọn kết thúc ngay);
 * lúc đó gọi `onFinish` với state cuối. `active = false` (đang có thẻ nổi của App) thì cảnh đứng yên làm nền.
 */
export function RoamScreen({
  content,
  stage,
  initialGame,
  active,
  onFinish,
  onPause,
}: Readonly<{
  content: Content;
  stage: Stage;
  /** State lúc vào chặng (chỉ số, cờ mang từ chặng trước sang). Chỉ đọc lúc gắn, trừ tên người chơi. */
  initialGame: GameState;
  active: boolean;
  onFinish: (game: GameState) => void;
  onPause: () => void;
}>) {
  const { personaId, regionId } = initialGame;
  const map = useMemo(() => getRoamMap(content, stage.mapId), [content, stage.mapId]);
  const controller = useMemo(() => new InputController(), []);
  const [fps, setFps] = useState<number | null>(null);
  /** Chỉ số, cờ, thẻ mẹo, lịch sử của lượt chơi. `gameRef` là bản đồng bộ: mọi cập nhật qua `commit`. */
  const [game, setGameState] = useState<GameState>(initialGame);
  const gameRef = useRef(game);
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

  // Tên người chơi có thể được nhập sau khi cảnh đã dựng làm nền (thẻ mở đầu).
  useEffect(() => {
    const name = initialGame.playerName;
    commit((g) => (g.playerName === name ? g : { ...g, playerName: name }));
  }, [initialGame.playerName, commit]);

  const setTalk = useCallback((t: Talk | null) => {
    talkRef.current = t;
    setTalkState(t);
  }, []);

  const pushToast = useCallback((text: string, tone: Toast['tone'] = 'info', ms = 2400, group?: string) => {
    const id = ++toastId.current;
    setToasts((cur) => [...cur.filter((x) => group === undefined || x.group !== group).slice(-2), { id, text, tone, group }]);
    timers.current.push(
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), ms),
    );
  }, []);

  /** NPC và đồ vật có mặt với vai của người chơi. */
  const myNpcs = useMemo(() => (map ? map.npcs.filter((n) => forPersona(n, personaId)) : []), [map, personaId]);
  const myObjects = useMemo(() => (map ? (map.objects ?? []).filter((o) => forPersona(o, personaId)) : []), [map, personaId]);
  const specOf = useCallback((key: string): MapNpc | undefined => myNpcs.find((n) => n.characterId === key), [myNpcs]);
  const objOf = useCallback((key: string): MapObject | undefined => myObjects.find((o) => OBJ + o.id === key), [myObjects]);

  const area = useMemo(() => (map ? walkAreaFor(map.setId, styleOfRegion(regionId)) : null), [map, regionId]);
  const player = useMemo(() => (map ? resolveCharacter(content, map.playerId) : null), [content, map]);
  const region = content.regions.find((r) => r.id === regionId);
  const persona = content.personas.find((p) => p.id === personaId);
  const npcs = useMemo<RoamNpc[]>(
    () =>
      map
        ? myNpcs.flatMap((spec): RoamNpc[] => {
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
    [content, map, myNpcs, personaId],
  );
  const objects = useMemo<RoamObject[]>(
    () =>
      map
        ? myObjects.flatMap((o): RoamObject[] => {
            const spot = SETS[map.setId]?.spots[o.spot];
            if (!spot) return [];
            const done = game.flags.includes(objectDoneFlag(map.id, o));
            return [
              {
                key: OBJ + o.id,
                x: spot.pos[0],
                z: spot.pos[2],
                model: o.model,
                available: !done,
                taken: done && o.action.kind === 'pickup',
                locked: !objectUnlocked(o, game),
              },
            ];
          })
        : [],
    [map, myObjects, game],
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
      pushToast(`Xong: ${q.title}${q.rewardLine ? ` · ${q.rewardLine}` : ''}`, 'good', 4200);
    }
  }, [game, map, commit, pushToast]);

  // Chặng xong: nhiệm vụ đích hoàn thành, hoặc game đã kết thúc (engine đặt `endingId`).
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

  /** Mở hội thoại chọn câu đáp từ danh sách scene (scene đầu tiên hợp vai/vùng/cờ); false nếu không có gì để nói. */
  const openChoose = useCallback(
    (key: string, sceneIds: readonly string[], hit: boolean): boolean => {
      const g = gameRef.current;
      const scene = pickScene(content, g, sceneIds);
      if (!scene) return false;
      const view = getView(content, g, scene.id);
      // Mọi lựa chọn bị ẩn thì không mở khung không có nút nào (kẹt).
      if (view.choices.length === 0) return false;
      setTalk({ kind: 'choose', key, sceneId: scene.id, view, hit });
      return true;
    },
    [content, setTalk],
  );

  // Sự kiện: tự bật khi đủ điều kiện, lúc không có hội thoại nào đang mở. Đọc từ ref nên chạy lại cũng không bật hai lần.
  useEffect(() => {
    if (!map || !active || talk !== null || ended) return;
    const ev = dueEvent(map, gameRef.current);
    if (!ev) return;
    commit((g) => withFlag(g, eventFlag(map.id, ev.id)));
    const scene = pickScene(content, gameRef.current, ev.sceneIds);
    if (!scene) return;
    if (ev.kind === 'call') {
      setTalk({ kind: 'call', key: EV + ev.id, caller: resolveCharacter(content, scene.characterId), sceneIds: ev.sceneIds });
    } else {
      openChoose(EV + ev.id, ev.sceneIds, false);
    }
  }, [map, active, talk, ended, game, content, commit, setTalk, openChoose]);

  /** Đánh dấu đã tương tác xong (không lặp hội thoại) và bật cờ tương ứng cho nhiệm vụ. */
  const markDone = useCallback(
    (key: string, flag: string) => {
      if (doneRef.current.includes(key)) return;
      doneRef.current = [...doneRef.current, key];
      commit((g) => withFlag(g, flag));
    },
    [commit],
  );

  const onObject = useCallback(
    (key: string) => {
      const o = objOf(key);
      if (!o || !map || doneRef.current.includes(key)) return;
      const g = gameRef.current;
      if (!objectUnlocked(o, g)) {
        setTalk({ kind: 'line', key, speaker: null, title: o.label, text: o.lockedLine ?? 'Chưa dùng được.' });
        return;
      }
      const a = o.action;
      if (a.kind === 'pickup') {
        markDone(key, objectDoneFlag(map.id, o));
        if (a.effects) commit((s) => ({ ...s, stats: applyEffects(s.stats, a.effects ?? {}) }));
        pushToast(`Đã lấy: ${o.label}. ${a.line}`, 'good', 3600, 'pickup');
        return;
      }
      if (a.kind === 'exit') {
        markDone(key, objectDoneFlag(map.id, o));
        pushToast(a.line, 'good', 3000);
        return;
      }
      openChoose(key, a.sceneIds, false);
    },
    [objOf, map, setTalk, markDone, commit, pushToast, openChoose],
  );

  const onInteract = useCallback(
    (key: string) => {
      if (talkRef.current !== null || gameRef.current.endingId !== null || !map) return;
      if (key.startsWith(OBJ)) return onObject(key);
      const spec = specOf(key);
      if (!spec) return;
      const speaker = resolveCharacter(content, key);
      const sayAfter = () => setTalk({ kind: 'line', key, speaker, text: spec.action.after });

      if (doneRef.current.includes(key)) return sayAfter();

      if (spec.action.kind === 'pet') {
        const { effects, line } = spec.action;
        markDone(key, pettedFlag(map.id, key));
        commit((g) => ({ ...g, stats: applyEffects(g.stats, effects) }));
        return setTalk({ kind: 'line', key, speaker, text: line });
      }
      if (!openChoose(key, spec.action.sceneIds, false)) sayAfter();
    },
    [content, map, specOf, onObject, setTalk, markDone, commit, openChoose],
  );

  const onChoose = useCallback(
    (choiceId: string) => {
      const t = talkRef.current;
      if (t?.kind !== 'choose' || gameRef.current.endingId !== null || !map) return;
      // Áp lên state MỚI NHẤT: không xoá cờ hit:, dodged:, thưởng nhiệm vụ... cập nhật sau lúc mở hội thoại.
      const r = choose(content, gameRef.current, t.sceneId, choiceId);
      commit(() => r.state);
      if (t.key.startsWith(OBJ)) {
        const o = objOf(t.key);
        if (o) markDone(t.key, objectDoneFlag(map.id, o));
      } else if (!t.key.startsWith(EV) && !t.hit) {
        // Bị bong bóng trúng thì không tính là "đã nói chuyện xong" (vẫn có thể chủ động lại nói chuyện).
        markDone(t.key, talkedFlag(map.id, t.key));
      }
      const picked = t.view.choices.find((c) => c.id === choiceId);
      const feed = t.view.scene.ui === 'feed';
      setTalk({
        kind: 'reply',
        key: t.key,
        speaker: t.view.speaker,
        said: feed ? (picked?.author ?? '') : (picked?.text ?? ''),
        reply: r.reply,
        tip: r.tip,
        feed,
      });
    },
    [content, map, commit, objOf, markDone, setTalk],
  );

  const onAnswer = useCallback(() => {
    const t = talkRef.current;
    if (t?.kind !== 'call') return;
    setTalk(null);
    openChoose(t.key, t.sceneIds, false);
  }, [setTalk, openChoose]);

  // ---- bong bóng câu hỏi ----
  const onShoot = useCallback(
    (key: string, text: string) => {
      pushToast(`${resolveCharacter(content, key).name}: ${text}`, 'info', 1800, 'shoot');
    },
    [content, pushToast],
  );

  const onDodge = useCallback(() => {
    if (!map) return;
    dodgedRef.current += 1;
    const inMap = dodgedRef.current;
    pushToast(`Né được! (${inMap})`, 'good', 1200, 'dodge');
    commit((g) => withFlags({ ...g, dodges: g.dodges + 1 }, dodgeFlags(map.id, inMap, g.dodges + 1)));
  }, [map, pushToast, commit]);

  const onHit = useCallback(
    (key: string) => {
      if (talkRef.current !== null || gameRef.current.endingId !== null || !map) return;
      const spec = specOf(key);
      if (!spec?.shoots) return;
      commit((g) => withFlag(g, hitFlag(map.id)));
      pushToast('Trúng rồi!', 'bad', 1500);
      if (!openChoose(key, spec.shoots.hitSceneIds, true)) {
        setTalk({ kind: 'line', key, speaker: resolveCharacter(content, key), text: spec.action.after });
      }
    },
    [content, map, specOf, commit, pushToast, openChoose, setTalk],
  );

  // Nút tương tác: NPC hoặc đồ vật đang trong tầm.
  const nearNpc = nearby && !talk ? specOf(nearby) : undefined;
  const nearObj = nearby && !talk ? objOf(nearby) : undefined;
  const prompt = nearNpc
    ? `${nearNpc.prompt} · ${resolveCharacter(content, nearNpc.characterId).name}`
    : nearObj
      ? `${nearObj.prompt} · ${nearObj.label}`
      : null;

  if (!map || !player) {
    return (
      <div className="game">
        <div className="loading">Không tìm thấy bản đồ "{stage.mapId}".</div>
      </div>
    );
  }

  const progress = map.quests.map((q) => ({ q, ...questProgress(q, game), recorded: game.flags.includes(questFlag(q.id)) }));
  const doneCount = progress.filter((p) => p.recorded).length;
  const paused = !active || talk !== null || ended;
  const showHud = active;

  return (
    <div className="game">
      <div className="viewport">
        {area ? (
          <Suspense fallback={<div className="loading">Đang dựng cảnh...</div>}>
            <RoamView
              setId={map.setId}
              regionId={regionId}
              variant={map.variantByPersona?.[personaId]}
              objects={objects}
              playerLook={player.look}
              npcs={npcs}
              area={area}
              controller={controller}
              paused={paused}
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

      {showHud && (
        <>
          {!talk && <RoamControls controller={controller} />}

          <div className="hud">
            <p className="hud-who">
              <strong>{game.playerName || 'Bạn'}</strong>
              <span>
                {persona?.name} · {region?.city}
              </span>
            </p>
            <StatBars stats={game.stats} compact />
          </div>

          <div className="top-actions">
            <button className="pill-btn" aria-expanded={questsOpen} onClick={() => setQuestsOpen((o) => !o)}>
              Nhiệm vụ {doneCount}/{map.quests.length}
            </button>
            <button className="icon-btn" aria-label="Tạm dừng" onClick={onPause}>
              <PauseIcon />
            </button>
          </div>

          {questsOpen && (
            <section className="quest-panel" aria-label="Nhiệm vụ">
              {progress.map(({ q, done, total, recorded }) => (
                <div key={q.id} className={recorded ? 'quest quest-done' : 'quest'}>
                  <p className="quest-title">
                    <span>{q.id === map.goalQuestId ? `★ ${q.title}` : q.title}</span>
                    <small>{recorded ? 'xong' : `${done}/${total}`}</small>
                  </p>
                  {!recorded && (
                    <ul>
                      {objectivesFor(q, game).map((o) => (
                        <li key={o.id} className={objectiveDone(o, game) ? 'obj-done' : ''}>
                          {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          <div className="toasts" aria-live="polite">
            {toasts.map((t) => (
              <p key={t.id} className={`toast toast-${t.tone}`}>
                {t.text}
              </p>
            ))}
          </div>

          {prompt && (
            <button className="prompt" onClick={() => controller.pressInteract()}>
              <kbd>E</kbd> {prompt}
            </button>
          )}

          {talk && (
            <TalkPanel
              talk={talk}
              playerName={game.playerName}
              onChoose={onChoose}
              onClose={() => setTalk(null)}
              onAnswer={onAnswer}
            />
          )}
        </>
      )}
    </div>
  );
}
