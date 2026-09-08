"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  RoundedBox,
  ContactShadows,
  Float,
} from "@react-three/drei";
import * as THREE from "three";
import { useClipper } from "@/lib/store";
import type { RefObject } from "react";
import type { DeviceKind } from "@/lib/types";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function DeviceMockup({ videoRef }: Props) {
  const device = useClipper((s) => s.device);
  const rotating = useClipper((s) => s.rotating);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 3.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#070708"]} />
      <fog attach="fog" args={["#070708", 5, 12]} />

      {/* lighting rig — no external HDR (kept sandbox-safe under COEP) */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#a3e635" />
      <directionalLight position={[0, -3, 2]} intensity={0.4} color="#88aaff" />
      {/* fake env reflections via a large inverted sphere */}
      <mesh scale={20}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial side={1} color="#15151a" />
      </mesh>

      <Suspense fallback={null}>
        <Float
          speed={rotating ? 1.2 : 0}
          rotationIntensity={rotating ? 0.6 : 0}
          floatIntensity={rotating ? 0.4 : 0}
        >
          <Device device={device} videoRef={videoRef} />
        </Float>
        <TextureKeepAlive videoRef={videoRef} />
      </Suspense>

      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.5}
        scale={6}
        blur={2.4}
        far={3}
        color="#000000"
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2}
        maxDistance={6}
        autoRotate={rotating}
        autoRotateSpeed={1.2}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}

function Device({ device, videoRef }: { device: DeviceKind; videoRef: Props["videoRef"] }) {
  const texture = useVideoTexture(videoRef);

  if (device === "iphone") return <Phone texture={texture} />;
  if (device === "android") return <AndroidPhone texture={texture} />;
  if (device === "ipad") return <Tablet texture={texture} />;
  if (device === "desktop") return <Monitor texture={texture} />;
  if (device === "tv") return <Tv texture={texture} />;
  if (device === "story") return <StoryFrame texture={texture} />;
  return null;
}

/** Build & keep a live THREE.VideoTexture bound to the <video> element. */
function useVideoTexture(videoRef: Props["videoRef"]) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const t = new THREE.VideoTexture(el);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    setTexture(t);
    return () => {
      t.dispose();
      setTexture(null);
    };
  }, [videoRef]);
  return texture;
}

/* ---------- Materials ---------- */
function bodyMaterial(color = "#1a1a1d", metalness = 1, roughness = 0.35) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
    />
  );
}

function screenMaterial(texture: THREE.VideoTexture | null) {
  if (texture) {
    return (
      <meshBasicMaterial map={texture} toneMapped={false} />
    );
  }
  return <meshStandardMaterial color="#0a0a0a" emissive="#1a1a1a" emissiveIntensity={0.4} />;
}

/* ---------- iPhone ---------- */
function Phone({ texture }: { texture: THREE.VideoTexture | null }) {
  return (
    <group rotation={[0, 0, 0]}>
      {/* body */}
      <RoundedBox args={[0.78, 1.6, 0.07]} radius={0.09} smoothness={6} castShadow>
        {bodyMaterial("#2b2b30", 1, 0.28)}
      </RoundedBox>
      {/* titanium frame edge highlight */}
      <RoundedBox args={[0.8, 1.62, 0.05]} radius={0.09} smoothness={6}>
        <meshStandardMaterial color="#3a3a40" metalness={1} roughness={0.2} />
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.036]}>
        <planeGeometry args={[0.7, 1.5]} />
        {screenMaterial(texture)}
      </mesh>
      {/* dynamic island */}
      <mesh position={[0, 0.66, 0.04]}>
        <planeGeometry args={[0.26, 0.07]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* back camera bump (visible when rotating) */}
      <group position={[0, 0.5, -0.05]}>
        <RoundedBox args={[0.3, 0.3, 0.03]} radius={0.05} smoothness={4}>
          {bodyMaterial("#1f1f23", 1, 0.3)}
        </RoundedBox>
        <mesh position={[-0.06, 0.06, -0.02]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial color="#000" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.06, 0.06, -0.02]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial color="#000" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.06, -0.06, -0.02]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial color="#000" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- iPad ---------- */
function Tablet({ texture }: { texture: THREE.VideoTexture | null }) {
  return (
    <group rotation={[0, 0, 0]}>
      <RoundedBox args={[1.3, 1.74, 0.06]} radius={0.08} smoothness={6} castShadow>
        {bodyMaterial("#26262b", 1, 0.3)}
      </RoundedBox>
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[1.2, 1.64]} />
        {screenMaterial(texture)}
      </mesh>
      {/* camera dot */}
      <mesh position={[0, 0.78, 0.033]}>
        <circleGeometry args={[0.018, 20]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
}

/* ---------- Desktop Monitor ---------- */
function Monitor({ texture }: { texture: THREE.VideoTexture | null }) {
  return (
    <group>
      {/* bezel */}
      <RoundedBox args={[2.1, 1.25, 0.05]} radius={0.03} smoothness={4} castShadow>
        {bodyMaterial("#0e0e10", 0.6, 0.4)}
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[2.0, 1.15]} />
        {screenMaterial(texture)}
      </mesh>
      {/* chin logo */}
      <mesh position={[0, -0.6, 0.028]}>
        <circleGeometry args={[0.015, 16]} />
        <meshStandardMaterial color="#3a3a40" metalness={1} roughness={0.2} />
      </mesh>
      {/* neck */}
      <mesh position={[0, -0.78, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.32, 16]} />
        {bodyMaterial("#1a1a1d", 1, 0.3)}
      </mesh>
      {/* base */}
      <mesh position={[0, -0.97, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.04, 32]} />
        {bodyMaterial("#161619", 1, 0.3)}
      </mesh>
    </group>
  );
}

