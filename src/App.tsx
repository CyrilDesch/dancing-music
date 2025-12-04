import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Stickman from "./Stickman";

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 50 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Background & lights */}
      <color attach="background" args={["#202025"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1} />

      <OrbitControls />

      {/* Ground for reference */}
      <gridHelper args={[10, 20]} position={[0, -2, 0]} />

      {/* Our full stickman */}
      <Stickman />
    </Canvas>
  );
}
