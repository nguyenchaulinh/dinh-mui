import { STAT_KEYS, type ByRegion, type Condition, type Content } from './types';

export interface ValidateOptions {
  /** Các bộ cảnh 3D có thật; có thì kiểm tra set, vị trí đứng và góc máy. */
  sets?: Record<string, { spots: Record<string, unknown>; cameras: Record<string, unknown> }>;
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
  const setFlags = new Set(c.scenes.flatMap((s) => s.choices.flatMap((ch) => ch.setFlags ?? [])));

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

  for (const e of c.endings) checkCond(`ending ${e.id}`, { flags: e.flags });
  const last = c.endings.at(-1);
  if (!last) err('Cần ít nhất 1 kết thúc');
  else if (last.when || last.flags) err('Kết thúc cuối cùng phải là mặc định (không có `when`/`flags`)');

  return errors;
}
