'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState, useEffect } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const set = () => setPrefers(mq.matches);
    set();                    // initial
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return prefers;
}

/* ─────────────────────────────────────────── Grid of points */
function DotWave() {
  const points = useRef<Points>(null);

  /* Build geometry once -------------------------------------------------- */
  const rows = 120;      // increase for finer mesh
  const cols = 120;
  const sep  = 0.25;     // point spacing

  const positions  = new Float32Array(rows * cols * 3);
  const colors     = new Float32Array(rows * cols * 3);
  const colorA     = new Color('#4f46ff');  // indigo
  const colorB     = new Color('#d946ef');  // magenta

  let idx = 0;
  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      const u = x / rows;
      const v = y / cols;
      positions[idx * 3]     = (x - rows / 2) * sep;
      positions[idx * 3 + 1] = (y - cols / 2) * sep;
      positions[idx * 3 + 2] = 0;

      // lerp between two colours
      const c = colorA.clone().lerp(colorB, v);
      colors.set([c.r, c.g, c.b], idx * 3);
      idx++;
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setAttribute('color',    new BufferAttribute(colors, 3));

  /* Animate every frame --------------------------------------------------- */
  useFrame(({ clock }) => {
    if (!points.current) return;
    const pos = points.current.geometry.attributes.position;
    const t   = clock.elapsedTime * 0.8;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = 0.6 * Math.sin((x + t) * 0.6) * Math.cos((y + t) * 0.6);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geom}>
      <pointsMaterial
        size={0.04}
        vertexColors
        depthWrite={false}
        transparent
        opacity={0.85}
      />
    </points>
  );
}

/* ──────────────────────────────────────────────── Canvas wrapper */
export default function WaveBackground() {
  const reduced = usePrefersReducedMotion();
  if (typeof window !== 'undefined' && reduced) return null;

  return (
    <Canvas
      className="absolute inset-0 -z-10"
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.6, 6], fov: 50 }}
    >
      {/* slightly dim ambient so dots don’t over-glow */}
      <color attach="background" args={['#000000']} />
      <Suspense fallback={null}>
        <DotWave />
      </Suspense>
    </Canvas>
  );
}
