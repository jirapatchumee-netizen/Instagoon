import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Compile at build time; Workers do not read Markdown or make a second AI call.
export function loadResponseContract(npc, creatorDir) {
  const config = npc.chatExperiment?.responseContract;
  if (!config) return npc;
  if (npc.id !== 'cheer' || !['cheer-response-v1', 'cheer-response-v2'].includes(config.id) || config.text !== undefined || config.previous?.text !== undefined || (config.previous && (config.id !== 'cheer-response-v2' || config.previous.id !== 'cheer-response-v1'))) throw new Error('invalid response contract source');
  const read = file => {
    const value = readFileSync(join(creatorDir, file), 'utf8').replace(/\r\n?/g, '\n').trim();
    if (!value || value.length > 2400) throw new Error('response contract must contain 1-2400 characters');
    return value;
  };
  const text = read('response-contract.md');
  const previous = config.previous ? { ...config.previous, text: read('response-contract-v1.md') } : undefined;
  return { ...npc, chatExperiment: { ...npc.chatExperiment, responseContract: { ...config, text, ...(previous ? { previous } : {}) } } };
}
