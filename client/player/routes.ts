// Tab-level routing on top of the History API — no router dependency (owner decision, PLAN rev 3).
// Companion to ADR 0014: overlay entries are pushed by overlay-history.ts and must never be read
// as a screen change here, otherwise one back press would close the overlay and switch tab at once.
export type HomeScreen = 'home' | 'creators' | 'reels' | 'inbox' | 'account';

export type Route = { screen: HomeScreen; creatorId?: string };

export const CURRENT_PATH_KEY = 'ig:currentPath';
export const PREVIOUS_PATH_KEY = 'ig:previousPath';

const SCREEN_BY_PATH: Record<string, HomeScreen> = {
  '/': 'home',
  '/creators': 'creators',
  '/reels': 'reels',
  '/inbox': 'inbox',
  '/profile': 'account',
};

export function pathToRoute(path: string | null | undefined): Route | null {
  if (!path) return null;
  const clean = (path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/');
  const exact = SCREEN_BY_PATH[clean];
  if (exact) return { screen: exact };
  const detail = clean.match(/^\/creators\/([\w.-]+)$/);
  if (detail) return { screen: 'creators', creatorId: detail[1] };
  return null;
}

export function routeToPath(route: Route): string {
  if (route.creatorId) return `/creators/${encodeURIComponent(route.creatorId)}`;
  switch (route.screen) {
    case 'home':
      return '/';
    case 'creators':
      return '/creators';
    case 'reels':
      return '/reels';
    case 'inbox':
      return '/inbox';
    case 'account':
      return '/profile';
  }
}

export type RouterPorts = {
  history: {
    pushState(state: unknown, title: string, url?: string | null): void;
    replaceState(state: unknown, title: string, url?: string | null): void;
  };
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  location: { pathname: string };
  onChange(route: Route): void;
};

export function createRouter(ports: RouterPorts) {
  let lastPath = ports.location.pathname;

  const remember = (path: string) => {
    const previous = ports.storage.getItem(CURRENT_PATH_KEY);
    if (previous && previous !== path) ports.storage.setItem(PREVIOUS_PATH_KEY, previous);
    ports.storage.setItem(CURRENT_PATH_KEY, path);
  };

  return {
    go(route: Route, { replace = false }: { replace?: boolean } = {}) {
      const path = routeToPath(route);
      remember(path);
      const state = { instagoonRoute: route };
      if (replace) ports.history.replaceState(state, '', path);
      else ports.history.pushState(state, '', path);
      lastPath = path;
    },

    // Deep link wins over the stored path: a shared /creators/milin must open that creator, not home.
    restore(): Route | null {
      return pathToRoute(ports.location.pathname) ?? pathToRoute(ports.storage.getItem(CURRENT_PATH_KEY));
    },

    onPopState(event: { state: unknown }) {
      const state = event.state as { instagoonRoute?: Route; instagoonOverlay?: boolean } | null;
      if (state?.instagoonOverlay) return;
      const route = state?.instagoonRoute ?? pathToRoute(ports.location.pathname) ?? { screen: 'home' as const };
      lastPath = routeToPath(route);
      ports.onChange(route);
    },

    currentPath() {
      return lastPath;
    },
  };
}

export type Router = ReturnType<typeof createRouter>;
