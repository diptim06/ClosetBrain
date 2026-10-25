import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface ArmoireMeshProps {
  scrollProgress: number;
}

const ArmoireModel: React.FC<ArmoireMeshProps> = ({ scrollProgress }) => {
  // Load front reference texture
  const frontTexture = useTexture('/assets/armoire_front.jpg');

  // Clone textures for Left Door, Right Door, and Crown for independent UV offsets
  const leftDoorTex = useMemo(() => {
    const tex = frontTexture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(0.44, 0.72);
    tex.offset.set(0.04, 0.08);
    tex.needsUpdate = true;
    return tex;
  }, [frontTexture]);

  const rightDoorTex = useMemo(() => {
    const tex = frontTexture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(0.44, 0.72);
    tex.offset.set(0.52, 0.08);
    tex.needsUpdate = true;
    return tex;
  }, [frontTexture]);

  const crownTex = useMemo(() => {
    const tex = frontTexture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(0.92, 0.22);
    tex.offset.set(0.04, 0.78);
    tex.needsUpdate = true;
    return tex;
  }, [frontTexture]);

  // Main armoire container ref
  const containerRef = useRef<THREE.Group>(null);
  const leftHingeRef = useRef<THREE.Group>(null);
  const rightHingeRef = useRef<THREE.Group>(null);
  const interiorLightRef = useRef<THREE.PointLight>(null);

  // Smooth lerp state refs to ensure cinematic heavy motion
  const currentX = useRef(3.6);
  const currentScale = useRef(0.68);
  const currentDoorRot = useRef(0);
  const currentLightInt = useRef(0);

  useFrame((_, delta) => {
    // Stage calculations based on scrollProgress (0.0 -> 1.0)
    // Stage 1 (0 -> 0.3): Move right -> center, scale up
    // Stage 2 (0.3 -> 0.6): Continue to center, doors unlatch & swing open
    // Stage 3 & 4 (0.6 -> 1.0): Reach center, scale to main focus, doors fully open (~105 deg)

    const targetX = THREE.MathUtils.lerp(3.8, 0.0, Math.min(1, scrollProgress * 1.3));
    const targetScale = THREE.MathUtils.lerp(0.68, 1.25, Math.pow(scrollProgress, 0.85));

    // Doors start opening after scrollProgress > 0.15
    const doorProgress = THREE.MathUtils.clamp((scrollProgress - 0.15) / 0.75, 0, 1);
    // Smooth ease for physical door weight
    const easedDoorProgress = Math.pow(doorProgress, 1.2);
    const targetDoorRot = THREE.MathUtils.lerp(0, Math.PI * 0.58, easedDoorProgress);

    // Interior warm glow light intensity
    const targetLightInt = THREE.MathUtils.lerp(0, 4.5, doorProgress);

    // Apply lerp for heavy antique momentum (lerp speed ~6 * delta)
    const lerpFactor = Math.min(1, delta * 5.5);
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, lerpFactor);
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, lerpFactor);
    currentDoorRot.current = THREE.MathUtils.lerp(currentDoorRot.current, targetDoorRot, lerpFactor);
    currentLightInt.current = THREE.MathUtils.lerp(currentLightInt.current, targetLightInt, lerpFactor);

    if (containerRef.current) {
      containerRef.current.position.x = currentX.current;
      containerRef.current.scale.setScalar(currentScale.current);
    }

    if (leftHingeRef.current) {
      leftHingeRef.current.rotation.y = -currentDoorRot.current;
    }

    if (rightHingeRef.current) {
      rightHingeRef.current.rotation.y = currentDoorRot.current;
    }

    if (interiorLightRef.current) {
      interiorLightRef.current.intensity = currentLightInt.current;
    }
  });

  // Dimensions of armoire
  const W = 2.2; // Width
  const H = 3.3; // Height
  const D = 1.1; // Depth
  const doorW = W / 2;

  // Dark Antique Wood Material
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2A1810',
        roughness: 0.65,
        metalness: 0.1
      }),
    []
  );

  const interiorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#382015',
        roughness: 0.7,
        metalness: 0.05
      }),
    []
  );

  const brassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#C5A059',
        roughness: 0.35,
        metalness: 0.8
      }),
    []
  );

  return (
    <group ref={containerRef} position={[3.6, -0.1, 0]}>
      {/* --- CABINET BODY FRAME --- */}

      {/* Back Wall */}
      <mesh position={[0, 0, -D / 2 + 0.04]} material={interiorMaterial}>
        <boxGeometry args={[W - 0.08, H - 0.1, 0.05]} />
      </mesh>

      {/* Top Ceiling */}
      <mesh position={[0, H / 2 - 0.04, 0]} material={interiorMaterial}>
        <boxGeometry args={[W, 0.08, D]} />
      </mesh>

      {/* Bottom Floor */}
      <mesh position={[0, -H / 2 + 0.04, 0]} material={woodMaterial}>
        <boxGeometry args={[W, 0.08, D]} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-W / 2 + 0.04, 0, 0]} material={woodMaterial}>
        <boxGeometry args={[0.08, H, D]} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[W / 2 - 0.04, 0, 0]} material={woodMaterial}>
        <boxGeometry args={[0.08, H, D]} />
      </mesh>

      {/* --- CARVED TOP CREST / PEDIMENT --- */}
      <mesh position={[0, H / 2 + 0.3, D / 2 - 0.02]}>
        <planeGeometry args={[W * 1.05, 0.7]} />
        <meshStandardMaterial
          map={crownTex}
          transparent
          alphaTest={0.1}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Carved Arch Backing */}
      <mesh position={[0, H / 2 + 0.25, 0]} material={woodMaterial}>
        <boxGeometry args={[W * 0.95, 0.5, D * 0.8]} />
      </mesh>

      {/* --- INTERIOR WARDROBE SPACE & LIGHTING --- */}

      {/* Warm Golden Interior Light Strip */}
      <pointLight
        ref={interiorLightRef}
        position={[0, H / 2 - 0.3, 0]}
        color="#FBBF24"
        distance={6}
        decay={2}
        intensity={0}
      />

      {/* Garment Clothes Rail (Golden Brass Rod) */}
      <mesh position={[0, H / 2 - 0.45, 0]} rotation={[0, 0, Math.PI / 2]} material={brassMaterial}>
        <cylinderGeometry args={[0.025, 0.025, W - 0.2, 16]} />
      </mesh>

      {/* Interior Garments / Hangers (Sample Wardrobe Clothes) */}
      <group position={[0, H / 2 - 1.2, 0]}>
        {/* Garment 1: Cream Linen Shirt */}
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.22, 1.1, 0.45]} />
          <meshStandardMaterial color="#F5EFE6" roughness={0.8} />
        </mesh>
        {/* Garment 2: Burgundy Tailored Jacket */}
        <mesh position={[-0.15, -0.05, 0]}>
          <boxGeometry args={[0.28, 1.2, 0.5]} />
          <meshStandardMaterial color="#5B1924" roughness={0.7} />
        </mesh>
        {/* Garment 3: Mocha Trench Coat */}
        <mesh position={[0.2, -0.15, 0]}>
          <boxGeometry args={[0.3, 1.35, 0.52]} />
          <meshStandardMaterial color="#8C7A6B" roughness={0.75} />
        </mesh>
        {/* Garment 4: Charcoal Trousers */}
        <mesh position={[0.5, -0.2, 0]}>
          <boxGeometry args={[0.2, 1.0, 0.42]} />
          <meshStandardMaterial color="#2B2625" roughness={0.8} />
        </mesh>
      </group>

      {/* --- HINGED DOORS --- */}

      {/* LEFT DOOR ASSEMBLY */}
      <group ref={leftHingeRef} position={[-doorW, 0, D / 2]}>
        {/* Door Leaf (Pivot at Left Edge x=0) */}
        <mesh position={[doorW / 2, 0, 0]}>
          <boxGeometry args={[doorW, H, 0.06]} />
          <meshStandardMaterial map={leftDoorTex} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Left Brass Handle */}
        <mesh position={[doorW - 0.08, -0.1, 0.05]} material={brassMaterial}>
          <boxGeometry args={[0.03, 0.45, 0.04]} />
        </mesh>
        {/* Hinge Knuckles */}
        <mesh position={[0.01, H * 0.35, 0]} material={brassMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
        </mesh>
        <mesh position={[0.01, -H * 0.35, 0]} material={brassMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
        </mesh>
      </group>

      {/* RIGHT DOOR ASSEMBLY */}
      <group ref={rightHingeRef} position={[doorW, 0, D / 2]}>
        {/* Door Leaf (Pivot at Right Edge x=0) */}
        <mesh position={[-doorW / 2, 0, 0]}>
          <boxGeometry args={[doorW, H, 0.06]} />
          <meshStandardMaterial map={rightDoorTex} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Right Brass Handle */}
        <mesh position={[-doorW + 0.08, -0.1, 0.05]} material={brassMaterial}>
          <boxGeometry args={[0.03, 0.45, 0.04]} />
        </mesh>
        {/* Hinge Knuckles */}
        <mesh position={[-0.01, H * 0.35, 0]} material={brassMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
        </mesh>
        <mesh position={[-0.01, -H * 0.35, 0]} material={brassMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
        </mesh>
      </group>

      {/* Floor Soft Shadow */}
      <ContactShadows
        position={[0, -H / 2 - 0.02, 0]}
        opacity={0.65}
        scale={6}
        blur={1.8}
        far={4}
        color="#2A1810"
      />
    </group>
  );
};

export const Armoire3DScene: React.FC<ArmoireMeshProps> = ({ scrollProgress }) => {
  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        {/* Ambient & Key Directional Lighting */}
        <ambientLight intensity={1.2} color="#FDFBF7" />
        <directionalLight position={[4, 6, 6]} intensity={1.8} color="#FFF8EE" castShadow />
        <directionalLight position={[-4, 3, 2]} intensity={0.6} color="#E8E0CE" />

        {/* Armoire 3D Model */}
        <ArmoireModel scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
};
