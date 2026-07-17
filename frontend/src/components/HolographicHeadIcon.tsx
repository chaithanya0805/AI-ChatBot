import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import * as THREE from 'three';

export const HolographicHeadIcon = () => {
  const group = useRef<THREE.Group>(null);
  
  // Load the detailed helmet mesh to act as the robotic head
  const { scene } = useGLTF('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');

  useEffect(() => {
    // Traverse the helmet model and replace all materials with the premium Hologram HUD effect
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Glowing cyan wireframe aesthetic
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#002244',
          emissive: '#00f0ff',
          emissiveIntensity: 0.8,
          wireframe: true,
          transparent: true,
          opacity: 0.7,
        });
      }
    });
  }, [scene]);

  // Continuous smooth rotation for the HUD elements
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = time * 0.4; // Constant smooth spin
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={group} dispose={null} scale={2.2} position={[0, -0.2, 0]}>
        <primitive object={scene} />
        <ambientLight intensity={0.5} color="#00f0ff" />
      </group>
    </Float>
  );
};

// Preload the model
useGLTF.preload('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');
