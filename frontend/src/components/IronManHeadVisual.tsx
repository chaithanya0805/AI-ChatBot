import React from 'react';

interface IronManHeadProps {
  className?: string;
  isActive?: boolean;
}

export const IronManHeadVisual: React.FC<IronManHeadProps> = ({ className = '', isActive = false }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background glow when active */}
      <div className={`absolute inset-0 rounded-full bg-jarvis-cyan blur-xl ${isActive ? 'opacity-30 animate-pulse' : 'opacity-10'} transition-opacity duration-500`}></div>
      
      {/* SVG Iron Man Head Hologram */}
      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible">
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0.5" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer Circular Tech Ring - Adds the JARVIS AI feel */}
        <circle 
          cx="50" cy="50" r="48" 
          fill="none" 
          stroke="#00f0ff" 
          strokeWidth="1" 
          strokeDasharray="10 5"
          opacity="0.3"
          className="animate-[spin_20s_linear_infinite]"
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Inner Counter-Rotating Ring */}
        <circle 
          cx="50" cy="50" r="43" 
          fill="none" 
          stroke="#00f0ff" 
          strokeWidth="0.5" 
          strokeDasharray="4 8"
          opacity="0.5"
          className="animate-[spin_15s_linear_infinite_reverse]"
          style={{ transformOrigin: 'center' }}
        />

        <g filter="url(#glow)" className={`transition-all duration-500 ${isActive ? 'scale-[1.02]' : 'scale-100'}`} style={{ transformOrigin: 'center' }}>
          
          {/* Main Helmet Outer Shell */}
          <path 
            d="M 30,15 C 50,-5 70,15 70,15 L 82,45 L 75,75 L 60,95 L 40,95 L 25,75 L 18,45 Z" 
            fill="rgba(0, 34, 68, 0.4)" 
            stroke="url(#neonGradient)" 
            strokeWidth="2" 
          />
          
          {/* Faceplate Inner Lines */}
          <path 
            d="M 35,25 C 50,15 65,25 65,25 L 74,48 L 68,70 L 55,85 L 45,85 L 32,70 L 26,48 Z" 
            fill="rgba(0, 240, 255, 0.05)" 
            stroke="#00f0ff" 
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Forehead Details */}
          <path d="M 45,18 L 55,18 M 40,24 L 60,24" stroke="#00f0ff" strokeWidth="1" opacity="0.5" />
          <line x1="50" y1="10" x2="50" y2="20" stroke="#00f0ff" strokeWidth="1" opacity="0.5" />
          
          {/* Glowing Eyes */}
          <g className={isActive ? 'animate-pulse' : ''} style={{ animationDuration: '2s' }}>
            {/* Left Eye */}
            <polygon 
              points="28,48 44,52 44,45 28,42" 
              fill="#ffffff" 
              stroke="#00f0ff" 
              strokeWidth="1"
            />
            {/* Right Eye */}
            <polygon 
              points="72,48 56,52 56,45 72,42" 
              fill="#ffffff" 
              stroke="#00f0ff" 
              strokeWidth="1"
            />
          </g>

          {/* Cheek / Jaw Lines */}
          <path d="M 32,70 L 45,63 M 68,70 L 55,63" stroke="#00f0ff" strokeWidth="1.5" opacity="0.7" />
          <path d="M 26,48 L 38,58 M 74,48 L 62,58" stroke="#00f0ff" strokeWidth="1" opacity="0.4" />
          
          {/* Mouth / Chin area */}
          <line x1="44" y1="75" x2="56" y2="75" stroke="#00f0ff" strokeWidth="2.5" opacity="0.9" />
          <line x1="42" y1="80" x2="58" y2="80" stroke="#00f0ff" strokeWidth="1" opacity="0.5" />
          <polygon points="46,85 54,85 50,92" fill="#00f0ff" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
};
