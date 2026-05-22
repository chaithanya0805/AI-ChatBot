import React from 'react';

interface JarvisArcVisualProps {
  className?: string;
  isActive?: boolean;
}

export const JarvisArcVisual: React.FC<JarvisArcVisualProps> = ({ className = '', isActive = false }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Core Glow */}
      <div className={`absolute inset-[25%] rounded-full bg-jarvis-cyan blur-md ${isActive ? 'opacity-40 animate-pulse' : 'opacity-20'} transition-opacity duration-500`}></div>
      
      {/* SVG Arc/Robotic Core */}
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible">
        <defs>
          <linearGradient id="jarvisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0.3" />
          </linearGradient>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer Ring 1 - Solid with gap */}
        <circle 
          cx="50" cy="50" r="48" 
          fill="none" 
          stroke="url(#jarvisGradient)" 
          strokeWidth="1.5" 
          strokeDasharray="250 50"
          filter="url(#neonGlow)"
          className="animate-[spin_20s_linear_infinite]"
          style={{ transformOrigin: 'center' }}
        />

        {/* Outer Ring 2 - Dotted */}
        <circle 
          cx="50" cy="50" r="42" 
          fill="none" 
          stroke="#00f0ff" 
          strokeWidth="3" 
          strokeDasharray="4 8"
          opacity="0.6"
          className="animate-[spin_30s_linear_infinite_reverse]"
          style={{ transformOrigin: 'center' }}
        />

        {/* Inner Ring - Tech segments */}
        <circle 
          cx="50" cy="50" r="34" 
          fill="none" 
          stroke="#00f0ff" 
          strokeWidth="6" 
          strokeDasharray="40 10 10 10"
          opacity="0.8"
          filter="url(#neonGlow)"
          className="animate-[spin_15s_linear_infinite]"
          style={{ transformOrigin: 'center' }}
        />

        {/* Center Robotic Head / Core Shape */}
        <g 
          className={`transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-70 scale-100'}`}
          style={{ transformOrigin: 'center' }}
        >
          {/* Hexagon Core */}
          <polygon 
            points="50,25 71,37 71,63 50,75 29,63 29,37" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="1.5"
            opacity="0.9"
            filter="url(#neonGlow)"
          />
          {/* Inner Triangle (like an Arc Reactor center) */}
          <polygon 
            points="50,38 60,56 40,56" 
            fill={isActive ? "#ffffff" : "transparent"}
            stroke="#00f0ff" 
            strokeWidth="2"
            opacity={isActive ? "1" : "0.5"}
            filter="url(#neonGlow)"
            className={isActive ? 'animate-pulse' : ''}
          />
          {/* Decorative lines */}
          <line x1="50" y1="25" x2="50" y2="15" stroke="#00f0ff" strokeWidth="2" />
          <line x1="29" y1="63" x2="18" y2="70" stroke="#00f0ff" strokeWidth="2" />
          <line x1="71" y1="63" x2="82" y2="70" stroke="#00f0ff" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
