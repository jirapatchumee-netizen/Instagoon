import React from 'react';
import { Bot, Zap, RefreshCw, ShieldCheck, Heart, MessageSquare } from 'lucide-react';
import type { CreatorViewPayload } from './types';

interface Props {
  data: CreatorViewPayload;
  hours: number;
  onHoursChange: (h: number) => void;
  onRefresh: () => void;
}

export function CreatorDashboard({ data, hours, onHoursChange, onRefresh }: Props) {
  // Aggregate stats across own characters
  let totalTurns = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostSatang = 0;

  for (const h of data.hours) {
    const m = h.metrics || {};
    for (const [key, val] of Object.entries(m)) {
      if (key.startsWith('creator.turns:')) totalTurns += val;
      if (key.startsWith('creator.tokens_in:')) totalTokensIn += val;
      if (key.startsWith('creator.tokens_out:')) totalTokensOut += val;
      if (key.startsWith('creator.cost_satang:')) totalCostSatang += val;
    }
  }

  const formatThb = (satang: number) => {
    return (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿';
  };

  const formatNumber = (num: number) => {
    return (num || 0).toLocaleString('th-TH');
  };

  const formatBucket = (bucketStr: string) => {
    try {
      const d = new Date(bucketStr);
      return d.toLocaleString('th-TH', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false 
      });
    } catch {
      return bucketStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-400">
              INSTAGOON
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Creator Studio
            </span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {data.source === 'production' ? 'Production Live' : data.source}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            ตัวละครของคุณ: <strong className="text-pink-400">{data.creators.join(', ')}</strong> · อัปเดตล่าสุด {new Date(data.generatedAt).toLocaleTimeString('th-TH')}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => onHoursChange(24)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                hours === 24 ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              24 ชม.
            </button>
            <button
              onClick={() => onHoursChange(48)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                hours === 48 ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              48 ชม.
            </button>
            <button
              onClick={() => onHoursChange(168)}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                hours === 168 ? 'bg-pink-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7 วัน
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="รีเฟรชข้อมูล"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="glass-panel rounded-2xl p-4 border border-zinc-800/80 flex items-center gap-3 text-xs text-zinc-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold text-white">มุมมองเฉพาะตัวละครของคุณ (Creator Mode):</span> ข้อมูลถูกคัดกรองอย่างปลอดภัย สถิติแสดงเฉพาะการโต้ตอบของตัวละครที่คุณเป็นเจ้าของเท่านั้น
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">บทสนทนา AI ({hours}h)</span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-white mb-1">
            {formatNumber(totalTurns)} <span className="text-xs font-normal text-zinc-400">เทิร์น</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            จำนวนการตอบกลับข้อความของผู้เล่น
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Prompt Tokens ({hours}h)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-indigo-300 mb-1">
            {formatNumber(totalTokensIn)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            โทเค็นคำสั่งและบริบทที่ส่งให้ AI
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">Output Tokens ({hours}h)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-purple-300 mb-1">
            {formatNumber(totalTokensOut)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            โทเค็นคำตอบที่สร้างโดย AI
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">ต้นทุนประเมิน ({hours}h)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-300 mb-1">
            {formatThb(totalCostSatang)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            คำนวณจากอัตราค่าบริการโมเดลมาตรฐาน
          </p>
        </div>
      </div>

      {/* Hourly Table */}
      <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">สถิติการใช้งานรายชั่วโมง</h2>
          <span className="text-xs text-zinc-500">{hours} ชั่วโมงล่าสุด</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-medium sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-6 py-3">ช่วงเวลา (Bucket)</th>
                <th className="px-6 py-3 text-right">AI Turns</th>
                <th className="px-6 py-3 text-right">Tokens In</th>
                <th className="px-6 py-3 text-right">Tokens Out</th>
                <th className="px-6 py-3 text-right">ต้นทุนประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-200">
              {data.hours.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    ไม่มีประวัติการแชทในช่วงเวลานี้
                  </td>
                </tr>
              ) : (
                data.hours.map(h => {
                  const m = h.metrics || {};
                  let bucketTurns = 0;
                  let bucketIn = 0;
                  let bucketOut = 0;
                  let bucketCost = 0;
                  for (const [k, v] of Object.entries(m)) {
                    if (k.startsWith('creator.turns:')) bucketTurns += v;
                    if (k.startsWith('creator.tokens_in:')) bucketIn += v;
                    if (k.startsWith('creator.tokens_out:')) bucketOut += v;
                    if (k.startsWith('creator.cost_satang:')) bucketCost += v;
                  }
                  return (
                    <tr key={h.bucket} className="hover:bg-zinc-900/40 transition">
                      <td className="px-6 py-3 font-mono text-zinc-300">
                        {formatBucket(h.bucket)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-pink-300">
                        {formatNumber(bucketTurns)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-zinc-400">
                        {formatNumber(bucketIn)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-zinc-400">
                        {formatNumber(bucketOut)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-amber-300">
                        {formatThb(bucketCost)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
