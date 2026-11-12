import {
  STAT_KEYS,
  STAT_MAX,
  STAT_MIN,
  type ByRegion,
  type Character,
  type Choice,
  type Condition,
  type Content,
  type Effects,
  type Ending,
  type GameState,
  type Scene,
  type Stats,
  type Tip,
} from './types';

const DEFAULT_START = 50;

/** Phần state dùng để quyết định scene/lựa chọn/thoại nào hiện. */
type Ctx = Pick<GameState, 'personaId' | 'regionIds' | 'seed' | 'flags' | 'history'>;

export interface ChoiceView {
  id: string;
  style: Choice['style'];
  text: string;
}

export interface LineView {
  character: Character;
  text: string;
}

/** Mọi thứ UI cần để vẽ scene hiện tại, đã lọc điều kiện và đổi giọng theo vùng. */
export interface SceneView {
  scene: Scene;
  /** Vùng dùng cho scene này (khi chọn nhiều vùng, mỗi scene lấy một vùng). */
  regionId: string;
  speaker: Character;
  line: string;
  lines: LineView[];
  choices: ChoiceView[];
}

export interface ChooseResult {
  /** State sau khi áp hiệu ứng và đã trỏ sang scene kế (hoặc đã kết thúc). */
  state: GameState;
  /** Phản ứng của nhân vật, đã đổi theo vùng. Null với cắt cảnh. */
  reply: string | null;
  tip: Tip | null;
}

const clamp = (n: number): number => Math.min(STAT_MAX, Math.max(STAT_MIN, n));

export function applyEffects(stats: Stats, effects: Effects): Stats {
  const next = { ...stats };
  for (const k of STAT_KEYS) {
    const d = effects[k];
    if (d !== undefined) next[k] = clamp(next[k] + d);
  }
  return next;
}

/** FNV-1a 32-bit. Chỉ để chọn biến thể nội dung ổn định, không dùng cho bảo mật. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function matches(cond: Condition | undefined, ctx: Ctx): boolean {
  if (!cond) return true;
  if (cond.flags && !cond.flags.every((f) => ctx.flags.includes(f))) return false;
  if (cond.notFlags?.some((f) => ctx.flags.includes(f))) return false;
  if (cond.personas && !cond.personas.includes(ctx.personaId)) return false;
  if (cond.regions && !cond.regions.some((r) => ctx.regionIds.includes(r))) return false;
  if (cond.history && !cond.history.every((h) => ctx.history.includes(h))) return false;
  return true;
}

function isVisible(scene: Scene, ctx: Ctx): boolean {
  return matches({ personas: scene.personas, regions: scene.regions }, ctx) && matches(scene.if, ctx);
}

/** Vùng dùng cho một scene: chọn 1 vùng thì cố định, chọn nhiều thì lấy theo seed. */
export function sceneRegion(ctx: Ctx, sceneId: string): string {
  const ids = ctx.regionIds;
  if (ids.length === 1) return ids[0]!;
  const r = ids[hash(`${ctx.seed}:${sceneId}`) % ids.length];
  if (!r) throw new Error('Chưa chọn vùng');
  return r;
}

const pick = (base: string, byRegion: ByRegion | undefined, regionId: string): string =>
  byRegion?.[regionId] ?? base;

function stageIndexOf(c: Content, scene: Scene): number {
  return c.stages.findIndex((s) => s.id === scene.stageId);
}

/**
 * Tìm scene hợp lệ đầu tiên bắt đầu từ `startId` (null = hết chặng hiện tại),
 * bỏ qua scene không thỏa điều kiện, rồi sang các chặng kế.
 * Trả về null khi hết game. Ném lỗi nếu nội dung có vòng lặp khi bỏ qua scene.
 */
function resolveNextScene(c: Content, ctx: Ctx, startId: string | null, fromStageIndex: number): string | null {
  const scenes = new Map(c.scenes.map((s) => [s.id, s]));
  let id = startId;
  let stageIndex = fromStageIndex;
  const visited = new Set<string>();

  for (;;) {
    if (id === null) {
      stageIndex += 1;
      const stage = c.stages[stageIndex];
      if (!stage) return null;
      id = stage.firstSceneId;
    }
    if (visited.has(id)) throw new Error(`Nội dung bị vòng lặp tại scene ${id}`);
    visited.add(id);

    const scene = scenes.get(id);
    if (!scene) throw new Error(`Scene không tồn tại: ${id}`);
    if (isVisible(scene, ctx)) return scene.id;

    id = scene.next ?? null;
    stageIndex = stageIndexOf(c, scene);
  }
}

