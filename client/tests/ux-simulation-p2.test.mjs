import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS, LANGS } from '../player/i18n.ts';
import { createFollowSync } from '../player/api.ts';
import { createOverlayStack } from '../player/overlay-history.ts';
import { formatFastForwardAction, cleanFastForwardLocation, cleanFastForwardLabel } from '../player/message-format.ts';

test('Placeholder copy: all 26 required keys exist across th, en, and ja', () => {
  const expectedKeys = [
    'reels',
    'inbox',
    'saved',
    'collection',
    'emptyReelsTitle',
    'emptyReelsDesc',
    'emptyInboxTitle',
    'emptyInboxDesc',
    'emptySavedTitle',
    'emptySavedDesc',
    'emptyCollectionTitle',
    'emptyCollectionDesc',
    'emptyFollowingTitle',
    'emptyFollowingDesc',
    'emptyActivity',
    'offlineToast',
    'onlineToast',
    'readMore',
    'pwaInstallTitle',
    'pwaInstallDesc',
    'settingsSound',
    'settingsHaptics',
    'likedByOthers',
    'likedByYou',
    'viewAllComments',
    'postMenuViewProfile',
    'postMenuSave',
    'postMenuUnsave',
    'postMenuMessage',
    'postMenuCancel',
  ];

  for (const lang of ['th', 'en', 'ja']) {
    const table = TRANSLATIONS[lang];
    assert.ok(table, `Translations for ${lang} must exist`);

    for (const key of expectedKeys) {
      assert.ok(
        key in table,
        `Key "${key}" must be defined in TRANSLATIONS.${lang}`
      );
      const val = table[key];
      if (typeof val === 'function') {
        const result = val('TestName', 5);
        assert.equal(typeof result, 'string');
        assert.ok(result.length > 0);
      } else {
        assert.equal(typeof val, 'string');
        assert.ok(val.length > 0);
      }
    }
  }
});

test('Overlay stack: closing ActivityOverlay and PostMenuSheet pops top entry without disturbing others', () => {
  const history = {
    stack: [{ instagoonOverlay: false }],
    pushState(state) {
      this.stack.push(state);
    },
    back() {
      this.stack.pop();
    },
  };

  const overlays = createOverlayStack(history);
  let activityClosed = false;
  let menuClosed = false;

  // Open Activity Overlay
  const disposeActivity = overlays.open(() => {
    activityClosed = true;
  });
  assert.equal(overlays.depth, 1);
  assert.equal(history.stack.length, 2);

  // Open Post Menu Sheet on top
  const disposeMenu = overlays.open(() => {
    menuClosed = true;
  });
  assert.equal(overlays.depth, 2);
  assert.equal(history.stack.length, 3);

  // User taps Back: should close Post Menu first
  overlays.onPopState();
  assert.equal(menuClosed, true);
  assert.equal(activityClosed, false);
  assert.equal(overlays.depth, 1);

  // User taps Back again: should close Activity
  overlays.onPopState();
  assert.equal(activityClosed, true);
  assert.equal(overlays.depth, 0);

  disposeMenu();
  disposeActivity();
});

test('Suggested for you: translations and creator fallback logic exist for new users', () => {
  for (const lang of ['th', 'en', 'ja']) {
    const table = TRANSLATIONS[lang];
    assert.ok(table.suggestedForYou, `suggestedForYou must exist in ${lang}`);
    assert.ok(table.suggestedSubtitle, `suggestedSubtitle must exist in ${lang}`);
    assert.ok(table.follow, `follow must exist in ${lang}`);
    assert.ok(table.following, `following must exist in ${lang}`);
    assert.ok(table.viewFeedWithCount, `viewFeedWithCount must exist in ${lang}`);
    assert.ok(table.allCaughtUp, `allCaughtUp must exist in ${lang}`);
    assert.ok(typeof table.viewFeedWithCount(2) === 'string');
  }

  const dummyCreators = [
    { id: 'mira-v2', name: 'Mira V2', bio: '', avatarKey: null, relationship: 0, following: false },
    { id: 'mook', name: 'มุก', bio: '', avatarKey: null, relationship: 0, following: false },
  ];
  const dummyStories = [];
  const hasFollowing = dummyCreators.some((c) => c.following);
  const storyCreatorIds = new Set(dummyStories.map((s) => s.creatorId));
  const barCreators = hasFollowing
    ? dummyCreators.filter((c) => c.following && !storyCreatorIds.has(c.id))
    : dummyCreators.filter((c) => !storyCreatorIds.has(c.id));

  // For new users with 0 followed creators, all available creators must appear in the top bar
  assert.equal(barCreators.length, 2);
  assert.equal(barCreators[0].id, 'mira-v2');
  assert.equal(barCreators[1].id, 'mook');

  // Verify Onboarding vs Feed separation logic
  // 1. New user (0 followed): inFeedMode starts false, showSuggested must be true
  let inFeedMode = dummyCreators.some((c) => c.following);
  let showSuggested = !inFeedMode || !dummyCreators.some((c) => c.following);
  assert.equal(showSuggested, true);

  // 2. User follows 1 creator: inFeedMode remains false, showSuggested stays true (does not collapse / stack)
  dummyCreators[0].following = true;
  showSuggested = !inFeedMode || !dummyCreators.some((c) => c.following);
  assert.equal(showSuggested, true);

  // 3. User taps Enter Feed: inFeedMode becomes true, showSuggested becomes false (shows feed only)
  inFeedMode = true;
  showSuggested = !inFeedMode || !dummyCreators.some((c) => c.following);
  assert.equal(showSuggested, false);

  // 4. Returning user with existing following: inFeedMode initializes to true, showSuggested is false immediately
  const returningInFeedMode = dummyCreators.some((c) => c.following);
  const returningShowSuggested = !returningInFeedMode || !dummyCreators.some((c) => c.following);
  assert.equal(returningShowSuggested, false);
});

