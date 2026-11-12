import { dodgedFlag, hitFlag, mapAutoFlags, npcDoneFlag, objectDoneFlag, totalDodgeFlags, DODGE_MILESTONES } from './quests';
import {
  STAT_KEYS,
  type ByRegion,
  type Condition,
  type Content,
  type Effects,
  type MapEvent,
  type MapNpc,
  type MapObject,
  type Quest,
} from './types';

export interface ValidateOptions {
  /** Các bộ cảnh 3D có thật; có thì kiểm tra set và vị trí đứng của NPC. */
  sets?: Record<string, { spots: Record<string, unknown> }>;
  /** Id các set có vùng đi lại (walk.ts); bản đồ phải trỏ tới set nằm trong danh sách này. */
  roamSets?: readonly string[];
  /** Model nhân vật có sẵn (scene3d/rigging.ts); `look.model` phải nằm trong danh sách này. */
  models?: readonly string[];
}

/**
 * Kiểm tra toàn vẹn nội dung: tham chiếu chéo, kill-switch, cờ, lịch sử,
 * biến thể vùng, bản đồ/NPC/nhiệm vụ, scene mồ côi, kết thúc mặc định. Trả về danh sách lỗi; rỗng = hợp lệ.
 */
export function validateContent(c: Content, opts: ValidateOptions = {}): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const dup = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`${kind} trùng id: ${id}`);
      seen.add(id);
    }
  };
  dup('region', c.regions.map((x) => x.id));
  dup('persona', c.personas.map((x) => x.id));
  dup('stage', c.stages.map((x) => x.id));
  dup('character', c.characters.map((x) => x.id));
  dup('scene', c.scenes.map((x) => x.id));
  dup('tip', c.tips.map((x) => x.id));
  dup('ending', c.endings.map((x) => x.id));

  const regionIds = new Set(c.regions.map((r) => r.id));
  const personaIds = new Set(c.personas.map((p) => p.id));
  const sceneById = new Map(c.scenes.map((s) => [s.id, s]));
  const tipIds = new Set(c.tips.map((t) => t.id));
  const chars = new Map(c.characters.map((x) => [x.id, x]));

  if (c.regions.length === 0) err('Cần ít nhất 1 vùng');
  if (c.personas.length === 0) err('Cần ít nhất 1 persona');
  if (c.stages.length === 0) err('Cần ít nhất 1 chặng');

  // Cờ được bật ở đâu đó; mọi cờ được dùng phải nằm trong tập này (bắt lỗi gõ sai).
  // Cờ có thể được bật: từ lựa chọn hội thoại, và cờ tự sinh của bản đồ đi lại (talked:, petted:, dodged:, quest:...).
  const setFlags = new Set([
    ...c.scenes.flatMap((s) => s.choices.flatMap((ch) => ch.setFlags ?? [])),
    ...c.maps.flatMap(mapAutoFlags),
    ...totalDodgeFlags(),
  ]);

  /** Chỗ chèn trong câu thoại: chỉ `{ten}` (tên người chơi) là hợp lệ; gõ sai như `{name}` sẽ hiện nguyên văn. */
  const checkText = (where: string, text: string | undefined) => {
    for (const m of (text ?? '').matchAll(/\{([^}]*)\}/g)) {
      if (m[1] !== 'ten') err(`${where}: chỗ chèn lạ {${m[1]}} (chỉ dùng {ten})`);
    }
  };
  const checkTextByRegion = (where: string, byRegion: ByRegion | undefined) => {
    for (const v of Object.values(byRegion ?? {})) checkText(where, v);
  };

  const checkRegions = (where: string, byRegion: ByRegion | undefined) => {
    for (const k of Object.keys(byRegion ?? {})) {
      if (!regionIds.has(k)) err(`${where}: biến thể cho vùng lạ ${k}`);
    }
  };

  const checkCond = (where: string, cond: Condition | undefined) => {
    if (!cond) return;
    for (const f of [...(cond.flags ?? []), ...(cond.notFlags ?? [])]) {
      if (!setFlags.has(f)) err(`${where}: cờ ${f} không được lựa chọn nào bật`);
    }
    for (const p of cond.personas ?? []) if (!personaIds.has(p)) err(`${where}: persona ${p} không tồn tại`);
    for (const r of cond.regions ?? []) if (!regionIds.has(r)) err(`${where}: region ${r} không tồn tại`);
    for (const h of cond.history ?? []) {
      const [sid, cid] = h.split('/');
      const s = sid ? sceneById.get(sid) : undefined;
      const ok = s && s.choices.some((x) => x.id === cid);
      if (!ok) err(`${where}: lịch sử ${h} không trỏ tới lựa chọn nào`);
    }
  };

  const checkChar = (where: string, id: string) => {
    if (!chars.has(id)) err(`${where}: nhân vật ${id} không tồn tại`);
  };

  for (const ch of c.characters) {
    const m = ch.look?.model;
    if (m !== undefined && opts.models && !opts.models.includes(m)) err(`character ${ch.id}: model ${m} không có trong public/models`);
  }

  for (const ch of c.characters) {
    if (ch.enabled) continue;
    const fb = ch.fallbackId ? chars.get(ch.fallbackId) : undefined;
    if (!fb) err(`character ${ch.id} bị tắt nhưng fallbackId thiếu/không tồn tại`);
    else if (!fb.enabled) err(`character ${ch.id}: fallback ${fb.id} cũng đang tắt`);
  }

  const mapById = new Map(c.maps.map((m) => [m.id, m]));
  for (const st of c.stages) {
    if (!mapById.has(st.mapId)) err(`stage ${st.id}: mapId ${st.mapId} không tồn tại`);
  }
  dup('mapId của chặng', c.stages.map((s) => s.mapId));
  for (const m of c.maps) {
    if (!c.stages.some((s) => s.mapId === m.id)) err(`map ${m.id}: không chặng nào dùng bản đồ này`);
  }

  for (const s of c.scenes) {
    const at = `scene ${s.id}`;
    checkChar(at, s.characterId);
    checkCond(at, { personas: s.personas, regions: s.regions });
    checkCond(at, s.if);
    checkRegions(at, s.lineByRegion);
    checkText(at, s.line);
    checkTextByRegion(at, s.lineByRegion);
    if (s.choices.length < 1) err(`${at}: cần ít nhất 1 lựa chọn`);
    if (s.ui !== undefined && s.ui !== 'dialog' && s.ui !== 'feed') err(`${at}: ui lạ ${String(s.ui)}`);

    for (const [i, l] of (s.lines ?? []).entries()) {
      if (l.characterId) checkChar(`${at} line ${i}`, l.characterId);
      checkCond(`${at} line ${i}`, l.if);
      checkRegions(`${at} line ${i}`, l.byRegion);
      checkText(`${at} line ${i}`, l.text);
      checkTextByRegion(`${at} line ${i}`, l.byRegion);
    }

    dup(`choice trong ${at}`, s.choices.map((x) => x.id));
    for (const ch of s.choices) {
      const where = `choice ${s.id}/${ch.id}`;
      if (ch.tipId && !tipIds.has(ch.tipId)) err(`${where}: tipId ${ch.tipId} không tồn tại`);
      checkCond(where, ch.if);
      checkRegions(where, ch.textByRegion);
      checkRegions(where, ch.replyByRegion);
      checkText(where, ch.text);
      checkText(where, ch.reply);
      checkTextByRegion(where, ch.textByRegion);
      checkTextByRegion(where, ch.replyByRegion);
      if (s.ui === 'feed' && !ch.author?.trim()) err(`${where}: bài đăng trong feed cần author (tên trang)`);
      for (const [k, v] of Object.entries(ch.effects)) {
        if (!(STAT_KEYS as readonly string[]).includes(k)) err(`${where}: chỉ số lạ ${k}`);
        if (!Number.isInteger(v)) err(`${where}: effect ${k} phải là số nguyên`);
      }
    }
  }

  // Scene mồ côi: không NPC, đồ vật hay sự kiện nào gọi tới thì không bao giờ chơi được (nội dung chết trong runtime).
  // (Dữ liệu viết tay có thể thiếu trường: lỗi cụ thể được báo ở phần bản đồ bên dưới, ở đây chỉ gom những gì đọc được.)
  const used = new Set(
    c.maps.flatMap((m) => [
      ...(m.npcs ?? []).flatMap((n) => [
        ...(n.action?.kind === 'talk' ? (n.action.sceneIds ?? []) : []),
        ...(n.ambush?.hitSceneIds ?? []),
      ]),
      ...(m.objects ?? []).flatMap((o) => (o.action?.kind === 'talk' ? (o.action.sceneIds ?? []) : [])),
      ...(m.events ?? []).flatMap((e) => e.sceneIds ?? []),
    ]),
  );
  for (const s of c.scenes) {
    if (!used.has(s.id)) err(`scene ${s.id}: không NPC, đồ vật hay sự kiện nào gọi tới (mồ côi)`);
  }

  const MAX_TEXT = 60; // câu hỏi trên bong bóng/nút: dài hơn là tràn màn hình điện thoại
  const checkEffects = (where: string, effects: Effects | undefined) => {
    for (const [k, v] of Object.entries(effects ?? {})) {
      if (!(STAT_KEYS as readonly string[]).includes(k)) err(`${where}: chỉ số lạ ${k}`);
      else if (!Number.isInteger(v)) err(`${where}: effect ${k} phải là số nguyên`);
      else if (Math.abs(v as number) > 100) err(`${where}: effect ${k} ngoài khoảng [-100, 100]`);
    }
  };
  const checkPersonas = (where: string, ps: readonly string[] | undefined) => {
    if (ps !== undefined && ps.length === 0) err(`${where}: personas rỗng (không ai thấy)`);
    for (const p of ps ?? []) if (!personaIds.has(p)) err(`${where}: persona ${p} không tồn tại`);
  };
  /**
   * Danh sách scene hội thoại của một NPC/đồ vật/sự kiện: tồn tại, (với NPC) do chính NPC đó nói, và với MỌI vai áp dụng
   * × vùng đều có ít nhất một scene hợp (nếu không người chơi đó không có gì để nói, cờ talked:/used: không bao giờ bật).
   */
  const checkSceneList = (where: string, ids: readonly string[], speakerId: string | null, personas?: readonly string[]) => {
    if (ids.length === 0) err(`${where}: danh sách scene rỗng`);
    for (const id of ids) {
      const s = sceneById.get(id);
      if (!s) {
        err(`${where}: scene ${id} không tồn tại`);
        continue;
      }
      if (speakerId !== null && s.characterId !== speakerId) {
        err(`${where}: scene ${id} do ${s.characterId} nói, không phải ${speakerId}`);
      }
    }
    for (const p of c.personas.filter((x) => !personas || personas.includes(x.id))) {
      for (const r of c.regions) {
        const ok = ids.some((id) => {
          const s = sceneById.get(id);
          return s && (!s.personas || s.personas.includes(p.id)) && (!s.regions || s.regions.includes(r.id));
        });
        if (!ok) err(`${where}: không có scene nào hợp persona ${p.id} ở vùng ${r.id}`);
      }
    }
  };
  const checkTexts = (where: string, texts: readonly string[]) => {
    if (texts.length === 0 || texts.some((q) => typeof q !== 'string' || !q.trim())) err(`${where}: rỗng hoặc có câu trống`);
    for (const t of texts) if (typeof t === 'string' && t.length > MAX_TEXT) err(`${where}: câu dài quá ${MAX_TEXT} ký tự: "${t.slice(0, 20)}..."`);
  };
  const checkNpc = (at: string, mapSet: string, n: MapNpc, playerId: string) => {
    const w = `${at} NPC ${n.characterId}`;
    checkChar(w, n.characterId);
    checkPersonas(w, n.personas);
    if (n.characterId === playerId) err(`${w}: trùng nhân vật người chơi`);
    const def = opts.sets?.[mapSet];
    const spot = def ? (def.spots as Record<string, { seated?: boolean } | undefined>)[n.spot] : undefined;
    if (def && !(n.spot in def.spots)) err(`${w}: vị trí ${n.spot} không có trong set ${mapSet}`);
    if (!['stand', 'wander', 'approach'].includes(n.behavior)) err(`${w}: hành vi lạ ${String(n.behavior)}`);
    if (spot?.seated === true && (n.behavior !== 'stand' || n.ambush)) {
      err(`${w}: vị trí ${n.spot} là chỗ ngồi, NPC chỉ được đứng yên (không đi lại, không lao tới hỏi)`);
    }
    for (const k of ['speed', 'leash', 'aware', 'stopDist', 'reach'] as const) {
      const v = n[k];
      if (v !== undefined && !(Number.isFinite(v) && v >= 0 && v <= 30)) err(`${w}: ${k} phải là số không âm, tối đa 30`);
    }
    if (typeof n.speed === 'number' && n.speed > 6) err(`${w}: speed quá lớn (> 6 m/s)`);
    if (!n.prompt.trim()) err(`${w}: thiếu chữ trên nút tương tác (prompt)`);
    if (!n.action.after.trim()) err(`${w}: thiếu câu nói lại (after)`);
    if (n.action.kind === 'talk') checkSceneList(`${w} talk`, n.action.sceneIds, n.characterId, n.personas);
    else {
      if (!n.action.line.trim()) err(`${w} pet: thiếu câu thoại (line)`);
      checkEffects(`${w} pet`, n.action.effects);
    }
    if (n.ambush) {
      const sh = n.ambush;
      if (!(Number.isFinite(sh.everySec) && sh.everySec >= 1)) err(`${w} ambush: everySec phải >= 1`);
      if (!(Number.isFinite(sh.range) && sh.range > 0 && sh.range <= 30)) err(`${w} ambush: range phải trong (0, 30]`);
      if (!(Number.isFinite(sh.minRange) && sh.minRange >= 0 && sh.minRange < sh.range)) {
        err(`${w} ambush: minRange phải trong [0, range)`);
      }
      const warn = sh.warnSec ?? 1.6;
      const win = sh.windowSec ?? 0.5;
      if (!(Number.isFinite(warn) && warn >= 0.6 && warn <= 4)) err(`${w} ambush: warnSec phải trong [0.6, 4] (báo trước quá ngắn thì không kịp phản ứng)`);
      if (!(Number.isFinite(win) && win >= 0.2 && win < warn)) err(`${w} ambush: windowSec phải trong [0.2, warnSec)`);
      checkTexts(`${w} ambush.questions`, sh.questions);
      for (const [pid, qs] of Object.entries(sh.questionsByPersona ?? {})) {
        if (!personaIds.has(pid)) err(`${w} ambush.questionsByPersona: persona ${pid} không tồn tại`);
        checkTexts(`${w} ambush.questionsByPersona.${pid}`, qs);
      }
      checkSceneList(`${w} ambush.hitSceneIds`, sh.hitSceneIds, n.characterId, n.personas);
    }
  };

  const checkObject = (at: string, mapSet: string, o: MapObject) => {
    const w = `${at} đồ ${o.id}`;
    checkPersonas(w, o.personas);
    const def = opts.sets?.[mapSet];
    if (def && !(o.spot in def.spots)) err(`${w}: vị trí ${o.spot} không có trong set ${mapSet}`);
    if (!o.label.trim()) err(`${w}: thiếu tên đồ (label)`);
    if (!o.prompt.trim()) err(`${w}: thiếu chữ trên nút tương tác (prompt)`);
    checkCond(`${w} requires`, o.requires);
    if (o.requires && !o.lockedLine?.trim()) err(`${w}: có requires thì cần lockedLine (báo còn thiếu gì)`);
    const a = o.action;
    if (a.kind === 'talk') checkSceneList(`${w} talk`, a.sceneIds, null, o.personas);
    else if (a.kind === 'pickup') {
      if (!a.line.trim()) err(`${w} pickup: thiếu câu thoại (line)`);
      checkEffects(`${w} pickup`, a.effects);
    } else if (a.kind === 'exit') {
      if (!a.line.trim()) err(`${w} exit: thiếu câu thoại (line)`);
    } else err(`${w}: hành động lạ ${String((a as { kind?: unknown }).kind)}`);
  };

  const checkEvent = (at: string, e: MapEvent) => {
    const w = `${at} sự kiện ${e.id}`;
    if (Object.keys(e.when ?? {}).length === 0) err(`${w}: điều kiện when rỗng (bật ngay khi vào bản đồ)`);
    checkCond(`${w} when`, e.when);
    if (e.kind !== undefined && e.kind !== 'popup' && e.kind !== 'call') err(`${w}: kind lạ ${String(e.kind)}`);
    checkSceneList(`${w}`, e.sceneIds, null);
  };

  /** Có vòng phụ thuộc giữa các nhiệm vụ (A cần quest:B, B cần quest:A) thì không nhiệm vụ nào hoàn thành được. */
  const questCycle = (quests: readonly Quest[]): string | null => {
    const deps = new Map(
      quests.map((q) => [q.id, q.objectives.flatMap((o) => (o.done.flags ?? []).filter((f) => f.startsWith('quest:')).map((f) => f.slice(6)))]),
    );
    const state = new Map<string, 1 | 2>();
    const visit = (id: string): string | null => {
      if (state.get(id) === 2) return null;
      if (state.get(id) === 1) return id;
      state.set(id, 1);
      for (const d of deps.get(id) ?? []) {
        const hit = visit(d);
        if (hit) return hit;
      }
      state.set(id, 2);
      return null;
    };
    for (const q of quests) {
      const hit = visit(q.id);
      if (hit) return hit;
    }
    return null;
  };

  dup('map', c.maps.map((m) => m.id));
  for (const m of c.maps) {
    const at = `map ${m.id}`;
    // Dữ liệu thiếu trường (JSON viết tay) phải ra danh sách lỗi dễ đọc, không phải TypeError thô.
    try {
      if (opts.sets && !opts.sets[m.setId]) err(`${at}: set 3D ${m.setId} không tồn tại`);
      if (opts.roamSets && !opts.roamSets.includes(m.setId)) err(`${at}: set ${m.setId} chưa có vùng đi lại (walk.ts)`);
      checkChar(at, m.playerId);
      dup(`NPC trong ${at}`, m.npcs.map((n) => n.characterId));
      dup(`vị trí xuất phát trong ${at}`, m.npcs.map((n) => n.spot));
      for (const n of m.npcs) checkNpc(at, m.setId, n, m.playerId);
      const objects = m.objects ?? [];
      dup(`đồ vật trong ${at}`, objects.map((o) => o.id));
      dup(`vị trí đồ vật trong ${at}`, objects.map((o) => o.spot));
      for (const o of objects) checkObject(at, m.setId, o);
      dup(`sự kiện trong ${at}`, (m.events ?? []).map((e) => e.id));
      for (const e of m.events ?? []) checkEvent(at, e);
      checkPersonas(`${at} variantByPersona`, m.variantByPersona ? Object.keys(m.variantByPersona) : undefined);

      const mapFlags = new Set(mapAutoFlags(m));
      // Cờ của NPC/đồ chỉ có với một số vai: mục tiêu dựa vào cờ đó cũng chỉ được áp dụng cho các vai ấy.
      // Nhiều nguồn cùng sinh một cờ (hai NPC cùng bắn câu hỏi): gộp vai; một nguồn không giới hạn vai thì cờ bật với mọi vai.
      const flagPersonas = new Map<string, readonly string[] | undefined>();
      const addSource = (f: string, ps: readonly string[] | undefined) => {
        if (!flagPersonas.has(f)) flagPersonas.set(f, ps);
        else {
          const cur = flagPersonas.get(f);
          flagPersonas.set(f, cur === undefined || ps === undefined ? undefined : [...new Set([...cur, ...ps])]);
        }
      };
      for (const n of m.npcs) {
        addSource(npcDoneFlag(m.id, n), n.personas);
        if (n.ambush) for (const f of [hitFlag(m.id), ...DODGE_MILESTONES.map((k) => dodgedFlag(m.id, k))]) addSource(f, n.personas);
      }
      for (const o of objects) addSource(objectDoneFlag(m.id, o), o.personas);
      dup(`quest trong ${at}`, m.quests.map((q) => q.id));
      for (const q of m.quests) {
        const w = `${at} quest ${q.id}`;
        if (q.objectives.length === 0) err(`${w}: cần ít nhất 1 mục tiêu`);
        dup(`mục tiêu trong ${w}`, q.objectives.map((o) => o.id));
        for (const o of q.objectives) {
          const ow = `${w}/${o.id}`;
          if (Object.keys(o.done).length === 0) err(`${ow}: điều kiện done rỗng (mục tiêu luôn đúng, nhiệm vụ tự xong ngay)`);
          if (o.done.personas || o.done.regions) err(`${ow}: không được giới hạn persona/vùng (không hoàn thành được với người chơi khác)`);
          checkCond(ow, o.done);
          checkPersonas(ow, o.personas);
          const applies = o.personas ?? c.personas.map((p) => p.id);
          for (const f of o.done.flags ?? []) {
            const only = flagPersonas.get(f);
            const missing = only ? applies.filter((p) => !only.includes(p)) : [];
            if (missing.length > 0) err(`${ow}: cờ ${f} không bao giờ bật với vai ${missing.join(', ')} (giới hạn personas của mục tiêu)`);
          }
          // Chỉ cờ do chính bản đồ này sinh ra mới bật được trong chế độ đi lại (không dùng cờ của luồng chính).
          for (const f of [...(o.done.flags ?? []), ...(o.done.notFlags ?? [])]) {
            if (!mapFlags.has(f)) err(`${ow}: cờ ${f} không do bản đồ này sinh ra, không bật được khi đi lại`);
          }
        }
        checkEffects(`${w} reward`, q.reward);
        for (const p of c.personas) {
          if (!q.objectives.some((o) => !o.personas || o.personas.includes(p.id))) err(`${w}: không có mục tiêu nào cho vai ${p.id}`);
        }
      }
      if (!m.quests.some((q) => q.id === m.goalQuestId)) err(`${at}: goalQuestId ${m.goalQuestId} không phải nhiệm vụ nào của bản đồ`);
      const cyc = questCycle(m.quests);
      if (cyc) err(`${at}: vòng phụ thuộc giữa các nhiệm vụ (quest:${cyc} chờ chính nó)`);
    } catch (e) {
      err(`${at}: dữ liệu thiếu hoặc sai kiểu (${e instanceof Error ? e.message : 'lỗi lạ'})`);
    }
  }

  // Nhiệm vụ của mọi bản đồ dùng chung không gian cờ `quest:<id>`.
  dup('quest (giữa các bản đồ)', c.maps.flatMap((m) => (m.quests ?? []).map((q) => q.id)));

  for (const e of c.endings) checkCond(`ending ${e.id}`, { flags: e.flags });
  const last = c.endings.at(-1);
  if (!last) err('Cần ít nhất 1 kết thúc');
  else if (last.when || last.flags) err('Kết thúc cuối cùng phải là mặc định (không có `when`/`flags`)');

  return errors;
}
