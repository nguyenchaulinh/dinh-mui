import { AnimationClip, AnimationMixer, Bone, Group, Quaternion, QuaternionKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import riggedSrc from './Rigged.tsx?raw';

/** Khung xương giả hai khúc + các clip như model thật (Idle, Walk, ...), đủ để mixer ràng buộc track với xương. */
function rig() {
  const root = new Group();
  const hips = new Bone();
  hips.name = 'Hips';
  const spine = new Bone();
  spine.name = 'Spine';
  hips.add(spine);
  root.add(hips);
  const q = new Quaternion().setFromAxisAngle({ x: 1, y: 0, z: 0 } as never, 0.3);
  const clip = (name: string) =>
    new AnimationClip(name, 1, [
      new QuaternionKeyframeTrack('Hips.quaternion', [0, 1], [0, 0, 0, 1, q.x, q.y, q.z, q.w]),
      new QuaternionKeyframeTrack('Spine.quaternion', [0, 1], [0, 0, 0, 1, q.x, q.y, q.z, q.w]),
    ]);
  return { root, clips: ['Idle', 'Walk', 'Wave', 'Talk'].map(clip) };
}

/**
 * Hồi quy lỗi trên iPhone: "undefined is not an object (evaluating 'firstInactiveBinding._cacheIndex = prevIndex')".
 * Nguyên nhân: cleanup gọi `mixer.uncacheRoot(root)` trong khi `actions` (memo) còn được dùng lại sau đó
 * (React StrictMode chạy lại effect ở dev), nên `play()` đụng vào binding đã bị xoá khỏi cache.
 * Đã tái hiện bằng model thật trong Node; ở đây giữ lại cách dùng đúng và chặn gọi `uncacheRoot` quay lại.
 */
describe('hoạt ảnh của model có xương', () => {
  it('dừng rồi phát lại mọi clip trên cùng một mixer (đúng như cleanup + effect chạy lại) không lỗi', () => {
    const { root, clips } = rig();
    const mixer = new AnimationMixer(root);
    const actions = clips.map((c) => mixer.clipAction(c)); // memo: sống qua lần chạy lại effect
    for (let round = 0; round < 3; round++) {
      for (const a of actions) {
        a.reset().play();
        mixer.update(0.016);
      }
      mixer.stopAllAction(); // cleanup trong Rigged.tsx
    }
    expect(actions.length).toBe(4);
  });

  it('Rigged.tsx không gọi uncacheRoot (làm action memo hỏng khi effect chạy lại)', () => {
    const code = riggedSrc.replace(/\/\/.*$/gm, ''); // bỏ chú thích: phần giải thích có nhắc tên hàm này
    expect(code).not.toMatch(/uncacheRoot/);
  });
});
