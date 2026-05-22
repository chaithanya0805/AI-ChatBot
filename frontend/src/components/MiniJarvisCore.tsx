import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface MiniJarvisCoreProps {
  isActive?: boolean;
}

export const MiniJarvisCore = ({ isActive = false }: MiniJarvisCoreProps) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (coreRef.current) {
      coreRef.current.rotation.x = time * 0.5;
      coreRef.current.rotation.y = time * 0.5;
      const scale = isActive ? 1 + Math.sin(time * 10) * 0.1 : 1;
      coreRef.current.scale.setScalar(scale);
    }
    
    if (ringRef.current) {
      ringRef.current.rotation.x = time * 0.8;
      ringRef.current.rotation.y = time * 1.2;
    }
  });

  return (
    <group scale={0.5}>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.5, 0.05, 16, 50]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={isActive ? 2 : 0.5} transparent opacity={0.8} />
      </mesh>

      <Sphere ref={coreRef} args={[1, 32, 32]}>
        <MeshDistortMaterial
          color="#001133"
          emissive="#00f0ff"
          emissiveIntensity={isActive ? 2 : 1}
          distort={isActive ? 0.3 : 0.1}
          speed={isActive ? 5 : 2}
          roughness={0.2}
          metalness={1}
          wireframe
        />
      </Sphere>
      
      <pointLight color="#00f0ff" intensity={isActive ? 10 : 2} distance={5} />
    </group>
  );
};