/* ---------- Smart TV ---------- */
function Tv({ texture }: { texture: THREE.VideoTexture | null }) {
  return (
    <group>
      {/* bezel */}
      <RoundedBox args={[2.5, 1.45, 0.06]} radius={0.02} smoothness={4} castShadow>
        {bodyMaterial("#0a0a0b", 0.5, 0.5)}
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[2.42, 1.37]} />
        {screenMaterial(texture)}
      </mesh>
      {/* legs */}
      <mesh position={[-0.9, -0.85, 0.05]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.1]} />
        {bodyMaterial("#151517", 1, 0.3)}
      </mesh>
      <mesh position={[0.9, -0.85, 0.05]} rotation={[0, 0, 0.18]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.1]} />
        {bodyMaterial("#151517", 1, 0.3)}
      </mesh>
      {/* power LED */}
      <mesh position={[1.15, -0.66, 0.033]}>
        <circleGeometry args={[0.01, 12]} />
        <meshBasicMaterial color="#a3e635" />
      </mesh>
    </group>
  );
}

/* keep the texture animating — ensure the source video keeps playing */
function TextureKeepAlive({ videoRef }: { videoRef: Props["videoRef"] }) {
  useFrame(() => {
    const el = videoRef.current;
    if (el && el.paused && el.readyState >= 2) {
      el.play().catch(() => {});
    }
  });
  return null;
}

/* ---------- Android Phone (Pixel-style) ---------- */
function AndroidPhone({ texture }: { texture: THREE.VideoTexture | null }) {
  return (
    <group>
      {/* body — flat back, rounded corners, camera bar */}
      <RoundedBox args={[0.76, 1.58, 0.08]} radius={0.06} smoothness={6} castShadow>
        {bodyMaterial("#1a1a1f", 0.7, 0.35)}
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[0.68, 1.48]} />
        {screenMaterial(texture)}
      </mesh>
      {/* punch-hole camera */}
      <mesh position={[0, 0.62, 0.045]}>
        <circleGeometry args={[0.022, 20]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* camera bar on the back (visible when rotating) */}
      <group position={[0, 0.45, -0.045]}>
        <RoundedBox args={[0.5, 0.12, 0.02]} radius={0.04} smoothness={4}>
          {bodyMaterial("#2a2a30", 0.8, 0.25)}
        </RoundedBox>
        <mesh position={[-0.12, 0, -0.012]}>
          <circleGeometry args={[0.035, 24]} />
          <meshStandardMaterial color="#000" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, -0.012]}>
          <circleGeometry args={[0.035, 24]} />
          <meshStandardMaterial color="#000" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.12, 0, -0.012]}>
          <circleGeometry args={[0.035, 24]} />
          <meshStandardMaterial color="#000" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
      {/* power button */}
      <mesh position={[0.385, 0.3, 0]} castShadow>
        <boxGeometry args={[0.015, 0.18, 0.04]} />
        {bodyMaterial("#33333a", 1, 0.2)}
      </mesh>
    </group>
  );
}

/* ---------- Vertical Story / Reels Frame ---------- */
function StoryFrame({ texture }: { texture: THREE.VideoTexture | null }) {
  // a 9:16 phone-style frame with UI overlays (story header + action bar)
  return (
    <group>
      {/* phone shell */}
      <RoundedBox args={[0.85, 1.75, 0.06]} radius={0.08} smoothness={6} castShadow>
        {bodyMaterial("#0e0e12", 0.6, 0.4)}
      </RoundedBox>
      {/* screen (9:16 aspect) */}
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[0.76, 1.65]} />
        {screenMaterial(texture)}
      </mesh>
      {/* story header gradient (top) */}
      <mesh position={[0, 0.7, 0.035]}>
        <planeGeometry args={[0.76, 0.35]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45} />
      </mesh>
      {/* profile circle */}
      <mesh position={[-0.28, 0.72, 0.036]}>
        <circleGeometry args={[0.035, 24]} />
        <meshBasicMaterial color="#a3e635" />
      </mesh>
      {/* username bar */}
      <mesh position={[-0.16, 0.72, 0.036]}>
        <planeGeometry args={[0.18, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* progress bars (story segments) */}
      {[-0.3, -0.16, -0.02, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.82, 0.037]}>
          <planeGeometry args={[0.115, 0.008]} />
          <meshBasicMaterial color={i === 0 ? "#a3e635" : "#ffffff44"} />
        </mesh>
      ))}
      {/* bottom action bar gradient */}
      <mesh position={[0, -0.72, 0.035]}>
        <planeGeometry args={[0.76, 0.4]} />
        <meshBasicMaterial color="#000" transparent opacity={0.5} />
      </mesh>
      {/* "send" arrow icon placeholder */}
      <mesh position={[0.3, -0.72, 0.036]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      {/* like + comment dots */}
      <mesh position={[-0.28, -0.66, 0.036]}>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.2, -0.66, 0.036]}>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
