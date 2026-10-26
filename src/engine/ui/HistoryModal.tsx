import React, { useEffect, useRef } from 'react';
import { HistoryEntry } from '@/schema/types';
import { X, BookOpen } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
      <div className="relative w-full max-w-3xl h-[80vh] bg-vn-card/95 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5 text-lg font-bold text-white">
            <BookOpen className="w-5 h-5 text-vn-accent" />
            <span>ประวัติบทสนทนา (Dialogue Log)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center text-zinc-500 py-12">ยังไม่มีประวัติบทสนทนา</div>
          ) : (
            history.map((entry, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                {entry.speakerName && (
                  <div
                    className="text-sm font-bold mb-1"
                    style={{ color: entry.speakerColor || '#38bdf8' }}
                  >
                    {entry.speakerName}
                  </div>
                )}
                <div className="text-zinc-200 text-sm sm:text-base leading-relaxed">
                  {entry.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
