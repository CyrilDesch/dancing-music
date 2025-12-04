import * as THREE from "three";

export type JointConstraint = {
  min: number; // radians
  max: number; // radians
};

export type Bone = {
  name: string;
  length: number;
  angle: number;
  constraint?: JointConstraint;
};

export type ArmState = {
  base: THREE.Vector3; // base position in world space
  bones: [Bone, Bone]; // upper arm + forearm
};

/**
 * Create a simple planar arm with 2 bones.
 */
export function createArmState(): ArmState {
  return {
    base: new THREE.Vector3(0, 0, 0),
    bones: [
      {
        name: "upperArm",
        length: 1.5,
        angle: 0,
        constraint: {
          min: -Math.PI / 2, // -90°
          max: Math.PI / 2, // 90°
        },
      },
      {
        name: "forearm",
        length: 1.2,
        angle: 0,
        constraint: {
          min: -Math.PI, // -180°
          max: 0, // 0°
        },
      },
    ],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Solve 2D IK for a 2-bone planar arm (XY plane).
 * Mutates arm.bones[*].angle in place.
 */
export function solveIK2D(arm: ArmState, targetWorld: THREE.Vector3): void {
  const base = arm.base;
  const [bone0, bone1] = arm.bones;

  const L1 = bone0.length;
  const L2 = bone1.length;

  // Target in arm-local coordinates (we ignore Z, planar IK)
  let tx = targetWorld.x - base.x;
  let ty = targetWorld.y - base.y;

  let d = Math.hypot(tx, ty);
  const maxReach = L1 + L2;
  const minReach = Math.abs(L1 - L2);

  // Clamp target to reachable annulus
  if (d > maxReach && d > 1e-6) {
    const scale = maxReach / d;
    tx *= scale;
    ty *= scale;
    d = maxReach;
  } else if (d < minReach && d > 1e-6) {
    const scale = minReach / d;
    tx *= scale;
    ty *= scale;
    d = minReach;
  }

  // Law of cosines for elbow angle (θ2)
  const cosTheta2 = clamp(
    (tx * tx + ty * ty - L1 * L1 - L2 * L2) / (2 * L1 * L2),
    -1,
    1
  );
  let theta2 = Math.acos(cosTheta2); // "elbow-down" solution
  // For the mirrored "elbow-up" solution, you could use: theta2 = -Math.acos(cosTheta2)

  // Shoulder angle (θ1)
  const k1 = L1 + L2 * Math.cos(theta2);
  const k2 = L2 * Math.sin(theta2);
  const theta1 = Math.atan2(ty, tx) - Math.atan2(k2, k1);

  // Apply joint constraints if present
  const c0 = bone0.constraint;
  const c1 = bone1.constraint;

  let finalTheta1 = theta1;
  let finalTheta2 = theta2;

  if (c0) {
    finalTheta1 = clamp(finalTheta1, c0.min, c0.max);
  }
  if (c1) {
    finalTheta2 = clamp(finalTheta2, c1.min, c1.max);
  }

  bone0.angle = finalTheta1;
  bone1.angle = finalTheta2;
}

export interface FKResult {
  joint0: THREE.Vector3; // base
  joint1: THREE.Vector3; // elbow
  endEffector: THREE.Vector3; // hand
}

/**
 * Forward kinematics: compute world-space joint positions from arm state.
 */
export function computeFK(arm: ArmState): FKResult {
  const base = arm.base;
  const [b0, b1] = arm.bones;

  const θ1 = b0.angle;
  const θ2 = b1.angle;

  const dir1 = new THREE.Vector3(Math.cos(θ1), Math.sin(θ1), 0);
  const joint1 = base.clone().add(dir1.clone().multiplyScalar(b0.length));

  const dir2 = new THREE.Vector3(Math.cos(θ1 + θ2), Math.sin(θ1 + θ2), 0);
  const endEff = joint1.clone().add(dir2.clone().multiplyScalar(b1.length));

  return {
    joint0: base.clone(),
    joint1,
    endEffector: endEff,
  };
}
