import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import type { Group, Mesh } from 'three';
import type { Look } from '../engine/types';

/**
 * Nhân vật low-poly kiểu đồ chơi, dựng từ `Look`. Đầu to, thân nhỏ (chibi).
 * Nhận diện qua màu, kiểu tóc, phụ kiện; không dựng mặt người thật.
 * Màu chỉ nhận mã hex để tránh giá trị lạ từ nội dung.
 */

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const color = (v: string | undefined, fallback: string): string => (v && HEX.test(v) ? v : fallback);
const INK = '#1f1410';

/** Bộ chuyển động có sẵn của nhân vật. */
export type Anim = 'idle' | 'talk' | 'wave' | 'dance' | 'sit' | 'walk' | 'cry';

interface FigureProps {
  look?: Look;
  anim?: Anim;
  seated?: boolean;
  /** Đang nói: có dấu chỉ trên đầu và nhún theo lời. */
  speaking?: boolean;
  /** Lệch pha động tác để cả đám không nhún đồng loạt. */
  phase?: number;
}

function Mat({ c }: Readonly<{ c: string }>) {
  return <meshStandardMaterial color={c} flatShading roughness={0.85} />;
}

function SpeakingMarker({ y }: Readonly<{ y: number }>) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = y + Math.sin(clock.elapsedTime * 4) * 0.06;
    ref.current.rotation.y = clock.elapsedTime * 2;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.1, 0.22, 4]} />
      <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.6} flatShading />
    </mesh>
  );
}

function Hair({ style, c }: Readonly<{ style: Look['hairStyle']; c: string }>) {
  if (style === 'bald') {
    return (
      <mesh position={[0, -0.02, -0.02]} scale={[1.02, 0.5, 1.02]}>
        <torusGeometry args={[0.26, 0.05, 4, 10]} />
        <Mat c={c} />
      </mesh>
    );
  }
  return (
    <group>
      {/* mái tóc: nửa cầu phủ đỉnh đầu, hơi lệch ra sau */}
      <mesh position={[0, 0.04, -0.03]} scale={[1.06, 1, 1.08]}>
        <sphereGeometry args={[0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <Mat c={c} />
      </mesh>
      {style === 'bun' && (
        <mesh position={[0, 0.2, -0.24]}>
          <icosahedronGeometry args={[0.11, 0]} />
          <Mat c={c} />
        </mesh>
      )}
      {style === 'long' && (
        <mesh position={[0, -0.18, -0.2]}>
          <boxGeometry args={[0.46, 0.4, 0.1]} />
          <Mat c={c} />
        </mesh>
      )}
    </group>
  );
}

/** Phụ kiện gắn trên đầu/cổ. Phụ kiện cầm tay nằm ở `HandProp`. */
function HeadProp({ kind }: Readonly<{ kind: Look['accessory'] }>) {
  switch (kind) {
    case 'glasses':
      return (
        <group position={[0, 0.02, 0.25]}>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <torusGeometry args={[0.065, 0.014, 4, 10]} />
              <Mat c={INK} />
            </mesh>
          ))}
        </group>
      );
    case 'hat':
      return (
        <mesh position={[0, 0.27, 0]}>
          <coneGeometry args={[0.46, 0.24, 10]} />
          <Mat c="#e8c77a" />
        </mesh>
      );
    case 'headphones':
      return (
        <group>
          <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.3, 0.025, 4, 12, Math.PI]} />
            <Mat c="#111827" />
          </mesh>
          {[-0.29, 0.29].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
              <Mat c="#ef4444" />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

function HandProp({ kind }: Readonly<{ kind: Look['accessory'] }>) {
  switch (kind) {
    case 'phone':
      return (
        <mesh position={[0, -0.32, 0.06]}>
          <boxGeometry args={[0.1, 0.18, 0.02]} />
          <Mat c="#111827" />
        </mesh>
      );
    case 'spoon':
      return (
        <group position={[0, -0.34, 0.05]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 4]} />
            <Mat c="#d1d5db" />
          </mesh>
          <mesh position={[0, 0.13, 0]} scale={[1, 1.4, 0.4]}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <Mat c="#e5e7eb" />
          </mesh>
        </group>
      );
    case 'cup':
      return (
        <mesh position={[0, -0.34, 0.05]}>
          <cylinderGeometry args={[0.045, 0.035, 0.09, 8]} />
          <Mat c="#fef3c7" />
        </mesh>
      );
    default:
      return null;
  }
}

