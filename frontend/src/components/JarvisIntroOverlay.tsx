import React from 'react';
import { motion } from 'framer-motion';

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
      <div className="relative z-10 flex flex-col items-center">
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
