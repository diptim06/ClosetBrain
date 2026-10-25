import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface WardrobeModelProps {
  scrollProgress: number;
  isMobile: boolean;
}

const GLB_PATH = '/assets/closet.glb';

function WardrobeModel({ scrollProgress, isMobile }: WardrobeModelProps) {
  const { scene } = useGLTF(GLB_PATH);
  const { camera, size } = useThree();

  const modelRootRef = useRef<THREE.Group>(null);

  // Desktop right-column camera view offset (-size.width * 0.28125 centers wardrobe at 78.1% of canvas width)
  // Keeps wardrobe at world X = 0 for a pure on-axis front elevation with 0 visible side panels.
  const initOffsetX = isMobile ? 0 : -size.width * 0.28125;
  const initY = isMobile ? -0.05 : -0.07;
  const initScale = isMobile ? 0.90 : 1.15;

  // Smooth lerp state refs to avoid React re-renders during high-refresh scroll
  const currentOffsetX = useRef(initOffsetX);
  const currentY = useRef(initY);
  const currentScale = useRef(initScale);
  const currentDoorAngle = useRef(0);

  // Clean up view offset if unmounting
  useEffect(() => {
    return () => {
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        (camera as THREE.PerspectiveCamera).clearViewOffset();
      }
    };
  }, [camera]);

  // Prepare cloned scene with preserved materials, textures, and door handle parenting
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);

    // Identify Left Door & Right Door groups (with Blender hinge pivots)
    const leftDoor = clone.getObjectByName('Armoire_|_mirrored_door_|_stile');
    const rightDoor = clone.getObjectByName('Armoire_|_mirrored_door_|_stile003');

    // Identify bronze door pulls to attach to doors
    const leftGrip = clone.getObjectByName('Armoire_|_bronze_door_pull_|_grip');
    const leftMount = clone.getObjectByName('Armoire_|_bronze_door_pull_|_mount');
    const leftMount1 = clone.getObjectByName('Armoire_|_bronze_door_pull_|_mount001');

    const rightGrip = clone.getObjectByName('Armoire_|_bronze_door_pull_|_grip001');
    const rightMount2 = clone.getObjectByName('Armoire_|_bronze_door_pull_|_mount002');
    const rightMount3 = clone.getObjectByName('Armoire_|_bronze_door_pull_|_mount003');

    if (leftDoor) {
      if (leftGrip) leftDoor.attach(leftGrip);
      if (leftMount) leftDoor.attach(leftMount);
      if (leftMount1) leftDoor.attach(leftMount1);
    }

    if (rightDoor) {
      if (rightGrip) rightDoor.attach(rightGrip);
      if (rightMount2) rightDoor.attach(rightMount2);
      if (rightMount3) rightDoor.attach(rightMount3);
    }

    // Resolve Three.js PBR rendering issue: Mirror material has metalness=1.0 and roughness=0.045,
    // which renders pure black in Three.js in the absence of an environment map.
    // Adjusting to a soft silver mirror finish (metalness: 0.1, roughness: 0.25) allows it to receive
    // the scene's ambient and directional lighting without altering geometry or textures.
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            if (m.name === 'Mirror | polished silver backing' && m instanceof THREE.MeshStandardMaterial) {
              const newMat = m.clone();
              newMat.metalness = 0.1;
              newMat.roughness = 0.25;
              return newMat;
            }
            return m;
          });
        } else if (
          mesh.material &&
          mesh.material.name === 'Mirror | polished silver backing' &&
          mesh.material instanceof THREE.MeshStandardMaterial
        ) {
          const newMat = mesh.material.clone();
          newMat.metalness = 0.1;
          newMat.roughness = 0.25;
          mesh.material = newMat;
        }
      }
    });

    // Clone back panel material so it can fade out independently to open the portal passage
    const backPanel = clone.getObjectByName('Case_|_inset_back') as THREE.Mesh | undefined;
    if (backPanel && backPanel.material) {
      backPanel.material = Array.isArray(backPanel.material)
        ? backPanel.material.map(m => m.clone())
        : backPanel.material.clone();
    }

    clone.updateMatrixWorld(true);
    return clone;
  }, [scene]);

  // Update initial transform on screen resize
  useEffect(() => {
    currentOffsetX.current = isMobile ? 0 : -size.width * 0.28125;
    currentY.current = isMobile ? -0.05 : -0.07;
    currentScale.current = isMobile ? 0.90 : 1.15;
  }, [isMobile, size.width]);

  // Unified smoothed progress ref to prevent drifting, jumping, or phase lag between transforms
  const smoothedProgress = useRef(0);

  useFrame((_, delta) => {
    const clampedProgress = Math.min(1, Math.max(0, scrollProgress));

    // Smooth single progress value for 100% synchronized motion across all axes
    const lerpFactor = Math.min(1, delta * 14.0);
    smoothedProgress.current = THREE.MathUtils.lerp(smoothedProgress.current, clampedProgress, lerpFactor);
    const p = smoothedProgress.current;

    // 1. Optical horizontal centering: glides from hero right column to exact center
    const startOffsetX = isMobile ? 0.0 : -size.width * 0.28125;
    const centerT = Math.min(1, p / 0.55);
    const easedCenter = centerT * centerT * (3 - 2 * centerT);
    const currentOffsetX = THREE.MathUtils.lerp(startOffsetX, 0.0, easedCenter);

    // 2. Vertical position: maintains balanced vertical framing throughout zoom
    const startY = isMobile ? -0.05 : -0.07;
    const finalY = isMobile ? 0.12 : 0.15;
    const easedScaleT = p * p * (3 - 2 * p);
    const currentY = THREE.MathUtils.lerp(startY, finalY, easedScaleT);

    // 3. Slimmer Refined Frame Scale:
    // Expands so visible left and right wooden borders are refined and architectural (~80-85px on desktop)
    const startScale = isMobile ? 0.90 : 1.15;
    const persistentFrameScale = isMobile ? 4.20 : 5.75;
    const currentScale = THREE.MathUtils.lerp(startScale, persistentFrameScale, easedScaleT);

    // 4. Door Rotation: smoothly opens outer hinge pivots in lockstep with the approach
    const doorT = Math.min(1, Math.max(0, (p - 0.15) / 0.65));
    const easedDoor = doorT * doorT * (3 - 2 * doorT);
    const currentDoorAngle = THREE.MathUtils.lerp(0, 2.05, easedDoor);

    // 5. Back panel: fades out cleanly as doors open to keep the interior portal clear
    const backPanel = clonedScene.getObjectByName('Case_|_inset_back') as THREE.Mesh | undefined;
    if (backPanel && backPanel.material) {
      const backOpacity = p < 0.25 ? 1.0 : Math.max(0, 1 - (p - 0.25) / 0.45);
      const mats = Array.isArray(backPanel.material) ? backPanel.material : [backPanel.material];
      mats.forEach(m => {
        m.transparent = true;
        m.opacity = backOpacity;
      });
      backPanel.visible = backOpacity > 0.01;
    }

    // Apply camera view offset smoothly until centered, without sudden cutoffs
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      if (Math.abs(currentOffsetX) > 0.01) {
        pCam.setViewOffset(size.width, size.height, currentOffsetX, 0, size.width, size.height);
      } else {
        pCam.clearViewOffset();
      }
    }

    // Apply synchronized transforms to wardrobe container:
    // Stays at world X = 0 and rotation [0, 0, 0] so front face is 100% perpendicular to the viewer
    if (modelRootRef.current) {
      modelRootRef.current.position.x = 0;
      modelRootRef.current.position.y = currentY;
      modelRootRef.current.rotation.set(0, 0, 0);
      modelRootRef.current.scale.setScalar(currentScale);
    }

    // Direct lookup on the scene graph to animate doors around their Blender hinge pivots
    const leftDoor = clonedScene.getObjectByName('Armoire_|_mirrored_door_|_stile');
    const rightDoor = clonedScene.getObjectByName('Armoire_|_mirrored_door_|_stile003');

    if (leftDoor) {
      leftDoor.rotation.y = -currentDoorAngle;
    }

    if (rightDoor) {
      rightDoor.rotation.y = currentDoorAngle;
    }
  });

  return (
    <group ref={modelRootRef} position={[0, initY, 0]} rotation={[0, 0, 0]}>
      {/* Centering offset: closet.glb model bounds y=[0.136, 2.035], centered at y=-1.085 */}
      <group position={[0, -1.085, 0]}>
        <primitive object={clonedScene} />
      </group>

      {/* Ground Contact Shadow: fades cleanly as wardrobe moves into portal mode */}
      <ContactShadows
        position={[0, -0.96, 0]}
        opacity={Math.max(0, 0.6 * (1 - Math.min(1, Math.max(0, scrollProgress)) * 2.2))}
        scale={4.2}
        blur={2.0}
        far={2.5}
        color="#1E120B"
      />
    </group>
  );
}

// Preload GLB model for immediate caching
useGLTF.preload(GLB_PATH);

interface Cupboard3DProps {
  scrollProgress?: number;
  className?: string;
}

export const Cupboard3D: React.FC<Cupboard3DProps> = ({
  scrollProgress = 0,
  className = 'w-full h-full'
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5.0], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        {/* Natural lighting matching Cosmic Latte / Mocha Cream palette */}
        <ambientLight intensity={1.6} color="#FDFBF7" />
        <directionalLight position={[3.5, 5, 5]} intensity={1.8} color="#FFFBF5" castShadow />
        <directionalLight position={[-4, 2.5, 3]} intensity={0.7} color="#E8E0CE" />
        <directionalLight position={[0, -2, 4]} intensity={0.3} color="#F2ECE1" />

        <React.Suspense fallback={null}>
          <WardrobeModel scrollProgress={scrollProgress} isMobile={isMobile} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};
