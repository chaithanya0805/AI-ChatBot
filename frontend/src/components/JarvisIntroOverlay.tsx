import React, { Suspense, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// 1. Error Boundary to protect the application from WebGL context failures or load failures
class CanvasErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("WebGL / 3D Helmet Rendering Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail-soft: render nothing if Canvas fails, keeping HTML/CSS intro intact
    }
    return this.props.children;
  }
}

// 2. 3D Golden Helmet Component
const GoldenHelmet: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  
  // Load the detailed damaged helmet model
  const { scene } = useGLTF('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');

  useEffect(() => {
    // Traverse meshes and replace materials with customized premium bronze-gold PBR settings
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        
        mesh.material = new THREE.MeshStandardMaterial({
          map: oldMat.map,
          normalMap: oldMat.normalMap,
          roughnessMap: oldMat.roughnessMap,
          metalnessMap: oldMat.metalnessMap,
          aoMap: oldMat.aoMap,
          emissiveMap: oldMat.emissiveMap,
          metalness: 0.95,
          roughness: 0.18,
          color: new THREE.Color('#B58E4F'), // Polished bronze-gold tint
          emissive: new THREE.Color('#D4AF6A'), // Gold emissive eyes/lines
          emissiveIntensity: 0, // Animated in useFrame
        });
      }
    });
  }, [scene]);

  // Gentle float, scanning rotation, and gradual eye-glow illumination over the first 2 seconds
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      // Subtle head sway/scan
      group.current.rotation.y = Math.sin(time * 0.3) * 0.25;
      group.current.rotation.x = Math.sin(time * 0.4) * 0.08;
      
      // visor & lines ignite gradually from 0 to 2.5 intensity
      const targetGlow = Math.min(2.5, time * 1.5);
      
      group.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.emissiveIntensity = targetGlow;
          }
        }
      });
    }
  });

  return (
    <group ref={group} dispose={null} scale={2.1} position={[0, -0.1, 0]}>
      {/* Soft gold sparkles surrounding the helmet */}
      <Sparkles count={40} scale={3.5} size={1.5} speed={0.4} opacity={0.3} color="#D4AF6A" />
      
      {/* 3D mesh model */}
      <primitive object={scene} />

      {/* Internal golden light source behind the visor faceplate */}
      <pointLight position={[0, 0.2, 0.4]} color="#D4AF6A" intensity={3} distance={2} />
    </group>
  );
};

// Preload the glTF model globally
useGLTF.preload('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');

// 3. Main Intro Overlay Component
export const JarvisIntroOverlay: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.03,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090909] text-[#F5F5F5] select-none pointer-events-auto overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,106,0.12)_0%,transparent_60%)] pointer-events-none z-0" />

      {/* Intro Contents */}
      <div className="relative z-10 flex flex-col items-center justify-center max-w-full">
        
        {/* Animated 3D Golden Helmet Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1.2, ease: "easeOut" }}
          className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] relative overflow-visible z-10 mb-2"
        >
          <CanvasErrorBoundary>
            <Suspense fallback={null}>
              <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <ambientLight intensity={0.15} color="#ffffff" />
                <directionalLight position={[5, 8, 5]} intensity={1.2} color="#D4AF6A" />
                <directionalLight position={[-5, 5, -5]} intensity={0.6} color="#C89B5C" />
                <GoldenHelmet />
                <Environment preset="city" />
                <ContactShadows position={[0, -1.0, 0]} opacity={0.4} scale={6} blur={2.5} far={3} color="#D4AF6A" />
              </Canvas>
            </Suspense>
          </CanvasErrorBoundary>
        </motion.div>

        {/* Animated J lettermark logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#D4AF6A] to-[#C89B5C] text-[#090909] font-extrabold text-4xl sm:text-5xl shadow-2xl select-none"
        >
          {/* Subtle pulse glow behind the logo */}
          <div className="absolute inset-0 bg-[#D4AF6A]/20 rounded-2xl blur-lg animate-pulse" />
          <span className="relative z-10">J</span>
        </motion.div>

        {/* Title JARVIS */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="mt-6 font-bold text-3xl sm:text-4xl tracking-widest text-[#F5F5F5] uppercase select-none font-sans drop-shadow-[0_0_12px_rgba(212,175,106,0.25)]"
        >
          JARVIS
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-2 text-xs sm:text-sm text-slate-400 tracking-wider font-semibold uppercase text-center max-w-xs sm:max-w-md px-4 font-sans"
        >
          Your Intelligent AI Assistant
        </motion.p>

        {/* Subtle scan glow line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="w-24 h-[1px] bg-slate-800 rounded-full mt-8 overflow-hidden relative"
        >
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            className="absolute top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-[#D4AF6A] to-transparent"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
