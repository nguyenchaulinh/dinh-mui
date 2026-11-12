import { applyEffects, choose, createGame, finishGame, getView, pickScene } from '../engine/engine';
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
  pettedFlag,
  talkedFlag,
  withFlag,
  withFlags,
} from '../engine/quests';
import type { Condition, Content, GameState, RoamMap } from '../engine/types';

/**
 * Mô phỏng cả hành trình để kiểm tra nội dung (CHỈ dùng trong test). Duyệt MỌI tổ hợp câu đáp với từng NPC (mặc định
 * người chơi nói chuyện với mọi NPC; `skipNpcs` thêm nhánh bỏ qua, tốn nhiều bộ nhớ hơn nhiều), bị trúng câu hỏi hay
 * không, dùng đồ vật và chọn gì, mọi lựa chọn trong sự kiện. Nhặt đồ luôn nhặt (bỏ qua chỉ làm kẹt chặng).
 * Số câu né được mỗi bản đồ do người gọi đặt (`dodges`).
 *
 * Để không bùng nổ số nhánh, sau mỗi bước các trạng thái "giống nhau về mặt luật chơi" được gộp lại (cộng dồn số cách
 * đi tới): cùng chỉ số, cùng tổng số câu né, cùng kết thúc, và cùng các cờ có xuất hiện trong một điều kiện nào đó
 * của nội dung (cờ không ai đọc thì không ảnh hưởng gì về sau).
 */

type Frontier = Map<string, { s: GameState; w: number }>;

/** Mọi cờ được đọc trong một điều kiện nào đó (scene, thoại, lựa chọn, đồ vật, sự kiện, nhiệm vụ, kết thúc). */
function referencedFlags(c: Content): Set<string> {
  const out = new Set<string>();
  const add = (cond: Condition | undefined) => {
    for (const f of [...(cond?.flags ?? []), ...(cond?.notFlags ?? [])]) out.add(f);
  };
  for (const s of c.scenes) {
    add(s.if);
    for (const l of s.lines ?? []) add(l.if);
    for (const ch of s.choices) add(ch.if);
  }
  for (const m of c.maps) {
    for (const o of m.objects ?? []) add(o.requires);
    for (const e of m.events ?? []) add(e.when);
    for (const q of m.quests) for (const o of q.objectives) add(o.done);
  }
  for (const e of c.endings) add({ flags: e.flags });
  return out;
}

export interface JourneyResult {
  /** Số cách chơi dẫn tới từng kết thúc. */
  endings: Record<string, number>;
  /** Số cách chơi bị kẹt (không xong được chặng nào đó và không kết thúc): phải luôn là 0 với nội dung đúng. */
  stuck: number;
}

/**
 * Chơi hết các chặng với một vai/vùng. `dodges[mapId]` = số câu né được ở bản đồ đó (mặc định 0).
 * `onEnd` nhận mỗi trạng thái cuối (đã gộp) để test xem phân bố chỉ số.
 */
export function simulateJourney(
  content: Content,
  personaId: string,
  regionId: string,
  dodges: Readonly<Record<string, number>>,
  onEnd?: (final: GameState, ways: number) => void,
  opts: { skipNpcs?: boolean; rng?: () => number } = {},
): JourneyResult {
  const refs = referencedFlags(content);
  // Không điều kiện nào đọc lịch sử thì bỏ lịch sử và thẻ mẹo khỏi trạng thái mô phỏng (đỡ bộ nhớ, không đổi kết quả).
  const usesHistory = JSON.stringify(content).includes('"history"');
  const keyOf = (s: GameState) =>
    `${s.stats.harmony},${s.stats.stamina},${s.stats.wallet}|${s.dodges}|${s.endingId}|${s.flags.filter((f) => refs.has(f)).sort().join(',')}`;
  const add = (f: Frontier, s: GameState, w: number) => {
    const k = keyOf(s);
    const cur = f.get(k);
    if (cur) cur.w += w;
    else f.set(k, { s: usesHistory ? s : { ...s, history: [], tipsSeen: [] }, w });
  };

  const endings: Record<string, number> = {};
  let stuck = 0;
  const finish = (s: GameState, w: number) => {
    endings[s.endingId!] = (endings[s.endingId!] ?? 0) + w;
    onEnd?.(s, w);
  };

  let frontier: Frontier = new Map();
  add(frontier, createGame(content, personaId, regionId, 'Test'), 1);

  for (const [stageIndex, stage] of content.stages.entries()) {
    const map = content.maps.find((m) => m.id === stage.mapId)!;
    const done = playMap(content, map, frontier, dodges[map.id] ?? 0, add, opts.skipNpcs === true, opts.rng);
    frontier = new Map();
    for (const { s, w } of done.values()) {
      if (s.endingId !== null) finish(s, w);
      else if (!mapGoalReached(map, s)) stuck += w;
      else if (stageIndex === content.stages.length - 1) finish(finishGame(content, s), w);
      else add(frontier, s, w);
    }
  }
  return { endings, stuck };
}

