import { Canvas } from '@react-three/fiber';
import { ChromaticAberration } from './components/ChromaticAberration';
import { IntroAnimation } from './components/IntroAnimation';

export default function App() {
  return (
    <Canvas
      style={{ background: '#04040c' }}
      camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 1.65, 9.8] }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <IntroAnimation />
      <ChromaticAberration amount={0.0016} />
      {/* Your portfolio scene will live here after the intro */}
    </Canvas>
  );
}
