import React, { useState } from 'react';
import { ShieldAlert, LogIn, Lock, ArrowLeft, RefreshCw, AlertCircle, Key } from 'lucide-react';

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

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    window.location.href = `/auth/session?token=${encodeURIComponent(token.trim())}`;
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
          {is401 && 'ต้องเข้าสู่ระบบก่อน (401)'}
          {is403 && 'ไม่มีสิทธิ์เข้าถึงแดชบอร์ด (403)'}
          {is503 && 'ระบบ Analytics ปิดปรับปรุง (503)'}
          {type === 'error' && 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}
        </h1>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {is401 && (
            <>
              เบราว์เซอร์ไม่พบ Cookie ประจำตัว (<code className="text-pink-400 font-mono text-xs">frost_session</code>) บนโดเมนนี้
              กรุณากรอก Access Token หรือเข้าสู่ระบบผ่านลิงก์ยืนยันตัวตน
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
          <form onSubmit={handleTokenSubmit} className="mb-6 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="กรอก Session Token (เช่น igx_...)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium text-xs hover:from-pink-500 hover:to-purple-500 transition shadow-lg shadow-pink-600/20 disabled:opacity-40"
            >
              <Key className="w-3.5 h-3.5" />
              เข้าสู่ระบบด้วย Token
            </button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {is401 && (
            <a
              href="https://instagoon.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-xs hover:bg-zinc-800 hover:text-white transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              เปิดหน้าเว็บหลัก Instagoon.app
            </a>
          )}

          {is403 && (
            <a
              href="https://instagoon.app"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปยังหน้าเกม Instagoon
            </a>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ลองตรวจสอบ Session ใหม่อีกครั้ง
            </button>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-900 text-xs text-zinc-600 font-mono">
          instagoon-analytics · production plane
        </div>
      </div>
    </div>
  );
}
