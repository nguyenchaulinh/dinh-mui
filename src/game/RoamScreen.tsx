import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG } from '../debug';
import { applyEffects, choose, createGame, getView, matches, resolveCharacter } from '../engine/engine';
import { STAT_KEYS, STAT_MAX, type Content, type GameState, type Scene } from '../engine/types';
import { STAT_LABEL } from '../labels';
import { SETS, styleOfRegion } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import { ROAM_DEMO, ROAM_NPCS, buildNpcParams } from './roamDemo';
import type { RoamNpc } from './RoamView';
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

export function RoamScreen({
  content,
  regionId,
  personaId,
  onExit,
}: Readonly<{ content: Content; regionId: string; personaId: string; onExit: () => void }>) {
  const controller = useMemo(() => new InputController(), []);
  const [fps, setFps] = useState<number | null>(null);
  /** Chỉ số, cờ, thẻ mẹo, lịch sử: dùng chung với engine hội thoại. Cảnh không tự chuyển trong chế độ đi lại. */
  const [game, setGame] = useState<GameState>(() => createGame(content, personaId, [regionId]));
  const [nearby, setNearby] = useState<string | null>(null);
  const [talk, setTalkState] = useState<Talk | null>(null);
  /** NPC đã nói chuyện xong (không lặp lại hội thoại, chỉ chào lại). */
  const [, setDoneState] = useState<string[]>([]);
  // Bản đồng bộ của talk/done: hai lần bấm E sát nhau (trước khi React kịp render lại) không được mở hai hội thoại
  // hay áp hiệu ứng hai lần. State chỉ để vẽ; quyết định dựa trên ref.
  const talkRef = useRef<Talk | null>(null);
  const doneRef = useRef<string[]>([]);
  const setTalk = useCallback((t: Talk | null) => {
    talkRef.current = t;
    setTalkState(t);
  }, []);
  const markDone = useCallback((key: string) => {
    if (doneRef.current.includes(key)) return;
    doneRef.current = [...doneRef.current, key];
    setDoneState(doneRef.current);
  }, []);

  useEffect(() => {
    const detach = controller.attachKeyboard();
    return () => {
      detach();
      controller.setStick(0, 0);
    };
  }, [controller]);

  const area = useMemo(() => walkAreaFor(ROAM_DEMO.setId, styleOfRegion(regionId)), [regionId]);
  const player = useMemo(() => resolveCharacter(content, ROAM_DEMO.playerId), [content]);
  const region = content.regions.find((r) => r.id === regionId);
  const npcs = useMemo<RoamNpc[]>(
    () =>
      ROAM_NPCS.flatMap((spec): RoamNpc[] => {
        const spot = SETS[ROAM_DEMO.setId]?.spots[spec.spot];
        if (!spot) return [];
        return [
          {
            key: spec.key,
            look: resolveCharacter(content, spec.key).look,
            spot: spec.spot,
            params: buildNpcParams(spec, spot.seated === true),
            reach: spec.reach,
          },
        ];
      }),
    [content],
  );

  const onInteract = useCallback(
    (key: string) => {
      const spec = ROAM_NPCS.find((s) => s.key === key);
      if (!spec) return;
      const speaker = resolveCharacter(content, key);
      if (talkRef.current !== null) return; // đã có hội thoại đang mở
      const sayAfter = () => setTalk({ kind: 'line', key, speaker, text: spec.action.after });

      if (doneRef.current.includes(key)) return sayAfter();

      if (spec.action.kind === 'pet') {
        const { effects, line } = spec.action;
        markDone(key);
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
    [content, game, setTalk, markDone],
  );

  const onChoose = useCallback(
    (choiceId: string) => {
      if (talk?.kind !== 'choose') return;
      const r = choose(content, talk.state, choiceId);
      // Chỉ lấy phần "ghi nhớ" của engine; không chuyển cảnh/kết thúc vì đang đi lại tự do.
      setGame((g) => ({
        ...g,
        stats: r.state.stats,
        flags: r.state.flags,
        tipsSeen: r.state.tipsSeen,
        history: r.state.history,
      }));
      markDone(talk.key);
      setTalk({ kind: 'reply', key: talk.key, speaker: talk.view.speaker, reply: r.reply ?? '', tip: r.tip });
    },
    [content, talk, setTalk, markDone],
  );

  const spec = nearby && !talk ? ROAM_NPCS.find((s) => s.key === nearby) : undefined;

  return (
    <div className="game">
      <div className="viewport">
        {area ? (
          <Suspense fallback={<div className="loading">Đang dựng cảnh...</div>}>
            <RoamView
              setId={ROAM_DEMO.setId}
              regionId={regionId}
              playerLook={player.look}
              npcs={npcs}
              area={area}
              controller={controller}
              paused={talk !== null}
              talkingKey={talk?.key ?? null}
              onNearby={setNearby}
              onInteract={onInteract}
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

      <RoamControls controller={controller} />

      {spec && (
        <button className="rs-prompt" onClick={() => controller.pressInteract()}>
          <kbd>E</kbd> {spec.prompt} {resolveCharacter(content, spec.key).name}
        </button>
      )}

      {talk && (
        <TalkPanel
          talk={talk}
          onChoose={onChoose}
          onClose={() => setTalk(null)}
        />
      )}
    </div>
  );
}
