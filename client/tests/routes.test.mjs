import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRouter, pathToRoute, routeToPath, CURRENT_PATH_KEY, PREVIOUS_PATH_KEY,
} from '../player/routes.ts';

function ports(startPath = '/') {
  const entries = [{ state: null, path: startPath }];
  let index = 0;
  const store = new Map();
  const changes = [];
  const history = {
    pushState(state, _t, url) { entries.splice(index + 1); entries.push({ state, path: url }); index += 1; },
    replaceState(state, _t, url) { entries[index] = { state, path: url }; },
  };
  return {
    changes,
    history,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    location: { get pathname() { return entries[index].path; } },
    onChange: (route) => changes.push(route),
    back: () => { index -= 1; },
    forward: () => { index += 1; },
    at: (i) => { index = i; },
  };
}

test('every tab has a stable path and unknown paths are rejected', () => {
  assert.deepEqual(pathToRoute('/'), { screen: 'home' });
  assert.deepEqual(pathToRoute('/reels'), { screen: 'reels' });
  assert.deepEqual(pathToRoute('/creators'), { screen: 'creators' });
  assert.deepEqual(pathToRoute('/inbox'), { screen: 'inbox' });
  assert.deepEqual(pathToRoute('/profile'), { screen: 'account' });
  assert.deepEqual(pathToRoute('/creators/milin'), { screen: 'creators', creatorId: 'milin' });
  assert.deepEqual(pathToRoute('/reels/'), { screen: 'reels' }, 'trailing slash is the same tab');
  assert.deepEqual(pathToRoute('/inbox?from=push'), { screen: 'inbox' }, 'query does not break routing');
  assert.equal(pathToRoute('/unknown'), null);
  assert.equal(pathToRoute('/api/feed'), null, 'API paths are never a screen');
  assert.equal(routeToPath({ screen: 'account' }), '/profile');
  assert.equal(routeToPath({ screen: 'creators', creatorId: 'a b' }), '/creators/a%20b');
});

test('go() records the route in history and keeps the previous path for restore', () => {
  const p = ports('/');
  const router = createRouter(p);
  router.go({ screen: 'home' }, { replace: true });
  assert.equal(p.changes.length, 0, 'mount does not re-notify the app');
  router.go({ screen: 'reels' });
  router.go({ screen: 'inbox' });
  assert.equal(p.storage.getItem(CURRENT_PATH_KEY), '/inbox');
  assert.equal(p.storage.getItem(PREVIOUS_PATH_KEY), '/reels');
  assert.equal(p.location.pathname, '/inbox');
});

test('a deep link beats the stored path, a bare reload falls back to it', () => {
  const p = ports('/reels');
  p.storage.setItem(CURRENT_PATH_KEY, '/inbox');
  assert.deepEqual(createRouter(p).restore(), { screen: 'reels' });

  const q = ports('/some/lost/path');
  q.storage.setItem(CURRENT_PATH_KEY, '/inbox');
  assert.deepEqual(createRouter(q).restore(), { screen: 'inbox' }, 'unknown URL falls back to the session path');

  const r = ports('/');
  assert.deepEqual(createRouter(r).restore(), { screen: 'home' });
});

test('back closes an overlay entry without changing the screen', () => {
  const p = ports('/');
  const router = createRouter(p);
  router.go({ screen: 'reels' });
  p.history.pushState({ instagoonOverlay: true }, ''); // what overlay-history.ts does when an overlay opens
  p.back();
  router.onPopState({ state: p.history.state ?? { instagoonOverlay: true } });
  assert.deepEqual(p.changes, [], 'overlay entries must not move tabs');

  p.back();
  router.onPopState({ state: { instagoonRoute: { screen: 'home' } } });
  assert.deepEqual(p.changes, [{ screen: 'home' }]);
  assert.equal(router.currentPath(), '/');
});

test('popstate without route state still follows the URL, and only an unknown URL falls back to home', () => {
  const p = ports('/inbox');
  const router = createRouter(p);
  router.onPopState({ state: null });
  assert.deepEqual(p.changes, [{ screen: 'inbox' }], 'the address bar is the source of truth when history.state is empty');

  const q = ports('/stray');
  createRouter(q).onPopState({ state: null });
  assert.deepEqual(q.changes, [{ screen: 'home' }], 'never leave the player on a blank screen');
});
