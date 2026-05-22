import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';

export const HolographicIronMan = () => {
  const group = useRef<THREE.Group>(null);
  const arcReactorRef = useRef<THREE.Group>(null);
  
  // Load a sleek humanoid armored robot model (Xbot) to act as the base for the Iron Man hologram
  const { scene, animations } = useGLTF('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Play idle animation for continuous smooth movement and breathing
    if (actions && actions['idle']) {
      actions['idle'].reset().fadeIn(0.5).play();
    } else if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      if (firstAction) firstAction.reset().fadeIn(0.5).play();
    }

    // Traverse the model and replace all materials with the advanced Hologram effect
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#001133',
          emissive: '#00f0ff',
          emissiveIntensity: 0.8,
          wireframe: true,
          transparent: true,
          opacity: 0.7,
        });
      }
    });
  }, [scene, actions]);

  // Gentle floating and dynamic arc reactor pulse
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      // Subtle body sway to make it feel alive
      group.current.rotation.y = Math.sin(time * 0.5) * 0.15;
    }
    if (arcReactorRef.current) {
      // Energy pulse glow for the chest core
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      arcReactorRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
      {/* Increased scale for a larger, more premium centerpiece as requested */}
      <group ref={group} dispose={null} scale={2.4} position={[0, -2.4, 0]}>
        
        {/* Floating holographic particles around the figure */}
        <Sparkles count={200} scale={3.5} size={2.5} speed={0.6} opacity={0.8} color="#00f0ff" />
        
        {/* The 3D Armored Humanoid Mesh */}
        <primitive object={scene} />

        {/* Arc Reactor Chest Glow Effect - Enhanced */}
        {/* Xbot's chest is roughly at y=1.1, z=0.15 */}
        <group ref={arcReactorRef} position={[0, 1.15, 0.16]}>
          {/* Inner bright core */}
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={1} />
          </mesh>
          {/* Outer glowing ring */}
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry args={[0.09, 0.12, 24]} />
            <meshBasicMaterial color="#00f0ff" transparent opacity={0.9} />
          </mesh>
          {/* Secondary Outer Ring */}
          <mesh position={[0, 0, 0.02]}>
            <ringGeometry args={[0.14, 0.15, 24]} />
            <meshBasicMaterial color="#0066ff" transparent opacity={0.6} />
          </mesh>
          {/* Light emission */}
          <pointLight color="#00f0ff" intensity={4} distance={4} />
        </group>

        {/* Ambient Hologram Light */}
        <ambientLight intensity={0.6} color="#00f0ff" />
      </group>
    </Float>
  );
};

// Preload the model so it renders instantly
useGLTF.preload('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb');
