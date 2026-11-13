import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { CircleGeometry, MeshBasicMaterial, type Object3D } from 'three';
import { PROP_MODELS, propOf, propOrigin, propScale, propSize, type PropModel } from './propModels';

/**
 * Đồ đạc và cây cối bằng model CC0 (public/models/props, nguồn trong CREDITS.md), thay cho các khối hộp ghép bằng code.
 * Gốc toạ độ của `Prop` là tâm đáy của model, nên `position` là chỗ model đứng trên mặt đất. Cỡ đặt theo mét: `fit.h`
 * (cao), `fit.w` (rộng) hoặc `fit.d` (sâu), hoặc `fit.s` (nhân thêm vào đơn vị gốc của bộ model).
 */

const NO_DRACO = false;
const NO_MESHOPT = false;
type V3 = [number, number, number];

const urlOf = (slug: string): string => {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith('/') ? base : `${base}/`}models/props/${slug}.glb`;
};

/** Tải trước một số model (gọi khi biết cảnh sắp vào dùng những gì). */
export function preloadProps(slugs: readonly string[]): void {
  for (const s of new Set(slugs)) if (propOf(s)) useGLTF.preload(urlOf(s), NO_DRACO, NO_MESHOPT);
}

/** Tải trước toàn bộ (ít file nhỏ; dùng khi không biết trước). */
export const preloadAllProps = (): void => preloadProps(PROP_MODELS.map((p) => p.slug));

// Bóng tiếp xúc rẻ tiền dưới chân đồ: một đĩa mờ dùng chung hình và vật liệu (không phải shadow map).
const BLOB_GEO = new CircleGeometry(1, 16);
const BLOB_MAT = new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });

function PropInner({ p, position, rotY, fit, blob }: Readonly<{ p: PropModel; position: V3; rotY: number; fit: PropFit; blob: boolean }>) {
  const gltf = useGLTF(urlOf(p.slug), NO_DRACO, NO_MESHOPT);
  const obj = useMemo<Object3D>(() => gltf.scene.clone(true), [gltf.scene]);
  const k = p.unit * propScale(p, fit);
  const o = propOrigin(p);
  const [w, , d] = propSize(p, propScale(p, fit));
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {blob && <mesh geometry={BLOB_GEO} material={BLOB_MAT} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[Math.max(w, 0.2) * 0.62, Math.max(d, 0.2) * 0.62, 1]} />}
      <group scale={k}>
        <primitive object={obj} position={o} />
      </group>
    </group>
  );
}

export interface PropFit {
  h?: number;
  w?: number;
  d?: number;
  s?: number;
}

export function Prop({
  model,
  position = [0, 0, 0],
  rotY = 0,
  fit = {},
  blob = false,
}: Readonly<{ model: string; position?: V3; rotY?: number; fit?: PropFit; blob?: boolean }>) {
  const p = propOf(model);
  if (!p) {
    if (import.meta.env.DEV) console.warn(`Prop: không có model "${model}" trong propModels.ts`);
    return null;
  }
  return (
    <Suspense fallback={null}>
      <PropInner p={p} position={position} rotY={rotY} fit={fit} blob={blob} />
    </Suspense>
  );
}
