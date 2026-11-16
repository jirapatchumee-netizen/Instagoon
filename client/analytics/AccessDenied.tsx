import React, { useState } from 'react';
import {
  ShieldAlert, Lock, ArrowLeft, RefreshCw, AlertCircle, Key, ShieldCheck, Sparkles, ArrowRight
} from 'lucide-react';

interface Props {
  type: '401' | '403' | '503' | 'error';
  message?: string;
  onRetry?: () => void;
}

export function AccessDenied({ type, message, onRetry }: Props) {
  const is401 = type === '401';
  const is403 = type === '403';
  const is503 = type === '503';
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    window.location.href = `/auth/session?token=${encodeURIComponent(token.trim())}`;
  };

  const handleQuickSession = (sessionToken: string) => {
    window.location.href = `/auth/session?token=${encodeURIComponent(sessionToken)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-pink-600/15 via-purple-600/10 to-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
                INSTAGOON
              </div>
              <div className="text-[11px] text-zinc-400">Analytics Intelligence</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            <span className={`w-1.5 h-1.5 rounded-full ${is503 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            Production
          </span>
        </div>

        {/* Status Icon & Title */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-zinc-900/90 border border-zinc-800 shadow-inner">
            {is401 ? (
              <Lock className="w-6 h-6 text-amber-400" />
            ) : is403 ? (
              <ShieldAlert className="w-6 h-6 text-pink-500" />
            ) : is503 ? (
              <AlertCircle className="w-6 h-6 text-indigo-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
          </div>

          <h1 className="text-lg font-bold tracking-tight text-white mb-1.5">
            {is401 && 'เข้าสู่ระบบ Analytics'}
            {is403 && 'ไม่มีสิทธิ์เข้าถึงแดชบอร์ด (403)'}
            {is503 && 'ระบบ Analytics ปิดปรับปรุง (503)'}
            {type === 'error' && 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}
          </h1>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {is401 && 'ยืนยันตัวตนด้วยบัญชี Google (Gmail) หรือ Session Token ที่มีสิทธิ์ Creator / Admin'}
            {is403 && (
              <>
                บัญชีปัจจุบันเป็นผู้เล่นทั่วไป (Player) สงวนสิทธิ์เฉพาะ{' '}
                <span className="text-zinc-200 font-medium">Creator</span> และ{' '}
                <span className="text-zinc-200 font-medium">Admin</span>
              </>
            )}
            {is503 && 'ระบบอ่านข้อมูล Analytics ยังไม่พร้อมใช้งาน หรือยังไม่ได้เปิด Binding ฐานข้อมูล Production'}
            {type === 'error' && (message || 'ไม่สามารถติดต่อ Analytics Worker ได้')}
          </p>
        </div>

        {is401 && (
          <div className="space-y-5">
            {/* Step 1: Primary Google Login */}
            <div className="space-y-2">
              <a
                href="/auth/google"
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-100 active:scale-[0.99] transition shadow-lg shadow-white/5"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>เข้าสู่ระบบด้วย Google (Gmail)</span>
              </a>
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                * หากกดแล้วเด้งไปหน้า <span className="text-zinc-400">instagoon.app</span> แสดงว่าฝั่ง Prod ยังรอ Merge PR #124 — ใช้ปุ่ม Admin หรือ Token ด้านล่างได้ทันที
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="shrink-0 mx-3 text-[11px] text-zinc-500">หรือเข้าใช้งานด้วย Session Token</span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            {/* Quick Admin Access */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickSession('igx_59c6dd16a85d4e2db17063af8f39214620c11c502ea44604b52052cbc31a60e3')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-pink-300 hover:bg-zinc-800/80 hover:border-pink-500/40 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Jirapat (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSession('igx_taychin_1ddfd8d99064419e8645011dfd1008b57ed9effdcb5146b99df5c7cd9adbae7c')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-purple-300 hover:bg-zinc-800/80 hover:border-purple-500/40 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Taychin (Admin)</span>
              </button>
            </div>

            {/* Manual Token Input Toggle */}
            {!showTokenInput ? (
              <button
                type="button"
                onClick={() => setShowTokenInput(true)}
                className="w-full py-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                <span>กรอก Access Token ด้วยตนเอง</span>
              </button>
            ) : (
              <form onSubmit={handleTokenSubmit} className="space-y-2 p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>วาง Session Token ของคุณ</span>
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    ปิด
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="igx_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!token.trim()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-xs transition disabled:opacity-40 flex items-center gap-1 shrink-0"
                  >
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
          {is403 && (
            <a
              href="https://instagoon.app"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับไปยังหน้าเกม Instagoon</span>
            </a>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ตรวจสอบ Session อีกครั้ง</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
