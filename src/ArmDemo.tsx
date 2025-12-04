import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createArmState,
  solveIK2D,
  computeFK,
} from "./rig";
import type { ArmState } from "./rig";



export default function ArmDemo() {
  const armRef = useRef<ArmState>(createArmState());

  const upperArmRef = useRef<THREE.Mesh>(null);
  const forearmRef = useRef<THREE.Mesh>(null);
  const targetMeshRef = useRef<THREE.Mesh>(null);
  const endEffRef = useRef<THREE.Mesh>(null);

  // We'll move the target on a small ellipse to stress-test the IK.
  const target = useRef<THREE.Vector3>(new THREE.Vector3(1.5, 0.5, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Animate target in a loop
    target.current.set(
      Math.cos(t) * 1.8, // x
      Math.sin(t) * 1.0 + 0.5, // y
      0
    );

    // Solve IK in math space
    solveIK2D(armRef.current, target.current);

    // Compute joint positions via FK
    const fk = computeFK(armRef.current);
    const [bone0, bone1] = armRef.current.bones;
    const base = fk.joint0;
    const joint1 = fk.joint1;
    const endEff = fk.endEffector;

    const L1 = bone0.length;
    const L2 = bone1.length;
    const θ1 = bone0.angle;
    const θ2 = bone1.angle;

    const dir1 = new THREE.Vector3(Math.cos(θ1), Math.sin(θ1), 0);
    const dir2 = new THREE.Vector3(Math.cos(θ1 + θ2), Math.sin(θ1 + θ2), 0);

    // Upper arm: center between base and elbow, rotated by θ1
    if (upperArmRef.current) {
      const center1 = base.clone().add(dir1.clone().multiplyScalar(L1 / 2));
      upperArmRef.current.position.copy(center1);
      upperArmRef.current.rotation.set(0, 0, θ1);
    }

    // Forearm: center between elbow and hand, rotated by θ1 + θ2
    if (forearmRef.current) {
      const center2 = joint1
        .clone()
        .add(dir2.clone().multiplyScalar(L2 / 2));
      forearmRef.current.position.copy(center2);
      forearmRef.current.rotation.set(0, 0, θ1 + θ2);
    }

    // Move target mesh
    if (targetMeshRef.current) {
      targetMeshRef.current.position.copy(target.current);
    }

    // Visualize end effector
    if (endEffRef.current) {
      endEffRef.current.position.copy(endEff);
    }
  });

  const arm = armRef.current;

  return (
    <group>
      {/* Upper arm */}
      <mesh ref={upperArmRef}>
        <cylinderGeometry
          args={[0.09, 0.09, arm.bones[0].length, 12]}
        />
        <meshStandardMaterial color="#ffcc66" />
      </mesh>

      {/* Forearm */}
      <mesh ref={forearmRef}>
        <cylinderGeometry
          args={[0.08, 0.08, arm.bones[1].length, 12]}
        />
        <meshStandardMaterial color="#66ccff" />
      </mesh>

      {/* Target point */}
      <mesh ref={targetMeshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ff6666" />
      </mesh>

      {/* End effector (hand) debug sphere */}
      <mesh ref={endEffRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#00ff88" />
      </mesh>

      {/* Optional: small grid to see scale */}
      <gridHelper args={[10, 20]} position={[0, -2, 0]} />
    </group>
  );
}
