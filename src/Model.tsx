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
      // Speed varies from 0.5 (quiet) to 3.0 (loud with bass)
      const animSpeed = 0.5 + level * 1.5 + bass * 1.0;
      currentAction.current.timeScale = animSpeed;
    }

    // warp based on bass/level
    if (group.current) {
      const intensity = 0.3 + level * 1.5;
      // Smaller base scale (reduced from 1 + bass * 3)
      const baseScale = 0.6 + bass * 0.5;

      const jitter = 0.1 * intensity;

      const sx = baseScale + (Math.random() - 0.5) * jitter;
      const sy = baseScale + (Math.random() - 0.5) * jitter;
      const sz = baseScale + (Math.random() - 0.5) * jitter;
      group.current.scale.set(sx, sy, sz);

      // continuous spin - faster with more bass
      group.current.rotation.y += 0.02 + bass * 0.08;

      // light wobble
      group.current.position.y = Math.sin(time * 2.0 + bass * 5.0) * 0.3;

      // tilt on beats
      if (onset) {
        group.current.rotation.x = (Math.random() - 0.5) * 0.3;
        group.current.rotation.z = (Math.random() - 0.5) * 0.3;
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
