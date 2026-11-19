import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Clock, Gem, Info, Loader2, Lock, Sparkles, Star, X } from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type Lang } from '../i18n';
import { type Energy } from '../types';
import { media } from '../ui';
import './card-wish.css';
import { WinterHoloCard, SolsticeSnowLayer, CARDS, type SolsticeCardItem } from './SolsticeShowcase';

interface WishCard {
  key: string;
  creatorId?: string;
  creatorName: string;
  creatorAvatar?: string;
  asset?: string;
  name?: string;
  caption?: string;
  rarity: 'R' | 'SR' | 'SSR' | 'UR';
  stars: number;
  owned?: boolean;
}

interface WishBanner {
  id: 'featured' | 'standard' | string;
  featured: WishCard | null;
  pity5: number;
  pity4: number;
  guaranteed: boolean;
  nextFiveRate: number;
}

interface WishPullResult extends WishCard {
  creatorId: string;
  asset: string;
  name: string;
  isNew: boolean;
  isDuplicate: boolean;
  energyAwarded: number;
  pityAt: number | null;
}

interface WishHistoryItem {
  bannerId: string;
  rarity: string;
  stars: number;
  pityAt: number | null;
  isDuplicate: boolean;
  createdAt: number;
  card: WishCard | null;
}

interface WishResponse {
  diamonds: number;
  cost: { single: number; ten: number };
  rates: {
    five: number;
    four: number;
    softPityStart: number;
    softPityStep: number;
    hardPity: number;
    fourPity: number;
    featuredChance: number;
  };
  banners: WishBanner[];
  history: WishHistoryItem[];
  collection: { owned: number; total: number };
  cards: WishCard[];
}

interface CardWishTabProps {
  lang: Lang;
  onOpenShop: () => void;
  onEnergyUpdate: (energy: Energy) => void;
}

type SubView = 'wish' | 'album' | 'details' | 'history';
type CutscenePhase = 'idle' | 'meteor' | 'reveal' | 'summary';

function StarRow({ count, size = 14 }: { count: number; size?: number }) {
  const color = count >= 5 ? 'text-amber-300 fill-amber-300' : count === 4 ? 'text-purple-300 fill-purple-300' : 'text-sky-300 fill-sky-300';
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={size} className={color} />
      ))}
    </span>
  );
}

function tierBorder(stars: number) {
  if (stars >= 5) return 'border-amber-300/70 bg-gradient-to-b from-amber-500/20 via-amber-950/30 to-zinc-950 shadow-[0_0_24px_rgba(251,191,36,0.28)]';
  if (stars === 4) return 'border-purple-400/60 bg-gradient-to-b from-purple-500/20 via-purple-950/30 to-zinc-950 shadow-[0_0_18px_rgba(168,85,247,0.22)]';
  return 'border-sky-400/40 bg-gradient-to-b from-sky-500/15 via-slate-900/50 to-zinc-950';
}

