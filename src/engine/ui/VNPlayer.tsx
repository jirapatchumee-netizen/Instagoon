import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VNProject, DialogueNode, ChoiceNode, PlayerSettings } from '@/schema/types';
import { VNEngine, EngineState } from '../core/VNEngine';
import { Stage } from './Stage';
import { DialogueBox } from './DialogueBox';
import { ChoiceOverlay } from './ChoiceOverlay';
import { HistoryModal } from './HistoryModal';
import { SaveLoadModal } from './SaveLoadModal';
import { SettingsModal } from './SettingsModal';
import { Trophy, RotateCcw } from 'lucide-react';
import { assetInfo } from '@/demo/artRegistry';

interface VNPlayerProps {
  project: VNProject;
  onExitToStudio?: () => void;
}

export const VNPlayer: React.FC<VNPlayerProps> = ({ project }) => {
  const engine = useMemo(() => new VNEngine(project), [project]);
  const [state, setState] = useState<EngineState>(() => engine.getState());

  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveLoadModal, setSaveLoadModal] = useState<{ isOpen: boolean; mode: 'save' | 'load' }>({
    isOpen: false,
    mode: 'save',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devNote, setDevNote] = useState('');
  const [devSent, setDevSent] = useState(false);

  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setState(newState);
    });
    engine.start();
    return () => unsubscribe();
  }, [engine]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (import.meta.env.DEV && e.key === 'F2') {
        e.preventDefault();
        setDevOpen((v) => !v);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      // Don't intercept if modals are open
      if (historyOpen || saveLoadModal.isOpen || settingsOpen) {
        if (e.key === 'Escape') {
          setHistoryOpen(false);
          setSaveLoadModal((prev) => ({ ...prev, isOpen: false }));
          setSettingsOpen(false);
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        engine.step();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setHistoryOpen(true);
      } else if (e.key === 'Control') {
        engine.toggleSkipMode();
      } else if (e.key === 'a' || e.key === 'A') {
        engine.toggleAutoPlay();
      } else if (e.key === 's' || e.key === 'S') {
        setSaveLoadModal({ isOpen: true, mode: 'save' });
      } else if (e.key === 'l' || e.key === 'L') {
        setSaveLoadModal({ isOpen: true, mode: 'load' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, historyOpen, saveLoadModal.isOpen, settingsOpen]);

  const currentBg = state.currentBgId ? project.backgrounds[state.currentBgId] : undefined;

  const currentSpeaker = useMemo(() => {
    if (!state.currentNode || state.currentNode.type !== 'dialogue') return undefined;
    const d = state.currentNode as DialogueNode;
    if (d.speakerId) {
      return project.characters[d.speakerId];
    }
    return undefined;
  }, [state.currentNode, project.characters]);

  const speakerName = useMemo(() => {
    if (!state.currentNode || state.currentNode.type !== 'dialogue') return undefined;
    const d = state.currentNode as DialogueNode;
    return currentSpeaker?.name || d.customSpeakerName;
  }, [state.currentNode, currentSpeaker]);

  const speakerColor = useMemo(() => {
    return currentSpeaker?.color || '#38bdf8';
  }, [currentSpeaker]);

  const isChoiceNode = state.currentNode?.type === 'choice';
  const choiceNode = isChoiceNode ? (state.currentNode as ChoiceNode) : null;

  const handleUpdateSettings = useCallback(
    (newSettings: Partial<PlayerSettings>) => {
      engine.settings = { ...engine.settings, ...newSettings };
      engine.saveManager.saveSettings(engine.settings);
      setState(engine.getState());
    },
    [engine]
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950 select-none">
      {/* Ambient Blurred Backdrop for Widescreen PC */}
      {currentBg && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-35 scale-110 pointer-events-none transition-all duration-700 hidden md:block"
          style={{ backgroundImage: `url(${currentBg.src})` }}
        />
      )}

      {/* Main Vertical 9:16 Frame (Optimized for 544x960 native aspect) */}
      <div className="relative h-full max-h-[100dvh] md:max-h-[96vh] aspect-[9/16] bg-black overflow-hidden shadow-2xl rounded-none md:rounded-2xl border md:border-white/15 select-none flex flex-col justify-between">
        {/* Visual Novel Stage Layer */}
        <Stage
          currentBg={currentBg}
          characters={state.characters}
          characterDefs={project.characters}
          cameraEffect={state.cameraEffect}
          onClick={() => {
            if (!isChoiceNode && !state.isEnded) {
              engine.step();
            }
          }}
        />

        {import.meta.env.DEV && devOpen && (
          <div className="absolute bottom-2 left-2 right-2 z-50 rounded-lg bg-black/85 border border-white/20 p-2 font-mono text-[10px] text-zinc-200 space-y-1" onClick={(e) => e.stopPropagation()}>
            <div>node: <b>{state.currentNode?.id}</b></div>
            <div>bg: <b>{state.currentBgId}</b> [{state.currentBgId ? assetInfo(state.currentBgId).status : '-'}{state.currentBgId && assetInfo(state.currentBgId).version ? ' v' + assetInfo(state.currentBgId).version : ''}]</div>
            {state.characters.filter((c) => c.characterId !== 'arm').map((c) => {
              const k = `${c.characterId}:${c.expression}`;
              const i = assetInfo(k);
              return <div key={k}>sprite: <b>{k}</b> [{i.status}{i.version ? ' v' + i.version : ''}]</div>;
            })}
            <textarea
              value={devNote}
              onChange={(e) => { setDevNote(e.target.value); setDevSent(false); }}
              placeholder="บอกสิ่งที่อยากแก้ภาพตรงนี้ เช่น ผมเข้มไป"
              className="w-full h-12 bg-zinc-900 border border-white/15 rounded p-1 text-[11px] text-white"
            />
            <button
              className="px-2 py-0.5 rounded bg-rose-600 text-white disabled:opacity-40"
              disabled={!devNote.trim()}
              onClick={() => {
                fetch('/__vn/feedback', { method: 'POST', body: JSON.stringify({ node: state.currentNode?.id, bg: state.currentBgId, sprites: state.characters.map((c) => `${c.characterId}:${c.expression}`), text: devNote.trim() }) })
                  .then(() => { setDevNote(''); setDevSent(true); });
              }}
            >
              ส่ง feedback {devSent ? '✓' : ''}
            </button>
          </div>
        )}

        {/* Infiltration HUD Bar for Overtime Secrets */}
        {state.variables.suspicion !== undefined && (
          <div className="absolute top-3 left-2 right-2 z-40 flex items-center justify-between gap-1.5 bg-black/85 backdrop-blur-md border border-white/15 px-2.5 py-1.5 rounded-xl text-[11px] shadow-xl animate-fadeIn">
            {/* Suspicion Meter */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                (state.variables.suspicion || 0) >= 75 ? 'bg-red-500 animate-ping' :
                (state.variables.suspicion || 0) >= 40 ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <div className="w-14 sm:w-20 h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-300 ${
                    (state.variables.suspicion || 0) >= 75 ? 'bg-red-500' :
                    (state.variables.suspicion || 0) >= 40 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, state.variables.suspicion || 0)}%` }}
                />
              </div>
              <span className="font-mono font-bold text-[10px] text-zinc-300">
                {state.variables.suspicion || 0}%
              </span>
            </div>

            {/* Clearance & Scanned Cards */}
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[9px]">
                {state.variables.clearanceLevel || 'LV.1'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold text-[9px]">
                {state.variables.scannedCards || 0}/5
              </span>
              <span className="font-mono font-bold text-rose-300 text-[10px] flex items-center gap-0.5">
                <span>❤️</span>{state.variables.noeyAffection || 0}
              </span>
            </div>

            {/* Dev Node Indicator */}
            <div
              className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-bold shadow-inner cursor-pointer hover:bg-emerald-500/25 transition-colors select-all truncate max-w-[110px]"
              title="Node ID ปัจจุบัน (คลิกเพื่อคัดลอกสำหรับสื่อสารกับ AI Agent)"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(state.currentNode?.id || '');
              }}
            >
              {state.currentNode?.id || '-'}
            </div>
          </div>
        )}

        {/* Choice Branching Overlay */}
      {isChoiceNode && choiceNode && (
        <ChoiceOverlay
          nodeId={state.currentNode?.id}
          prompt={choiceNode.prompt}
          options={choiceNode.options}
          onSelectChoice={(idx) => engine.makeChoice(idx)}
          canChooseOption={(cond) => engine.evalCondition(cond)}
        />
      )}

      {/* Main Dialogue Box (Shown when not a choice and not ended) */}
      {!isChoiceNode && !state.isEnded && (
        <DialogueBox
          currentNodeId={state.currentNode?.id}
          speakerName={speakerName}
          speakerColor={speakerColor}
          displayedText={state.displayedText}
          isTyping={state.isTyping}
          canRollback={state.canRollback}
          isAutoPlay={state.isAutoPlay}
          isSkipMode={state.isSkipMode}
          onStep={() => engine.step()}
          onRollback={() => engine.rollback()}
          onToggleAuto={() => engine.toggleAutoPlay()}
          onToggleSkip={() => engine.toggleSkipMode()}
          onOpenHistory={() => setHistoryOpen(true)}
          onQuickSave={() => engine.quickSave()}
          onQuickLoad={() => engine.quickLoad()}
          onOpenSave={() => setSaveLoadModal({ isOpen: true, mode: 'save' })}
          onOpenLoad={() => setSaveLoadModal({ isOpen: true, mode: 'load' })}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Game Ending Card Screen */}
      {state.isEnded && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 animate-bounce">
            <Trophy className="w-12 h-12" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500 mb-3 tracking-wide">
            {state.endingName || 'The End'}
          </h2>
          <p className="max-w-lg text-sm sm:text-base text-zinc-300 mb-8 leading-relaxed">
            {state.endingMessage}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {state.retryNodeId && (
              <button
                onClick={() => engine.retryCheckpoint(state.retryNodeId!)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm sm:text-base shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ลองใหม่อีกครั้งที่จุดก่อนเกิดเหตุ (Retry Checkpoint)</span>
              </button>
            )}
            <button
              onClick={() => engine.start()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base border border-white/15 transition-all transform hover:scale-105 active:scale-95"
            >
              <span>เริ่มใหม่ตั้งแต่ต้น (Restart)</span>
            </button>
          </div>
        </div>
      )}

      </div>

      {/* Modal Dialogs */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={state.history}
      />

      <SaveLoadModal
        isOpen={saveLoadModal.isOpen}
        mode={saveLoadModal.mode}
        onClose={() => setSaveLoadModal((prev) => ({ ...prev, isOpen: false }))}
        onSaveToSlot={async (slotId) => {
          if (state.currentNode) {
            await engine.saveManager.save(slotId, {
              currentNodeId: state.currentNode.id,
              variables: { ...state.variables },
              history: [...state.history],
              currentBgId: state.currentBgId,
              characters: [...state.characters],
            });
          }
        }}
        onLoadFromSlot={async (slotId) => {
          const data = await engine.saveManager.load(slotId);
          if (data) {
            engine.applySaveData(data);
          }
        }}
        listSlots={() => engine.saveManager.listSlots()}
        deleteSlot={(slotId) => engine.saveManager.delete(slotId)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={engine.settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
};
