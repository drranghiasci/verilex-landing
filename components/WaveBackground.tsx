'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import { Mesh, Vector3 } from 'three';
import { useEffect, useState } from 'react';

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

function Waves() {
  const mesh = useRef<Mesh>(null);

  // animate the vertices for a gentle wave
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.elapsedTime;
    const position = mesh.current.geometry.attributes.position;
    const vertex = new Vector3();
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      vertex.z = 0.3 * Math.sin(i / 2 + time * 0.8);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    position.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
      {/* width, height, width-segs, height-segs */}
      <planeGeometry attach="geometry" args={[15, 15, 50, 50]} />
      <meshBasicMaterial
        attach="material"
        color="hsl(235,70%,60%)"
        wireframe
        opacity={0.12}
        transparent
      />
    </mesh>
  );
}

export default function WaveBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  if (typeof window !== 'undefined' && prefersReducedMotion) return null;

  return (
    <Canvas
      className="fixed inset-0 -z-10"
      dpr={[1, 1.5]}
      camera={{ position: [0, 5, 6], fov: 55 }}
    >
      <Suspense fallback={null}>
        <Waves />
      </Suspense>
    </Canvas>
  );
}
