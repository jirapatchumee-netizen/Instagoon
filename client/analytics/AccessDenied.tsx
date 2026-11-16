import React, { useState } from 'react';
import { ShieldAlert, LogIn, Lock, ArrowLeft, RefreshCw, AlertCircle, Key, UserCheck, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 text-center border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          is401 ? 'bg-amber-500' : is403 ? 'bg-pink-500' : 'bg-red-500'
        }`} />

        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-zinc-900 border border-zinc-800 shadow-inner">
          {is401 ? (
            <Lock className="w-8 h-8 text-amber-400" />
          ) : is403 ? (
            <ShieldAlert className="w-8 h-8 text-pink-500" />
          ) : is503 ? (
            <AlertCircle className="w-8 h-8 text-indigo-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-400" />
          )}
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          {is401 && 'เข้าสู่ระบบ Analytics (401)'}
          {is403 && 'ไม่มีสิทธิ์เข้าถึงแดชบอร์ด (403)'}
          {is503 && 'ระบบ Analytics ปิดปรับปรุง (503)'}
          {type === 'error' && 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}
        </h1>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {is401 && (
            <>
              กรุณาเข้าสู่ระบบด้วยบัญชี Google (Gmail) หรือเลือกยืนยัน Session Token ที่มีสิทธิ์ Creator หรือ Admin
            </>
          )}
          {is403 && (
            <>
              บัญชีปัจจุบันของคุณเป็นบัญชีผู้เล่นทั่วไป (Player)
              แดชบอร์ดนี้สงวนสิทธิ์เฉพาะ <span className="text-zinc-200 font-medium">Cosplay Creator</span> เจ้าของตัวละคร และ <span className="text-zinc-200 font-medium">ทีมผู้ดูแลระบบ (Admin)</span> เท่านั้น
            </>
          )}
          {is503 && (
            <>
              ระบบอ่านข้อมูล Analytics ยังไม่พร้อมใช้งาน หรือยังไม่ได้เปิด Binding ฐานข้อมูล Production
            </>
          )}
          {type === 'error' && (message || 'ไม่สามารถติดต่อ Analytics Worker ได้')}
        </p>

        {is401 && (
          <div className="space-y-4 mb-6">
            {/* Primary Action: Google Login */}
            <a
              href="/auth/google"
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-100 transition shadow-lg shadow-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              เข้าสู่ระบบด้วย Google (Gmail)
            </a>

            {/* Quick Session Login for Provisioned Admins */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <div className="text-[11px] font-medium text-zinc-400">หรือคลิกทดสอบเข้าสู่ระบบด้วยสิทธิ์ Admin:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSession('igx_59c6dd16a85d4e2db17063af8f39214620c11c502ea44604b52052cbc31a60e3')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-pink-300 hover:bg-zinc-800 hover:border-pink-500/40 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                  Jirapat (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSession('igx_taychin_1ddfd8d99064419e8645011dfd1008b57ed9effdcb5146b99df5c7cd9adbae7c')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-purple-300 hover:bg-zinc-800 hover:border-purple-500/40 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Taychin (Admin)
                </button>
              </div>
            </div>

            {/* Secondary Action: Direct Token Input */}
            <div className="pt-2 border-t border-zinc-800/80">
              {!showTokenInput ? (
                <button
                  type="button"
                  onClick={() => setShowTokenInput(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Key className="w-3.5 h-3.5" />
                  กรอก Access Token ด้วยตนเอง
                </button>
              ) : (
                <form onSubmit={handleTokenSubmit} className="space-y-2 text-left">
                  <div className="text-[11px] text-zinc-400 font-medium">กรอก Access Token ของคุณ:</div>
                  <input
                    type="text"
                    placeholder="igx_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/60"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!token.trim()}
                      className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition disabled:opacity-40"
                    >
                      ยืนยัน Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTokenInput(false)}
                      className="px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {is403 && (
            <a
              href="https://instagoon.app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับไปยังหน้าเกม Instagoon
            </a>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ลองตรวจสอบ Session ใหม่อีกครั้ง
            </button>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-900 text-[11px] text-zinc-600 font-mono">
          instagoon-analytics · production plane
        </div>
      </div>
    </div>
  );
}
