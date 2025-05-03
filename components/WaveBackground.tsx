'use client';

import { Canvas, useFrame }   from '@react-three/fiber';
import { useRef, Suspense }   from 'react';
import { Mesh, Vector3 }      from 'three';
import { useEffect, useState } from 'react';

/* ––––– accessibility: honour reduced‑motion ––––– */
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

/* ––––– animated plane ––––– */
function Waves() {
  const mesh = useRef<Mesh>(null!);

  useFrame(({ clock }) => {
    const t       = clock.elapsedTime;
    const posAttr = mesh.current.geometry.attributes.position;
    const v       = new Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      v.z = 0.45 * Math.sin(i / 3 + t * 0.8);     // amplitude & speed
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
      {/* width, height, segsX, segsY */}
      <planeGeometry args={[60, 60, 120, 120]} />
      <meshBasicMaterial
        wireframe
        transparent
        opacity={0.14}
        color="hsl(265,80%,60%)"
      />
    </mesh>
  );
}

/* ––––– wrapper ––––– */
export default function WaveBackground() {
  const prefersReducedMotion = usePrefersReducedMotion();
  if (typeof window !== 'undefined' && prefersReducedMotion) return null;

  return (
    <Canvas
      /* FULL‑BLEED inside the hero */
      className="absolute inset-0 -z-10 h-full w-full pointer-events-none"
      dpr={[1, 1.5]}
      camera={{ position: [0, 8, 8], fov: 60 }}
      /* make canvas transparent (important for light‑mode) */
      gl={{ alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('transparent');
      }}
    >
      <Suspense fallback={null}>
        <Waves />
      </Suspense>
    </Canvas>
  );
}
