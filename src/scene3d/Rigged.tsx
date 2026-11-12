import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AnimationMixer, type AnimationAction, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Look } from '../engine/types';
import { BIND_HEIGHT, POM_BONES, POM_FUR, clipFor, heightFor, modelUrl, partOf, roleOf, type CharacterModel, type MatRole } from './rigging';

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
/** Không dùng Draco/Meshopt: file không nén theo kiểu đó, và tránh tự tải bộ giải mã từ CDN ngoài. */
const NO_DRACO = false;
const NO_MESHOPT = false;

export const urlOf = (model: CharacterModel) => modelUrl(model, import.meta.env.BASE_URL);

/** Tải trước model (gọi khi biết bản đồ sắp vào dùng những ai). */
export function preloadModels(models: readonly CharacterModel[]): void {
  for (const m of new Set(models)) useGLTF.preload(urlOf(m), NO_DRACO, NO_MESHOPT);
}

function colorFor(role: MatRole, look: Look): string | null {
  const ok = (c: string | undefined) => (c && HEX.test(c) ? c : null);
  switch (role) {
    case 'skin':
      return ok(look.kind === 'dog' ? undefined : look.skin);
    case 'hair':
      return ok(look.hair);
    case 'outfit':
      return ok(look.outfit);
    case 'pants':
      return ok(look.pants);
    case 'fur':
      return ok(look.skin) ?? POM_FUR.main;
    case 'fur-light':
      return POM_FUR.light;
    default:
      return null;
  }
}

/** Tên bộ phận của một mesh: chính nó hoặc nhóm cha (GLTFLoader tách mesh nhiều vật liệu thành nhóm con). */
const partName = (o: Object3D) => partOf(o.name) ?? (o.parent ? partOf(o.parent.name) : null);

/**
 * Nhân vật có xương: nhân bản cảnh GLB (mỗi nhân vật một bộ xương riêng), đổi màu vật liệu theo `look`,
 * chuẩn hoá chiều cao, phát hoạt ảnh theo `anim` (chuyển mượt 0.2 s).
 */
export function RiggedFigure({ model, look, anim, phase = 0 }: Readonly<{ model: CharacterModel; look: Look; anim?: string; phase?: number }>) {
  const gltf = useGLTF(urlOf(model), NO_DRACO, NO_MESHOPT);
  const kind = look.kind;

  const { root, scale } = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    // 1. Vật liệu chiếm nhiều nhất của mỗi bộ phận (để biết đâu là áo, đâu là quần).
    const count = new Map<string, Map<string, number>>();
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const part = partName(m) ?? '';
      const name = (m.material as Material).name;
      if (/^skin|hair|eye|moustache/i.test(name)) return;
      const n = m.geometry.index?.count ?? m.geometry.attributes.position?.count ?? 0;
      const byMat = count.get(part) ?? new Map<string, number>();
      byMat.set(name, (byMat.get(name) ?? 0) + n);
      count.set(part, byMat);
    });
    const dominant = new Map<string, string>();
    for (const [part, byMat] of count) {
      const top = [...byMat.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) dominant.set(part, top[0]);
    }
    // 2. Vật liệu riêng cho từng nhân vật rồi đổi màu.
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // khung bao tư thế gốc không theo hoạt ảnh: tránh nhân vật biến mất ở mép màn hình
      const src = m.material as MeshStandardMaterial;
      const mat = src.clone();
      const part = partName(m);
      const c = colorFor(roleOf(src.name, part, dominant.get(part ?? '') === src.name), look);
      if (c) mat.color.set(c);
      mat.roughness = 0.75;
      mat.metalness = 0;
      m.material = mat;
    });
    // 3. Chỉnh dáng Pomeranian (scale đặt lên xương, hoạt ảnh không ghi đè).
    if (model === 'cho-pom') {
      root.traverse((o) => {
        const s = POM_BONES[o.name];
        if (s !== undefined && (o as { isBone?: boolean }).isBone) o.scale.setScalar(s);
      });
    }
    // 4. Chuẩn hoá chiều cao theo chiều cao tư thế gốc đã biết (KHÔNG đo bằng Box3: xem BIND_HEIGHT).
    return { root, scale: heightFor(kind, look.build) / BIND_HEIGHT[model] };
  }, [gltf.scene, model, kind, look]);

  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const actions = useMemo(() => new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)])), [gltf.animations, mixer]);
  const current = useRef<AnimationAction | null>(null);

  useEffect(() => {
    const next = actions.get(clipFor(anim, kind)) ?? actions.get('Idle');
    if (!next || next === current.current) return;
    next.reset().play();
    if (current.current) {
      next.crossFadeFrom(current.current, 0.2, false);
    } else {
      // Lệch pha để cả đám không thở/đi đều tăm tắp.
      next.time = (phase * 0.37) % Math.max(next.getClip().duration, 0.01);
    }
    current.current = next;
  }, [anim, kind, actions, phase]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
    [mixer, root],
  );

  useFrame((_, dt) => mixer.update(Math.min(dt, 0.1)));

  return (
    <group scale={scale}>
      <primitive object={root} />
    </group>
  );
}
