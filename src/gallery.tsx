import { Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { createRoot } from 'react-dom/client';
import { loadContent } from './content';
import { Figure } from './scene3d/Figure';
import './styles.css';

/** Trang dev: xem toàn bộ nhân vật 3D để rà style. Mở /gallery.html khi chạy `npm run dev`. */
function Gallery() {
  const { characters } = loadContent();
  const gap = 1.7;
  const x0 = -((characters.length - 1) * gap) / 2;
  return (
    <div className="game">
      <Canvas camera={{ fov: 40, position: [0, 2.2, 13] }} dpr={[1, 2]}>
        <color attach="background" args={['#fff7ed']} />
        <hemisphereLight args={['#ffffff', '#8d6e63', 0.9]} />
        <directionalLight position={[5, 8, 6]} intensity={1.3} />
        {characters.map((ch, i) => (
          <group key={ch.id} position={[x0 + i * gap, 0, 0]}>
            <Figure look={ch.look} anim={i % 3 === 0 ? 'wave' : 'idle'} phase={i} />
            <Html position={[0, -0.25, 0]} center style={{ whiteSpace: 'nowrap', fontSize: 11, textAlign: 'center' }}>
              <strong>{ch.name}</strong>
            </Html>
          </group>
        ))}
      </Canvas>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Thiếu #root');
createRoot(root).render(<Gallery />);
