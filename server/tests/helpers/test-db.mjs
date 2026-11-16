import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Every test database is built by replaying the real migrations, so a query that drifts from the
// schema fails here instead of on a Worker.
export function createTestDb() {
  const db = new DatabaseSync(':memory:');
  const dir = new URL('../../migrations/', import.meta.url);
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.sql')) db.exec(readFileSync(new URL(name, dir), 'utf8'));
  }

  // Cloudflare D1 compatibility shim
  return {
    raw: db,
    prepare(query) {
      return {
        bind(...params) {
          return {
            async first() { return db.prepare(query).get(...params); },
            async all() { return { results: db.prepare(query).all(...params) }; },
            async run() { return { meta: { changes: db.prepare(query).run(...params).changes } }; }
          };
        },
        async first() { return db.prepare(query).get(); },
        async all() { return { results: db.prepare(query).all() }; },
        async run() { return { meta: { changes: db.prepare(query).run().changes } }; }
      };
    },
    async batch(stmts) {
      const results = [];
      for (const s of stmts) results.push(await s.run());
      return results;
    }
  };
}
