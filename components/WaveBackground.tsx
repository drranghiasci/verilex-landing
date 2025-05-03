'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import { Mesh, Vector3 } from 'three';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

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

function Waves({ isDark }: { isDark: boolean }) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();
    const position = mesh.current.geometry.attributes.position;
    const vertex = new Vector3();

    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      vertex.z = 0.4 * Math.sin(i / 3 + time);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100, 100, 100]} />
      <meshBasicMaterial
        wireframe
        transparent
        opacity={0.14}
        color={isDark ? 'hsl(265, 80%, 65%)' : 'hsl(265, 60%, 50%)'}
      />
    </mesh>
  );
}

export default function WaveBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  if (typeof window !== 'undefined' && prefersReducedMotion) return null;

  return (
    <Canvas
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
      camera={{ position: [0, 8, 8], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0); // fully transparent
      }}
    >
      <Suspense fallback={null}>
        <Waves isDark={isDark} />
      </Suspense>
    </Canvas>
  );
}
