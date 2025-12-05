// src/Model.tsx
// @ts-nocheck

import React, { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { audioState } from "./audioReactive";

const MODEL_PATH = "/models/cat.glb";

function Model(props) {
  const group = useRef();
  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, group);
  const currentAction = useRef(null);

  // Play the first animation when the model loads
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const firstAnimationName = Object.keys(actions)[0];
      const action = actions[firstAnimationName];
      if (action) {
        action.reset().fadeIn(0.5).play();
        currentAction.current = action;
      }
    }
  }, [actions]);

  // main reactive logic
  useFrame(() => {
    const { bass, level, onset, time } = audioState;

    // Modulate animation speed based on music
    if (currentAction.current) {
      // Speed varies from 0.5 (quiet) to 2.0 (loud with bass) - reduced intensity
      const animSpeed = 0.5 + level * 0.8 + bass * 0.5;
      currentAction.current.timeScale = animSpeed;
    }

    // warp based on bass/level
    if (group.current) {
      const intensity = 0.2 + level * 0.8;
      // Smaller base scale - further reduced
      const baseScale = 0.7 + bass * 0.3;

      const jitter = 0.05 * intensity;

      const sx = baseScale + (Math.random() - 0.5) * jitter;
      const sy = baseScale + (Math.random() - 0.5) * jitter;
      const sz = baseScale + (Math.random() - 0.5) * jitter;
      group.current.scale.set(sx, sy, sz);

      // continuous spin - slower with more bass
      group.current.rotation.y += 0.015 + bass * 0.04;

      // lighter wobble
      group.current.position.y = Math.sin(time * 2.0 + bass * 5.0) * 0.15;

      // gentler tilt on beats
      if (onset) {
        group.current.rotation.x = (Math.random() - 0.5) * 0.15;
        group.current.rotation.z = (Math.random() - 0.5) * 0.15;
      } else {
        // slowly return to normal
        group.current.rotation.x *= 0.95;
        group.current.rotation.z *= 0.95;
      }
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

export default Model;