function Human({ look, anim, seated, speaking, phase = 0 }: Readonly<FigureProps>) {
  const skin = color(look?.skin, '#f2c9a0');
  const hair = color(look?.hair, '#3b2a20');
  const outfit = color(look?.outfit, '#b91c1c');
  const accessory = look?.accessory ?? 'none';

  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);

  const mode: Anim = speaking && (anim === undefined || anim === 'idle' || anim === 'sit') ? 'talk' : (anim ?? 'idle');

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const r = root.current;
    const h = head.current;
    const al = armL.current;
    const ar = armR.current;
    if (!r || !h || !al || !ar) return;
    // mặc định: thở nhẹ
    r.position.y = (seated ? -0.14 : 0) + Math.sin(t * 2) * 0.012;
    h.rotation.set(0, 0, 0);
    al.rotation.set(0, 0, 0.12);
    ar.rotation.set(0, 0, -0.12);

    switch (mode) {
      case 'talk':
        h.rotation.x = Math.sin(t * 9) * 0.08;
        h.rotation.y = Math.sin(t * 1.7) * 0.25;
        ar.rotation.x = -0.9 + Math.sin(t * 5) * 0.35;
        break;
      case 'wave':
        ar.rotation.z = -2.6 + Math.sin(t * 10) * 0.35;
        h.rotation.z = Math.sin(t * 3) * 0.1;
        break;
      case 'dance':
        r.position.y += Math.abs(Math.sin(t * 6)) * 0.12;
        al.rotation.z = 0.6 + Math.sin(t * 6) * 0.9;
        ar.rotation.z = -0.6 - Math.sin(t * 6) * 0.9;
        h.rotation.z = Math.sin(t * 6) * 0.15;
        break;
      case 'walk': {
        const s = Math.sin(t * 8);
        r.position.y += Math.abs(s) * 0.04;
        al.rotation.x = s * 0.6;
        ar.rotation.x = -s * 0.6;
        if (legL.current && legR.current) {
          legL.current.rotation.x = -s * 0.6;
          legR.current.rotation.x = s * 0.6;
        }
        break;
      }
      case 'cry':
        h.rotation.x = 0.35 + Math.sin(t * 12) * 0.04;
        al.rotation.x = -2.2;
        ar.rotation.x = -2.2;
        break;
      default:
        h.rotation.y = Math.sin(t * 0.7) * 0.15;
    }
    if (mode !== 'walk' && legL.current && legR.current) {
      const bend = seated ? -Math.PI / 2 : 0;
      legL.current.rotation.x = bend;
      legR.current.rotation.x = bend;
    }
  });

  return (
    <group ref={root}>
      {/* chân, xoay quanh hông */}
      {[
        [-0.1, legL],
        [0.1, legR],
      ].map(([x, ref]) => (
        <group key={String(x)} ref={ref as RefObject<Group>} position={[x as number, 0.5, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[0.13, 0.5, 0.14]} />
            <Mat c="#374151" />
          </mesh>
        </group>
      ))}
      {/* thân */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 0.66, 7]} />
        <Mat c={outfit} />
      </mesh>
      {accessory === 'scarf' && (
        <mesh position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.05, 5, 10]} />
          <Mat c="#ffffff" />
        </mesh>
      )}
      {accessory === 'bowtie' && (
        <mesh position={[0, 1.08, 0.2]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.12, 0.04]} />
          <Mat c="#fbbf24" />
        </mesh>
      )}
      {/* tay, xoay quanh vai */}
      <group ref={armL} position={[-0.27, 1.08, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.1, 0.44, 0.11]} />
          <Mat c={outfit} />
        </mesh>
        <mesh position={[0, -0.47, 0]}>
          <icosahedronGeometry args={[0.06, 0]} />
          <Mat c={skin} />
        </mesh>
      </group>
      <group ref={armR} position={[0.27, 1.08, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.1, 0.44, 0.11]} />
          <Mat c={outfit} />
        </mesh>
        <mesh position={[0, -0.47, 0]}>
          <icosahedronGeometry args={[0.06, 0]} />
          <Mat c={skin} />
        </mesh>
        <group position={[0, -0.16, 0]}>
          <HandProp kind={accessory} />
        </group>
      </group>
      {/* đầu */}
      <group ref={head} position={[0, 1.42, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.28, 1]} />
          <Mat c={skin} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.255]}>
            <sphereGeometry args={[0.035, 6, 4]} />
            <Mat c={INK} />
          </mesh>
        ))}
        {[-0.17, 0.17].map((x) => (
          <mesh key={x} position={[x, -0.07, 0.22]} scale={[1, 0.6, 0.4]}>
            <sphereGeometry args={[0.045, 6, 4]} />
            <meshStandardMaterial color="#f9a8a8" transparent opacity={0.7} />
          </mesh>
        ))}
        <Hair style={look?.hairStyle ?? 'short'} c={hair} />
        <HeadProp kind={accessory} />
      </group>
      {speaking && <SpeakingMarker y={1.95} />}
    </group>
  );
}

