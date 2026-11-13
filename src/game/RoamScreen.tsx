import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '../debug';
import { applyEffects, choose, getView, pickScene, resolveCharacter } from '../engine/engine';
import {
  completeQuests,
  dodgeFlags,
  dueEvent,
  eventFlag,
  forPersona,
  goalTargetKeys,
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
import { HudMeters, PauseIcon, accentOf } from '../ui/ui';
import type { ActiveAmbush } from './ambush';
import { DodgeQte, type QteView } from './DodgeQte';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import { buildNpcParams, getRoamMap } from './roamDemo';
import type { ActionStep, PlayerAction } from './action';
import { GuideArrows } from './GuideArrows';
import type { GuideItem, RoamNpc, RoamObject } from './RoamView';
import { speechBubbles } from './speech';
import { TalkDock, type Talk } from './TalkDock';

const RoamView = lazy(() => import('./RoamView'));

/** Chờ (ms) sau khi xong nhiệm vụ đích / hết chỉ số để người chơi kịp đọc thông báo trước khi chuyển màn. */
const FINISH_DELAY_MS = 1800;

const OBJ = 'obj:';
const NO_GUIDE_KEYS: readonly string[] = [];
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** Lượt bấm NÉ đang chạy (người lao tới, câu hỏi, vòng thời gian). */
  const [qte, setQte] = useState<(QteView & { key: string; text: string }) | null>(null);
  /** Chữ nổi to giữa màn hình ("NÉ ĐƯỢC!", "SỚM QUÁ!"), tự tắt. */
  const [flash, setFlash] = useState<{ id: number; text: string; tone: 'good' | 'bad' } | null>(null);
  const [tasksOpen, setTasksOpen] = useState(true);
  /** Hoạt cảnh nhân vật chính đang chạy (action.ts) và việc cần làm ở từng mốc của nó. */
  const [action, setActionState] = useState<PlayerAction | null>(null);
  const actionRef = useRef<PlayerAction | null>(null);
  const actionId = useRef(0);
  const onSteps = useRef(new Map<number, Partial<Record<ActionStep, () => void>>>());
  /** Đang đi ra cửa: màn hình tối dần. */
  const [leaving, setLeaving] = useState(false);
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
                // Câu hỏi lúc lao tới theo vai của người chơi để khớp với cảnh hội thoại khi bị bắt.
                ambush: spec.ambush && {
                  ...spec.ambush,
                  questions: spec.ambush.questionsByPersona?.[personaId] ?? spec.ambush.questions,
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
            // Đang dùng (đang nói chuyện / ngồi / với tay vào nó): ẩn dấu vàng, nó không còn là "việc để bấm".
            const key = OBJ + o.id;
            // (Không ẩn lúc với tay: nhân vật còn cần tra vị trí món đồ để quay mặt về.)
            const inUse = talk?.key === key || (action?.kind === 'sit' && action.key === key);
            return [
              {
                key: OBJ + o.id,
                x: spot.pos[0],
                z: spot.pos[2],
                model: o.model,
                available: !done && !inUse,
                taken: done && o.action.kind === 'pickup',
                locked: !objectUnlocked(o, game),
              },
            ];
          })
        : [],
    [map, myObjects, game, talk, action],
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

  // Mũi tên chỉ hướng tới việc đang cần làm khi nó ra khỏi khung nhìn. Tắt lúc hội thoại / hoạt cảnh / NÉ / hết chặng.
  const guideKeys = useMemo(
    () => (map && active && talk === null && action === null && qte === null && !ended ? goalTargetKeys(map, game, OBJ) : NO_GUIDE_KEYS),
    [map, game, active, talk, action, qte, ended],
  );
  const [guides, setGuides] = useState<GuideItem[]>([]);
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
    if (!map || !active || talk !== null || ended || action !== null) return;
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
  }, [map, active, talk, ended, action, game, content, commit, setTalk, openChoose]);

  /** Đánh dấu đã tương tác xong (không lặp hội thoại) và bật cờ tương ứng cho nhiệm vụ. */
  const markDone = useCallback(
    (key: string, flag: string) => {
      if (doneRef.current.includes(key)) return;
      doneRef.current = [...doneRef.current, key];
      commit((g) => withFlag(g, flag));
    },
    [commit],
  );

  const setAction = useCallback((a: PlayerAction | null) => {
    actionRef.current = a;
    setActionState(a);
  }, []);

  /** Bắt đầu một hoạt cảnh; `steps` chạy khi hoạt cảnh báo mốc tương ứng. Xong (`done`) thì tự gỡ. */
  const runAction = useCallback(
    (make: (id: number) => PlayerAction, steps: Partial<Record<ActionStep, () => void>>) => {
      const id = ++actionId.current;
      onSteps.current.set(id, steps);
      setAction(make(id));
    },
    [setAction],
  );

  const onActionStep = useCallback(
    (id: number, step: ActionStep) => {
      onSteps.current.get(id)?.[step]?.();
      if (step === 'done') {
        onSteps.current.delete(id);
        if (actionRef.current?.id === id) setAction(null);
      }
    },
    [setAction],
  );

  /** Đóng khung thoại; nếu đang ngồi ở máy tính thì đứng dậy. */
  const closeTalk = useCallback(() => {
    setTalk(null);
    const a = actionRef.current;
    if (a?.kind === 'sit' && !a.standUp) setAction({ ...a, standUp: true });
  }, [setTalk, setAction]);

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
      const spotOf = (name: string | undefined) => (name ? SETS[map.setId]?.spots[name] : undefined);
      if (a.kind === 'pickup') {
        // Với tay lấy; tới mốc "grab" món đồ mới bay vào người và tính là đã nhặt.
        runAction((id) => ({ id, kind: 'reach', key }), {
          grab: () => {
            markDone(key, objectDoneFlag(map.id, o));
            if (a.effects) commit((s) => ({ ...s, stats: applyEffects(s.stats, a.effects ?? {}) }));
            pushToast(`Đã lấy: ${o.label}. ${a.line}`, 'good', 3600, 'pickup');
          },
        });
        return;
      }
      if (a.kind === 'exit') {
        const to = spotOf(o.seat);
        const finish = () => markDone(key, objectDoneFlag(map.id, o));
        pushToast(a.line, 'good', 3000);
        if (!to) return finish();
        setLeaving(true);
        runAction((id) => ({ id, kind: 'leave', to: { x: to.pos[0], z: to.pos[2] } }), { done: finish });
        return;
      }
      const seat = spotOf(o.seat);
      const here = spotOf(o.spot);
      if (seat && here) {
        // Đi tới ghế, ngồi xuống, rồi mới mở máy tính. Đóng khung thoại thì đứng dậy (closeTalk).
        runAction(
          (id) => ({
            id,
            kind: 'sit',
            seat: { x: seat.pos[0], z: seat.pos[2], rotY: seat.rotY ?? 0 },
            seatY: 0.48,
            look: { x: here.pos[0], z: here.pos[2] },
            standUp: false,
            key,
          }),
          { seated: () => void openChoose(key, a.sceneIds, false) },
        );
        return;
      }
      openChoose(key, a.sceneIds, false);
    },
    [objOf, map, setTalk, markDone, commit, pushToast, openChoose, runAction],
  );

  const onInteract = useCallback(
    (key: string) => {
      if (talkRef.current !== null || actionRef.current !== null || gameRef.current.endingId !== null || !map) return;
      if (key.startsWith(OBJ)) return onObject(key);
      const spec = specOf(key);
      if (!spec) return;
      const speaker = resolveCharacter(content, key);
      const sayAfter = () => setTalk({ kind: 'line', key, speaker, text: spec.action.after });

      if (doneRef.current.includes(key)) return sayAfter();

      if (spec.action.kind === 'pet') {
        const { effects, line } = spec.action;
        // Cúi xuống vuốt ve (với tay), xong mới hiện câu thoại.
        runAction((id) => ({ id, kind: 'reach', key }), {
          grab: () => {
            markDone(key, pettedFlag(map.id, key));
            commit((g) => ({ ...g, stats: applyEffects(g.stats, effects) }));
          },
          done: () => setTalk({ kind: 'line', key, speaker, text: line }),
        });
        return;
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

  // ---- bấm NÉ đúng lúc ----
  const showFlash = useCallback((text: string, tone: 'good' | 'bad') => {
    const id = ++toastId.current;
    setFlash({ id, text, tone });
    timers.current.push(window.setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 1100));
  }, []);

  const onAmbush = useCallback(
    (a: ActiveAmbush) => {
      setQte({ key: a.key, text: a.text, name: resolveCharacter(content, a.key).name, warnSec: a.warnSec, windowSec: a.windowSec, startedAt: performance.now() });
    },
    [content],
  );

  const onDodge = useCallback(() => {
    if (!map) return;
    setQte(null);
    dodgedRef.current += 1;
    const inMap = dodgedRef.current;
    showFlash(`NÉ ĐƯỢC! (${inMap})`, 'good');
    commit((g) => withFlags({ ...g, dodges: g.dodges + 1 }, dodgeFlags(map.id, inMap, g.dodges + 1)));
  }, [map, showFlash, commit]);

  const onHit = useCallback(
    (key: string, early: boolean) => {
      setQte(null);
      if (talkRef.current !== null || gameRef.current.endingId !== null || !map) return;
      const spec = specOf(key);
      if (!spec?.ambush) return;
      commit((g) => withFlag(g, hitFlag(map.id)));
      showFlash(early ? 'SỚM QUÁ!' : 'BỊ BẮT RỒI!', 'bad');
      if (!openChoose(key, spec.ambush.hitSceneIds, true)) {
        setTalk({ kind: 'line', key, speaker: resolveCharacter(content, key), text: spec.action.after });
      }
    },
    [content, map, specOf, commit, showFlash, openChoose, setTalk],
  );

  // Hội thoại mở hoặc tạm dừng thì lượt NÉ bị huỷ (ambush.ts cũng huỷ phía luật).
  useEffect(() => {
    if (talk !== null || !active) setQte(null);
  }, [talk, active]);

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
  // Việc còn dở, nhiệm vụ đích lên đầu.
  const pending = progress
    .filter((p) => !p.recorded)
    .sort((a, b) => Number(b.q.id === map.goalQuestId) - Number(a.q.id === map.goalQuestId));
  const todo = pending.flatMap(({ q }) => objectivesFor(q, game).filter((o) => !objectiveDone(o, game)).map((o) => ({ q, o })));

  // Bong bóng thoại trên đầu nhân vật đang đứng trong cảnh (tối đa một, xem speech.ts).
  const onMap = (key: string) => myNpcs.some((n) => n.characterId === key);
  const { bubbles, speakerOnMap } = speechBubbles(
    talk,
    qte && { key: qte.key, name: qte.name, text: qte.text, speaker: resolveCharacter(content, qte.key) },
    onMap,
    accentOf,
    game.playerName,
  );
  const actionLabel = qte ? 'NÉ!' : nearNpc ? nearNpc.prompt : nearObj ? nearObj.prompt : 'Tương tác';

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
              bubbles={bubbles}
              action={action}
              onActionStep={onActionStep}
              onNearby={setNearby}
              onInteract={onInteract}
              onAmbush={onAmbush}
              onDodge={onDodge}
              onHit={onHit}
              onFps={DEBUG ? setFps : undefined}
              guideKeys={guideKeys}
              onGuides={setGuides}
            />
          </Suspense>
        ) : (
          <div className="loading">Cảnh này chưa hỗ trợ đi lại.</div>
        )}
      </div>
      {leaving && <div className="fade-out" aria-hidden="true" />}

      {showHud && (
        <>
          {guideKeys.length > 0 && <GuideArrows items={guides} />}
          {!talk && <RoamControls controller={controller} actionLabel={actionLabel} actionHot={qte !== null || prompt !== null} />}

          <div className="hud-stack">
            <div className="hud">
              <p className="hud-who">
                <strong>{game.playerName || 'Bạn'}</strong>
                <span>
                  {persona?.name} · {region?.city}
                </span>
              </p>
              <HudMeters stats={game.stats} />
            </div>

            <section className="tasks" aria-label="Việc cần làm">
              <button className="tasks-head" aria-expanded={tasksOpen} onClick={() => setTasksOpen((o) => !o)}>
                <span>Việc cần làm</span>
                <span className="tasks-count">
                  {doneCount}/{map.quests.length} {tasksOpen ? '▴' : '▾'}
                </span>
              </button>
              {tasksOpen && !talk && (
                <ul>
                  {todo.slice(0, 5).map(({ q, o }) => (
                    <li key={`${q.id}/${o.id}`} className={q.id === map.goalQuestId ? 'task-goal' : ''}>
                      {o.text}
                    </li>
                  ))}
                  {todo.length > 5 && <li className="task-more">và {todo.length - 5} việc nữa</li>}
                  {todo.length === 0 && <li className="task-more">Xong hết rồi!</li>}
                </ul>
              )}
            </section>
          </div>

          <div className="top-actions">
            {DEBUG && fps !== null && <span className="fps">{fps} FPS</span>}
            <button className="icon-btn" aria-label="Tạm dừng" onClick={onPause}>
              <PauseIcon />
            </button>
          </div>

          <div className="toasts" aria-live="polite">
            {toasts.map((t) => (
              <p key={t.id} className={`toast toast-${t.tone}`}>
                {t.text}
              </p>
            ))}
          </div>

          {flash && (
            <p key={flash.id} className={`flash flash-${flash.tone}`} aria-live="assertive">
              {flash.text}
            </p>
          )}

          {qte && !talk && <DodgeQte qte={qte} onPress={() => controller.pressInteract()} />}

          {prompt && !qte && (
            <button className="prompt" onClick={() => controller.pressInteract()}>
              <kbd>E</kbd> {prompt}
            </button>
          )}

          {talk && (
            <TalkDock
              talk={talk}
              speakerOnMap={speakerOnMap}
              onChoose={onChoose}
              onClose={closeTalk}
              onAnswer={onAnswer}
            />
          )}
        </>
      )}
    </div>
  );
}