export function createGame(c: Content, personaId: string, regionIds: readonly string[], seed = 0): GameState {
  const persona = c.personas.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Persona không tồn tại: ${personaId}`);
  if (regionIds.length === 0) throw new Error('Cần chọn ít nhất 1 vùng');
  const known = new Set(c.regions.map((r) => r.id));
  const unknown = regionIds.find((r) => !known.has(r));
  if (unknown) throw new Error(`Vùng không tồn tại: ${unknown}`);
  if (!Number.isInteger(seed)) throw new Error('seed phải là số nguyên');

  const stats: Stats = { harmony: DEFAULT_START, stamina: DEFAULT_START, wallet: DEFAULT_START };
  for (const k of STAT_KEYS) {
    const v = persona.startStats?.[k];
    if (v !== undefined) stats[k] = clamp(v);
  }

  const first = c.stages[0];
  if (!first) throw new Error('Nội dung không có chặng nào');

  const base: GameState = {
    personaId,
    regionIds: [...new Set(regionIds)],
    seed,
    sceneId: null,
    stats,
    flags: [],
    tipsSeen: [],
    history: [],
    endingId: null,
  };
  const sceneId = resolveNextScene(c, base, first.firstSceneId, 0);
  return sceneId === null ? finish(c, base) : { ...base, sceneId };
}

export function getScene(c: Content, state: GameState): Scene | null {
  if (state.sceneId === null) return null;
  return c.scenes.find((s) => s.id === state.sceneId) ?? null;
}

/** Áp kill-switch: nhân vật bị tắt thì trả về bản thay thế trung tính. */
export function resolveCharacter(c: Content, characterId: string): Character {
  const byId = new Map(c.characters.map((x) => [x.id, x]));
  const ch = byId.get(characterId);
  if (!ch) throw new Error(`Nhân vật không tồn tại: ${characterId}`);
  if (ch.enabled) return ch;
  const fb = ch.fallbackId ? byId.get(ch.fallbackId) : undefined;
  if (!fb?.enabled) throw new Error(`Nhân vật ${ch.id} bị tắt nhưng không có fallback hợp lệ`);
  return fb;
}

export function getView(c: Content, state: GameState): SceneView | null {
  const scene = getScene(c, state);
  if (!scene) return null;
  const regionId = sceneRegion(state, scene.id);
  return {
    scene,
    regionId,
    speaker: resolveCharacter(c, scene.characterId),
    line: pick(scene.line, scene.lineByRegion, regionId),
    lines: (scene.lines ?? [])
      .filter((l) => matches(l.if, state))
      .map((l) => ({
        character: resolveCharacter(c, l.characterId ?? scene.characterId),
        text: pick(l.text, l.byRegion, regionId),
      })),
    choices: scene.choices
      .filter((ch) => matches(ch.if, state))
      .map((ch) => ({ id: ch.id, style: ch.style, text: pick(ch.text, ch.textByRegion, regionId) })),
  };
}

export function pickEnding(c: Content, stats: Stats, flags: readonly string[] = []): Ending {
  for (const e of c.endings) {
    const flagsOk = !e.flags || e.flags.every((f) => flags.includes(f));
    const statsOk = STAT_KEYS.every((k) => {
      const r = e.when?.[k];
      if (!r) return true;
      return (r.min === undefined || stats[k] >= r.min) && (r.max === undefined || stats[k] <= r.max);
    });
    if (flagsOk && statsOk) return e;
  }
  const last = c.endings[c.endings.length - 1];
  if (!last) throw new Error('Nội dung không có kết thúc nào');
  return last;
}

function finish(c: Content, state: GameState): GameState {
  return { ...state, sceneId: null, endingId: pickEnding(c, state.stats, state.flags).id };
}

/** Một chỉ số về 0 thì game kết thúc ngay. */
function isDepleted(stats: Stats): boolean {
  return STAT_KEYS.some((k) => stats[k] <= STAT_MIN);
}

/** Chuyển sang scene kế từ `target` (đã có state mới), hoặc kết thúc. */
function moveOn(c: Content, next: GameState, scene: Scene, target: string | null): GameState {
  const nextId = resolveNextScene(c, next, target, stageIndexOf(c, scene));
  return nextId === null ? finish(c, next) : { ...next, sceneId: nextId };
}

/**
 * Áp một lựa chọn ở scene hội thoại. Thuần (không đổi state vào). Ném lỗi nếu
 * game đã kết thúc, scene là cắt cảnh, hoặc lựa chọn không thuộc/không mở ở scene hiện tại.
 */
export function choose(c: Content, state: GameState, choiceId: string): ChooseResult {
  const scene = getScene(c, state);
  if (!scene) throw new Error('Game đã kết thúc');
  if (scene.kind === 'cutscene') throw new Error(`Scene ${scene.id} là cắt cảnh, dùng advance()`);
  const choice = scene.choices.find((x) => x.id === choiceId);
  if (!choice || !matches(choice.if, state)) {
    throw new Error(`Lựa chọn không hợp lệ ở scene ${scene.id}: ${choiceId}`);
  }

  const regionId = sceneRegion(state, scene.id);
  const stats = applyEffects(state.stats, choice.effects);
  const tip = choice.tipId ? (c.tips.find((t) => t.id === choice.tipId) ?? null) : null;
  const flags = [...new Set([...state.flags, ...(choice.setFlags ?? [])])];

  let next: GameState = {
    ...state,
    stats,
    flags,
    history: [...state.history, `${scene.id}/${choice.id}`],
    tipsSeen: tip && !state.tipsSeen.includes(tip.id) ? [...state.tipsSeen, tip.id] : state.tipsSeen,
  };

  if (choice.end || isDepleted(stats)) {
    next = finish(c, next);
  } else {
    const target = choice.next !== undefined ? choice.next : (scene.next ?? null);
    next = moveOn(c, next, scene, target);
  }

  return { state: next, reply: pick(choice.reply, choice.replyByRegion, regionId), tip };
}

/** Qua cắt cảnh hiện tại. Ném lỗi nếu scene hiện tại không phải cắt cảnh. */
export function advance(c: Content, state: GameState): GameState {
  const scene = getScene(c, state);
  if (!scene) throw new Error('Game đã kết thúc');
  if (scene.kind !== 'cutscene') throw new Error(`Scene ${scene.id} không phải cắt cảnh`);
  const next: GameState = { ...state, history: [...state.history, `${scene.id}/>`] };
  return moveOn(c, next, scene, scene.next ?? null);
}

export function getEnding(c: Content, state: GameState): Ending | null {
  return state.endingId ? (c.endings.find((e) => e.id === state.endingId) ?? null) : null;
}
