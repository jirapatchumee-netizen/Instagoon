#!/usr/bin/env node
/**
 * Auto-generate INDEX.md for games/overtime
 * Provides quick overview of scenes, node counts, entry/exit links, and variables set.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const gameDir = path.join(rootDir, 'games', 'overtime');
const scenesDir = path.join(gameDir, 'scenes');

if (!fs.existsSync(scenesDir)) {
  console.error(`❌ scenes directory not found at ${scenesDir}`);
  process.exit(1);
}

const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.json')).sort();

let totalNodes = 0;
const sceneRows = [];

for (const file of sceneFiles) {
  const filePath = path.join(scenesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const nodes = data.nodes || [];
  totalNodes += nodes.length;

  const entry = nodes[0] ? nodes[0].id : '-';
  const exits = new Set();
  const varsSet = new Set();

  for (const node of nodes) {
    if (node.set) {
      Object.keys(node.set).forEach(v => varsSet.add(v));
    }
    if (node.choice && Array.isArray(node.options)) {
      node.options.forEach(opt => {
        if (opt.go && (opt.go.includes('/') || opt.go.startsWith('end'))) {
          exits.add(opt.go);
        }
      });
    } else if (node.go && node.go.includes('/')) {
      exits.add(node.go);
    }
    if (node.end) {
      exits.add(`END: ${node.end.slice(0, 15)}...`);
    }
  }

  sceneRows.push({
    file,
    id: data.id,
    title: data.title || data.id,
    nodeCount: nodes.length,
    entry,
    exits: exits.size > 0 ? [...exits].join(', ') : 'Sequential next',
    vars: varsSet.size > 0 ? [...varsSet].join(', ') : '—'
  });
}

const mdLines = [
  '# 📑 Overtime Secrets — Scene Index (สารบัญฉาก)',
  '',
  '> **Generated automatically by `pnpm vn:index`. DO NOT EDIT MANUALLY.**',
  `> Last updated: ${new Date().toISOString()}`,
  `> Total Scenes: **${sceneFiles.length}** | Total Nodes: **${totalNodes}**`,
  '',
  '| Scene ID | Title | Nodes | Entry | Exits / Branches | Variables Set |',
  '| :--- | :--- | :---: | :---: | :--- | :--- |'
];

for (const row of sceneRows) {
  mdLines.push(`| \`${row.id}\` | **${row.title}** | ${row.nodeCount} | \`${row.entry}\` | ${row.exits} | \`${row.vars}\` |`);
}

mdLines.push('');
mdLines.push('## 🗺️ Story Flow Summary');
mdLines.push('1. `S1_01_server_room` ➔ `S1_02_noey_desk`');
mdLines.push('2. `S1_02_noey_desk` ➔ (Heist Choice: Bad End OR `S1_03_night_terminal`)');
mdLines.push('3. `S1_03_night_terminal` ➔ `S1_04_hr_incident` (Cat-Maid Photo Shoot)');
mdLines.push('4. `S1_04_hr_incident` ➔ `S1_05_keycard` (Pim Bullying & Revenge Alliance)');
mdLines.push('5. `S1_05_keycard` ➔ `STAGE 1 COMPLETE` (Midnight Silk Photo + Pim ID Card Handover)');

fs.writeFileSync(path.join(gameDir, 'INDEX.md'), mdLines.join('\n') + '\n', 'utf8');
console.log(`✅ games/overtime/INDEX.md generated successfully with ${sceneFiles.length} scenes.`);