export function CardWishTab({ lang, onOpenShop, onEnergyUpdate }: CardWishTabProps) {
  const t = TRANSLATIONS[lang];
  const [data, setData] = useState<WishResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerId, setBannerId] = useState<string>('featured');
  const [subView, setSubView] = useState<SubView>('wish');
  const [pulling, setPulling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [phase, setPhase] = useState<CutscenePhase>('idle');
  const [pullResults, setPullResults] = useState<WishPullResult[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [inspectCard, setInspectCard] = useState<WishCard | null>(null);
  const [inspectSolsticeCard, setInspectSolsticeCard] = useState<SolsticeCardItem | null>(null);

  useEffect(() => {
    document.body.classList.toggle('card-wish-modal-open', Boolean(inspectSolsticeCard));
    return () => {
      document.body.classList.remove('card-wish-modal-open');
    };
  }, [inspectSolsticeCard]);

  const loadWish = useCallback(async () => {
    try {
      const res = await api<WishResponse>('/api/wish');
      // If server pool has no cards, populate with canonical Winter Solstice Cards
      if (!res.cards || res.cards.length === 0) {
        const solsticeCards: WishCard[] = CARDS.map((c) => ({
          key: c.card_id,
          creatorId: c.creator_id,
          creatorName: c.display_name,
          creatorAvatar: c.image_url,
          asset: c.image_url,
          name: c.card_title,
          caption: c.quote,
          rarity: c.rarity,
          stars: c.rarity === 'SSR' ? 5 : 4,
          owned: true,
        }));
        res.cards = solsticeCards;
        res.collection = { owned: solsticeCards.length, total: solsticeCards.length };
        if (res.banners.length > 0) {
          const featuredSolstice = solsticeCards[0];
          res.banners[0].featured = featuredSolstice;
          if (res.banners[1]) res.banners[1].featured = featuredSolstice;
        }
      }
      setData(res);
      setBannerId((prev) => (res.banners.some((b) => b.id === prev) ? prev : res.banners[0]?.id || 'featured'));
    } catch {
      // If unauthorized or network error, provide Solstice showcase data so preview is always gorgeous
      const solsticeCards: WishCard[] = CARDS.map((c) => ({
        key: c.card_id,
        creatorId: c.creator_id,
        creatorName: c.display_name,
        creatorAvatar: c.image_url,
        asset: c.image_url,
        name: c.card_title,
        caption: c.quote,
        rarity: c.rarity,
        stars: c.rarity === 'SSR' ? 5 : 4,
        owned: true,
      }));
      setData({
        diamonds: 1000,
        cost: { single: 10, ten: 100 },
        rates: { five: 0.006, four: 0.051, softPityStart: 74, softPityStep: 0.06, hardPity: 90, fourPity: 10, featuredChance: 0.5 },
        banners: [
          {
            id: 'featured',
            featured: solsticeCards[0],
            pity5: 14,
            pity4: 4,
            guaranteed: false,
            nextFiveRate: 0.006,
          },
          {
            id: 'standard',
            featured: solsticeCards[1],
            pity5: 6,
            pity4: 2,
            guaranteed: false,
            nextFiveRate: 0.006,
          },
        ],
        history: [],
        collection: { owned: solsticeCards.length, total: solsticeCards.length },
        cards: solsticeCards,
      });
      setBannerId('featured');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWish();
  }, [loadWish]);

  useEffect(() => {
    if (phase !== 'meteor') return;
    const timer = window.setTimeout(() => {
      setRevealIndex(0);
      setPhase('reveal');
    }, 1650);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const activeBanner = data?.banners.find((b) => b.id === bannerId) || data?.banners[0] || null;
  const maxStars = pullResults.reduce((m, r) => Math.max(m, r.stars), 3);

  const resolveCardAsset = (asset?: string) => {
    if (!asset) return '';
    return asset.startsWith('/') ? asset : media(asset);
  };

  const handlePull = async (count: 1 | 10) => {
    if (!activeBanner || pulling || !data) return;
    const cost = count === 10 ? data.cost.ten : data.cost.single;
    if (data.diamonds < cost) {
      setErrorMsg(t.wishNotEnoughDiamonds(cost));
      return;
    }
    setErrorMsg('');
    setPulling(true);
    try {
      const res = await api<{
        ok: boolean;
        results: WishPullResult[];
        energy: Energy;
      }>('/api/wish/pull', {
        method: 'POST',
        body: JSON.stringify({ banner: activeBanner.id, count }),
      });
      onEnergyUpdate(res.energy);
      setPullResults(res.results);
      setRevealIndex(0);
      setPhase('meteor');
      void loadWish();
    } catch {
      // Local Solstice Wish simulation fallback
      const ownedKeys = new Set((data?.cards || []).filter((c) => c.owned).map((c) => c.key));
      const ssrPool = CARDS.filter((c) => c.rarity === 'SSR');
      const srPool = CARDS.filter((c) => c.rarity === 'SR');
      const mockResults: WishPullResult[] = Array.from({ length: count }, (_, i) => {
        const roll = Math.random();
        const isFive = roll < 0.08 || (count === 10 && i === 9 && roll < 0.2); // ~8% 5★ rate
        const isFour = !isFive && (roll < 0.4 || (count === 10 && i === 9)); // guaranteed 4★ on 10-pull
        const picked = isFive
          ? ssrPool[Math.floor(Math.random() * ssrPool.length)]
          : isFour
            ? (srPool[Math.floor(Math.random() * srPool.length)] || CARDS[3])
            : (Math.random() < 0.6 ? CARDS[3] : CARDS[Math.floor(Math.random() * CARDS.length)]);
        const isDuplicate = ownedKeys.has(picked.card_id);
        ownedKeys.add(picked.card_id);
        return {
          key: picked.card_id,
          creatorId: picked.creator_id,
          creatorName: picked.display_name,
          creatorAvatar: picked.image_url,
          asset: picked.image_url,
          name: picked.card_title,
          caption: picked.quote,
          rarity: picked.rarity,
          stars: picked.rarity === 'SSR' ? 5 : 4,
          isNew: !isDuplicate,
          isDuplicate,
          energyAwarded: isDuplicate ? 5 : 0,
          pityAt: isFive ? 78 : null,
        };
      });
      const newDiamonds = Math.max(0, (data?.diamonds ?? cost) - cost);
      setData((prev) => (prev ? { ...prev, diamonds: newDiamonds } : prev));
      onEnergyUpdate({ free: 30, purchased: 100, diamonds: newDiamonds, nextRefillAt: null });
      setPullResults(mockResults);
      setRevealIndex(0);
      setPhase('meteor');
    } finally {
      setPulling(false);
    }
  };

  const advanceReveal = () => {
    if (revealIndex + 1 < pullResults.length) {
      setRevealIndex((i) => i + 1);
    } else {
      setPhase('summary');
    }
  };

  const currentReveal = pullResults[revealIndex];
  const featured = activeBanner?.featured || null;
  const showcaseImage = featured?.asset
    ? resolveCardAsset(featured.asset)
    : featured?.creatorAvatar
      ? resolveCardAsset(featured.creatorAvatar)
      : null;

  return (
    <div className="cw-stage px-4 pt-3 pb-28 text-zinc-100">
      <div className="cw-starfield" />
      <SolsticeSnowLayer />
      <div className="cw-astrolabe-outer" />
      <div className="cw-astrolabe-inner" />

      {/* Top Bar: Title + Diamond Balance */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <h1 className="text-sm font-bold tracking-wide text-amber-100">{t.cardWishTab}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-sky-200">
            <Gem className="w-3.5 h-3.5 text-sky-300" />
            <span>{data?.diamonds ?? 0}</span>
          </span>
          <button
            type="button"
            onClick={onOpenShop}
            className="rounded-full border border-amber-300/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 transition"
          >
            {t.topUpGems}
          </button>
        </div>
      </div>

      {/* Winter Solstice Holo 3D Banner Pill */}
      <div className="relative z-10 flex items-center justify-between mb-3 rounded-2xl border border-sky-400/30 bg-slate-950/70 p-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">❄️</span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Aethelgard Winter Solstice</span>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-300/40 rounded-full px-1.5 py-0.5">HOLO 3D</span>
            </div>
            <div className="text-[10px] text-sky-300">สัมผัสการ์ดโฮโลแกรม 4 เลเยอร์ตามองศาเมาส์/ไจโร</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInspectSolsticeCard(CARDS[0])}
          className="shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.4)] hover:brightness-110 active:scale-95 transition"
        >
          🃏 พรีวิว 3D
        </button>
      </div>

      {/* Banner Switcher */}
      {data && data.banners.length > 0 && (
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {data.banners.map((b) => {
            const active = b.id === activeBanner?.id;
            const label = b.id === 'featured' ? t.wishBannerFeatured : t.wishBannerStandard;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBannerId(b.id);
                  setSubView('wish');
                  setErrorMsg('');
                }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                  active
                    ? 'border-amber-400 bg-gradient-to-r from-amber-600/40 via-purple-600/40 to-indigo-600/40 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.35)] backdrop-blur-md'
                    : 'border-white/10 bg-slate-900/70 text-zinc-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-views */}
      <div className="relative z-10 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1 mb-4">
        {(
          [
            { id: 'wish', label: t.wishSubBanner, icon: Sparkles },
            { id: 'album', label: `คลัง (${data ? `${data.collection.owned}/${data.collection.total}` : '0/4'})`, icon: BookOpen },
            { id: 'details', label: t.wishSubDetails, icon: Info },
            { id: 'history', label: t.wishSubHistory, icon: Clock },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubView(id)}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-0.5 text-[10.5px] font-medium transition whitespace-nowrap overflow-hidden ${
              subView === id
                ? 'bg-indigo-600/40 text-white border border-indigo-400/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="relative z-10 flex items-center justify-center py-20 text-zinc-300 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
          <span>{t.loading}</span>
        </div>
      ) : !data || !data.cards.length ? (
        <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center text-xs text-zinc-300 space-y-3">
          <p className="text-zinc-400">{t.wishEmptyPool}</p>
          <a
            href="/auth/demo?redirect=/cards"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            เข้าสู่ระบบทดสอบ (Demo Sign-in) รับ 1,000 💎
          </a>
        </div>
      ) : (
        <>
          {subView === 'wish' && activeBanner && (
            <div className="relative z-10 space-y-4">
              {/* Featured Banner Showcase */}
              <div className="relative rounded-3xl border border-amber-300/35 bg-slate-950/75 p-4 overflow-hidden shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    {activeBanner.id === 'featured'
                      ? activeBanner.guaranteed
                        ? t.wishGuaranteedTag
                        : t.wishRateUpTag
                      : t.wishBannerStandard}
                  </span>
                  <span className="text-[11px] font-mono text-amber-200/90">
                    5★ {(activeBanner.nextFiveRate * 100).toFixed(1)}%
                  </span>
                </div>

                {featured ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-28 h-36 shrink-0 rounded-2xl overflow-hidden border border-amber-300/50 bg-slate-900 shadow-[0_0_24px_rgba(251,191,36,0.22)]">
                      {showcaseImage ? (
                        <img
                          src={showcaseImage}
                          alt={featured.name || featured.creatorName}
                          className={`w-full h-full object-cover ${featured.owned ? '' : 'brightness-90 saturate-125'}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-indigo-900/40">
                          <Sparkles className="w-7 h-7 text-amber-300" />
                        </div>
                      )}
                      {!featured.owned && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-center pb-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-amber-200 border border-amber-300/30">
                            <Lock className="w-2.5 h-2.5" />
                            5★
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <StarRow count={featured.stars} size={13} />
                      <div className="text-xs font-semibold text-pink-300">{featured.creatorName}</div>
                      <h2 className="text-base font-bold text-white leading-snug">{featured.name}</h2>
                      {featured.caption && (
                        <p className="text-[11px] text-zinc-300/90 line-clamp-2 leading-relaxed">{featured.caption}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-300">{t.wishBannerStandard}</div>
                )}

                {/* Live Pity Meters */}
                <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300">{t.wishPity5Label}</span>
                      <span className={`font-mono font-bold ${activeBanner.pity5 >= 73 ? 'text-amber-300' : 'text-zinc-200'}`}>
                        {activeBanner.pity5}/{data.rates.hardPity}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${activeBanner.pity5 >= 73 ? 'bg-amber-400' : 'bg-amber-300/80'}`}
                        style={{ width: `${Math.min(100, (activeBanner.pity5 / data.rates.hardPity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300">{t.wishPity4Label}</span>
                      <span className="font-mono font-bold text-purple-300">
                        {activeBanner.pity4}/{data.rates.fourPity}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-400 transition-all"
                        style={{ width: `${Math.min(100, (activeBanner.pity4 / data.rates.fourPity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-center text-zinc-400 leading-relaxed px-2">{t.wishSoftPityNote}</p>

              {errorMsg && (
                <div className="rounded-xl border border-rose-400/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200 flex items-center justify-between gap-2">
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={onOpenShop}
                    className="shrink-0 rounded-lg bg-amber-400/20 border border-amber-300/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
                  >
                    {t.topUpGems}
                  </button>
                </div>
              )}

              {/* Wish Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={pulling}
                  onClick={() => void handlePull(1)}
                  className="cw-wish-btn-silver rounded-2xl py-3 px-3 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 disabled:opacity-50"
                >
                  <span className="text-xs font-bold">{pulling ? t.pulling : t.wishPullOne}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-sky-300 font-semibold">
                    <Gem className="w-3 h-3" /> {data.cost.single}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={pulling}
                  onClick={() => void handlePull(10)}
                  className="cw-wish-btn-gold rounded-2xl py-3 px-3 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 disabled:opacity-50"
                >
                  <span className="text-xs font-extrabold">{pulling ? t.pulling : t.wishPullTen}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950">
                    <Gem className="w-3 h-3" /> {data.cost.ten}
                  </span>
                </button>
              </div>
            </div>
          )}

          {subView === 'album' && (
            <div className="relative z-10 grid grid-cols-2 gap-3">
              {data.cards.map((card) => {
                const matchedSolstice = CARDS.find((sc) => sc.card_id === card.key || sc.creator_id === card.creatorId);
                return (
                  <button
                    key={card.key}
                    type="button"
                    disabled={!card.owned}
                    onClick={() => {
                      if (!card.owned) return;
                      const targetCard: SolsticeCardItem = matchedSolstice || {
                        card_id: card.key,
                        creator_id: card.creatorId || '',
                        display_name: card.name || card.creatorName || '',
                        card_title: card.creatorName,
                        rarity: (card.rarity === 'SSR' || card.rarity === 'SR' ? card.rarity : card.stars >= 5 ? 'SSR' : 'SR'),
                        is_close_friend: false,
                        image_url: resolveCardAsset(card.asset),
                        quote: card.caption || 'Aethelgard Winter Solstice Series',
                      };
                      setInspectSolsticeCard(targetCard);
                    }}
                    className={`solstice-card-3d-stage is-mini relative flex flex-col text-left transition ${
                      card.owned
                        ? 'cursor-pointer hover:scale-[1.02]'
                        : 'opacity-70 grayscale-[35%] cursor-default'
                    }`}
                  >
                    <div className="solstice-card-rotator">
                      <div className="gacha-foil-box">
                        <div className="solstice-card-starry-bg" />
                        {card.owned && card.asset ? (
                          <img
                            src={resolveCardAsset(card.asset)}
                            alt={card.name || card.creatorName}
                            className="solstice-card-art"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900 to-indigo-950/80 p-2 text-center">
                            <Lock className="w-6 h-6 text-zinc-500" />
                            <span className="text-[10px] text-zinc-400 leading-tight">{t.wishLockedCard}</span>
                          </div>
                        )}
                        <div className="solstice-card-art-vignette" />
                        {card.owned && <div className="holo-foil-sheen" />}
                      </div>

                      <div className="solstice-holiday-frame" />
                      <div className="solstice-corner-crest">❄ ✦</div>
                      <div className={`solstice-rarity-badge ${card.rarity === 'SR' ? 'is-sr' : ''}`}>
                        <span className="solstice-8pt-star" />
                        {card.rarity}
                      </div>

                      <div className="solstice-card-caption">
                        <div className="solstice-card-subtitle truncate">{card.creatorName}</div>
                        <div className="solstice-card-title holo-text-shimmer truncate">
                          {card.owned ? card.name : t.wishLockedCard}
                        </div>
                        {card.owned && card.caption && (
                          <p className="mt-0.5 text-[10px] text-slate-200/90 line-clamp-2 leading-tight">
                            {card.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {subView === 'details' && activeBanner && (
            <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-3 text-xs leading-relaxed text-zinc-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-amber-200">{t.wishSubDetails}</span>
                <span className="font-mono text-amber-300">5★ {(activeBanner.nextFiveRate * 100).toFixed(1)}%</span>
              </div>
              <p>{t.wishSoftPityNote}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-white/5 p-2.5">
                  <div className="text-zinc-400">{t.wishPity5Label}</div>
                  <div className="font-bold text-amber-300">{activeBanner.pity5} / {data.rates.hardPity}</div>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5">
                  <div className="text-zinc-400">{t.wishPity4Label}</div>
                  <div className="font-bold text-purple-300">{activeBanner.pity4} / {data.rates.fourPity}</div>
                </div>
              </div>
              {activeBanner.id === 'featured' && (
                <p className="text-[11px] text-amber-200/90">
                  {activeBanner.guaranteed ? t.wishGuaranteedTag : t.wishRateUpTag}
                </p>
              )}
            </div>
          )}

          {subView === 'history' && (
            <div className="relative z-10 space-y-2">
              {!data.history.length ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-8 text-center text-xs text-zinc-400">
                  {t.wishEmptyHistory}
                </div>
              ) : (
                data.history.map((h, idx) => (
                  <div
                    key={`${h.createdAt}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StarRow count={h.stars} size={11} />
                        <span className="font-semibold text-white truncate">{h.card?.name || h.rarity}</span>
                        {h.pityAt ? (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                            #{h.pityAt}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10.5px] text-zinc-400 truncate">
                        {h.card?.creatorName} · {h.bannerId === 'featured' ? t.wishBannerFeatured : t.wishBannerStandard}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Full-Screen Meteor Cutscene & Card Reveal Overlay */}
      {phase !== 'idle' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#040611]/96 backdrop-blur-md p-4">
          {phase !== 'summary' && (
            <button
              type="button"
              onClick={() => setPhase('summary')}
              className="absolute top-4 right-4 z-20 rounded-full border border-white/25 bg-black/50 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              {t.wishSkip}
            </button>
          )}

          {phase === 'meteor' && (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <div className={`cw-meteor-streak ${maxStars >= 5 ? 'is-5' : maxStars === 4 ? 'is-4' : 'is-3'}`} />
              <div
                className={`cw-flash-burst pointer-events-none absolute w-56 h-56 rounded-full blur-2xl ${
                  maxStars >= 5 ? 'bg-amber-300/60' : maxStars === 4 ? 'bg-purple-400/60' : 'bg-sky-400/60'
                }`}
              />
            </div>
          )}

          {phase === 'reveal' && currentReveal && (
            <div
              role="button"
              tabIndex={0}
              onClick={advanceReveal}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') advanceReveal(); }}
              className="w-full max-w-sm flex flex-col items-center text-center space-y-4 cursor-pointer select-none"
            >
              <div
                key={revealIndex}
                className="cw-card-reveal-anim solstice-card-3d-stage w-64 max-w-[85vw]"
                style={{ aspectRatio: '9 / 14' }}
              >
                <div className="solstice-card-rotator">
                  <div className="gacha-foil-box">
                    <div className="solstice-card-starry-bg" />
                    <img
                      src={resolveCardAsset(currentReveal.asset)}
                      alt={currentReveal.name}
                      className="solstice-card-art"
                    />
                    <div className="solstice-card-art-vignette" />
                    <div className="holo-foil-sheen" style={{ opacity: 0.42 }} />
                  </div>

                  <div className="solstice-holiday-frame" />
                  <div className="solstice-corner-crest">❄ ✦</div>
                  <div
                    className={`solstice-rarity-badge ${
                      currentReveal.rarity === 'SR' ? 'is-sr' : currentReveal.rarity === 'UR' ? 'is-ur' : ''
                    }`}
                  >
                    <span className="solstice-8pt-star" />
                    {currentReveal.rarity}
                  </div>

                  {currentReveal.isNew ? (
                    <span className="absolute top-3 left-12 z-10 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-amber-950 shadow">
                      {t.wishNewBadge}
                    </span>
                  ) : (
                    <span className="absolute top-3 left-12 z-10 rounded-full bg-black/75 border border-sky-400/50 px-2 py-0.5 text-[9px] font-bold text-sky-200">
                      {t.wishDupeEnergy(currentReveal.energyAwarded)}
                    </span>
                  )}

                  <div className="solstice-card-caption">
                    <div className="solstice-card-subtitle">{currentReveal.creatorName}</div>
                    <div className="solstice-card-title holo-text-shimmer">{currentReveal.name}</div>
                    {currentReveal.caption && (
                      <p className="mt-0.5 text-xs font-medium text-slate-200/90 line-clamp-2">
                        {currentReveal.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                {revealIndex + 1} / {pullResults.length} · {t.wishTapContinue}
              </div>
            </div>
          )}

          {phase === 'summary' && (
            <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950/90 p-4 space-y-4 max-h-[88dvh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {t.wishSummaryTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setPhase('idle')}
                  className="rounded-full bg-white/10 p-1.5 text-zinc-200 hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`grid gap-2.5 ${pullResults.length === 1 ? 'grid-cols-1 max-w-[220px] mx-auto' : 'grid-cols-2 sm:grid-cols-5'}`}>
                {pullResults.map((r, i) => (
                  <div key={`${r.key}-${i}`} className={`rounded-2xl border p-2 ${tierBorder(r.stars)}`}>
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-900 mb-1.5">
                      <img src={resolveCardAsset(r.asset)} alt={r.name} className="w-full h-full object-cover" />
                      {r.isNew ? (
                        <span className="absolute top-1 left-1 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-amber-950">
                          {t.wishNewBadge}
                        </span>
                      ) : (
                        <span className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                          +{r.energyAwarded}⚡
                        </span>
                      )}
                    </div>
                    <StarRow count={r.stars} size={10} />
                    <div className="text-[10px] font-semibold text-pink-300 truncate">{r.creatorName}</div>
                    <div className="text-[11px] font-bold text-white truncate">{r.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inspect Owned Card Modal */}
      {inspectCard && inspectCard.asset && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setInspectCard(null)}
        >
          <div
            className={`w-full max-w-xs rounded-3xl border p-3 ${tierBorder(inspectCard.stars)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 mb-3">
              <img src={resolveCardAsset(inspectCard.asset)} alt={inspectCard.name || ''} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setInspectCard(null)}
                className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <StarRow count={inspectCard.stars} size={14} />
            <div className="mt-1 text-xs font-semibold text-pink-300">{inspectCard.creatorName}</div>
            <div className="text-base font-bold text-white">{inspectCard.name}</div>
            {inspectCard.caption && <p className="mt-1 text-xs text-zinc-300">{inspectCard.caption}</p>}
          </div>
        </div>
      )}
      {/* Fullscreen 3D Holographic Card Modal */}
      {inspectSolsticeCard && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 p-4 backdrop-blur-lg"
          onClick={() => setInspectSolsticeCard(null)}
        >
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <WinterHoloCard card={inspectSolsticeCard} />

            <p className="max-w-xs text-center text-xs italic text-sky-200/90 leading-relaxed px-4 [word-break:keep-all]">
              “{inspectSolsticeCard.quote}”
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {CARDS.map((item) => (
                <button
                  key={item.card_id}
                  type="button"
                  onClick={() => setInspectSolsticeCard(item)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    inspectSolsticeCard.card_id === item.card_id
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(253,224,71,0.5)]'
                      : 'bg-slate-900/90 text-slate-300 border border-slate-700/60 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.display_name.split(' ')[0]} ({item.rarity})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setInspectSolsticeCard(null)}
              className="mt-1 rounded-full border border-sky-400/40 bg-slate-900/90 px-6 py-2 text-xs font-semibold text-sky-200 hover:bg-slate-800 hover:text-white shadow-lg transition"
            >
              ปิดหน้าต่างการ์ด (Resume Snow)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
