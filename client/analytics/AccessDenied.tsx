import React, { useState } from 'react';
import {
  ShieldAlert, Lock, ArrowLeft, RefreshCw, AlertCircle, Key, ShieldCheck, Sparkles,
  ArrowRight, Mail, Loader2, CheckCircle2
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

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const handleDualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !token.trim()) {
      setErrorMsg('กรุณากรอกทั้งอีเมล Gmail และ Access Token ให้ครบถ้วน');
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg(null);
      const res = await fetch('/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: token.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      setVerifySuccess(true);
      setTimeout(() => {
        if (onRetry) onRetry();
        else window.location.reload();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'การตรวจสอบตัวตนล้มเหลว');
    } finally {
      setVerifying(false);
    }
  };

  const handlePresetFill = (presetEmail: string, presetToken: string) => {
    setEmail(presetEmail);
    setToken(presetToken);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-pink-600/15 via-purple-600/10 to-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative z-10 animate-fadeIn">
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
            Production Plane
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
            {is401 && 'ระบบยืนยันตัวตน 2 Checkpoints'}
            {is403 && 'ไม่มีสิทธิ์เข้าถึงแดชบอร์ด (403)'}
            {is503 && 'ระบบ Analytics ปิดปรับปรุง (503)'}
            {type === 'error' && 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}
          </h1>

          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {is401 && 'ต้องผ่านทั้ง Checkpoint Gmail ที่ได้รับสิทธิ์ และ Checkpoint Token ประจำตัวพร้อมกันในรอบเดียว'}
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
            {/* Error or Success notification */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {verifySuccess && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ผ่านการตรวจสอบทั้ง 2 Checkpoints กำลังเข้าสู่แดชบอร์ด...</span>
              </div>
            )}

            {/* Quick Fill Admin Presets */}
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium">คลิกเติมข้อมูลอัตโนมัติ (Admin Quick Fill):</span>
                <span className="text-[10px] text-zinc-500">ทั้ง 2 Checkpoints</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetFill('jirapat.chumee@gmail.com', 'igx_59c6dd16a85d4e2db17063af8f39214620c11c502ea44604b52052cbc31a60e3')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-pink-300 hover:bg-zinc-800 hover:border-pink-500/40 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>Jirapat (Admin)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFill('taychinsgo@gmail.com', 'igx_taychin_1ddfd8d99064419e8645011dfd1008b57ed9effdcb5146b99df5c7cd9adbae7c')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-purple-300 hover:bg-zinc-800 hover:border-purple-500/40 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Taychin (Admin)</span>
                </button>
              </div>
            </div>

            {/* Dual Checkpoint Form */}
            <form onSubmit={handleDualSubmit} className="space-y-4">
              {/* Checkpoint 1: Gmail Input */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Checkpoint 1: บัญชี Google (Gmail)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">จำกัดสิทธิ์แบบ Staging</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="เช่น jirapat.chumee@gmail.com หรือ taychinsgo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/60"
                  />
                </div>
              </div>

              {/* Checkpoint 2: Access Token Input */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>Checkpoint 2: รหัส Access Token ประจำตัว</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">เช็กสิทธิ์และสถานะใน D1</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="igx_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={verifying || verifySuccess || !email.trim() || !token.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-pink-600/20 disabled:opacity-40"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบทั้ง 2 Checkpoints...</span>
                  </>
                ) : verifySuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>ตรวจสอบสำเร็จ</span>
                  </>
                ) : (
                  <>
                    <span>ตรวจสอบ 2 Checkpoints & เข้าสู่ระบบ</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
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
