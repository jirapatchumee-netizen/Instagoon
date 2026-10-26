import React, { useState, useEffect } from 'react';
import { SaveMetadata } from '@/schema/types';
import { X, Save, Download, Trash2, Clock } from 'lucide-react';

interface SaveLoadModalProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
  onSaveToSlot: (slotId: string) => Promise<void>;
  onLoadFromSlot: (slotId: string) => Promise<void>;
  listSlots: () => Promise<SaveMetadata[]>;
  deleteSlot: (slotId: string) => Promise<void>;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  mode: initialMode,
  onClose,
  onSaveToSlot,
  onLoadFromSlot,
  listSlots,
  deleteSlot,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>(initialMode);
  const [slots, setSlots] = useState<SaveMetadata[]>([]);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  const refreshSlots = async () => {
    const data = await listSlots();
    setSlots(data);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Fixed list of 6 normal slots + auto + quick
  const slotIds = ['1', '2', '3', '4', '5', '6'];

  const getSlotData = (id: string) => slots.find((s) => s.slotId === id);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[85vh] bg-vn-card/95 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header with Tabs */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('save')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'save'
                  ? 'bg-vn-accent text-white shadow-lg shadow-purple-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>บันทึกเกม (Save)</span>
            </button>
            <button
              onClick={() => setActiveTab('load')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'load'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>โหลดเกม (Load)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {slotIds.map((id) => {
            const slot = getSlotData(id);

            return (
              <div
                key={id}
                className="group relative p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between min-h-[120px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      Slot {id}
                    </span>
                    {slot && (
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  {slot ? (
                    <div className="text-sm text-zinc-200 line-clamp-2 leading-relaxed">
                      {slot.previewText}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500 italic py-2">
                      ว่าง (Empty Slot)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-end gap-2">
                  {slot && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteSlot(id);
                        refreshSlots();
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="ลบเซฟนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {activeTab === 'save' ? (
                    <button
                      onClick={async () => {
                        await onSaveToSlot(id);
                        await refreshSlots();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-vn-accent hover:bg-purple-600 text-white font-semibold text-xs transition-colors"
                    >
                      {slot ? 'บันทึกทับ' : 'บันทึกที่นี่'}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (slot) {
                          await onLoadFromSlot(id);
                          onClose();
                        }
                      }}
                      disabled={!slot}
                      className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                        slot
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      โหลดข้อมูล
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
