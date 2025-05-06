'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense, useEffect, useState } from 'react';
import { Mesh, Vector3, Color } from 'three';
import { useTheme } from 'next-themes';

type WaveBackgroundProps = {
  className?: string;
};

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = () => setPrefers(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}

function Waves({ theme }: { theme: 'light' | 'dark' }) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    const position = mesh.current.geometry.attributes.position;
    const vertex = new Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      vertex.z = 0.3 * Math.sin(i / 2 + time * 0.8);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
  });

  const gridColor =
    theme === 'light'
      ? new Color('hsl(265, 50%, 50%)') // lighter violet grid
      : new Color('hsl(265, 80%, 70%)'); // dark theme violet

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, 0]}
    >
      <planeGeometry args={[60, 60, 80, 80]} />
      <meshBasicMaterial
        color={gridColor}
        wireframe
        opacity={theme === 'light' ? 0.12 : 0.18}
        transparent
      />
    </mesh>
  );
}

export default function WaveBackground({ className = '' }: WaveBackgroundProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { resolvedTheme } = useTheme();

  if (typeof window !== 'undefined' && prefersReducedMotion) return null;

  // fallback to 'dark' if theme is still resolving
  const theme = resolvedTheme === 'light' ? 'light' : 'dark';

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        className="w-full h-full"
        dpr={[1, 1.5]}
        camera={{ position: [0, 10, 10], fov: 65 }}
        style={{
          background: theme === 'light' ? 'white' : 'black',
        }}
      >
        <Suspense fallback={null}>
          <Waves theme={theme} />
        </Suspense>
      </Canvas>
    </div>
  );
}
