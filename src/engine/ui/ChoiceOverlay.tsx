import React from 'react';
import { ChoiceOption } from '@/schema/types';

interface ChoiceOverlayProps {
  nodeId?: string;
  prompt?: string;
  options: ChoiceOption[];
  onSelectChoice: (index: number) => void;
  canChooseOption: (condition?: string) => boolean;
}

export const ChoiceOverlay: React.FC<ChoiceOverlayProps> = ({
  nodeId,
  prompt,
  options,
  onSelectChoice,
  canChooseOption,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/45 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fadeIn">
      {/* Dev Node Indicator */}
      {nodeId && (
        <div
          className="mb-3 px-3 py-1 rounded-md bg-black/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-emerald-950/40 transition-colors"
          title="Node ID ปัจจุบัน (คลิกเพื่อคัดลอก)"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(nodeId);
          }}
        >
          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">NODE:</span>
          <span>{nodeId}</span>
        </div>
      )}

      {/* Choice Prompt Title */}
      {prompt && (
        <div className="mb-6 px-6 py-2.5 rounded-full bg-vn-card/90 border border-white/20 text-base sm:text-lg font-bold text-zinc-100 shadow-xl tracking-wide text-center max-w-2xl">
          {prompt}
        </div>
      )}

      {/* Choice Options Stack */}
      <div className="flex flex-col gap-3.5 w-full max-w-xl">
        {options.map((opt, idx) => {
          const isAllowed = canChooseOption(opt.condition);

          return (
            <button
              key={opt.id || idx}
              onClick={() => isAllowed && onSelectChoice(idx)}
              disabled={!isAllowed}
              className={`group relative w-full text-left px-6 py-4 rounded-xl border transition-all duration-200 transform ${
                isAllowed
                  ? 'bg-vn-card/85 hover:bg-vn-card border-white/20 hover:border-vn-accent hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 text-zinc-100 cursor-pointer active:scale-95'
                  : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-500 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-semibold group-hover:text-white">
                  {opt.label}
                </span>
                {!isAllowed && (
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    เงื่อนไขไม่ผ่าน
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