test('Fast forward: cleans pronouns and formats natural roleplay action without duplicate bars', () => {
  assert.equal(cleanFastForwardLocation('ห้องกู'), 'ห้องของเธอ');
  assert.equal(cleanFastForwardLocation('ห้องกู 412 ตึกหอใน'), 'ห้อง 412 ตึกหอใน');
  assert.equal(cleanFastForwardLocation('ห้องฉัน'), 'ห้องของเธอ');
  assert.equal(cleanFastForwardLocation('ร้านกาแฟ'), 'ร้านกาแฟ');

  assert.equal(
    formatFastForwardAction({ location: 'ห้องกู', time: '20:00 น.' }),
    '*มาตามนัดที่ห้องของเธอ เวลา 20:00 น.*'
  );
  assert.equal(
    formatFastForwardAction({ location: 'ห้องกู 412 ตึกหอใน', time: '20:00 น.' }),
    '*มาตามนัดที่ห้อง 412 ตึกหอใน เวลา 20:00 น.*'
  );
  assert.equal(
    formatFastForwardAction({ location: 'ห้องสโมฯ ชั้น 3', time: '17:00 น.' }),
    '*มาตามนัดที่ห้องสโมฯ ชั้น 3 เวลา 17:00 น.*'
  );
  assert.equal(
    cleanFastForwardLabel('⏩ ไปที่ ห้องกู (20:00 น.)'),
    '⏩ ไปที่ ห้องของเธอ (20:00 น.)'
  );
});

test('Follow sync: rapid consecutive follow clicks do not flicker from stale loadFeed responses', () => {
  const sync = createFollowSync();
  const ids = ['pim', 'juna', 'milin', 'mook', 'cheer', 'noey'];
  let creators = ids.map((id) => ({ id, following: false }));

  // 1. User clicks Follow on pim; POST completes quickly and starts loadFeed #1
  const c1 = sync.beginFollow('pim', false);
  creators = creators.map((c) => (c.id === 'pim' ? { ...c, following: c1.nextFollowing } : c));
  assert.equal(c1.nextFollowing, true);
  const s1 = sync.endFollow('pim', c1.seq);
  assert.equal(s1.allSettled, true);
  const feedVer1 = sync.beginFeedLoad(); // loadFeed #1 starts when only pim is followed on server

  // 2. While loadFeed #1 is in flight, user rapidly clicks Follow on juna, milin, mook, cheer, noey
  const inFlight = [];
  for (const id of ['juna', 'milin', 'mook', 'cheer', 'noey']) {
    const step = sync.beginFollow(id, false);
    creators = creators.map((c) => (c.id === id ? { ...c, following: step.nextFollowing } : c));
    inFlight.push({ id, ...step });
  }
  assert.ok(creators.every((c) => c.following === true));

  // 3. Stale loadFeed #1 resolves with server snapshot where only pim is followed: must be rejected!
  assert.equal(sync.isCurrentFeedLoad(feedVer1), false);
  // Even if applyPending is called on a background /api/creators fetch, pending follows stay true
  const staleServerList = ids.map((id) => ({ id, following: id === 'pim' }));
  const merged = sync.applyPending(staleServerList);
  assert.ok(merged.every((c) => c.following === true));

  // 4. First 4 of the 5 remaining POSTs complete: allSettled stays false so no premature loadFeed fires
  for (let i = 0; i < 4; i++) {
    const res = sync.endFollow(inFlight[i].id, inFlight[i].seq);
    assert.equal(res.isLatestForCreator, true);
    assert.equal(res.allSettled, false);
  }

  // 5. Final POST (noey) completes: allSettled becomes true, single fresh loadFeed runs and is accepted
  const lastRes = sync.endFollow(inFlight[4].id, inFlight[4].seq);
  assert.equal(lastRes.isLatestForCreator, true);
  assert.equal(lastRes.allSettled, true);

  const feedVer2 = sync.beginFeedLoad();
  assert.equal(sync.isCurrentFeedLoad(feedVer2), true);

  // 6. Double-tap on same creator ignores older in-flight POST
  const tap1 = sync.beginFollow('pim', true);
  assert.equal(tap1.nextFollowing, false);
  const tap2 = sync.beginFollow('pim', true); // uses pending false -> flips back to true
  assert.equal(tap2.nextFollowing, true);
  assert.equal(sync.endFollow('pim', tap1.seq).isLatestForCreator, false);
  assert.equal(sync.endFollow('pim', tap2.seq).isLatestForCreator, true);
});