/** Một bản đồ: trả các trạng thái cuối (đã xong nhiệm vụ đích, đã kết thúc game, hoặc bị kẹt). */
function playMap(
  content: Content,
  map: RoamMap,
  start: Frontier,
  dodged: number,
  add: (f: Frontier, s: GameState, w: number) => void,
  skipNpcs: boolean,
  rng: (() => number) | undefined,
): Frontier {
  /** Duyệt hết (không có rng) hoặc chỉ đi một nhánh ngẫu nhiên (lấy mẫu). */
  const pick = <T,>(xs: readonly T[]): readonly T[] => (rng && xs.length > 1 ? [xs[Math.floor(rng() * xs.length)]!] : xs);
  /** Áp nhiệm vụ vừa xong và mọi sự kiện đến lượt (rẽ nhánh theo lựa chọn trong sự kiện). */
  const settle = (s0: GameState, w: number, out: Frontier) => {
    const s = completeQuests(map.quests, s0).state;
    if (s.endingId !== null) return add(out, s, w);
    const ev = dueEvent(map, s);
    if (!ev) return add(out, s, w);
    const fired = withFlag(s, eventFlag(map.id, ev.id));
    const scene = pickScene(content, fired, ev.sceneIds);
    if (!scene) return settle(fired, w, out);
    for (const ch of pick(getView(content, fired, scene.id).choices)) settle(choose(content, fired, scene.id, ch.id).state, w, out);
  };

  /** Một bước rẽ nhánh: mỗi trạng thái sinh ra các trạng thái kế. */
  const step = (f: Frontier, branch: (s: GameState) => GameState[]): Frontier => {
    const out: Frontier = new Map();
    for (const { s, w } of f.values()) {
      if (s.endingId !== null) {
        add(out, s, w);
        continue;
      }
      for (const n of pick(branch(s))) settle(n, w, out);
    }
    return out;
  };

  /** Mở scene đầu tiên hợp vai và chọn từng lựa chọn (rồi bật cờ `doneFlag` nếu chưa kết thúc); `skip` thêm nhánh bỏ qua. */
  const talkOptions = (s: GameState, ids: readonly string[], doneFlag: string | null, skip: boolean): GameState[] => {
    const scene = pickScene(content, s, ids);
    if (!scene) return [s];
    const out = skip ? [s] : [];
    for (const ch of getView(content, s, scene.id).choices) {
      const r = choose(content, s, scene.id, ch.id).state;
      out.push(r.endingId === null && doneFlag ? withFlag(r, doneFlag) : r);
    }
    return out;
  };

  let f: Frontier = new Map();
  for (const { s, w } of start.values()) settle(s, w, f);

  for (const n of map.npcs) {
    const key = n.characterId;
    const a = n.action;
    f = step(f, (s) => {
      if (!forPersona(n, s.personaId)) return [s];
      const petted = () => withFlag({ ...s, stats: applyEffects(s.stats, a.kind === 'pet' ? a.effects : {}) }, pettedFlag(map.id, key));
      if (a.kind === 'pet') return skipNpcs ? [s, petted()] : [petted()];
      return talkOptions(s, a.sceneIds, talkedFlag(map.id, key), skipNpcs);
    });
    if (n.ambush) {
      const sh = n.ambush;
      // Bị bắt tối đa một lần (bị bắt nhiều lần là hành vi lặp, không phải lựa chọn nội dung).
      f = step(f, (s) => (forPersona(n, s.personaId) ? [s, ...talkOptions(withFlag(s, hitFlag(map.id)), sh.hitSceneIds, null, false)] : [s]));
    }
  }
  for (const o of map.objects ?? []) {
    if (o.action.kind === 'exit') continue;
    const a = o.action;
    f = step(f, (s) => {
      if (!forPersona(o, s.personaId) || !objectUnlocked(o, s)) return [s];
      if (a.kind === 'pickup') {
        const next = a.effects ? { ...s, stats: applyEffects(s.stats, a.effects) } : s;
        return [withFlag(next, objectDoneFlag(map.id, o))];
      }
      return a.kind === 'talk' ? talkOptions(s, a.sceneIds, objectDoneFlag(map.id, o), false) : [s];
    });
  }

  // Né câu hỏi: đếm trong bản đồ và cộng dồn cả hành trình.
  f = step(f, (s) => {
    let g = s;
    for (let i = 1; i <= dodged; i++) g = withFlags({ ...g, dodges: g.dodges + 1 }, dodgeFlags(map.id, i, g.dodges + 1));
    return [g];
  });

  // Ra cửa (nếu bản đồ có cửa và đã mở khoá).
  for (const o of map.objects ?? []) {
    if (o.action.kind !== 'exit') continue;
    f = step(f, (s) => (forPersona(o, s.personaId) && objectUnlocked(o, s) ? [withFlag(s, objectDoneFlag(map.id, o))] : [s]));
  }
  return f;
}

/** mulberry32: số giả ngẫu nhiên trong [0, 1) theo hạt giống (để test lặp lại được). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Lấy mẫu `runs` lượt chơi ngẫu nhiên (mỗi quyết định chọn đều trong các lựa chọn), hạt giống cố định nên kết quả
 * lặp lại được. Nhanh hơn duyệt hết rất nhiều; dùng cho test phân bố kết thúc.
 */
export function sampleJourney(
  content: Content,
  personaId: string,
  regionId: string,
  dodges: Readonly<Record<string, number>>,
  runs: number,
  seed = 1,
): JourneyResult {
  const rng = seeded(seed);
  const total: JourneyResult = { endings: {}, stuck: 0 };
  for (let i = 0; i < runs; i++) {
    const r = simulateJourney(content, personaId, regionId, dodges, undefined, { rng });
    total.stuck += r.stuck;
    for (const [k, n] of Object.entries(r.endings)) total.endings[k] = (total.endings[k] ?? 0) + n;
  }
  return total;
}
