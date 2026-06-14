import React from 'react';
import { Sparkles } from 'lucide-react';

const GlassLoader = ({ title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.35)' }}>
      {/* Soft radial glow behind the card */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#A573FF]/30 to-[#C0E8FE]/30 blur-[80px] pointer-events-none" />

      {/* Glass card */}
      <div className="relative flex flex-col items-center gap-6 px-12 py-10 rounded-[2rem] border border-white/60 shadow-[0_8px_48px_rgba(140,82,255,0.18)]" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        {/* Glare */}
        <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[2rem] bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

        {/* Spinner ring */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="absolute inset-0 w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="url(#spinGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="110 44" />
            <defs>
              <linearGradient id="spinGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A573FF" />
                <stop offset="100%" stopColor="#8C52FF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A573FF] to-[#8C52FF] flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-lg font-bold text-[#1b1238] tracking-tight">{title}</p>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{subtitle}</p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-br from-[#A573FF] to-[#8C52FF]"
              style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlassLoader;
