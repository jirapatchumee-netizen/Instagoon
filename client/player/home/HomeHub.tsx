import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { Creator } from '../types';
import { TRANSLATIONS, type HomeCopy, type Lang } from '../i18n';
import { CharacterCard } from './CharacterCard';
import { ContinueRail } from './ContinueRail';
import { GenrePills } from './GenrePills';
import { HeroCard } from './HeroCard';
import { PodiumRanking } from './PodiumRanking';
import { PromoCard } from './PromoCard';
import './home.css';

type Props = {
  lang: Lang;
  creators: Creator[];
  seedKey: string;
  recentPosts: number;
  unreadChats: number;
  onOpenChat: (creator: Creator) => void;
  onOpenProfile: (creator: Creator) => void;
  onGoToReels: () => void;
  onOpenShop?: () => void;
};

function Section({
  title,
  subtitle,
  hint,
  children,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between px-0.5">
        <div>
          <h2 className="flex items-center gap-1.5 text-[17px] font-extrabold tracking-tight text-white">
            <span>{title}</span>
            <span className="text-[14px] text-zinc-500 font-normal">›</span>
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] leading-snug text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {hint ? <small className="text-[11px] font-normal text-muted-foreground">{hint}</small> : null}
      </div>
      {children}
    </section>
  );
}

