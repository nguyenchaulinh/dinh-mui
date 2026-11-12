import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { DEBUG } from '../debug';
import { resolveCharacter } from '../engine/engine';
import type { Content } from '../engine/types';
import { styleOfRegion } from '../scene3d/registry';
import { walkAreaFor } from '../scene3d/walk';
import { InputController } from './input';
import { RoamControls } from './RoamControls';
import type { RoamNpc } from './RoamView';

const RoamView = lazy(() => import('./RoamView'));

/** Bản thử bước 1: đi lại trong sân nhà, họ hàng lấy từ cảnh "bvn-1-dl". */
export const ROAM_DEMO = { setId: 'san-nha', sceneId: 'bvn-1-dl', playerId: 'ban' } as const;

/** Ghép danh sách NPC cho chế độ đi lại từ khai báo diễn viên của một scene (đã áp kill-switch). */
export function npcsFromScene(content: Content, sceneId: string, playerId: string): RoamNpc[] {
  const scene = content.scenes.find((s) => s.id === sceneId);
  return (scene?.stage3d?.actors ?? [])
    .filter((a) => a.characterId !== playerId)
    .map((a) => ({
      key: a.characterId,
      look: resolveCharacter(content, a.characterId).look,
      spot: a.spot,
      anim: a.anim,
    }));
}

export function RoamScreen({
  content,
  regionId,
  onExit,
}: Readonly<{ content: Content; regionId: string; onExit: () => void }>) {
  const controller = useMemo(() => new InputController(), []);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const detach = controller.attachKeyboard();
    return () => {
      detach();
      controller.setStick(0, 0);
    };
  }, [controller]);

  const area = useMemo(() => walkAreaFor(ROAM_DEMO.setId, styleOfRegion(regionId)), [regionId]);
  const npcs = useMemo(() => npcsFromScene(content, ROAM_DEMO.sceneId, ROAM_DEMO.playerId), [content]);
  const player = useMemo(() => resolveCharacter(content, ROAM_DEMO.playerId), [content]);
  const region = content.regions.find((r) => r.id === regionId);

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
      <RoamControls controller={controller} />
    </div>
  );
}
