import React from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  FastForward,
  BookOpen,
  Save,
  Download,
  Settings,
  Sparkles,
} from 'lucide-react';

interface DialogueBoxProps {
  currentNodeId?: string;
  speakerName?: string;
  speakerColor?: string;
  displayedText: string;
  isTyping: boolean;
  canRollback: boolean;
  isAutoPlay: boolean;
  isSkipMode: boolean;
  onStep: () => void;
  onRollback: () => void;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onOpenHistory: () => void;
  onQuickSave: () => void;
  onQuickLoad: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  currentNodeId,
  speakerName,
  speakerColor = '#38bdf8',
  displayedText,
  isTyping,
  canRollback,
  isAutoPlay,
  isSkipMode,
  onStep,
  onRollback,
  onToggleAuto,
  onToggleSkip,
  onOpenHistory,
  onQuickSave,
  onQuickLoad,
  onOpenSave,
  onOpenLoad,
  onOpenSettings,
}) => {
  return (
    <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4 z-30 select-none">
      {/* Top Header: Speaker Name Tag & Dev Node ID */}
      <div className="flex items-center justify-between mb-1">
        {speakerName ? (
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1 sm:px-5 sm:py-1.5 rounded-t-xl bg-vn-card/95 backdrop-blur-md border-t border-x border-white/20 shadow-lg text-xs sm:text-sm font-bold tracking-wide transition-all"
            style={{
              borderTopColor: speakerColor,
              color: speakerColor,
              boxShadow: `0 -4px 15px -2px ${speakerColor}40`,
            }}
          >
            <Sparkles className="w-3 h-3 opacity-80" />
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: speakerColor }}
            />
            <span style={{ color: speakerColor }}>{speakerName}</span>
          </div>
        ) : <div />}

        {currentNodeId && (
          <div
            className="px-2 py-0.5 rounded-md bg-black/75 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold shadow-md flex items-center gap-1 select-all hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title="Node ID สำหรับ Dev & AI Agent (คลิกเพื่อคัดลอก)"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(currentNodeId);
            }}
          >
            <span className="text-zinc-400 font-medium text-[8px] uppercase tracking-wider">NODE:</span>
            <span>{currentNodeId}</span>
          </div>
        )}
      </div>

      {/* Main Dialogue Panel */}
      <div
        className="relative bg-vn-card/90 backdrop-blur-xl border border-white/15 rounded-2xl rounded-tl-none p-3.5 sm:p-5 shadow-2xl min-h-[120px] sm:min-h-[140px] flex flex-col justify-between cursor-pointer transition-all hover:border-white/25"
        onClick={onStep}
      >
        {/* Dialogue Text Area */}
        <div className="text-sm sm:text-base text-zinc-100 font-medium leading-relaxed tracking-wide min-h-[48px]">
          {displayedText}
          {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-vn-accent animate-pulse align-middle" />}
        </div>

        {/* Bottom Bar: Action Controls & Next Indicator */}
        <div
          className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-zinc-300">
            <button
              onClick={onRollback}
              disabled={!canRollback}
              className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md transition-colors ${
                canRollback ? 'hover:bg-white/15 hover:text-white' : 'opacity-35 cursor-not-allowed'
              }`}
              title="ย้อนกลับบทสนทนาก่อนหน้า"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Back</span>
            </button>

            <button
              onClick={onToggleAuto}
              className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md transition-colors ${
                isAutoPlay ? 'bg-vn-accent text-white font-bold' : 'hover:bg-white/15 hover:text-white'
              }`}
            >
              {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>Auto</span>
            </button>

            <button
              onClick={onToggleSkip}
              className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md transition-colors ${
                isSkipMode ? 'bg-amber-600 text-white font-bold' : 'hover:bg-white/15 hover:text-white'
              }`}
            >
              <FastForward className="w-3 h-3" />
              <span>Skip</span>
            </button>

            <div className="h-3 w-[1px] bg-white/20 mx-0.5" />

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md hover:bg-white/15 hover:text-white transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>Log</span>
            </button>

            <button
              onClick={onQuickSave}
              className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md hover:bg-white/15 hover:text-white transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>Q.Save</span>
            </button>

            <button
              onClick={onQuickLoad}
              className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md hover:bg-white/15 hover:text-white transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Q.Load</span>
            </button>

            <button
              onClick={onOpenSave}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-colors"
            >
              <span>Save</span>
            </button>

            <button
              onClick={onOpenLoad}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-colors"
            >
              <span>Load</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/15 hover:text-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Config</span>
            </button>
          </div>

          {/* Next Indicator */}
          <div className="flex items-center gap-2 text-vn-accent font-semibold text-xs sm:text-sm animate-pulse">
            <span>แตะเพื่อดำเนินเรื่อง</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
