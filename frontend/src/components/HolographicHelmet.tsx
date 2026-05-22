import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export const HolographicHelmet = () => {
  const group = useRef<THREE.Group>(null);
  
  // Load the detailed helmet mesh
  const { scene } = useGLTF('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');

  useEffect(() => {
    // Enhance the materials for a hyper-realistic, premium cinematic metallic look
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhysicalMaterial) {
          // Keep the original textures but boost the metallic feel
          mesh.material.metalness = 0.9;
          mesh.material.roughness = Math.max(0.1, mesh.material.roughness - 0.2); // Make it shinier for premium reflections
          
          // Tint the emissive glow to electric blue/cyan to match the AI aesthetic
          mesh.material.emissiveIntensity = 2.0;
          mesh.material.emissive = new THREE.Color('#00f0ff');
          mesh.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  // Cinematic animations: Hovering, breathing, scanning
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      // Subtle left-right rotation (scanning)
      group.current.rotation.y = Math.sin(time * 0.4) * 0.3;
      // Slight head tilt
      group.current.rotation.x = Math.sin(time * 0.6) * 0.1;
      group.current.rotation.z = Math.cos(time * 0.3) * 0.05;
      // Breathing-like hover motion is handled by the Float component
      group.current.position.y = Math.sin(time * 2) * 0.03;
    }
  });

  return (
    <>
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.4}>
        <group ref={group} dispose={null} scale={2.2} position={[0, -0.2, 0]}>
          
          {/* Soft holographic particles around the helmet */}
          <Sparkles count={50} scale={4} size={1.5} speed={0.4} opacity={0.4} color="#00f0ff" />
          
          {/* The 3D Armored Helmet Mesh with Hyper-Realistic PBR */}
          <primitive object={scene} />

          {/* Internal glowing light for cinematic effect */}
          <pointLight position={[0, 0.2, 0.5]} color="#00f0ff" intensity={5} distance={2} />
        </group>
      </Float>

      {/* Hyper-realistic lighting and reflections */}
      <Environment preset="city" />
      <ambientLight intensity={0.2} color="#ffffff" />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#00f0ff" />
      <directionalLight position={[-5, 5, -5]} intensity={1} color="#0066ff" />
      
      {/* Ground reflection shadow for realism */}
      <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={10} blur={2} far={4} color="#00f0ff" />
    </>
  );
};

// Preload the model so it renders instantly
useGLTF.preload('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');
