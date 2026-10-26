#!/usr/bin/env node
/**
 * Visual Novel Context Packer (Inspired by story-architect-skill build_context_pack.py)
 * Assembles a lightweight, non-leaking context bundle for generating or reviewing scenes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const gameDir = path.join(rootDir, 'games', 'overtime');

// Parse args
const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const targetStage = parseInt(getArg('--stage', '1'), 10);
const targetHeroine = getArg('--heroine', null);
const targetScene = getArg('--scene', null);
const outputFile = getArg('--output', null);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/vn-pack.mjs [options]

Options:
  --stage <1-5>       Target stage number (default: 1)
  --heroine <id>      Specific heroine (noey, pim, rinda, meena, rhea)
  --scene <id>        Adjacent scene ID to focus on (e.g. S1_01_server_room)
  --output <file>     Write context pack to file instead of stdout
  --help, -h          Show this help message
`);
  process.exit(0);
}

const stageHeroines = {
  1: { id: 'noey', name: 'น้องเนย (Noey)', floor: 'ชั้น 2: แผนกการตลาด' },
  2: { id: 'pim', name: 'คุณพิมพ์ (Pim)', floor: 'ชั้น 4: ฝ่ายบุคคล (HR)' },
  3: { id: 'rinda', name: 'คุณรินดา (Rinda)', floor: 'ชั้น 12: ฝ่ายตรวจสอบภายใน (Audit)' },
  4: { id: 'meena', name: 'คุณมีนา (Meena)', floor: 'ชั้น 19: หน้าห้องผู้บริหาร' },
  5: { id: 'rhea', name: 'คุณหนู เร-อา (Rhea)', floor: 'ชั้น 20: Penthouse Suite' }
};

const heroineInfo = targetHeroine
  ? Object.values(stageHeroines).find(h => h.id === targetHeroine) || { id: targetHeroine, name: targetHeroine, floor: 'Unknown' }
  : stageHeroines[targetStage] || stageHeroines[1];

// Load manifest
const manifest = JSON.parse(fs.readFileSync(path.join(gameDir, 'game.json'), 'utf8'));

// Read CANON & THREADS
const canonPath = path.join(gameDir, 'CANON.md');
const canonContent = fs.existsSync(canonPath) ? fs.readFileSync(canonPath, 'utf8') : '';

const threadsPath = path.join(gameDir, 'THREADS.md');
const threadsContent = fs.existsSync(threadsPath) ? fs.readFileSync(threadsPath, 'utf8') : '';

// Build Pack
const pack = [];
pack.push(`# 📦 VISUAL NOVEL SCENE WRITING CONTEXT PACK`);
pack.push(`> **Project:** ${manifest.title}`);
pack.push(`> **Target Stage:** Stage ${targetStage} (${heroineInfo.floor})`);
pack.push(`> **Target Heroine:** ${heroineInfo.name} (\`${heroineInfo.id}\`)`);
pack.push(`> **Generated At:** ${new Date().toISOString()}`);
pack.push(``);

pack.push(`## 🛡️ 1. NON-NEGOTIABLE CORE RULES`);
pack.push(`- **Core AI Rule:** Echo Mind v4.9 will ONLY open target terminal when a real 13-digit Thai ID card is scanned.`);
pack.push(`- **PDPA Failure Gate:** If suspicion reaches >= 100%, trigger BAD END: PDPA Arrest immediately.`);
pack.push(`- **Knowledge Boundaries:**`);
pack.push(`  - ${heroineInfo.name} DOES NOT KNOW Arm has Echo Mind or that her private ID is being targeted.`);
pack.push(`  - Arm must act as a humble, polite IT support on the surface while maintaining keen observation.`);
pack.push(``);

pack.push(`## 🗣️ 2. HEROINE PROFILE & VOICE CONTRACT`);
if (heroineInfo.id === 'noey') {
  pack.push(`- **Voice:** Bubbly, cute, clumsy, slightly flustered, affectionate. Calls Arm "พี่อาร์ม" (P'Arm).`);
  pack.push(`- **Keywords:** [กังวลไม่ผ่านโปร], [แอบชอบแมว], [เหงากะดึก]`);
} else if (heroineInfo.id === 'pim') {
  pack.push(`- **Voice:** Strict, authoritative, sharp, commanding. Slips into flustered embarrassment when cosplay is exposed.`);
  pack.push(`- **Keywords:** [ความเครียดประเมิน KPI], [คอสเพลย์ลับ], [เกลียดคนไม่จริงใจ]`);
} else if (heroineInfo.id === 'rinda') {
  pack.push(`- **Voice:** Professional, sharp audit logic, observant, cynical.`);
  pack.push(`- **Keywords:** [ความกดดันจากครอบครัว], [ภาระงาน Audit], [อยากได้รับการดูแล]`);
} else if (heroineInfo.id === 'meena') {
  pack.push(`- **Voice:** Calm, monotone, observant, highly guarded executive shadow.`);
  pack.push(`- **Keywords:** [การเป็นเงาคนอื่นตลอดชีวิต], [ไม่มีเวลาส่วนตัว], [ฝันอยากท่องเที่ยว]`);
} else if (heroineInfo.id === 'rhea') {
  pack.push(`- **Voice:** Cool beauty, regal, untouchable, analytical, deeply lonely.`);
  pack.push(`- **Keywords:** [ความโดดเดี่ยวบนยอดตึก], [แผนหักหลังของรองประธาน], [โหยหาคนที่ไว้ใจได้]`);
}
pack.push(``);

pack.push(`## 📐 3. JSON SCHEMA & NODE OUTPUT SPECIFICATION`);
pack.push(`Every scene MUST be valid JSON adhering to the engine contract:`);
pack.push(`\`\`\`json
{
  "id": "S${targetStage}_XX_scenename",
  "title": "Title of the Scene",
  "bg": "bg_marketing_office",
  "nodes": [
    {
      "id": "010",
      "say": "arm",
      "cast": ["arm@center"],
      "text": "บทบรรยายหรือบทพูด..."
    },
    {
      "id": "020",
      "say": "${heroineInfo.id}",
      "cast": ["arm@left", "${heroineInfo.id}@right"],
      "text": "บทพูดของตัวละคร..."
    },
    {
      "id": "030",
      "choice": "คำถามหรือการตัดสินใจเลือกทางแยก?",
      "options": [
        { "label": "ทางเลือกที่ 1 (เนียน)", "go": "040", "set": { "suspicion": -10 } },
        { "label": "ทางเลือกที่ 2 (เสี่ยง)", "go": "050", "set": { "suspicion": 25 } }
      ]
    }
  ]
}
\`\`\``);
pack.push(``);

pack.push(`## 🔍 4. DECLARED ENGINE ASSETS`);
pack.push(`- **Characters:** ${Object.keys(manifest.characters).join(', ')}`);
pack.push(`- **Variables:** ${Object.keys(manifest.variables).join(', ')}`);
pack.push(`- **Backgrounds:** ${Object.keys(manifest.backgrounds).join(', ')}`);

const result = pack.join('\n');

if (outputFile) {
  const resolvedOut = path.resolve(process.cwd(), outputFile);
  fs.writeFileSync(resolvedOut, result, 'utf8');
  console.log(`✅ Context pack written to: ${resolvedOut}`);
} else {
  console.log(result);
}
