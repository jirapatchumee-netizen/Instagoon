import test from 'node:test';
import assert from 'node:assert/strict';
import { composeFallbackHome, extractHomeSection, filterHomeCreators } from '../player/home/home-data.ts';

const SAMPLE_CREATORS = [
  { id: 'c1', name: 'Mina', bio: 'a', avatarKey: null, relationship: 0, chatCount: 120, publishedAt: 100, tags: ['romance'] },
  { id: 'c2', name: 'Rina', bio: 'b', avatarKey: null, relationship: 2, chatCount: 450, publishedAt: 300, tags: ['drama'] },
  { id: 'c3', name: 'Sora', bio: 'c', avatarKey: null, relationship: 0, chatCount: 0, publishedAt: 200, tags: ['romance', 'comedy'] },
];

test('Trending filter does not drop creators when chatCount < 2500', () => {
  const result = filterHomeCreators(SAMPLE_CREATORS, {
    query: '',
    filter: 'Trending',
    filterAll: 'All',
    filterTrending: 'Trending',
    filterNew: 'New',
  });
  assert.deepEqual(
    result.map((c) => c.id),
    ['c2', 'c1'],
  );
});

test('New filter orders by publishedAt descending rather than array index', () => {
  const result = filterHomeCreators(SAMPLE_CREATORS, {
    query: '',
    filter: 'New',
    filterAll: 'All',
    filterTrending: 'Trending',
    filterNew: 'New',
  });
  assert.deepEqual(
    result.map((c) => c.id),
    ['c2', 'c3', 'c1'],
  );
});

test('Server trending and new sections take precedence when provided', () => {
  const result = filterHomeCreators(SAMPLE_CREATORS, {
    query: '',
    filter: 'Trending',
    filterAll: 'All',
    filterTrending: 'Trending',
    filterNew: 'New',
    serverTrending: [SAMPLE_CREATORS[2]],
  });
  assert.deepEqual(
    result.map((c) => c.id),
    ['c3'],
  );
});

test('extractHomeSection handles both array and record section shapes', () => {
  const arrayPayload = {
    period: '7d',
    sections: [{ id: 'trending', items: [SAMPLE_CREATORS[1]] }],
    ranking: [],
    genres: [],
    missions: [],
  };
  const recordPayload = {
    period: '7d',
    sections: { trending: [SAMPLE_CREATORS[0]] },
    ranking: [],
    genres: [],
    missions: [],
  };
  assert.deepEqual(extractHomeSection(arrayPayload, 'trending').map((c) => c.id), ['c2']);
  assert.deepEqual(extractHomeSection(recordPayload, 'trending').map((c) => c.id), ['c1']);
});

test('composeFallbackHome produces populated ranking, genres, and sections', () => {
  const fallback = composeFallbackHome(SAMPLE_CREATORS, '7d');
  assert.equal(fallback.period, '7d');
  assert.deepEqual(fallback.ranking.map((c) => c.id), ['c2', 'c1', 'c3']);
  assert.deepEqual(fallback.genres, ['romance', 'drama', 'comedy']);
  assert.equal(extractHomeSection(fallback, 'continue').map((c) => c.id).join(','), 'c2');
});
