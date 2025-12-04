// src/Model.tsx
// @ts-nocheck

import React, { useRef, useState } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioState } from "./audioReactive";

// hardcoded animations list so you can comment some out later
const ANIMATION_NAMES = [
  "A_TPose",
  "Crouch_Fwd_Loop",
  "Crouch_Idle_Loop",
  "Dance_Loop",
  "Death01",
  "Driving_Loop",
  "Fixing_Kneeling",
  "Hit_Chest",
  "Hit_Head",
  "Idle_Loop",
  "Idle_Talking_Loop",
  "Idle_Torch_Loop",
  "Interact",
  "Jog_Fwd_Loop",
  "Jump_Land",
  "Jump_Loop",
  "Jump_Start",
  "PickUp_Table",
  "Pistol_Aim_Down",
  "Pistol_Aim_Neutral",
  "Pistol_Aim_Up",
  "Pistol_Idle_Loop",
  "Pistol_Reload",
  "Pistol_Shoot",
  "Punch_Cross",
  "Punch_Enter",
  "Punch_Jab",
  "Push_Loop",
  "Roll",
  "Roll_RM",
  "Sitting_Enter",
  "Sitting_Exit",
  "Sitting_Idle_Loop",
  "Sitting_Talking_Loop",
  "Spell_Simple_Enter",
  "Spell_Simple_Exit",
  "Spell_Simple_Idle_Loop",
  "Spell_Simple_Shoot",
  "Sprint_Loop",
  "Swim_Fwd_Loop",
  "Swim_Idle_Loop",
  "Sword_Attack",
  "Sword_Attack_RM",
  "Sword_Idle",
  "Walk_Formal_Loop",
  "Walk_Loop",
];

function Model(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF(
    "src/assets/models/model.glb"
  );
  const { actions } = useAnimations(animations, group);

  const [currentName, setCurrentName] = useState("");
  const actionRef = useRef(null);
  const beatIndexRef = useRef(-1);
  const animIndexRef = useRef(0);

  // main reactive logic
  useFrame(() => {
    if (!actions) return;

    const {
      bass,
      level,
      treble,
      onset,
      beatIndex,
      time,
      timeSinceOnset,
    } = audioState;

    const validNames = ANIMATION_NAMES.filter((name) => actions[name]);
    if (!validNames.length) return;

    // on each detected onset, advance animation
    if (onset && beatIndexRef.current !== beatIndex) {
      beatIndexRef.current = beatIndex;

      animIndexRef.current =
        (animIndexRef.current + 1) % validNames.length;
      const name = validNames[animIndexRef.current];
      const next = actions[name];
      if (next) {
        if (actionRef.current) {
          actionRef.current.stop();
        }
        actionRef.current = next;
        setCurrentName(name);

        next
          .reset()
          .setLoop(THREE.LoopOnce, 0)
          .play();
      }
    }

    // warp based on bass/level
    if (group.current) {
      const intensity = 0.3 + level * 1.5;
      const baseScale = 1 + bass * 1.5;

      const jitter = 0.25 * intensity;

      const sx = baseScale + (Math.random() - 0.5) * jitter;
      const sy = baseScale + (Math.random() - 0.5) * jitter;
      const sz = baseScale + (Math.random() - 0.5) * jitter;
      group.current.scale.set(sx, sy, sz);

      // small continuous spin
      group.current.rotation.y += 0.02 + bass * 0.08;

      // light wobble
      group.current.position.y =
        -0.3 + Math.sin(time * 2.0 + bass * 5.0) * 0.2;
    }

    // colors from treble
    if (materials?.M_Joints && materials.M_Joints.color) {
      const hue = (treble * 5 + audioState.time * 0.4) % 1;
      materials.M_Joints.color.setHSL(hue, 1, 0.6);
      materials.M_Joints.emissive = new THREE.Color().setHSL(
        hue,
        1,
        0.5
      );
      materials.M_Joints.emissiveIntensity = 0.5 + treble * 2.0;
    }

    if (materials?.M_Main && materials.M_Main.emissive) {
      const hue =
        (audioState.progress * 2 + bass * 2 + time * 0.1) % 1;
      materials.M_Main.emissive = new THREE.Color().setHSL(
        hue,
        0.7,
        0.4
      );
      materials.M_Main.emissiveIntensity = 0.4 + level * 1.6;
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <group name="Rig">
          <group name="Mannequin">
            <skinnedMesh
              name="Mannequin_1"
              geometry={nodes.Mannequin_1.geometry}
              material={materials.M_Main}
              skeleton={nodes.Mannequin_1.skeleton}
            />
            <skinnedMesh
              name="Mannequin_2"
              geometry={nodes.Mannequin_2.geometry}
              material={materials.M_Joints}
              skeleton={nodes.Mannequin_2.skeleton}
            />
          </group>
          <primitive object={nodes.root} />
        </group>
      </group>

      {/* label above head */}
      {/* <Html position={[0, 2.5, 0]} center style={{ pointerEvents: "none" }}>
        <div
          style={{
            padding: "4px 8px",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            fontSize: "11px",
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {currentName || "Waiting for beats..."}
        </div>
      </Html> */}
    </group>
  );
}

useGLTF.preload("src/assets/models/model.glb");

export default Model;