export function HomeHub({
  lang,
  creators,
  seedKey: _seedKey,
  recentPosts,
  unreadChats,
  onOpenChat,
  onOpenProfile,
  onGoToReels,
  onOpenShop,
}: Props) {
  const t: HomeCopy = TRANSLATIONS[lang].home;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(t.filterAll);

  const tags = useMemo(() => {
    const seen: string[] = [];
    for (const creator of creators) {
      for (const tag of creator.tags || []) {
        if (!seen.includes(tag)) seen.push(tag);
      }
    }
    return seen;
  }, [creators]);

  const filters = useMemo(
    () => [t.filterAll, t.filterTrending, t.filterNew, ...tags.slice(0, 10)],
    [t, tags],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return creators.filter((creator) => {
      if (q) {
        const hay = [creator.name, creator.handle, creator.tagline, ...(creator.tags || [])]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === t.filterAll) return true;
      if (filter === t.filterTrending) return (creator.chatCount || 0) >= 2000;
      if (filter === t.filterNew) return creators.indexOf(creator) >= creators.length - 3;
      return (creator.tags || []).includes(filter);
    });
  }, [creators, query, filter, t]);

  const featured = useMemo(() => creators.slice(0, 3), [creators]);

  const continuing = useMemo(
    () => creators.filter((c) => c.lastMessage || c.relationship > 0).slice(0, 6),
    [creators],
  );

  const chosen = useMemo(
    () => [...creators].sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0)).slice(0, 6),
    [creators],
  );

  const specialEpisodes = useMemo(() => {
    const withEp = creators.filter((c) => !!c.firstEpisodeTitle);
    return withEp.length ? withEp : creators.slice(0, 4);
  }, [creators]);

  const exclusive = useMemo(() => {
    const ex = creators.filter((c) => (c.vaultCount || 0) > 0 || c.id === 'mook' || c.id === 'milin');
    return ex.length ? ex : creators.slice(0, 4);
  }, [creators]);

  return (
    <div className="player-home-scope flex flex-col gap-3 px-3 pb-8 pt-2">
      {/* Search Input */}
      <div className="flex items-center gap-2 rounded-full border border-border/80 bg-zinc-900/90 px-3.5 py-2.5 shadow-sm">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-zinc-500"
        />
      </div>

      {/* Genre Pills */}
      <GenrePills label={t.filtersLabel} filters={filters} active={filter} onSelect={setFilter} />

      {/* Hero: Large Vertical 4:5 Card (Dream Chat style as preferred by user) */}
      {featured.length ? (
        <HeroCard
          creators={featured}
          t={t}
          onChat={onOpenChat}
          onOpenProfile={onOpenProfile}
        />
      ) : null}

      {/* Continue Rail (if active chats exist) */}
      {continuing.length > 0 ? (
        <Section title={t.sectionContinue}>
          <ContinueRail creators={continuing} t={t} onOpen={onOpenChat} />
        </Section>
      ) : null}

      {/* Section 1: เจ้าคือผู้ถูกเลือกคนต่อไป 🫵🏻 (Candy AI Section style + Dream Chat rich cards) */}
      <Section
        title={t.sectionChosen}
        subtitle={t.sectionChosenSubtitle}
      >
        <div className="fs-h-rail">
          {chosen.map((creator) => (
            <div key={creator.id} className="w-[185px] shrink-0">
              <CharacterCard creator={creator} t={t} onOpen={onOpenProfile} />
            </div>
          ))}
        </div>
      </Section>

      {/* Content Feed Entry Banner */}
      <button
        type="button"
        onClick={onGoToReels}
        className="fs-h-card flex items-center justify-between gap-3 p-3.5 text-left transition-colors duration-200 hover:bg-white/5 shadow-sm"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-foreground">
            {t.feedEntryTitle}
          </span>
          <span className="block text-[11.5px] text-muted-foreground">
            {t.feedEntryHint(String(recentPosts), String(unreadChats))}
          </span>
        </span>
        <span className="fs-h-grad-text shrink-0 text-[12.5px] font-bold">
          {t.feedEntryCta} →
        </span>
      </button>

      {/* Section 2: ตัวละครจากตอนพิเศษ (เล่นฟรี) */}
      <Section
        title={t.sectionSpecialEpisodes}
        subtitle={t.sectionSpecialEpisodesSubtitle}
      >
        <div className="fs-h-rail">
          {specialEpisodes.map((creator) => (
            <div key={creator.id} className="w-[185px] shrink-0">
              <CharacterCard
                creator={creator}
                t={t}
                onOpen={onOpenProfile}
                badge="specialEpisode"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Section 3: ตัวละครสุดฮอต (3D Podium Ranking) */}
      <Section
        title={t.sectionRanking}
        subtitle={t.sectionRankingSubtitle}
      >
        <PodiumRanking creators={creators} t={t} onOpen={onOpenProfile} />
      </Section>

      {/* Section 4: Exclusive Characters / Private Content Packs */}
      <Section
        title={t.sectionExclusive}
        subtitle={t.sectionExclusiveSubtitle}
      >
        <div className="fs-h-rail">
          {exclusive.map((creator) => (
            <div key={creator.id} className="w-[185px] shrink-0">
              <CharacterCard
                creator={creator}
                t={t}
                onOpen={onOpenProfile}
                badge="exclusive"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5: ตัวละครทั้งหมด (Candy AI 2-Column Grid with PromoCard integrated) */}
      <Section
        title={t.sectionAll}
        subtitle={t.sectionAllSubtitle}
        hint={t.countLabel(String(matches.length))}
      >
        {matches.length ? (
          <div className="grid grid-cols-2 gap-2.5">
            {matches.map((creator, idx) => {
              // Weave the Candy.ai style Special Offer PromoCard at index 3 in the grid
              const showPromoBefore = idx === 3;
              return (
                <div key={creator.id} className="contents">
                  {showPromoBefore ? (
                    <PromoCard t={t} onOpenShop={onOpenShop} />
                  ) : null}
                  <CharacterCard
                    creator={creator}
                    t={t}
                    onOpen={onOpenProfile}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-[12px] text-muted-foreground">{t.emptyFilter}</p>
        )}
      </Section>

      {/* Footer */}
      <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <a href="/terms.html" className="hover:text-foreground">
          {t.terms}
        </a>
        <span>·</span>
        <a href="/privacy.html" className="hover:text-foreground">
          {t.privacy}
        </a>
      </footer>
    </div>
  );
}
