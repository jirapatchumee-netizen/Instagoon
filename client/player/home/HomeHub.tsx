import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { Creator } from '../types';
import { TRANSLATIONS, type HomeCopy, type Lang } from '../i18n';
import { CharacterCard } from './CharacterCard';
import { ContinueRail } from './ContinueRail';
import { GenrePills } from './GenrePills';
import { HeroCard } from './HeroCard';
import { heroIndex } from './format';
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
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 flex items-baseline gap-2 px-0.5 text-[15px] font-semibold text-foreground">
        {title}
        {hint ? <small className="text-[11px] font-normal text-muted-foreground">{hint}</small> : null}
      </h2>
      {children}
    </section>
  );
}

export function HomeHub({
  lang, creators, seedKey, recentPosts, unreadChats, onOpenChat, onOpenProfile, onGoToReels,
}: Props) {
  const t: HomeCopy = TRANSLATIONS[lang].home;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(t.filterAll);

  const tags = useMemo(() => {
    const seen: string[] = [];
    for (const creator of creators) for (const tag of creator.tags || []) if (!seen.includes(tag)) seen.push(tag);
    return seen;
  }, [creators]);

  const filters = useMemo(() => [t.filterAll, t.filterTrending, t.filterNew, ...tags.slice(0, 10)], [t, tags]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return creators.filter((creator) => {
      if (q) {
        const hay = [creator.name, creator.handle, creator.tagline, ...(creator.tags || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === t.filterAll) return true;
      if (filter === t.filterTrending) return (creator.chatCount || 0) >= 2500;
      if (filter === t.filterNew) return creators.indexOf(creator) >= creators.length - 3;
      return (creator.tags || []).includes(filter);
    });
  }, [creators, query, filter, t]);

  const hero = creators.length ? creators[heroIndex(seedKey, creators.length)] : null;
  const continuing = useMemo(() => creators.filter((c) => c.lastMessage || c.relationship > 0).slice(0, 6), [creators]);
  const trending = useMemo(
    () => [...creators].sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0)).slice(0, 5),
    [creators],
  );

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

      <Section title={t.sectionContinue}>
        <ContinueRail creators={continuing} t={t} onOpen={onOpenChat} />
      </Section>

      <button
        type="button"
        onClick={onGoToReels}
        className="fs-h-card flex items-center justify-between gap-3 p-3 text-left transition-colors duration-200 hover:bg-white/5"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] font-semibold text-foreground">{t.feedEntryTitle}</span>
          <span className="block text-[11.5px] text-muted-foreground">
            {t.feedEntryHint(String(recentPosts), String(unreadChats))}
          </span>
        </span>
        <span className="fs-h-grad-text shrink-0 text-[12.5px] font-semibold">{t.feedEntryCta}</span>
      </button>

      <Section title={t.sectionTrending}>
        <div className="fs-h-rail">
          {trending.map((creator) => (
            <div key={creator.id} className="w-[158px] shrink-0">
              <CharacterCard creator={creator} t={t} onOpen={onOpenProfile} />
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.sectionAll} hint={t.countLabel(String(matches.length))}>
        {matches.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {matches.map((creator) => (
              <CharacterCard key={creator.id} creator={creator} t={t} onOpen={onOpenProfile} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">{t.emptyFilter}</p>
        )}
      </Section>

      <footer className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <a href="/terms.html" className="hover:text-foreground">{t.terms}</a>
        <a href="/privacy.html" className="hover:text-foreground">{t.privacy}</a>
      </footer>
    </div>
  );
}
