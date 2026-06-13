import React from 'react';
import { AlertTriangle, Lightbulb, ShieldAlert, TrendingUp } from 'lucide-react';

// ─── Risks Card ───────────────────────────────────────────────────────────────
export const RisksCard = ({ risks }) => {
  if (!risks || risks.length === 0) return null;
  return (
    <div className="mt-3 bg-white/60 backdrop-blur-md border border-red-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <h4 className="font-semibold text-red-800 m-0 text-sm">Risks Detected</h4>
        <span className="ml-auto text-xs font-bold text-red-400 bg-red-100 px-2 py-0.5 rounded-full">
          {risks.length}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {risks.map((risk, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-red-50/60 border border-red-100 rounded-xl px-3 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-900 leading-snug m-0">{risk}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Opportunities Card ───────────────────────────────────────────────────────
export const OpportunitiesCard = ({ opportunities }) => {
  if (!opportunities || opportunities.length === 0) return null;
  return (
    <div className="mt-3 bg-white/60 backdrop-blur-md border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-600" />
        <h4 className="font-semibold text-emerald-800 m-0 text-sm">Opportunities Identified</h4>
        <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
          {opportunities.length}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {opportunities.map((opp, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2"
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-900 leading-snug m-0">{opp}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
