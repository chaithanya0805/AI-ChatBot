import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Trail, Float } from '@react-three/drei';
import * as THREE from 'three';

interface JarvisCoreProps {
  isSpeaking?: boolean;
}

export const JarvisCore = ({ isSpeaking = false }: JarvisCoreProps) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (coreRef.current) {
      coreRef.current.rotation.x = time * 0.2;
      coreRef.current.rotation.y = time * 0.3;
      // Pulse scale when speaking
      const scale = isSpeaking ? 1 + Math.sin(time * 8) * 0.05 : 1;
      coreRef.current.scale.setScalar(scale);
    }
    
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.5;
      ring1Ref.current.rotation.y = time * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = time * 0.4;
      ring2Ref.current.rotation.z = time * 0.3;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = time * 0.1;
      ring3Ref.current.rotation.z = time * 0.6;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      {/* Outer energy rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={isSpeaking ? 3 : 1} transparent opacity={0.6} />
      </mesh>
      
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.2, 0.03, 16, 100]} />
        <meshStandardMaterial color="#0066ff" emissive="#0066ff" emissiveIntensity={isSpeaking ? 4 : 2} transparent opacity={0.5} />
      </mesh>

      <mesh ref={ring3Ref}>
        <torusGeometry args={[1.9, 0.01, 16, 100]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} transparent opacity={0.3} />
      </mesh>

      {/* Inner Core */}
      <Trail width={2} color={'#00f0ff'} length={4} decay={1} local>
        <Sphere ref={coreRef} args={[1.2, 64, 64]}>
          <MeshDistortMaterial
            color="#002244"
            emissive="#00f0ff"
            emissiveIntensity={isSpeaking ? 1.5 : 0.8}
            distort={isSpeaking ? 0.4 : 0.2}
            speed={isSpeaking ? 4 : 2}
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
          />
        </Sphere>
      </Trail>
      
      {/* Core Glow */}
      <pointLight color="#00f0ff" intensity={isSpeaking ? 50 : 20} distance={10} />
      
      {/* Ambient Lighting */}
      <ambientLight intensity={0.5} />
    </Float>
  );
};
