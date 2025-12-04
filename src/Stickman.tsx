import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Stickman() {
  // Refs to the parts we want to animate
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  // Build the stickman hierarchy once
  const root = useMemo(() => {
    const rootGroup = new THREE.Group();

    // --- Parameters ---
    const torsoHeight = 2;
    const armLength = 1.3;
    const legLength = 1.6;
    const limbRadius = 0.12;

    // --- Torso (oval body) ---
    const points = [];
    const torsoRadiusX = 0.6;
    const torsoRadiusZ = 0.35;
    const segments = 10;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * torsoHeight;
      // Ellipse cross-section around XZ plane
      const r = Math.sin(Math.PI * t) * torsoRadiusX;
      points.push(new THREE.Vector2(r, y));
    }
    const torsoGeometry = new THREE.LatheGeometry(points, 16);
    const torsoMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      flatShading: false,
    });
    const torsoMesh = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torsoMesh.position.y = 0;
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);


    // --- Head ---
    const headRadius = 0.4;
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius, 16, 16),
      new THREE.MeshStandardMaterial({ color: "#dddddd" })
    );
    headMesh.position.y = torsoHeight + headRadius;
    torsoGroup.add(headMesh);

    // --- Shoulders pivot (where arms attach) ---
    const shouldersY = torsoHeight; // same as torso top

    // Left arm group (pivot at left shoulder)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.8, shouldersY, 0); // shoulder position
    torsoGroup.add(leftArmGroup);

    // Right arm group (pivot at right shoulder)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.8, shouldersY, 0);
    torsoGroup.add(rightArmGroup);

    // Upper arm (left)
    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRadius, limbRadius, armLength, 10),
      new THREE.MeshStandardMaterial({ color: "#ff8888" })
    );
    // Arm extends downwards from shoulder: center at -armLength/2 in local Y
    leftUpperArm.position.y = -armLength / 2;
    leftArmGroup.add(leftUpperArm);

    // Upper arm (right)
    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRadius, limbRadius, armLength, 10),
      new THREE.MeshStandardMaterial({ color: "#8888ff" })
    );
    rightUpperArm.position.y = -armLength / 2;
    rightArmGroup.add(rightUpperArm);

    // --- Legs (attached at hip) ---
    const hipY = 0;
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.5, hipY, 0); // wider spacing
    torsoGroup.add(leftLegGroup);
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.5, hipY, 0); // wider spacing
    torsoGroup.add(rightLegGroup);

    const leftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRadius, limbRadius, legLength, 10),
      new THREE.MeshStandardMaterial({ color: "#88ff88" })
    );
    leftLeg.position.y = -legLength / 2;
    leftLegGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(limbRadius, limbRadius, legLength, 10),
      new THREE.MeshStandardMaterial({ color: "#88ff88" })
    );
    rightLeg.position.y = -legLength / 2;
    rightLegGroup.add(rightLeg);

    // Expose arm groups through refs in the render function
    (rootGroup as any)._leftArmGroup = leftArmGroup;
    (rootGroup as any)._rightArmGroup = rightArmGroup;

    // Lift the whole character a bit so feet are around y ≈ -2 (above grid)
    rootGroup.position.y = 0;

    return rootGroup;
  }, []);

  // Attach the internal groups to the refs after creation
  // (we do it in render via cast, see below)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const swing = Math.sin(t * 2) * 0.8; // amplitude

    if (leftArmRef.current) {
      // Rotate around Z or X depending on desired motion plane
      leftArmRef.current.rotation.z = swing;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -swing;
    }
  });

  return (
    <primitive
      object={root}
      // this callback runs once root is in the scene, we can hook the arm groups
      ref={(g: THREE.Group | null) => {
        if (g) {
          // Our groups are stored on the root via custom props
          const anyG = g as any;
          if (anyG._leftArmGroup && !leftArmRef.current) {
            leftArmRef.current = anyG._leftArmGroup;
          }
          if (anyG._rightArmGroup && !rightArmRef.current) {
            rightArmRef.current = anyG._rightArmGroup;
          }
        }
      }}
      scale={1.5} // make the stickman a bit bigger
    />
  );
}
