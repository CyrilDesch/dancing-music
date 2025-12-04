// src/App.tsx
// @ts-nocheck

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import Model from "./Model";
import AudioReactiveUpdater from "./AudioReactiveUpdater";
import { audioState, startAudio, unmuteAudio } from "./audioReactive";

function AnimatedBackground() {
  const { scene } = useThree();
  const color = useRef(new THREE.Color("#05010a"));

  useFrame(() => {
    const { level } = audioState;
    const t = audioState.time;

    // hue rotates with time, speed modulated by level
    const hue = ((t * (0.05 + level * 0.3)) % 1 + 1) % 1;
    const saturation = 0.8;
    const lightness =
      0.05 + 0.25 * (Math.sin(t * 0.3) * 0.5 + 0.5) + level * 0.1;

    color.current.setHSL(hue, saturation, lightness);

    scene.background = color.current;
    if (scene.fog) {
      scene.fog.color.copy(color.current);
    }
  });

  return null;
}

function CameraRig() {
  const { camera } = useThree();
  const offset = useRef(Math.random() * 1000);

  useFrame(() => {
    const { bass, level } = audioState;
    const t = audioState.time;
    const o = offset.current;

    const baseRadius = 7;
    const radius =
      baseRadius +
      Math.sin(t * 0.9 + o) * 2 +
      bass * 4 +
      level * 2;

    const angle =
      t * (0.3 + level * 0.7) +
      Math.sin(t * 0.8) * 0.5 +
      o;

    const height =
      2 +
      Math.sin(t * 1.7 + o * 0.3) * (1 + level * 2) +
      bass * 2;

    camera.position.x = Math.cos(angle) * radius;
    camera.position.z = Math.sin(angle) * radius;
    camera.position.y = height;

    // little shake on strong beats
    if (audioState.onset) {
      const s = 0.2 + audioState.onsetStrength * 2;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      camera.position.z += (Math.random() - 0.5) * s;
    }

    camera.lookAt(0, 0, 0);
  });

  return null;
}

function BackgroundChaos() {
  const group = useRef();

  const cubes = useMemo(() => {
    const arr = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const radius = 6 + Math.random() * 4;
      const angle = (i / count) * Math.PI * 2;
      const y = -1.5 + Math.random() * 3;
      const size = 0.3 + Math.random() * 0.7;
      const color = new THREE.Color().setHSL(Math.random(), 0.9, 0.5);
      arr.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ),
        rotationAxis: new THREE.Vector3(
          Math.random(),
          Math.random(),
          Math.random()
        ).normalize(),
        size,
        color,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!group.current) return;
    const { level } = audioState;
    const t = audioState.time;

    group.current.rotation.y = t * (0.1 + level * 0.5);
    group.current.rotation.z =
      Math.sin(t * 0.4) * (0.1 + level * 0.4);
  });

  return (
    <group ref={group}>
      {cubes.map((c, i) => (
        <AnimatedCube key={i} config={c} />
      ))}

      <Sparkles
        count={200}
        speed={3 + audioState.treble * 8}
        opacity={0.7}
        size={4}
        color="#ff55ff"
        noise={1}
        scale={[20, 10, 20]}
      />
    </group>
  );
}

function AnimatedCube({ config }) {
  const mesh = useRef();

  useFrame(() => {
    if (!mesh.current) return;
    const t = audioState.time * config.speed;
    const { level, mids } = audioState;

    mesh.current.position.y +=
      Math.sin(t * 2.3) * 0.003 * (1 + level * 4);

    mesh.current.quaternion.setFromAxisAngle(
      config.rotationAxis,
      t * (1.5 + mids * 4)
    );

    const pulse =
      0.7 + (Math.sin(t * 5.1) + 1) * 0.25 * (1 + level * 2);
    mesh.current.scale.setScalar(config.size * pulse);
  });

  return (
    <mesh ref={mesh} position={config.position.clone()}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={config.color}
        metalness={0.6}
        roughness={0.3}
        emissive={config.color.clone().multiplyScalar(0.5)}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);

  // try muted autoplay; on any gesture/visibility, unmute and ensure playback
  useEffect(() => {
    let canceled = false;
    let startedFlag = false;

    const tryStartMuted = () => {
      if (canceled || startedFlag) return;
      startAudio({ muted: true })
        .then(() => {
          startedFlag = true;
          setStarted(true);
        })
        .catch(() => {
          // will retry on gestures/visibility
        });
    };

    const unlock = () => {
      if (canceled) return;
      unmuteAudio();
    };

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        tryStartMuted();
        unlock();
      }
    };

    tryStartMuted();

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("pointermove", unlock, true);
    document.addEventListener("visibilitychange", visibilityHandler, true);

    return () => {
      canceled = true;
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("pointermove", unlock, true);
      document.removeEventListener("visibilitychange", visibilityHandler, true);
    };
  }, []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 50 }}
        style={{ width: "100vw", height: "100vh", display: "block" }}
      >
        <fog attach="fog" args={["#05010a", 10, 40]} />
        <AnimatedBackground />
        <CameraRig />
        <AudioReactiveUpdater />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />
        <directionalLight
          position={[-5, -4, -5]}
          intensity={0.7}
          color="#55aaff"
        />

        <BackgroundChaos />

        {/* mannequin slightly above ground */}
        <group position={[0, -1.5, 0]}>
          <Model />
        </group>

        {/* faint ground */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]}>
          <circleGeometry args={[8, 64]} />
          <meshStandardMaterial
            color="#111111"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      </Canvas>
    </>
  );
}
