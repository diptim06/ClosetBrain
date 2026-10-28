import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface WardrobeModelProps {
  scrollProgress: number;
  authProgress?: number;
  isMobile?: boolean;
  prefersReducedMotion?: boolean;
}

const GLB_PATH = '/assets/closet.glb';

function WardrobeModel({
  scrollProgress,
  authProgress = 0,
  prefersReducedMotion = false
}: WardrobeModelProps) {
  const { scene } = useGLTF(GLB_PATH);
  const { camera, size } = useThree();

  const modelRootRef = useRef<THREE.Group>(null);

  // Compute visible screen dimensions at camera focal distance (z = 5.0, fov = 34 deg)
  const aspect = size.width / Math.max(1, size.height);
  const visibleHeight = 2 * Math.tan((34 * Math.PI) / 360) * 5.0; // ≈ 3.0573 Three.js units
  const visibleWidth = visibleHeight * aspect;

  const isSmallMobile = size.width < 640;
  const isTablet = size.width >= 640 && size.width < 1024;
  const isMobile = size.width < 1024;

  // Hero initial resting positions
  const initOffsetX = isMobile ? 0 : -size.width * 0.28125;
  const initY = isSmallMobile ? -0.74 : isTablet ? -0.68 : -0.07;
  const initScale = isSmallMobile ? 0.38 : isTablet ? 0.46 : 1.15;

  // Clean up view offset if unmounting
  useEffect(() => {
    return () => {
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        (camera as THREE.PerspectiveCamera).clearViewOffset();
      }
    };
  }, [camera]);

  // Prepare cloned scene with preserved materials, textures, and classified mesh groups
  const { clonedScene, sideMeshes, fadingMeshes, doorMeshes, backRef } = useMemo(() => {
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

    const sideMeshes: THREE.Mesh[] = [];
    const fadingMeshes: THREE.Mesh[] = [];
    const doorMeshes: THREE.Mesh[] = [];
    const backRef: { current: THREE.Mesh | null } = { current: null };

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name || '';

        // Deep clone material so each group can control transparency independently
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }

        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
        mats.forEach((m: THREE.Material) => {
          if (m.name === 'Mirror | polished silver backing' && m instanceof THREE.MeshStandardMaterial) {
            m.metalness = 0.1;
            m.roughness = 0.25;
          }
        });

        if (name === 'Case_|_side' || name === 'Case_|_side001') {
          // Side stiles: Keep 100% opaque, retaining authentic Walnut texture and lighting
          sideMeshes.push(mesh);
        } else if (name === 'Case_|_inset_back') {
          backRef.current = mesh;
          mats.forEach((m: THREE.Material) => { m.transparent = true; });
        } else if (name.includes('door') || name.includes('grip') || name.includes('mount') || name.includes('pull')) {
          doorMeshes.push(mesh);
          mats.forEach((m: THREE.Material) => { m.transparent = true; });
        } else {
          // Top cornice, bottom drawer, separator, panels, rail, hinges
          fadingMeshes.push(mesh);
          mats.forEach((m: THREE.Material) => { m.transparent = true; });
        }
      }
    });

    clone.updateMatrixWorld(true);
    return { clonedScene: clone, sideMeshes, fadingMeshes, doorMeshes, backRef };
  }, [scene]);

  // Update initial transform on screen resize
  useEffect(() => {
    if (isSmallMobile && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).clearViewOffset();
    }
  }, [isSmallMobile, size.width, camera]);

  // Unified smoothed progress refs to prevent drifting, jumping, or phase lag between transforms
  const smoothedProgress = useRef(0);
  const smoothedAuthProgress = useRef(0);

  useFrame((_, delta) => {
    const clampedProgress = Math.min(1, Math.max(0, scrollProgress));
    const clampedAuth = Math.min(1, Math.max(0, authProgress));

    // Smooth single progress value; instant tracking if reduced motion is preferred
    const lerpFactor = prefersReducedMotion ? 1.0 : Math.min(1, delta * 14.0);
    smoothedProgress.current = prefersReducedMotion
      ? clampedProgress
      : THREE.MathUtils.lerp(smoothedProgress.current, clampedProgress, lerpFactor);
    const p = smoothedProgress.current;

    smoothedAuthProgress.current = prefersReducedMotion
      ? clampedAuth
      : THREE.MathUtils.lerp(smoothedAuthProgress.current, clampedAuth, lerpFactor);
    const ap = smoothedAuthProgress.current;

    const isAuthMode = ap > 0.001;

    // 1. Optical horizontal positioning:
    // If in auth transition: moves horizontally toward the left side of the viewport!
    // On desktop: glides from hero right column (-0.28125 * W) to auth left column (+0.26 * W).
    // On tablet: glides from center to auth left position (+0.22 * W).
    const startOffsetX = isMobile ? 0.0 : -size.width * 0.28125;
    const centerT = Math.min(1, p / 0.50);
    const easedCenter = centerT * centerT * (3 - 2 * centerT);
    const scrollOffsetXVal = THREE.MathUtils.lerp(startOffsetX, 0.0, easedCenter);

    const desktopTargetAuthOffsetX = size.width * 0.26;
    const tabletTargetAuthOffsetX = size.width * 0.22;
    const targetAuthOffsetX = isTablet ? tabletTargetAuthOffsetX : desktopTargetAuthOffsetX;

    const currentOffsetXVal = isAuthMode
      ? THREE.MathUtils.lerp(startOffsetX, targetAuthOffsetX, ap)
      : scrollOffsetXVal;

    // 2. Vertical position & zoom progression:
    const scaleProgress = Math.min(1, p / 0.72);
    const easedScaleT = scaleProgress * scaleProgress * (3 - 2 * scaleProgress);
    const scrollYVal = THREE.MathUtils.lerp(initY, 0.0, easedScaleT);

    // On small mobile in auth mode: slightly elevate wardrobe to top-left area to comfortably accommodate form below
    const mobileAuthY = THREE.MathUtils.lerp(initY, 0.44, ap);
    const currentYVal = (isSmallMobile && isAuthMode) ? mobileAuthY : scrollYVal;

    // 3. Stile scaling to viewport edges:
    const targetScaleX = (visibleWidth / 2) / 0.5735;
    const targetScaleY = Math.max(targetScaleX, (visibleHeight / 1.838) * 1.10);

    const scrollScaleX = THREE.MathUtils.lerp(initScale, targetScaleX, easedScaleT);
    const scrollScaleY = THREE.MathUtils.lerp(initScale, targetScaleY, easedScaleT);
    const targetScaleZ = 0.05;
    const scrollScaleZ = THREE.MathUtils.lerp(initScale, targetScaleZ, easedScaleT);

    // On small mobile in auth mode, slightly adapt scale (0.38 -> 0.30)
    const mobileAuthScale = THREE.MathUtils.lerp(initScale, 0.30, ap);
    const currentScaleX = (isSmallMobile && isAuthMode) ? mobileAuthScale : scrollScaleX;
    const currentScaleY = (isSmallMobile && isAuthMode) ? mobileAuthScale : scrollScaleY;
    const currentScaleZ = (isSmallMobile && isAuthMode) ? mobileAuthScale : scrollScaleZ;

    // Small mobile horizontal position in auth mode
    const mobileAuthPosX = THREE.MathUtils.lerp(0, -0.22, ap);
    const currentPosX = (isSmallMobile && isAuthMode) ? mobileAuthPosX : 0;

    // Apply synchronized transforms to wardrobe container
    if (modelRootRef.current) {
      modelRootRef.current.position.x = currentPosX;
      modelRootRef.current.position.y = currentYVal;
      modelRootRef.current.rotation.set(0, 0, 0);
      modelRootRef.current.scale.set(currentScaleX, currentScaleY, currentScaleZ);
    }

    // 4. Door Rotation: smoothly opens outer hinge pivots in lockstep with the approach (only during scroll, stays closed during auth)
    const doorRotT = isAuthMode ? 0 : Math.min(1, Math.max(0, (p - 0.10) / 0.40));
    const easedDoor = doorRotT * doorRotT * (3 - 2 * doorRotT);
    const currentDoorAngle = THREE.MathUtils.lerp(0, 2.05, easedDoor);

    const leftDoor = clonedScene.getObjectByName('Armoire_|_mirrored_door_|_stile');
    const rightDoor = clonedScene.getObjectByName('Armoire_|_mirrored_door_|_stile003');
    if (leftDoor) leftDoor.rotation.y = -currentDoorAngle;
    if (rightDoor) rightDoor.rotation.y = currentDoorAngle;

    // 5. Back panel: fades out cleanly as doors open to keep the interior portal clear (solid in auth mode)
    if (backRef.current) {
      const backMesh = backRef.current;
      const backOpacity = isAuthMode ? 1.0 : (p < 0.12 ? 1.0 : Math.max(0, 1 - (p - 0.12) / 0.28));
      const mats = (Array.isArray(backMesh.material) ? backMesh.material : [backMesh.material]) as THREE.Material[];
      mats.forEach((m: THREE.Material) => { m.opacity = backOpacity; });
      backMesh.visible = backOpacity > 0.005;
    }

    // 6. Top cornice & bottom drawer: smoothly fade out during scroll, solid in auth mode
    const topBottomOpacity = isAuthMode ? 1.0 : (p < 0.16 ? 1.0 : Math.max(0, 1 - (p - 0.16) / 0.32));
    fadingMeshes.forEach((mesh: THREE.Mesh) => {
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
      mats.forEach((m: THREE.Material) => { m.opacity = topBottomOpacity; });
      mesh.visible = topBottomOpacity > 0.005;
    });

    // 7. Doors fade as they reach wide-open angle (solid in auth mode)
    const doorOpacity = isAuthMode ? 1.0 : (p < 0.26 ? 1.0 : Math.max(0, 1 - (p - 0.26) / 0.26));
    doorMeshes.forEach((mesh: THREE.Mesh) => {
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
      mats.forEach((m: THREE.Material) => { m.opacity = doorOpacity; });
      mesh.visible = doorOpacity > 0.005;
    });

    // Apply camera view offset for horizontal framing on desktop and tablet
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      const enableViewOffset = !isSmallMobile && (Math.abs(currentOffsetXVal) > 0.005 || isAuthMode);
      if (enableViewOffset) {
        pCam.setViewOffset(size.width, size.height, currentOffsetXVal, 0, size.width, size.height);
      } else {
        pCam.clearViewOffset();
      }
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
        opacity={Math.max(0, 0.6 * (1 - Math.min(1, Math.max(0, scrollProgress)) * 2.8))}
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
  authProgress?: number;
  className?: string;
  prefersReducedMotion?: boolean;
}

export const Cupboard3D: React.FC<Cupboard3DProps> = ({
  scrollProgress = 0,
  authProgress = 0,
  className = 'w-full h-full',
  prefersReducedMotion = false
}) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5.0], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        className="w-full h-full pointer-events-none"
        style={{ pointerEvents: 'none' }}
      >
        {/* Natural lighting matching Cosmic Latte / Mocha Cream palette */}
        <ambientLight intensity={1.6} color="#FDFBF7" />
        <directionalLight position={[3.5, 5, 5]} intensity={1.8} color="#FFFBF5" castShadow />
        <directionalLight position={[-4, 2.5, 3]} intensity={0.7} color="#E8E0CE" />
        <directionalLight position={[0, -2, 4]} intensity={0.3} color="#F2ECE1" />

        <React.Suspense fallback={null}>
          <WardrobeModel
            scrollProgress={scrollProgress}
            authProgress={authProgress}
            isMobile={isMobile}
            prefersReducedMotion={prefersReducedMotion}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
};
