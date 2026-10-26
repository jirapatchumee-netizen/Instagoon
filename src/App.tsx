import React, { useState } from 'react';
import { OVERTIME_PROJECT as OVERTIME_SECRETS_PROJECT } from './demo/loadOvertime';
import { VNPlayer } from './engine/ui/VNPlayer';
import { StudioView } from './studio/StudioView';
import { Play, PenTool, RotateCcw, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState(OVERTIME_SECRETS_PROJECT);
  const [mode, setMode] = useState<'player' | 'studio'>('player');

  return (
    <div className="w-screen h-screen flex flex-col bg-vn-bg text-vn-text font-sans overflow-hidden select-none">
      {/* Universal Mode Switcher Bar */}
      <div className="h-11 bg-black/75 border-b border-white/10 px-4 flex items-center justify-between z-50 text-xs">
        {/* Left: Brand & Story Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wider">
            <span className="text-sm">🎭</span>
            <span className="font-mono">Frost Novel Studio</span>
          </div>

          <div className="h-4 w-[1px] bg-white/15" />

          {/* Active Story Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold text-xs bg-rose-600/90 text-white shadow-sm shadow-rose-500/30">
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            <span>Overtime Secrets (แฟ้มลับกะดึก) — บทที่ 1</span>
          </div>
        </div>

        {/* Right: Player / Studio Modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('player')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              mode === 'player'
                ? 'bg-vn-accent text-white shadow-sm shadow-purple-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>โหมดผู้เล่น (Player)</span>
          </button>

          <button
            onClick={() => setMode('studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              mode === 'studio'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>โหมดผู้สร้าง (Studio)</span>
          </button>

          <button
            onClick={() => setProject({ ...OVERTIME_SECRETS_PROJECT })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="รีเซ็ตเกมเริ่มใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">รีเซ็ต</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {mode === 'player' ? (
          <div className="w-full h-full flex items-center justify-center p-0 sm:p-4 bg-black">
            <VNPlayer project={project} />
          </div>
        ) : (
          <StudioView project={project} onUpdateProject={setProject} />
        )}
      </div>
    </div>
  );
};

export default App;
