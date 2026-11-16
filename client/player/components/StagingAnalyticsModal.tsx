import { useState, useEffect } from 'react';
import { X, RefreshCw, TrendingUp, Cpu, DollarSign, ShieldCheck, UserCheck, Layers, AlertCircle, ArrowUpRight } from 'lucide-react';

interface CreatorPnLRow {
  creatorId: string;
  name: string;
  avatarKey?: string;
  cosplayAccount?: {
    userId: string;
    userEmail: string;
    accountStatus: string;
    revShareBps: number;
    boundAt: number;
    oneAccountOneCharacterEnforced: boolean;
  } | null;
  turns: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  costs: {
    aiCostSatang: number;
    aiCostThb: number;
    aiCostPerTurnThb: number;
  };
  revenue: {
    grossRevenueSatang: number;
    grossRevenueThb: number;
    creatorEarningSatang: number;
    creatorEarningThb: number;
    platformFeeSatang: number;
    platformFeeThb: number;
    pendingEscrowThb: number;
    settledThb: number;
  };
  pnl: {
    platformNetProfitSatang: number;
    platformNetProfitThb: number;
    netMarginPercent: number;
  };
}

interface AnalyticsData {
  mode: string;
  source?: string;
  revenueInstrumented?: boolean;
  generatedAt: number;
  modelPricing: {
    activeModel: string;
    exchangeRateThb: number;
    rates: {
      inputCacheMissUsdPerM: number;
      inputCacheHitUsdPerM: number;
      outputUsdPerM: number;
    };
  };
  overview: {
    totalCreators: number;
    boundCosplayAccounts: number;
    totalTurns: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    costs: {
      aiCostSatang: number;
      aiCostThb: number;
      avgCostPerTurnThb: number;
    };
    revenue: {
      grossRevenueSatang: number;
      grossRevenueThb: number;
      creatorPayoutSatang: number;
      creatorPayoutThb: number;
      platformNetProfitSatang: number;
      platformNetProfitThb: number;
      netMarginPercent: number;
    };
  };
  creators: CreatorPnLRow[];
}

export function StagingAnalyticsModal({ origin, onClose }: { origin: string; onClose: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      // The read plane is a different Worker on its own origin, so the session cookie has to ride
      // cross-origin; same-origin credentials would silently send nothing.
      const response = await fetch(`${origin}/api/analytics/cosplay`, { credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `เกิดข้อผิดพลาด (${response.status})`;
        throw new Error(message);
      }
      setData(data as AnalyticsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load staging analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [origin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Staging Data Analytics & PnL Engine</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  STAGING ONLY
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono flex items-center gap-1">
                  <ShieldCheck size={12} /> 1 Account = 1 Character
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time Token Economics based on <span className="text-pink-400 font-semibold">deepseek-flash</span> (THB Satang Precision)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pricing Model Rate Card */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Cpu size={14} className="text-blue-400" /> Active Model
            </span>
            <div className="mt-1">
              <span className="text-base font-bold text-blue-400">DeepSeek-Flash</span>
              <p className="text-[11px] text-zinc-500 mt-0.5">1 USD = ฿34.50 (Live Fixed)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
            <span className="text-xs text-zinc-400">Input (Cache Miss)</span>
            <div className="mt-1">
              <span className="text-base font-bold text-zinc-100">$0.14 <span className="text-xs text-zinc-400 font-normal">/ 1M</span></span>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">฿4.83 ต่อ 1M Tokens</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
            <span className="text-xs text-zinc-400">Input (Cache Hit)</span>
            <div className="mt-1">
              <span className="text-base font-bold text-zinc-100">$0.014 <span className="text-xs text-zinc-400 font-normal">/ 1M</span></span>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">฿0.48 ต่อ 1M Tokens</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
            <span className="text-xs text-zinc-400">Output Tokens</span>
            <div className="mt-1">
              <span className="text-base font-bold text-zinc-100">$0.28 <span className="text-xs text-zinc-400 font-normal">/ 1M</span></span>
              <p className="text-[11px] text-purple-400 font-mono mt-0.5">฿9.66 ต่อ 1M Tokens</p>
            </div>
          </div>
        </div>

        {/* Overview KPI Summary */}
        {data && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Total AI Turns</span>
                <Layers size={13} className="text-pink-400" />
              </div>
              <div className="text-2xl font-extrabold mt-1 text-zinc-100">
                {data.overview.totalTurns.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {data.overview.tokens.total.toLocaleString()} total tokens
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Total AI Cost (THB)</span>
                <DollarSign size={13} className="text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold mt-1 text-amber-400">
                ฿{data.overview.costs.aiCostThb.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Avg ฿{data.overview.costs.avgCostPerTurnThb.toFixed(4)} / turn
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Gross Revenue</span>
                <TrendingUp size={13} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold mt-1 text-emerald-400">
                ฿{data.overview.revenue.grossRevenueThb.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Creator 30%: ฿{data.overview.revenue.creatorPayoutThb.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Platform Net Margin</span>
                <ArrowUpRight size={13} className="text-blue-400" />
              </div>
              <div className={`text-2xl font-extrabold mt-1 ${data.overview.revenue.platformNetProfitThb >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                ฿{data.overview.revenue.platformNetProfitThb.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Net Margin: {data.overview.revenue.netMarginPercent}%
              </div>
            </div>
          </div>
        )}

        {/* Table of Cosplay Creators PnL */}
        <div className="mt-5 flex-1 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-900/30">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Cosplay Creator / Persona</th>
                <th className="py-2.5 px-3">1:1 Account Binding</th>
                <th className="py-2.5 px-3 text-right">Turns</th>
                <th className="py-2.5 px-3 text-right">Tokens</th>
                <th className="py-2.5 px-3 text-right">AI Cost (DeepSeek)</th>
                <th className="py-2.5 px-3 text-right">Gross Rev</th>
                <th className="py-2.5 px-3 text-right">Creator Commission (30%)</th>
                <th className="py-2.5 px-3 text-right">Platform Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    <RefreshCw size={20} className="animate-spin inline-block mb-1 text-pink-400" />
                    <div>Loading staging telemetry...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-rose-400">
                    <AlertCircle size={20} className="inline-block mb-1" />
                    <div>{error}</div>
                  </td>
                </tr>
              ) : data && data.creators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No creators found in staging database.
                  </td>
                </tr>
              ) : (
                data?.creators.map((c) => (
                  <tr key={c.creatorId} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2 px-3 font-sans font-medium text-zinc-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-[10px]">
                        {c.name.slice(0, 1)}
                      </div>
                      <div>
                        <div>{c.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">@{c.creatorId}</div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {c.cosplayAccount ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans">
                          <UserCheck size={13} />
                          <span>1:1 Bound</span>
                          <span className="text-[10px] text-zinc-500">({c.cosplayAccount.userEmail || 'active'})</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-sans text-[11px]">Static Canon</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-200">{c.turns.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-zinc-400">{c.tokens.total.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-amber-400">฿{c.costs.aiCostThb.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400">฿{c.revenue.grossRevenueThb.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-zinc-300">฿{c.revenue.creatorEarningThb.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold">
                      <span className={c.pnl.platformNetProfitThb >= 0 ? 'text-blue-400' : 'text-rose-400'}>
                        ฿{c.pnl.platformNetProfitThb.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Data is scoped strictly to <span className="text-zinc-300 font-mono">Cloudflare D1 Staging isolate</span>. Protected from Production.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-medium"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
