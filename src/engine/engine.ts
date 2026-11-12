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
type Ctx = Pick<GameState, 'personaId' | 'regionId' | 'flags' | 'history'>;

export interface ChoiceView {
  id: string;
  style: Choice['style'];
  text: string;
}

export interface LineView {
  character: Character;
  text: string;
}

/** Mọi thứ UI cần để vẽ một cuộc hội thoại, đã lọc điều kiện và đổi giọng theo vùng. */
export interface SceneView {
  scene: Scene;
  speaker: Character;
  line: string;
  lines: LineView[];
  choices: ChoiceView[];
}

export interface ChooseResult {
  /** State sau khi áp hiệu ứng; đã có `endingId` nếu lựa chọn này kết thúc game. */
  state: GameState;
  /** Phản ứng của nhân vật, đã đổi theo vùng. */
  reply: string;
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

export function matches(cond: Condition | undefined, ctx: Ctx): boolean {
  if (!cond) return true;
  if (cond.flags && !cond.flags.every((f) => ctx.flags.includes(f))) return false;
  if (cond.notFlags?.some((f) => ctx.flags.includes(f))) return false;
  if (cond.personas && !cond.personas.includes(ctx.personaId)) return false;
  if (cond.regions && !cond.regions.includes(ctx.regionId)) return false;
  if (cond.history && !cond.history.every((h) => ctx.history.includes(h))) return false;
  return true;
}

function isVisible(scene: Scene, ctx: Ctx): boolean {
  return matches({ personas: scene.personas, regions: scene.regions }, ctx) && matches(scene.if, ctx);
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

/**
 * Chọn một vùng trong các vùng người chơi đã tích: chọn một thì lấy luôn, chọn nhiều thì lấy theo `seed`
 * (cùng seed + cùng khoá thì cùng kết quả). Không dùng cho bảo mật.
 */
export function pickRegion(regionIds: readonly string[], seed: number, key = ''): string {
  const r = regionIds[hash(`${seed}:${key}`) % Math.max(1, regionIds.length)];
  if (!r) throw new Error('Chưa chọn vùng');
  return r;
}

const pick = (base: string, byRegion: ByRegion | undefined, regionId: string): string => byRegion?.[regionId] ?? base;

export function createGame(c: Content, personaId: string, regionId: string): GameState {
  const persona = c.personas.find((p) => p.id === personaId);
  if (!persona) throw new Error(`Persona không tồn tại: ${personaId}`);
  if (!c.regions.some((r) => r.id === regionId)) throw new Error(`Vùng không tồn tại: ${regionId}`);

  const stats: Stats = { harmony: DEFAULT_START, stamina: DEFAULT_START, wallet: DEFAULT_START };
  for (const k of STAT_KEYS) {
    const v = persona.startStats?.[k];
    if (v !== undefined) stats[k] = clamp(v);
  }
  return { personaId, regionId, stats, flags: [], tipsSeen: [], history: [], endingId: null };
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

/**
 * Scene đầu tiên trong `ids` hợp với persona/vùng/điều kiện của người chơi, hoặc null nếu không có.
 * (Cùng một NPC có thể hỏi mỗi vai một câu khác nhau.)
 */
export function pickScene(c: Content, state: Ctx, ids: readonly string[]): Scene | null {
  for (const id of ids) {
    const s = c.scenes.find((x) => x.id === id);
    if (s && isVisible(s, state)) return s;
  }
  return null;
}

/** Cảnh hội thoại đã lọc điều kiện và đổi giọng theo vùng. Ném lỗi nếu scene không tồn tại. */
export function getView(c: Content, state: Ctx, sceneId: string): SceneView {
  const scene = c.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Scene không tồn tại: ${sceneId}`);
  const regionId = state.regionId;
  return {
    scene,
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

/** Kết thúc game ngay với danh hiệu hợp chỉ số và cờ hiện tại. Thuần (không đổi state vào). */
export function finishGame(c: Content, state: GameState): GameState {
  return { ...state, endingId: pickEnding(c, state.stats, state.flags).id };
}

/**
 * Sau khi xong chặng thứ `stageIndex`: sang chặng kế (giữ nguyên chỉ số/cờ) hoặc kết thúc game
 * (hết chặng, hoặc game đã có kết thúc từ trước, ví dụ một chỉ số về 0). Thuần.
 */
export function afterStage(c: Content, stageIndex: number, state: GameState): { next: number } | { end: GameState } {
  if (state.endingId !== null) return { end: state };
  return stageIndex + 1 < c.stages.length ? { next: stageIndex + 1 } : { end: finishGame(c, state) };
}

/** Một chỉ số về 0 thì game kết thúc ngay. */
function isDepleted(stats: Stats): boolean {
  return STAT_KEYS.some((k) => stats[k] <= STAT_MIN);
}

/**
 * Áp một lựa chọn ở scene `sceneId` lên `state` (nên là state MỚI NHẤT của lượt chơi). Thuần (không đổi state vào).
 * Ném lỗi nếu game đã kết thúc, scene không tồn tại, hoặc lựa chọn không thuộc/không mở ở scene này.
 * Lựa chọn có `end`, hoặc làm một chỉ số về 0, thì kết thúc game ngay.
 */
export function choose(c: Content, state: GameState, sceneId: string, choiceId: string): ChooseResult {
  if (state.endingId !== null) throw new Error('Game đã kết thúc');
  const scene = c.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Scene không tồn tại: ${sceneId}`);
  const choice = scene.choices.find((x) => x.id === choiceId);
  if (!choice || !matches(choice.if, state)) {
    throw new Error(`Lựa chọn không hợp lệ ở scene ${scene.id}: ${choiceId}`);
  }

  const stats = applyEffects(state.stats, choice.effects);
  const tip = choice.tipId ? (c.tips.find((t) => t.id === choice.tipId) ?? null) : null;
  const next: GameState = {
    ...state,
    stats,
    flags: [...new Set([...state.flags, ...(choice.setFlags ?? [])])],
    history: [...state.history, `${scene.id}/${choice.id}`],
    tipsSeen: tip && !state.tipsSeen.includes(tip.id) ? [...state.tipsSeen, tip.id] : state.tipsSeen,
  };

  return {
    state: choice.end || isDepleted(stats) ? finishGame(c, next) : next,
    reply: pick(choice.reply, choice.replyByRegion, state.regionId),
    tip,
  };
}

export function getEnding(c: Content, state: GameState): Ending | null {
  return state.endingId ? (c.endings.find((e) => e.id === state.endingId) ?? null) : null;
}
