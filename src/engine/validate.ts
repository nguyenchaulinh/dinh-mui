import { mapAutoFlags } from './quests';
import { STAT_KEYS, type ByRegion, type Condition, type Content, type Effects, type MapNpc, type Quest } from './types';

export interface ValidateOptions {
  /** Các bộ cảnh 3D có thật; có thì kiểm tra set, vị trí đứng và góc máy. */
  sets?: Record<string, { spots: Record<string, unknown>; cameras: Record<string, unknown> }>;
  /** Id các set có vùng đi lại (walk.ts); bản đồ phải trỏ tới set nằm trong danh sách này. */
  roamSets?: readonly string[];
}

/**
 * Kiểm tra toàn vẹn nội dung: tham chiếu chéo, kill-switch, cờ, lịch sử,
 * biến thể vùng, kết thúc mặc định. Trả về danh sách lỗi; rỗng = hợp lệ.
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
  const stageIds = new Set(c.stages.map((s) => s.id));
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
    ...(c.maps ?? []).flatMap(mapAutoFlags),
  ]);

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
      const ok = s && (cid === '>' ? s.kind === 'cutscene' : s.choices.some((x) => x.id === cid));
      if (!ok) err(`${where}: lịch sử ${h} không trỏ tới lựa chọn nào`);
    }
  };

  const checkChar = (where: string, id: string) => {
    if (!chars.has(id)) err(`${where}: nhân vật ${id} không tồn tại`);
  };

  for (const ch of c.characters) {
    if (ch.enabled) continue;
    const fb = ch.fallbackId ? chars.get(ch.fallbackId) : undefined;
    if (!fb) err(`character ${ch.id} bị tắt nhưng fallbackId thiếu/không tồn tại`);
    else if (!fb.enabled) err(`character ${ch.id}: fallback ${fb.id} cũng đang tắt`);
  }

  for (const st of c.stages) {
    if (!sceneById.has(st.firstSceneId)) err(`stage ${st.id}: firstSceneId ${st.firstSceneId} không tồn tại`);
  }

  for (const s of c.scenes) {
    const at = `scene ${s.id}`;
    if (!stageIds.has(s.stageId)) err(`${at}: stageId ${s.stageId} không tồn tại`);
    checkChar(at, s.characterId);
    if (s.next != null && !sceneById.has(s.next)) err(`${at}: next ${s.next} không tồn tại`);
    checkCond(at, { personas: s.personas, regions: s.regions });
    checkCond(at, s.if);
    checkRegions(at, s.lineByRegion);

    if (s.kind === 'cutscene') {
      if (s.choices.length > 0) err(`${at}: cắt cảnh không được có lựa chọn`);
    } else if (s.choices.length < 1) {
      err(`${at}: cần ít nhất 1 lựa chọn`);
    }

    for (const [i, l] of (s.lines ?? []).entries()) {
      if (l.characterId) checkChar(`${at} line ${i}`, l.characterId);
      checkCond(`${at} line ${i}`, l.if);
      checkRegions(`${at} line ${i}`, l.byRegion);
    }

    if (s.stage3d) {
      const def = opts.sets?.[s.stage3d.set];
      if (opts.sets && !def) err(`${at}: set 3D ${s.stage3d.set} không tồn tại`);
      if (def && s.stage3d.camera && !(s.stage3d.camera in def.cameras)) {
        err(`${at}: góc máy ${s.stage3d.camera} không có trong set ${s.stage3d.set}`);
      }
      for (const a of s.stage3d.actors ?? []) {
        checkChar(`${at} actor`, a.characterId);
        if (def && !(a.spot in def.spots)) err(`${at}: vị trí ${a.spot} không có trong set ${s.stage3d.set}`);
      }
    }

    dup(`choice trong ${at}`, s.choices.map((x) => x.id));
    for (const ch of s.choices) {
      const where = `choice ${s.id}/${ch.id}`;
      if (ch.tipId && !tipIds.has(ch.tipId)) err(`${where}: tipId ${ch.tipId} không tồn tại`);
      if (ch.next != null && !sceneById.has(ch.next)) err(`${where}: next ${ch.next} không tồn tại`);
      checkCond(where, ch.if);
      checkRegions(where, ch.textByRegion);
      checkRegions(where, ch.replyByRegion);
      for (const [k, v] of Object.entries(ch.effects)) {
        if (!(STAT_KEYS as readonly string[]).includes(k)) err(`${where}: chỉ số lạ ${k}`);
        if (!Number.isInteger(v)) err(`${where}: effect ${k} phải là số nguyên`);
      }
    }
  }

  const MAX_TEXT = 60; // câu hỏi trên bong bóng/nút: dài hơn là tràn màn hình điện thoại
  const checkEffects = (where: string, effects: Effects | undefined) => {
    for (const [k, v] of Object.entries(effects ?? {})) {
      if (!(STAT_KEYS as readonly string[]).includes(k)) err(`${where}: chỉ số lạ ${k}`);
      else if (!Number.isInteger(v)) err(`${where}: effect ${k} phải là số nguyên`);
      else if (Math.abs(v as number) > 100) err(`${where}: effect ${k} ngoài khoảng [-100, 100]`);
    }
  };
  /**
   * Danh sách scene hội thoại của một NPC: tồn tại, có lựa chọn, do chính NPC đó nói, và với MỌI persona × vùng đều có
   * ít nhất một scene hợp (nếu không NPC không có gì để nói với người chơi đó, cờ talked: không bao giờ bật).
   */
  const checkSceneList = (where: string, ids: readonly string[], speakerId: string) => {
    if (ids.length === 0) err(`${where}: danh sách scene rỗng`);
    for (const id of ids) {
      const s = sceneById.get(id);
      if (!s) {
        err(`${where}: scene ${id} không tồn tại`);
        continue;
      }
      if (s.kind === 'cutscene') err(`${where}: scene ${id} là cắt cảnh, cần có lựa chọn`);
      if (s.characterId !== speakerId) err(`${where}: scene ${id} do ${s.characterId} nói, không phải ${speakerId}`);
    }
    for (const p of c.personas) {
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
  const checkNpc = (at: string, mapSet: string, n: MapNpc, playerId: string, itemIds: ReadonlySet<string>) => {
    const w = `${at} NPC ${n.characterId}`;
    checkChar(w, n.characterId);
    if (n.characterId === playerId) err(`${w}: trùng nhân vật người chơi`);
    const def = opts.sets?.[mapSet];
    const spot = def ? (def.spots as Record<string, { seated?: boolean } | undefined>)[n.spot] : undefined;
    if (def && !(n.spot in def.spots)) err(`${w}: vị trí ${n.spot} không có trong set ${mapSet}`);
    if (!['stand', 'wander', 'approach'].includes(n.behavior)) err(`${w}: hành vi lạ ${String(n.behavior)}`);
    if (spot?.seated === true && (n.behavior !== 'stand' || n.shoots)) {
      err(`${w}: vị trí ${n.spot} là chỗ ngồi, NPC chỉ được đứng yên (không đi lại, không bắn)`);
    }
    for (const k of ['speed', 'leash', 'aware', 'stopDist', 'reach'] as const) {
      const v = n[k];
      if (v !== undefined && !(Number.isFinite(v) && v >= 0 && v <= 30)) err(`${w}: ${k} phải là số không âm, tối đa 30`);
    }
    if (typeof n.speed === 'number' && n.speed > 6) err(`${w}: speed quá lớn (> 6 m/s)`);
    if (!n.prompt.trim()) err(`${w}: thiếu chữ trên nút tương tác (prompt)`);
    if (typeof n.turnRate === 'number' && !(Number.isFinite(n.turnRate) && n.turnRate >= 0 && n.turnRate <= 20)) {
      err(`${w}: turnRate phải trong [0, 20] rad/s`);
    }
    if (n.serve) {
      if (!itemIds.has(n.serve.item)) err(`${w} serve: vật phẩm ${n.serve.item} không có trạm nào cho lấy (pickup)`);
      if (!n.serve.prompt.trim() || !n.serve.line.trim()) err(`${w} serve: thiếu prompt hoặc line`);
      checkEffects(`${w} serve`, n.serve.effects);
    }
    if (n.lens) {
      const l = n.lens;
      const inRange = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi;
      if (!inRange(l.range, 1, 12)) err(`${w} lens: range phải trong [1, 12] m`);
      if (!inRange(l.halfAngleDeg, 5, 80)) err(`${w} lens: halfAngleDeg phải trong [5, 80] độ`);
      if (!inRange(l.holdSec, 0.5, 10)) err(`${w} lens: holdSec phải trong [0.5, 10] giây`);
      if (!inRange(l.restSec, 0, 30)) err(`${w} lens: restSec phải trong [0, 30] giây`);
      if (!l.penaltyLine.trim()) err(`${w} lens: thiếu penaltyLine`);
      checkEffects(`${w} lens penalty`, l.penalty);
    }
    if (!n.action.after.trim()) err(`${w}: thiếu câu nói lại (after)`);
    if (n.action.kind === 'talk') checkSceneList(`${w} talk`, n.action.sceneIds, n.characterId);
    else {
      if (!n.action.line.trim()) err(`${w} pet: thiếu câu thoại (line)`);
      checkEffects(`${w} pet`, n.action.effects);
    }
    if (n.shoots) {
      const sh = n.shoots;
      if (!(Number.isFinite(sh.everySec) && sh.everySec >= 0.5)) err(`${w} shoots: everySec phải >= 0.5`);
      if (!(Number.isFinite(sh.range) && sh.range > 0 && sh.range <= 30)) err(`${w} shoots: range phải trong (0, 30]`);
      if (!(Number.isFinite(sh.speed) && sh.speed > 0 && sh.speed <= 8)) {
        err(`${w} shoots: speed phải trong (0, 8] m/s (nhanh hơn thì xuyên người chơi giữa hai khung hình)`);
      }
      if (!(Number.isFinite(sh.minRange) && sh.minRange >= 0 && sh.minRange < sh.range)) {
        err(`${w} shoots: minRange phải trong [0, range)`);
      }
      if (sh.icon !== undefined && sh.icon !== 'question' && sh.icon !== 'qr') err(`${w} shoots: icon lạ ${String(sh.icon)}`);
      checkTexts(`${w} shoots.questions`, sh.questions);
      for (const [pid, qs] of Object.entries(sh.questionsByPersona ?? {})) {
        if (!personaIds.has(pid)) err(`${w} shoots.questionsByPersona: persona ${pid} không tồn tại`);
        checkTexts(`${w} shoots.questionsByPersona.${pid}`, qs);
      }
      checkSceneList(`${w} shoots.hitSceneIds`, sh.hitSceneIds, n.characterId);
    }
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

  dup('map', (c.maps ?? []).map((m) => m.id));
  for (const m of c.maps ?? []) {
    const at = `map ${m.id}`;
    // Dữ liệu thiếu trường (JSON viết tay) phải ra danh sách lỗi dễ đọc, không phải TypeError thô.
    try {
      if (opts.sets && !opts.sets[m.setId]) err(`${at}: set 3D ${m.setId} không tồn tại`);
      if (opts.roamSets && !opts.roamSets.includes(m.setId)) err(`${at}: set ${m.setId} chưa có vùng đi lại (walk.ts)`);
      checkChar(at, m.playerId);
      dup(`NPC trong ${at}`, m.npcs.map((n) => n.characterId));
      dup(`vị trí xuất phát trong ${at}`, m.npcs.map((n) => n.spot));
      const itemIds = new Set(
        (m.stations ?? []).flatMap((st) => (st.action?.kind === 'pickup' ? [st.action.item.id] : [])),
      );
      for (const n of m.npcs) checkNpc(at, m.setId, n, m.playerId, itemIds);

      const mapFlags = new Set(mapAutoFlags(m));
      const def = opts.sets?.[m.setId];
      const checkFlagsInMap = (w: string, cond: Condition | undefined) => {
        checkCond(w, cond);
        for (const f of [...(cond?.flags ?? []), ...(cond?.notFlags ?? [])]) {
          if (!mapFlags.has(f)) err(`${w}: cờ ${f} không do bản đồ này sinh ra, không bật được khi đi lại`);
        }
      };

      // Trạm
      dup(`trạm trong ${at}`, (m.stations ?? []).map((s) => s.id));
      for (const st of m.stations ?? []) {
        const w = `${at} trạm ${st.id}`;
        if (def && !(st.spot in def.spots)) err(`${w}: vị trí ${st.spot} không có trong set ${m.setId}`);
        if (!st.label.trim() || !st.prompt.trim()) err(`${w}: thiếu label hoặc prompt`);
        if (st.reach !== undefined && !(Number.isFinite(st.reach) && st.reach > 0 && st.reach <= 6)) err(`${w}: reach phải trong (0, 6]`);
        checkFlagsInMap(w, st.if);
        const a = st.action;
        if (a.kind === 'pickup') {
          if (!a.item.id.trim() || !a.item.label.trim()) err(`${w} pickup: thiếu id/label của vật phẩm`);
          for (const r of Object.keys(a.item.labelByRegion ?? {})) if (!regionIds.has(r)) err(`${w} pickup: vùng lạ ${r}`);
        } else if (a.kind === 'use') checkEffects(`${w} use`, a.effects);
        else if (a.kind !== 'board') err(`${w}: hành động lạ ${String((a as { kind: unknown }).kind)}`);
        if (!a.line.trim()) err(`${w}: thiếu line`);
      }

      // Vùng kích hoạt
      dup(`vùng trong ${at}`, (m.zones ?? []).map((z) => z.id));
      for (const z of m.zones ?? []) {
        const w = `${at} vùng ${z.id}`;
        if (![z.x0, z.z0, z.x1, z.z1].every(Number.isFinite) || z.x0 === z.x1 || z.z0 === z.z1) err(`${w}: toạ độ hỏng hoặc vùng rỗng`);
        checkFlagsInMap(w, z.if);
      }

      // Xe máy
      if (m.traffic) {
        const t = m.traffic;
        const w = `${at} traffic`;
        if (t.lanes.length === 0) err(`${w}: cần ít nhất 1 làn`);
        for (const [i, l] of t.lanes.entries()) {
          if (!Number.isFinite(l.z)) err(`${w} làn ${i}: z hỏng`);
          if (l.dir !== 1 && l.dir !== -1) err(`${w} làn ${i}: dir phải là 1 hoặc -1`);
          if (!(Number.isFinite(l.speed) && l.speed > 0 && l.speed <= 6)) err(`${w} làn ${i}: speed phải trong (0, 6] m/s`);
        }
        if (!(Number.isInteger(t.count) && t.count >= 1 && t.count <= 40)) err(`${w}: count phải là số nguyên trong [1, 40]`);
        if (!(Number.isFinite(t.length) && t.length >= 10 && t.length <= 200)) err(`${w}: length phải trong [10, 200] m`);
        if (!(Number.isFinite(t.safeNorthZ) && Number.isFinite(t.safeSouthZ) && t.safeNorthZ < t.safeSouthZ)) {
          err(`${w}: safeNorthZ phải nhỏ hơn safeSouthZ`);
        }
        const zs = t.lanes.map((l) => l.z);
        if (zs.length > 0 && !(t.safeNorthZ < Math.min(...zs) && t.safeSouthZ > Math.max(...zs))) {
          err(`${w}: vỉa hè an toàn phải nằm ngoài các làn xe`);
        }
        if (!t.hitLine.trim()) err(`${w}: thiếu hitLine`);
        checkEffects(`${w} hit`, t.hitEffects);
      }
      dup(`quest trong ${at}`, m.quests.map((q) => q.id));
      for (const q of m.quests) {
        const w = `${at} quest ${q.id}`;
        if (q.objectives.length === 0) err(`${w}: cần ít nhất 1 mục tiêu`);
        dup(`mục tiêu trong ${w}`, q.objectives.map((o) => o.id));
        for (const o of q.objectives) {
          const ow = `${w}/${o.id}`;
          if (Object.keys(o.done).length === 0) err(`${ow}: điều kiện done rỗng (mục tiêu luôn đúng, nhiệm vụ tự xong ngay)`);
          if (o.done.personas || o.done.regions) err(`${ow}: không được giới hạn persona/vùng (không hoàn thành được với người chơi khác)`);
          // Chỉ cờ do chính bản đồ này sinh ra mới bật được trong chế độ đi lại (không dùng cờ của luồng chính).
          checkFlagsInMap(ow, o.done);
        }
        checkEffects(`${w} reward`, q.reward);
      }
      const cyc = questCycle(m.quests);
      if (cyc) err(`${at}: vòng phụ thuộc giữa các nhiệm vụ (quest:${cyc} chờ chính nó)`);
    } catch (e) {
      err(`${at}: dữ liệu thiếu hoặc sai kiểu (${e instanceof Error ? e.message : 'lỗi lạ'})`);
    }
  }

  // Hành trình: mỗi chặng trỏ tới một bản đồ và các nhiệm vụ có thật trong bản đồ đó.
  if (c.journey) {
    try {
      const steps = c.journey.steps;
      if (steps.length === 0) err('journey: cần ít nhất 1 chặng');
      if (c.journey.epilogue !== undefined && !c.journey.epilogue.trim()) err('journey: epilogue rỗng');
      dup('chặng trong journey', steps.map((s) => s.id));
      for (const st of steps) {
        const w = `journey chặng ${st.id}`;
        const map = (c.maps ?? []).find((m) => m.id === st.mapId);
        if (!map) err(`${w}: bản đồ ${st.mapId} không tồn tại`);
        if (!st.title.trim() || !st.intro.trim()) err(`${w}: thiếu title hoặc intro`);
        if (st.outro !== undefined && !st.outro.trim()) err(`${w}: outro rỗng`);
        if (st.finish.length === 0) err(`${w}: finish rỗng (chặng không bao giờ kết thúc)`);
        for (const q of st.finish) {
          if (map && !map.quests.some((x) => x.id === q)) err(`${w}: nhiệm vụ ${q} không có trong bản đồ ${st.mapId}`);
        }
      }
    } catch (e) {
      err(`journey: dữ liệu thiếu hoặc sai kiểu (${e instanceof Error ? e.message : 'lỗi lạ'})`);
    }
  }

  for (const e of c.endings) checkCond(`ending ${e.id}`, { flags: e.flags });
  const last = c.endings.at(-1);
  if (!last) err('Cần ít nhất 1 kết thúc');
  else if (last.when || last.flags) err('Kết thúc cuối cùng phải là mặc định (không có `when`/`flags`)');

  return errors;
}
