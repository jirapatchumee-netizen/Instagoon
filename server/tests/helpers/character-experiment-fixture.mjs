import { readFileSync } from 'node:fs';
import { narrativeFixture } from './narrative-fixture.mjs';
export const sourceNpc = JSON.parse(readFileSync(new URL('../../../content/creators/cheer/character.json', import.meta.url), 'utf8'));
export const juneNpc = JSON.parse(readFileSync(new URL('../../../content/creators/june/character.json', import.meta.url), 'utf8'));
export async function characterExperimentFixture({ scene = false, opening = false, creator = 'cheer' } = {}) {
  const f = await narrativeFixture();
  for (const key of Object.keys(f.npc)) delete f.npc[key];
  Object.assign(f.npc, structuredClone(creator === 'june' ? juneNpc : sourceNpc));
  if (!scene) delete f.npc.chatExperiment.presentation;
  if (!opening) delete f.npc.chatExperiment.opening;
  f.sql.prepare('INSERT INTO creators(id,name,bio) VALUES(?,?,?)').run(f.npc.id, f.npc.name, f.npc.tagline);
  f.sql.prepare('INSERT INTO npc_definitions(creator_id,definition_json,updated_at) VALUES(?,?,0)').run(f.npc.id, JSON.stringify(f.npc));
  f.env.DEEPSEEK_API_KEY = 'fixture-placeholder';
  f.env.PRIMARY_AI_PROVIDER = 'workers-ai';
  f.env.AI = { async run() { throw new Error('experiment must never use Workers AI'); } };
  return f;
}
