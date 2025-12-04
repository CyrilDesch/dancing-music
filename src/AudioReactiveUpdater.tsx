// src/AudioReactiveUpdater.tsx
// @ts-nocheck

import React from "react";
import { useFrame } from "@react-three/fiber";
import { updateAudio } from "./audioReactive";

export default function AudioReactiveUpdater() {
  useFrame((_, dt) => {
    updateAudio(dt);
  });
  return null;
}
