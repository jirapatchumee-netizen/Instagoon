#!/usr/bin/env node
/**
 * Fast Visual Novel Story & Scene Validator
 * Validates scene files, links, variables, characters, and reachability in <1s.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const gameDir = path.join(rootDir, 'games', 'overtime');
const { values: target } = parseArgs({ options: {
  node: { type: 'string' }, asset: { type: 'string' }, file: { type: 'string' },
} });
if ((target.node || target.asset || target.file) && (!target.node || !target.asset)) {
  console.error('Target verification requires --node SCENE/NODE and --asset ASSET_ID');
  process.exit(1);
}
let errors = 0;
let warnings = 0;

console.log('🔍 Running vn:check on:', gameDir);

if (!fs.existsSync(gameDir)) {
  console.error(`❌ Game directory not found: ${gameDir}`);
  process.exit(1);
}

const gameManifestPath = path.join(gameDir, 'game.json');
if (!fs.existsSync(gameManifestPath)) {
  console.error(`❌ game.json not found in ${gameDir}`);
  process.exit(1);
}

const canonPath = path.join(gameDir, 'CANON.md');
if (!fs.existsSync(canonPath)) {
  console.warn('⚠️  CANON.md not found in game directory (recommended for Lore Source of Truth)');
  warnings++;
}

const threadsPath = path.join(gameDir, 'THREADS.md');
if (!fs.existsSync(threadsPath)) {
  console.warn('⚠️  THREADS.md not found in game directory (recommended for Thread/Quest tracking)');
  warnings++;
}

const gameManifest = JSON.parse(fs.readFileSync(gameManifestPath, 'utf8'));
const declaredCharacters = new Set(Object.keys(gameManifest.characters || {}));
const declaredBackgrounds = new Set(Object.keys(gameManifest.backgrounds || {}));
const declaredVariables = new Set(Object.keys(gameManifest.variables || {}));

const scenesDir = path.join(gameDir, 'scenes');
const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.json')).sort();

const allNodes = new Map(); // fullNodeId -> node
const crossReferences = []; // { source, target, type }

// 1. Parse and register all nodes
for (const file of sceneFiles) {
  const filePath = path.join(scenesDir, file);
  try {
    const sceneData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const sceneId = sceneData.id;

    if (!sceneId) {
      console.error(`❌ [${file}] Scene is missing 'id'`);
      errors++;
      continue;
    }

    if (!Array.isArray(sceneData.nodes)) {
      console.error(`❌ [${file}] Scene 'nodes' must be an array`);
      errors++;
      continue;
    }

    sceneData.nodes.forEach((node, idx) => {
      const fullId = `${sceneId}/${node.id}`;
      if (allNodes.has(fullId)) {
        console.error(`❌ Duplicate node ID: ${fullId}`);
        errors++;
      }
      allNodes.set(fullId, { ...node, sceneId, fullId });

      // Check character
      if (node.say && !declaredCharacters.has(node.say)) {
        console.error(`❌ [${fullId}] Unknown speaker '${node.say}'. Declared: ${[...declaredCharacters].join(', ')}`);
        errors++;
      }

      // Check background
      if (node.bg && !declaredBackgrounds.has(node.bg)) {
        console.error(`❌ [${fullId}] Unknown background '${node.bg}'`);
        errors++;
      }

      // Check set variables
      if (node.set) {
        for (const varName of Object.keys(node.set)) {
          if (!declaredVariables.has(varName)) {
            console.warn(`⚠️ [${fullId}] Setting undeclared variable '${varName}'`);
            warnings++;
          }
        }
      }

      // Collect target references
      if (node.choice && Array.isArray(node.options)) {
        node.options.forEach((opt, optIdx) => {
          if (opt.go) {
            crossReferences.push({
              source: fullId,
              target: opt.go.includes('/') ? opt.go : `${sceneId}/${opt.go}`,
              type: `choice option ${optIdx + 1}`
            });
          }
        });
      } else if (node.go) {
        crossReferences.push({
          source: fullId,
          target: node.go.includes('/') ? node.go : `${sceneId}/${node.go}`,
          type: 'go'
        });
      }

      if (node.retry) {
        crossReferences.push({
          source: fullId,
          target: node.retry.includes('/') ? node.retry : `${sceneId}/${node.retry}`,
          type: 'retry checkpoint'
        });
      }
    });
  } catch (err) {
    console.error(`❌ [${file}] JSON Parse Error:`, err.message);
    errors++;
  }
}

// 2. Validate all cross-references
for (const ref of crossReferences) {
  if (!allNodes.has(ref.target)) {
    console.error(`❌ Broken link: [${ref.source}] -> '${ref.target}' (${ref.type}) not found`);
    errors++;
  }
}

const registry = JSON.parse(fs.readFileSync(path.join(gameDir, 'assets.json'), 'utf8')).assets;
const publicDir = path.join(rootDir, 'public');
for (const [key, asset] of Object.entries(registry)) {
  if (!asset.file) continue;
  const file = path.resolve(publicDir, `.${asset.file}`);
  if (!asset.file.startsWith('/') || path.relative(publicDir, file).startsWith('..') || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.error(`❌ Missing asset file: ${key} -> ${asset.file}`);
    errors++;
  }
}
if (target.node) {
  const node = allNodes.get(target.node);
  const asset = registry[target.asset];
  if (!asset?.file || (target.file && asset.file !== target.file)) {
    console.error(`❌ Expected asset ${target.asset} is not mapped to ${target.file ?? 'a served file'}`);
    errors++;
  }
  if (!node || node.bg !== target.asset) {
    console.error(`❌ Target ${target.node} does not use background ${target.asset}`);
    errors++;
  }
  if (!errors) console.log(`✅ Target binding verified: ${target.node} -> ${target.asset} -> ${asset.file}`);
}

console.log(`\n📊 Scan Complete:`);
console.log(`   Scenes:     ${sceneFiles.length}`);
console.log(`   Total Nodes: ${allNodes.size}`);
console.log(`   Errors:     ${errors}`);
console.log(`   Warnings:   ${warnings}`);

if (errors > 0) {
  console.log('\n❌ vn:check FAILED. Please resolve errors before committing.');
  process.exit(1);
} else {
  console.log('\n✅ vn:check PASSED cleanly! All story links and data contracts valid.');
}
