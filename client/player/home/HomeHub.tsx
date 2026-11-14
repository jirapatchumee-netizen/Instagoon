import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import type { Creator, HomePayload, HomePeriod, Story } from '../types';
import { TRANSLATIONS, type HomeCopy, type Lang } from '../i18n';
import { CharacterCard } from './CharacterCard';
import { ContinueRail } from './ContinueRail';
import { GenrePills } from './GenrePills';
import { HeroCard } from './HeroCard';
import { heroIndex } from './format';
import { composeFallbackHome, extractHomeSection, filterHomeCreators } from './home-data';
import './home.css';

type Props = {
  lang: Lang;
  creators: Creator[];
  stories?: Story[];
  seedKey: string;
  onOpenChat: (creator: Creator) => void;
  onOpenProfile: (creator: Creator) => void;
  onOpenStory?: (story: Story) => void;
  onGoToReels: () => void;
};

const PERIODS: HomePeriod[] = ['1d', '7d', '30d'];

function Section({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
          {title}
          {hint ? <small className="text-[11px] font-normal text-muted-foreground">{hint}</small> : null}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function HomeHub({
  lang,
  creators,
  stories = [],
  seedKey,
  onOpenChat,
  onOpenProfile,
  onOpenStory,
  onGoToReels,
}: Props) {
  const t: HomeCopy = TRANSLATIONS[lang].home;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(t.filterAll);
  const [period, setPeriod] = useState<HomePeriod>('7d');
  const [remoteHome, setRemoteHome] = useState<HomePayload | null>(null);

  useEffect(() => {
    setFilter(t.filterAll);
  }, [t.filterAll]);

  useEffect(() => {
    let cancelled = false;
    api<HomePayload>(`/api/home?period=${period}`)
      .then((data) => {
        if (!cancelled) setRemoteHome(data);
      })
      .catch(() => {
        if (!cancelled) setRemoteHome(null);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const fallbackHome = useMemo(() => composeFallbackHome(creators, period), [creators, period]);
  const activeHome = remoteHome ?? fallbackHome;

  const serverTrending = useMemo(() => {
    const items = extractHomeSection(remoteHome, 'trending');
    return items.length ? items : (remoteHome?.ranking ?? []);
  }, [remoteHome]);

  const serverNew = useMemo(() => extractHomeSection(remoteHome, 'new'), [remoteHome]);

  const tags = useMemo(() => {
    const base = activeHome.genres.length ? activeHome.genres : fallbackHome.genres;
    return base.slice(0, 10);
  }, [activeHome.genres, fallbackHome.genres]);

  const filters = useMemo(() => [t.filterAll, t.filterTrending, t.filterNew, ...tags], [t, tags]);

  const matches = useMemo(
    () =>
      filterHomeCreators(creators, {
        query,
        filter,
        filterAll: t.filterAll,
        filterTrending: t.filterTrending,
        filterNew: t.filterNew,
        serverTrending,
        serverNew,
      }),
    [creators, query, filter, t, serverTrending, serverNew],
  );

  const hero = useMemo(() => {
    const serverHero = extractHomeSection(remoteHome, 'hero')[0];
    if (serverHero) return serverHero;
    return creators.length ? creators[heroIndex(seedKey, creators.length)] : null;
  }, [remoteHome, creators, seedKey]);

  const continuing = useMemo(() => {
    const items = extractHomeSection(activeHome, 'continue');
    return items.length ? items : creators.filter((c) => c.lastMessage || c.relationship > 0).slice(0, 6);
  }, [activeHome, creators]);

  const trending = useMemo(() => {
    const items = extractHomeSection(activeHome, 'trending');
    return items.length ? items : [...creators].sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0)).slice(0, 5);
  }, [activeHome, creators]);

  const recommended = useMemo(() => extractHomeSection(activeHome, 'recommended'), [activeHome]);
  const ranking = useMemo(
    () => (activeHome.ranking.length ? activeHome.ranking : trending.slice(0, 5)),
    [activeHome.ranking, trending],
  );
  const missions = activeHome.missions;

  const periodLabel = (p: HomePeriod) => (p === '1d' ? t.period1d : p === '7d' ? t.period7d : t.period30d);

  return (
    <div className="player-home-scope flex flex-col gap-3 px-3 pb-6 pt-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-panel2 px-3.5 py-2.5">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="flex-1 bg-transparent text-[14px] text-foreground outline-none"
        />
      </div>

      <GenrePills label={t.filtersLabel} filters={filters} active={filter} onSelect={setFilter} />

      {hero ? <HeroCard creator={hero} t={t} onChat={onOpenChat} onFeed={onGoToReels} /> : null}

      {missions.length > 0 ? (
        <section aria-label={t.missionsTitle} className="fs-h-card flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between text-[13px] font-semibold text-foreground">
            <span>{t.missionsTitle}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {missions.slice(0, 3).map((mission) => {
              const pct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
              return (
                <div key={mission.id} className="flex items-center gap-2.5 text-[12px]">
                  <span className="min-w-0 flex-1 truncate text-slate-200">{mission.title}</span>
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                    <span className="fs-h-grad-bg block h-full rounded-full" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {mission.completed ? t.missionDone : t.missionProgress(mission.progress, mission.target)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Section title={t.sectionContinue}>
        <ContinueRail
          creators={continuing}
          allCreators={creators}
          stories={stories}
          t={t}
          onOpen={onOpenChat}
          onOpenStory={onOpenStory}
        />
      </Section>

      <Section title={t.sectionTrending}>
        <div className="fs-h-rail">
          {trending.map((creator) => (
            <div key={creator.id} className="w-[158px] shrink-0">
              <CharacterCard creator={creator} t={t} onOpen={onOpenProfile} />
            </div>
          ))}
        </div>
      </Section>

      {ranking.length > 0 ? (
        <Section
          title={t.sectionRanking}
          right={
            <div role="tablist" aria-label={t.sectionRanking} className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={period === p}
                  onClick={() => setPeriod(p)}
                  className={
                    'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ' +
                    (period === p ? 'fs-h-grad-bg text-black' : 'bg-white/5 text-muted-foreground hover:text-foreground')
                  }
                >
                  {periodLabel(p)}
                </button>
              ))}
            </div>
          }
        >
          <div className="fs-h-rail">
            {ranking.map((creator, idx) => (
              <div key={creator.id} className="relative w-[158px] shrink-0">
                <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  {t.rankBadge(idx + 1)}
                </span>
                <CharacterCard creator={creator} t={t} onOpen={onOpenProfile} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {recommended.length > 0 ? (
        <Section title={t.sectionRecommended}>
          <div className="fs-h-rail">
            {recommended.map((creator) => (
              <div key={creator.id} className="w-[158px] shrink-0">
                <CharacterCard creator={creator} t={t} onOpen={onOpenProfile} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={t.sectionAll} hint={t.countLabel(String(matches.length))}>
        {matches.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
            {matches.map((creator) => (
              <CharacterCard key={creator.id} creator={creator} t={t} onOpen={onOpenProfile} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">{t.emptyFilter}</p>
        )}
      </Section>

      <footer className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <a href="/terms.html" className="hover:text-foreground">
          {t.terms}
        </a>
        <a href="/privacy.html" className="hover:text-foreground">
          {t.privacy}
        </a>
      </footer>
    </div>
  );
}
