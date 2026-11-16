import React, { useState } from 'react';
import { 
  Users, Bot, DollarSign, Activity, RefreshCw, Clock, 
  Layers, AlertTriangle, ShieldCheck, Zap, BarChart3, Database,
  Eye, LogOut, Sliders, ChevronDown, CheckCircle2, Cpu, Coins
} from 'lucide-react';
import type { AdminOverviewPayload, CreatorViewPayload } from './types';
import { CreatorDashboard } from './CreatorDashboard';

interface Props {
  data: AdminOverviewPayload;
  hours: number;
  onHoursChange: (h: number) => void;
  onRefresh: () => void;
}

type DisplaySegment = 'overview' | 'tokens' | 'simulator';

export function AdminDashboard({ data, hours, onHoursChange, onRefresh }: Props) {
  const [segment, setSegment] = useState<DisplaySegment>('overview');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(
    data.creators[0]?.creatorId || 'crt_yuki'
  );
  const [runningRollup, setRunningRollup] = useState(false);
  const [rollupMessage, setRollupMessage] = useState<string | null>(null);

  // Compute aggregated sums across loaded hourly buckets
  let totalAiTurns = 0;
  let totalAiOk = 0;
  let totalAiError = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalRevenueSatang = 0;
  let totalPaidOrders = 0;
  let totalEnergyGranted = 0;
  let totalDmActivity = 0;
  let totalStoryActivity = 0;
  let totalNewPlayers = 0;
  let maxActivePlayers = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const h of data.hours) {
    const m = h.metrics || {};
    totalAiTurns += m['ai.turns'] || 0;
    totalAiOk += m['ai.outcome.ok'] || 0;
    totalAiError += m['ai.outcome.error'] || 0;
    totalTokensIn += m['ai.tokens_in'] || 0;
    totalTokensOut += m['ai.tokens_out'] || 0;
    totalRevenueSatang += m['money.orders_paid_satang'] || 0;
    totalPaidOrders += m['money.orders_paid'] || 0;
    totalEnergyGranted += m['money.energy_granted'] || 0;
    totalDmActivity += m['activity.dm'] || 0;
    totalStoryActivity += m['activity.story'] || 0;
    totalNewPlayers += m['players.new'] || 0;
    const act = m['players.active'] || 0;
    if (act > maxActivePlayers) maxActivePlayers = act;
    if (m['ai.latency_ms']) {
      latencySum += m['ai.latency_ms'];
      latencyCount += 1;
    }
  }

  // Calculate AI cost satang based on creator aggregates
  let totalCostSatang = 0;
  for (const c of data.creators) {
    totalCostSatang += c.costSatangEstimate || 0;
  }

  const totalTokens = totalTokensIn + totalTokensOut;
  const avgTokensPerTurn = totalAiTurns > 0 ? Math.round(totalTokens / totalAiTurns) : 0;
  const avgTokensOutPerTurn = totalAiTurns > 0 ? Math.round(totalTokensOut / totalAiTurns) : 0;
  const avgLatencyMs = latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0;
  const estimatedCachedTokens = Math.floor(totalTokensIn * 0.5);
  const costPerThousandTurnsSatang = totalAiTurns > 0 ? Math.round((totalCostSatang / totalAiTurns) * 1000) : 0;

  const handleForceRollup = async () => {
    try {
      setRunningRollup(true);
      setRollupMessage(null);
      const res = await fetch('/api/analytics/rollup/run', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setRollupMessage(`คำนวณ Rollup สำเร็จ: ${result.rowsWritten || 0} แถว`);
      onRefresh();
    } catch (err: any) {
      setRollupMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setRunningRollup(false);
    }
  };

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

  // Build simulated CreatorViewPayload for Creator Simulator Tab
  const simulatedCreatorData: CreatorViewPayload = {
    scope: 'creator',
    source: data.source,
    generatedAt: data.generatedAt,
    creators: [selectedCreatorId],
    meta: {
      money: 'hidden_until_attributed',
      costBasis: data.meta.costBasis
    },
    hours: data.hours.map(h => {
      const metrics: Record<string, number> = {};
      for (const [k, v] of Object.entries(h.metrics || {})) {
        if (k.endsWith(`:${selectedCreatorId}`)) {
          metrics[k] = v;
        }
      }
      return { bucket: h.bucket, metrics };
    })
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-400">
              INSTAGOON
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Admin Plane
            </span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {data.source === 'production' ? 'Production Live' : data.source}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            ระบบวิเคราะห์ข้อมูลจาก Rollup Table รายชั่วโมง (Prod D1) · อัปเดตล่าสุด {new Date(data.generatedAt).toLocaleTimeString('th-TH')}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Time range selector */}
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

          <button
            onClick={handleForceRollup}
            disabled={runningRollup}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/10 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${runningRollup ? 'animate-spin' : ''}`} />
            {runningRollup ? 'กำลังคำนวณ...' : 'คำนวณ Rollup เดี๋ยวนี้'}
          </button>

          {/* Logout Button */}
          <a
            href="/auth/logout"
            title="ออกจากระบบ"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-xs transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออก</span>
          </a>
        </div>
      </div>

      {rollupMessage && (
        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300 flex items-center justify-between">
          <span>{rollupMessage}</span>
          <button onClick={() => setRollupMessage(null)} className="text-zinc-400 hover:text-zinc-200">✕</button>
        </div>
      )}

      {/* Segment Mode Switcher (แบ่งประเภทการแสดงผลตาม Token / สิทธิ์การเข้าถึง) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl">
        <div className="flex items-center flex-wrap gap-1">
          <button
            onClick={() => setSegment('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              segment === 'overview'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ภาพรวม Platform (Admin Token)</span>
          </button>

          <button
            onClick={() => setSegment('tokens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              segment === 'tokens'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>วิเคราะห์สัดส่วน AI Tokens</span>
          </button>

          <button
            onClick={() => setSegment('simulator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              segment === 'simulator'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>จำลองสิทธิ์ Creator Token</span>
          </button>
        </div>

        {segment === 'simulator' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs">
            <span className="text-zinc-400 text-[11px]">เลือกตัวละคร:</span>
            <select
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
              className="bg-transparent text-pink-300 font-semibold focus:outline-none cursor-pointer"
            >
              {data.creators.length === 0 ? (
                <option value="crt_yuki" className="bg-zinc-900 text-zinc-100">crt_yuki</option>
              ) : (
                data.creators.map(c => (
                  <option key={c.creatorId} value={c.creatorId} className="bg-zinc-900 text-zinc-100">
                    {c.creatorId} ({c.turns} turns)
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* ===================== TAB 1: OVERVIEW ===================== */}
      {segment === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Users & Traffic */}
            <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">ผู้เล่นในระบบ</span>
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-white mb-1">
                {formatNumber(data.lifetime['users.total'] || 0)} <span className="text-xs font-normal text-zinc-400">บัญชีรวม</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900 mt-3">
                <span>ผู้เล่นใหม่ ({hours}h): <strong className="text-pink-400">+{formatNumber(totalNewPlayers)}</strong></span>
                <span>Active สูงสุด: <strong className="text-zinc-200">{formatNumber(maxActivePlayers)}</strong></span>
              </div>
            </div>

            {/* Card 2: AI Turns & Efficiency */}
            <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">AI Chat Turns ({hours}h)</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-white mb-1">
                {formatNumber(totalAiTurns)} <span className="text-xs font-normal text-zinc-400">เทิร์น</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900 mt-3">
                <span>สำเร็จ: <strong className="text-emerald-400">{formatNumber(totalAiOk)}</strong></span>
                <span>Error: <strong className={totalAiError > 0 ? 'text-red-400' : 'text-zinc-500'}>{formatNumber(totalAiError)}</strong></span>
              </div>
            </div>

            {/* Card 3: Revenue (Admin only) */}
            <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">ยอดเติมเงิน ({hours}h)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-400 mb-1">
                {formatThb(totalRevenueSatang)}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900 mt-3">
                <span>ออเดอร์ชำระแล้ว: <strong className="text-zinc-200">{formatNumber(totalPaidOrders)}</strong></span>
                <span>พลังงานที่ให้: <strong className="text-zinc-200">{formatNumber(totalEnergyGranted)} ⚡</strong></span>
              </div>
            </div>

            {/* Card 4: AI Compute & Token Cost */}
            <div className="glass-panel glass-panel-hover rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">ต้นทุนประเมิน AI ({hours}h)</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-purple-300 mb-1">
                {formatThb(totalCostSatang)}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900 mt-3">
                <span>Tokens เข้า: <strong className="text-zinc-300">{formatNumber(totalTokensIn)}</strong></span>
                <span>Tokens ออก: <strong className="text-zinc-300">{formatNumber(totalTokensOut)}</strong></span>
              </div>
            </div>
          </div>

          {/* Content Assets Stats Pill Bar */}
          <div className="glass-panel rounded-2xl p-4 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Layers className="w-4 h-4 text-pink-400" />
              <span className="font-medium text-zinc-200">สถิติ Content รวมในระบบ (Lifetime):</span>
            </div>
            <div className="flex items-center flex-wrap gap-6 text-zinc-300">
              <div>Creators: <strong className="text-pink-400 ml-1">{formatNumber(data.lifetime['creators.total'] || 0)}</strong></div>
              <div>Posts: <strong className="text-purple-400 ml-1">{formatNumber(data.lifetime['posts.total'] || 0)}</strong></div>
              <div>Stories: <strong className="text-indigo-400 ml-1">{formatNumber(data.lifetime['stories.total'] || 0)}</strong></div>
              <div>Relationships: <strong className="text-emerald-400 ml-1">{formatNumber(data.lifetime['relationships.total'] || 0)}</strong></div>
              <div>Likes: <strong className="text-amber-400 ml-1">{formatNumber(data.lifetime['likes.total'] || 0)}</strong></div>
              <div>Cosplay Accounts: <strong className="text-cyan-400 ml-1">{formatNumber(data.lifetime['cosplay_accounts.bound'] || 0)}</strong></div>
            </div>
          </div>

          {/* Creator Performance Table */}
          <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-pink-400" />
                <h2 className="text-sm font-semibold text-white">ประสิทธิภาพรายตัวละคร (Creator Leaderboard)</h2>
              </div>
              <span className="text-xs text-zinc-500">เรียงตามจำนวนเทิร์นแชทใน {hours} ชม.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/60 uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-6 py-3">Creator ID</th>
                    <th className="px-6 py-3 text-right">AI Turns</th>
                    <th className="px-6 py-3 text-right">Tokens In</th>
                    <th className="px-6 py-3 text-right">Tokens Out</th>
                    <th className="px-6 py-3 text-right">ต้นทุนประเมิน (THB)</th>
                    <th className="px-6 py-3 text-center">สิทธิ์การมองเห็น</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-200">
                  {data.creators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                        ยังไม่มีข้อมูลการแชทของ Creator ในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    data.creators.map(c => (
                      <tr key={c.creatorId} className="hover:bg-zinc-900/40 transition">
                        <td className="px-6 py-3.5 font-medium text-pink-300">
                          {c.creatorId}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-zinc-100">
                          {formatNumber(c.turns)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-zinc-400">
                          {formatNumber(c.tokensIn)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-zinc-400">
                          {formatNumber(c.tokensOut)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-purple-300">
                          {formatThb(c.costSatangEstimate)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedCreatorId(c.creatorId);
                              setSegment('simulator');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition text-[11px]"
                          >
                            <Eye className="w-3 h-3 text-pink-400" />
                            <span>ดูมุมมอง Creator</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hourly Trend Table */}
          <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">ประวัติสถิติรายชั่วโมง (Hourly Rollup Timeline)</h2>
              </div>
              <span className="text-xs text-zinc-500">แสดงสูงสุด {hours} ชั่วโมงล่าสุด</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-medium sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-6 py-3">ช่วงเวลา (Bucket)</th>
                    <th className="px-6 py-3 text-right">Active Players</th>
                    <th className="px-6 py-3 text-right">DMs</th>
                    <th className="px-6 py-3 text-right">Stories</th>
                    <th className="px-6 py-3 text-right">AI Turns</th>
                    <th className="px-6 py-3 text-right">AI Errors</th>
                    <th className="px-6 py-3 text-right">ยอดเติมเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-200">
                  {data.hours.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        ไม่มีข้อมูลรายชั่วโมง
                      </td>
                    </tr>
                  ) : (
                    data.hours.map(h => {
                      const m = h.metrics || {};
                      return (
                        <tr key={h.bucket} className="hover:bg-zinc-900/40 transition">
                          <td className="px-6 py-3 font-mono text-zinc-300">
                            {formatBucket(h.bucket)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-zinc-400">
                            {formatNumber(m['players.active'] || 0)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-zinc-400">
                            {formatNumber(m['activity.dm'] || 0)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-zinc-400">
                            {formatNumber(m['activity.story'] || 0)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-zinc-100">
                            {formatNumber(m['ai.turns'] || 0)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono">
                            <span className={(m['ai.outcome.error'] || 0) > 0 ? 'text-red-400' : 'text-zinc-600'}>
                              {formatNumber(m['ai.outcome.error'] || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-emerald-400">
                            {formatThb(m['money.orders_paid_satang'] || 0)}
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
      )}

      {/* ===================== TAB 2: AI TOKEN ECONOMICS ===================== */}
      {segment === 'tokens' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Token Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Input / Prompt Tokens</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-cyan-300 font-mono mb-1">
                {formatNumber(totalTokensIn)}
              </div>
              <p className="text-[11px] text-zinc-500">โทเคนคำสั่งและประวัติแชทที่ส่งเข้าโมเดล</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Output / Completion Tokens</span>
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-purple-300 font-mono mb-1">
                {formatNumber(totalTokensOut)}
              </div>
              <p className="text-[11px] text-zinc-500">โทเคนบทสนทนาที่ AI ตอบกลับมา</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">Estimated Cached Tokens</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-300 font-mono mb-1">
                {formatNumber(estimatedCachedTokens)}
              </div>
              <p className="text-[11px] text-zinc-500">ส่วนประหยัดด้วย Context Caching (~50%)</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">ต้นทุนประเมินรวม (Satang/THB)</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-amber-300 font-mono mb-1">
                {formatThb(totalCostSatang)}
              </div>
              <p className="text-[11px] text-zinc-500">คำนวณตามสูตรต้นทุน Gemini-2.5-Flash</p>
            </div>
          </div>

          {/* Token Efficiency Card Bar */}
          <div className="glass-panel rounded-2xl p-6 border border-zinc-800/80 grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="border-b md:border-b-0 md:border-r border-zinc-800/80 pb-4 md:pb-0">
              <div className="text-xs text-zinc-400 mb-1">เฉลี่ย Tokens / Turn</div>
              <div className="text-xl font-bold font-mono text-white">{formatNumber(avgTokensPerTurn)}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Input + Output รวมต่อเทิร์น</div>
            </div>
            <div className="border-b md:border-b-0 md:border-r border-zinc-800/80 pb-4 md:pb-0">
              <div className="text-xs text-zinc-400 mb-1">เฉลี่ย Output Tokens / Turn</div>
              <div className="text-xl font-bold font-mono text-purple-300">{formatNumber(avgTokensOutPerTurn)}</div>
              <div className="text-[11px] text-zinc-500 mt-1">ความยาวบทตอบสนอง AI</div>
            </div>
            <div className="border-b md:border-b-0 md:border-r border-zinc-800/80 pb-4 md:pb-0">
              <div className="text-xs text-zinc-400 mb-1">ความเร็วเฉลี่ย (Latency)</div>
              <div className="text-xl font-bold font-mono text-cyan-300">{formatNumber(avgLatencyMs)} ms</div>
              <div className="text-[11px] text-zinc-500 mt-1">เวลาตอบสนองของโมเดล</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">ต้นทุนเฉลี่ยต่อ 1,000 Turns</div>
              <div className="text-xl font-bold font-mono text-emerald-300">{formatThb(costPerThousandTurnsSatang)}</div>
              <div className="text-[11px] text-zinc-500 mt-1">ประสิทธิภาพด้านค่าใช้จ่าย</div>
            </div>
          </div>

          {/* Token Share by Character */}
          <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">สัดส่วนการบริโภค Token แยกตามตัวละคร</h2>
              </div>
              <span className="text-xs text-zinc-500">คำนวณจากยอดรวมใน {hours} ชั่วโมง</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/60 uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-6 py-3">Creator ID</th>
                    <th className="px-6 py-3 text-right">AI Turns</th>
                    <th className="px-6 py-3 text-right">Tokens In</th>
                    <th className="px-6 py-3 text-right">Tokens Out</th>
                    <th className="px-6 py-3 text-right">Tokens รวม</th>
                    <th className="px-6 py-3 text-left">สัดส่วนการใช้ (Share %)</th>
                    <th className="px-6 py-3 text-right">ต้นทุนประเมิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-200">
                  {data.creators.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        ยังไม่มีข้อมูล Token ของ Creator
                      </td>
                    </tr>
                  ) : (
                    data.creators.map(c => {
                      const cTotalTokens = c.tokensIn + c.tokensOut;
                      const sharePercent = totalTokens > 0 ? ((cTotalTokens / totalTokens) * 100).toFixed(1) : '0';
                      return (
                        <tr key={c.creatorId} className="hover:bg-zinc-900/40 transition">
                          <td className="px-6 py-3.5 font-medium text-pink-300">
                            {c.creatorId}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-zinc-300">
                            {formatNumber(c.turns)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-cyan-400">
                            {formatNumber(c.tokensIn)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-purple-400">
                            {formatNumber(c.tokensOut)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-semibold text-white">
                            {formatNumber(cTotalTokens)}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min(parseFloat(sharePercent), 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-zinc-400">{sharePercent}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-amber-300">
                            {formatThb(c.costSatangEstimate)}
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
      )}

      {/* ===================== TAB 3: CREATOR SIMULATOR ===================== */}
      {segment === 'simulator' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Simulation Header Notice */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">กำลังจำลองมุมมอง Creator Token:</span>{' '}
                <span className="text-cyan-300 font-mono font-semibold">{selectedCreatorId}</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  นี่คือหน้าจอที่ Creator เจ้าของ Token นี้จะมองเห็นจริง — ปลอดภัย 100% ไร้ข้อมูลการเงิน Platform และตัวละครอื่น
                </p>
              </div>
            </div>
            <button
              onClick={() => setSegment('overview')}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition font-medium"
            >
              กลับสู่มุมมอง Admin
            </button>
          </div>

          {/* Embedded Creator Dashboard */}
          <div className="border border-zinc-800/80 rounded-3xl bg-zinc-950/60 p-2 sm:p-4">
            <CreatorDashboard
              data={simulatedCreatorData}
              hours={hours}
              onHoursChange={onHoursChange}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      )}

      {/* Rollup Engine Status Footer */}
      <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-zinc-300">สถานะ Rollup Engine:</span>
            {data.meta.lastRun ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                สถานะ: {data.meta.lastRun.status} ({data.meta.lastRun.rows_written} แถวที่เขียน)
              </span>
            ) : (
              <span className="text-zinc-500">ยังไม่มีประวัติการรัน</span>
            )}
          </div>
          {data.meta.lastRun && (
            <div className="font-mono text-zinc-500">
              Bucket ล่าสุด: {data.meta.lastRun.bucket} · เสร็จสิ้นเมื่อ: {new Date(data.meta.lastRun.finished_at).toLocaleTimeString('th-TH')}
            </div>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed pt-2 border-t border-zinc-900">
          * {data.meta.costBasis} · {data.meta.revenuePerCreator} · {data.meta.traffic}
        </p>
      </div>
    </div>
  );
}