function Goat({ look, anim, speaking, phase = 0 }: Readonly<FigureProps>) {
  const fur = color(look?.skin, '#f5ead7');
  const scarf = color(look?.outfit, '#b91c1c');
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (!root.current) return;
    const hop = anim === 'wave' || anim === 'dance' || speaking ? Math.abs(Math.sin(t * 5)) * 0.15 : 0;
    root.current.position.y = hop + Math.sin(t * 2) * 0.01;
    root.current.rotation.z = speaking ? Math.sin(t * 6) * 0.06 : 0;
  });
  return (
    <group ref={root}>
      {[
        [-0.12, 0.12],
        [0.12, 0.12],
        [-0.12, -0.12],
        [0.12, -0.12],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.18, z!]}>
          <cylinderGeometry args={[0.04, 0.035, 0.36, 5]} />
          <Mat c="#a8a29e" />
        </mesh>
      ))}
      <mesh position={[0, 0.52, 0]} scale={[1, 0.9, 1.15]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <Mat c={fur} />
      </mesh>
      <mesh position={[0, 0.78, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.05, 5, 10]} />
        <Mat c={scarf} />
      </mesh>
      <group position={[0, 1.02, 0.12]}>
        <mesh>
          <icosahedronGeometry args={[0.26, 1]} />
          <Mat c={fur} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.12, 0.25, -0.02]} rotation={[-0.5, 0, s * -0.35]}>
              <coneGeometry args={[0.05, 0.26, 5]} />
              <Mat c="#c8a46a" />
            </mesh>
            <mesh position={[s * 0.28, 0.02, 0]} rotation={[0, 0, s * -1.1]} scale={[1, 0.45, 0.6]}>
              <sphereGeometry args={[0.11, 6, 4]} />
              <Mat c={fur} />
            </mesh>
            <mesh position={[s * 0.09, 0.03, 0.235]}>
              <sphereGeometry args={[0.032, 6, 4]} />
              <Mat c={INK} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.25, 0.12]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 5]} />
          <Mat c="#e7dcc6" />
        </mesh>
      </group>
      {speaking && <SpeakingMarker y={1.55} />}
    </group>
  );
}

function Dog({ look, anim, speaking, phase = 0 }: Readonly<FigureProps>) {
  const fur = color(look?.skin, '#d9a441');
  const tail = useRef<Group>(null);
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const excited = anim === 'dance' || anim === 'wave' || speaking;
    if (tail.current) tail.current.rotation.y = Math.sin(t * (excited ? 18 : 4)) * (excited ? 0.8 : 0.3);
    if (root.current) root.current.position.y = excited ? Math.abs(Math.sin(t * 7)) * 0.08 : 0;
  });
  return (
    <group ref={root}>
      {[
        [-0.1, 0.18],
        [0.1, 0.18],
        [-0.1, -0.18],
        [0.1, -0.18],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.13, z!]}>
          <boxGeometry args={[0.07, 0.26, 0.07]} />
          <Mat c={fur} />
        </mesh>
      ))}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.28, 0.24, 0.55]} />
        <Mat c={fur} />
      </mesh>
      <group position={[0, 0.52, 0.3]}>
        <mesh>
          <boxGeometry args={[0.24, 0.22, 0.22]} />
          <Mat c={fur} />
        </mesh>
        <mesh position={[0, -0.04, 0.15]}>
          <boxGeometry args={[0.13, 0.1, 0.12]} />
          <Mat c="#f5deb3" />
        </mesh>
        <mesh position={[0, -0.01, 0.215]}>
          <boxGeometry args={[0.05, 0.04, 0.02]} />
          <Mat c={INK} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.07, 0.04, 0.115]}>
              <sphereGeometry args={[0.025, 6, 4]} />
              <Mat c={INK} />
            </mesh>
            <mesh position={[s * 0.1, 0.14, -0.02]} rotation={[0, 0, s * -0.3]}>
              <coneGeometry args={[0.05, 0.12, 4]} />
              <Mat c="#a16207" />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={tail} position={[0, 0.42, -0.28]}>
        <mesh position={[0, 0.06, -0.08]} rotation={[0.8, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 0.22, 5]} />
          <Mat c={fur} />
        </mesh>
      </group>
      {speaking && <SpeakingMarker y={0.95} />}
    </group>
  );
}

export function Figure(props: Readonly<FigureProps>) {
  const kind = props.look?.kind ?? 'human';
  const scale = useMemo(() => {
    if (kind !== 'human') return 1;
    if (props.look?.build === 'kid') return 0.72;
    if (props.look?.build === 'elder') return 0.95;
    return 1;
  }, [kind, props.look?.build]);
  const lean = kind === 'human' && props.look?.build === 'elder' ? 0.08 : 0;

  return (
    <group scale={scale} rotation={[lean, 0, 0]}>
      {kind === 'goat' && <Goat {...props} />}
      {kind === 'dog' && <Dog {...props} />}
      {kind === 'human' && <Human {...props} />}
    </group>
  );
}
