import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Compile at build time; Workers do not read Markdown or make a second AI call.
export function loadResponseContract(npc, creatorDir) {
  const config = npc.chatExperiment?.responseContract;
  if (!config) return npc;
  if (npc.id !== 'cheer' || config.id !== 'cheer-response-v1' || config.text !== undefined) throw new Error('invalid response contract source');
  const text = readFileSync(join(creatorDir, 'response-contract.md'), 'utf8').trim();
  if (!text || text.length > 2400) throw new Error('response contract must contain 1-2400 characters');
  return { ...npc, chatExperiment: { ...npc.chatExperiment, responseContract: { ...config, text } } };
}
