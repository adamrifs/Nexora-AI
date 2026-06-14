import React from 'react';
import { Sparkles } from 'lucide-react';

const ReportLoader = () => {
  return (
    <div className="relative w-full rounded-[2rem] rounded-tl-md border border-white/60 shadow-[0_8px_32px_rgba(140,82,255,0.08)] bg-white/50 backdrop-blur-xl p-8 flex flex-col items-center justify-center min-h-[160px] overflow-hidden animate-fade-in">
      {/* Soft radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-[#A573FF]/20 to-[#C0E8FE]/20 blur-[40px] pointer-events-none" />
      
      <div className="relative w-12 h-12 flex items-center justify-center mb-4">
        <svg className="absolute inset-0 w-12 h-12 animate-[spin_1.5s_linear_infinite]" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="url(#spinGradInline)" strokeWidth="4" strokeLinecap="round" strokeDasharray="110 44" />
          <defs>
            <linearGradient id="spinGradInline" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A573FF" />
              <stop offset="100%" stopColor="#8C52FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A573FF] to-[#8C52FF] flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-[#1b1238] font-bold text-sm tracking-wide z-10">Compiling Report</p>
      <div className="flex items-center gap-1 mt-1 z-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#A573FF] to-[#8C52FF]"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
};

export default ReportLoader;
