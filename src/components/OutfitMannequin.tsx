import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
};

const Mannequin = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (group.current && !reducedMotion) {
      group.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.8) * 0.025;
      group.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.025;
    }
  });

  return (
    <group ref={group} position={[0, -1.05, 0]}>
      {/* Warm ivory mannequin base */}
      <mesh position={[0, 2.42, 0]} castShadow>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color="#E8D9CB" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.34, 20]} />
        <meshStandardMaterial color="#E8D9CB" roughness={0.72} />
      </mesh>

      {/* Oversized lavender sweater */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.56, 0.7, 0.95, 24]} />
        <meshStandardMaterial color="#A98CCB" roughness={0.86} />
      </mesh>
      <mesh position={[-0.69, 1.43, 0]} rotation={[0, 0, -0.32]} castShadow>
        <cylinderGeometry args={[0.18, 0.21, 0.88, 16]} />
        <meshStandardMaterial color="#A98CCB" roughness={0.86} />
      </mesh>
      <mesh position={[0.69, 1.43, 0]} rotation={[0, 0, 0.32]} castShadow>
        <cylinderGeometry args={[0.18, 0.21, 0.88, 16]} />
        <meshStandardMaterial color="#A98CCB" roughness={0.86} />
      </mesh>

      {/* Tailored trousers */}
      <mesh position={[-0.24, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.2, 1.15, 18]} />
        <meshStandardMaterial color="#4A4552" roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.2, 1.15, 18]} />
        <meshStandardMaterial color="#4A4552" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, -0.3, 0.1]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.16, 0.58]} />
        <meshStandardMaterial color="#765B48" roughness={0.68} />
      </mesh>
      <mesh position={[0.25, -0.3, 0.1]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.16, 0.58]} />
        <meshStandardMaterial color="#765B48" roughness={0.68} />
      </mesh>

      {/* Minimal display stand */}
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.45, 12]} />
        <meshStandardMaterial color="#B8AFA8" metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.08, 32]} />
        <meshStandardMaterial color="#D9CEC4" roughness={0.75} />
      </mesh>
    </group>
  );
};

export const OutfitMannequin = () => {
  const reducedMotion = useReducedMotion();

  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.05, 6], fov: 30 }} frameloop={reducedMotion ? 'demand' : 'always'}>
      <color attach="background" args={['#F5EFE6']} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
      <pointLight position={[-3, 2, 2]} intensity={1.1} color="#D9B8F2" />
      <Mannequin reducedMotion={reducedMotion} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minPolarAngle={Math.PI / 2.25}
        maxPolarAngle={Math.PI / 1.75}
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
      />
    </Canvas>
  );
};
