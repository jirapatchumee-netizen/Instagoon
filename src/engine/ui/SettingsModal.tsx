import React, { useEffect, useId, useRef } from 'react';
import { PlayerSettings } from '@/schema/types';
import { X, Volume2, Gauge, Zap } from 'lucide-react';
import { audioManager } from '../audio/WebAudioManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) dialog.showModal();
    else dialog.close();
    return () => dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] p-0 bg-vn-card text-vn-text border border-white/20 rounded-2xl shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-md motion-safe:animate-fadeIn"
    >
      <div className="flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex shrink-0 items-center justify-between gap-3 bg-black/40">
          <h2 id={`${id}-title`} className="min-w-0 text-lg font-bold text-vn-text leading-snug break-words">
            การตั้งค่า (Settings & Configuration)
          </h2>
          <button
            autoFocus
            type="button"
            aria-label="ปิดการตั้งค่า"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-vn-muted hover:text-vn-text hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 text-sm font-semibold text-vn-text">
              <label htmlFor={`${id}-text-speed`} className="flex min-w-0 items-start gap-2">
                <Gauge aria-hidden="true" className="shrink-0 mt-0.5 w-4 h-4 text-vn-accent" />
                <span>ความเร็วการพิมพ์ตัวอักษร (Text Speed)</span>
              </label>
              <span className="shrink-0 text-xs text-vn-muted">
                {settings.textSpeed === 0 ? 'ทันที (Instant)' : `${settings.textSpeed} ms`}
              </span>
            </div>
            <input
              id={`${id}-text-speed`}
              type="range"
              min="0"
              max="60"
              step="1"
              value={settings.textSpeed}
              aria-valuetext={settings.textSpeed === 0 ? 'ทันที (Instant)' : `${settings.textSpeed} มิลลิวินาที`}
              onChange={(e) => onUpdateSettings({ textSpeed: Number(e.target.value) })}
              className="w-full accent-vn-accent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent rounded"
            />
            <div className="flex justify-between text-[11px] text-vn-muted">
              <span>ทันที</span>
              <span>ปกติ</span>
              <span>ช้า</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 text-sm font-semibold text-vn-text">
              <label htmlFor={`${id}-auto-speed`} className="flex min-w-0 items-start gap-2">
                <Zap aria-hidden="true" className="shrink-0 mt-0.5 w-4 h-4 text-amber-500" />
                <span>ระยะเวลาหน่วง Auto (Auto Play Delay)</span>
              </label>
              <span className="shrink-0 text-xs text-vn-muted">{settings.autoSpeed / 1000} วิ</span>
            </div>
            <input
              id={`${id}-auto-speed`}
              type="range"
              min="800"
              max="4000"
              step="200"
              value={settings.autoSpeed}
              aria-valuetext={`${settings.autoSpeed / 1000} วินาที`}
              onChange={(e) => onUpdateSettings({ autoSpeed: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent rounded"
            />
            <div className="flex justify-between text-[11px] text-vn-muted">
              <span>เร็ว (0.8s)</span>
              <span>ปกติ (2s)</span>
              <span>ช้า (4s)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 text-sm font-semibold text-vn-text">
              <label htmlFor={`${id}-bgm-volume`} className="flex min-w-0 items-start gap-2">
                <Volume2 aria-hidden="true" className="shrink-0 mt-0.5 w-4 h-4 text-cyan-400" />
                <span>ระดับเสียงเพลงประกอบ (BGM Volume)</span>
              </label>
              <span className="shrink-0 text-xs text-vn-muted">{Math.round(settings.bgmVolume * 100)}%</span>
            </div>
            <input
              id={`${id}-bgm-volume`}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.bgmVolume}
              aria-valuetext={`${Math.round(settings.bgmVolume * 100)} เปอร์เซ็นต์`}
              onChange={(e) => {
                const vol = Number(e.target.value);
                onUpdateSettings({ bgmVolume: vol });
                audioManager.setBgmVolume(vol);
              }}
              className="w-full accent-cyan-400 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent rounded"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 text-sm font-semibold text-vn-text">
              <label htmlFor={`${id}-sfx-volume`} className="flex min-w-0 items-start gap-2">
                <Volume2 aria-hidden="true" className="shrink-0 mt-0.5 w-4 h-4 text-pink-400" />
                <span>ระดับเสียงเอฟเฟกต์ (SFX Volume)</span>
              </label>
              <span className="shrink-0 text-xs text-vn-muted">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              id={`${id}-sfx-volume`}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              aria-valuetext={`${Math.round(settings.sfxVolume * 100)} เปอร์เซ็นต์`}
              onChange={(e) => {
                const vol = Number(e.target.value);
                onUpdateSettings({ sfxVolume: vol });
                audioManager.setSfxVolume(vol);
                audioManager.playSound('click');
              }}
              className="w-full accent-pink-400 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent rounded"
            />
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-vn-accent hover:bg-purple-600 text-white font-semibold text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </dialog>
  );
};
