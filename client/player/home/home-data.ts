import type { Creator, HomePayload, HomePeriod } from '../types';

export function extractHomeSection(payload: HomePayload | null, id: string): Creator[] {
  if (!payload?.sections) return [];
  if (Array.isArray(payload.sections)) {
    return payload.sections.find((section) => section.id === id)?.items ?? [];
  }
  return payload.sections[id] ?? [];
}

export function composeFallbackHome(creators: Creator[], period: HomePeriod): HomePayload {
  const byChats = [...creators].sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0));
  const byPublished = [...creators].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  const recommended = [...creators]
    .sort((a, b) => Number(a.relationship > 0) - Number(b.relationship > 0) || (b.chatCount || 0) - (a.chatCount || 0))
    .slice(0, 6);

  const genres: string[] = [];
  for (const creator of creators) {
    for (const tag of creator.tags || []) {
      if (!genres.includes(tag)) genres.push(tag);
    }
  }

  return {
    period,
    sections: {
      continue: creators.filter((c) => c.lastMessage || c.relationship > 0).slice(0, 6),
      trending: byChats.slice(0, 6),
      new: byPublished.slice(0, 6),
      recommended,
    },
    ranking: byChats.slice(0, 5),
    genres,
    missions: [],
  };
}

export type HomeFilterOptions = {
  query: string;
  filter: string;
  filterAll: string;
  filterTrending: string;
  filterNew: string;
  serverTrending?: Creator[];
  serverNew?: Creator[];
};

export function filterHomeCreators(creators: Creator[], opts: HomeFilterOptions): Creator[] {
  const q = opts.query.trim().toLowerCase();
  const base = q
    ? creators.filter((creator) => {
        const hay = [creator.name, creator.handle, creator.tagline, ...(creator.tags || [])].join(' ').toLowerCase();
        return hay.includes(q);
      })
    : creators;

  if (opts.filter === opts.filterAll) return base;

  if (opts.filter === opts.filterTrending) {
    if (opts.serverTrending?.length) {
      const ids = new Set(opts.serverTrending.map((c) => c.id));
      return base.filter((c) => ids.has(c.id));
    }
    return base
      .filter((c) => (c.chatCount || 0) > 0)
      .sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0));
  }

  if (opts.filter === opts.filterNew) {
    if (opts.serverNew?.length) {
      const ids = new Set(opts.serverNew.map((c) => c.id));
      return base.filter((c) => ids.has(c.id));
    }
    return [...base].sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).slice(0, 6);
  }

  return base.filter((creator) => (creator.tags || []).includes(opts.filter));
}
