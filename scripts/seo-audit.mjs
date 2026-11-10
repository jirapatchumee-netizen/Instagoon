#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
const issues = [];

function check(title, condition, hint = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  \x1b[32m✔\x1b[0m ${title}`);
  } else {
    issues.push({ title, hint });
    console.log(`  \x1b[31m✖\x1b[0m ${title} ${hint ? `\x1b[33m(${hint})\x1b[0m` : ''}`);
  }
}

console.log('\n\x1b[1m=== Instagoon SEO & AEO Compliance Audit ===\x1b[0m\n');

// 1. Check client/index.html
console.log('\x1b[36m[1/4] Inspecting client/index.html & Meta Tags...\x1b[0m');
const indexHtmlPath = path.resolve(rootDir, 'client', 'index.html');
const indexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf-8') : '';

check('index.html exists', fs.existsSync(indexHtmlPath));
check('Has <title> with brand & keywords', /<title>.*Instagoon.*<\/title>/i.test(indexHtml));
check('Has <meta name="description">', /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(indexHtml));
check('Has <link rel="canonical">', /<link\s+rel=["']canonical["']\s+href=["']https:\/\/instagoon\.app\/["']/i.test(indexHtml));
check('Has OpenGraph title & image', /<meta\s+property=["']og:title["']/i.test(indexHtml) && /<meta\s+property=["']og:image["']/i.test(indexHtml));
check('Has Twitter Card tags', /<meta\s+name=["']twitter:card["']/i.test(indexHtml) && /<meta\s+name=["']twitter:image["']/i.test(indexHtml));
check('Has Schema.org JSON-LD Structured Data', /<script\s+type=["']application\/ld\+json["']>[\s\S]*@context[\s\S]*schema\.org[\s\S]*<\/script>/i.test(indexHtml));
check('Has noscript crawlable fallback for bots', /<noscript>[\s\S]*<\/noscript>/i.test(indexHtml));

// 2. Check client/public/robots.txt
console.log('\n\x1b[36m[2/4] Inspecting robots.txt...\x1b[0m');
const robotsPath = path.resolve(rootDir, 'client', 'public', 'robots.txt');
const robots = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, 'utf-8') : '';

check('robots.txt exists', fs.existsSync(robotsPath));
check('robots.txt allows root path', /Allow:\s*\//.test(robots));
check('robots.txt declares Sitemap link', /Sitemap:\s*https:\/\/instagoon\.app\/sitemap\.xml/i.test(robots));

// 3. Check client/public/sitemap.xml
console.log('\n\x1b[36m[3/4] Inspecting sitemap.xml...\x1b[0m');
const sitemapPath = path.resolve(rootDir, 'client', 'public', 'sitemap.xml');
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf-8') : '';

check('sitemap.xml exists', fs.existsSync(sitemapPath));
check('sitemap.xml includes root URL', /<loc>https:\/\/instagoon\.app\/<\/loc>/.test(sitemap));
check('sitemap.xml includes Milin profile', /<loc>https:\/\/instagoon\.app\/milin<\/loc>/.test(sitemap));
check('sitemap.xml includes Mook profile', /<loc>https:\/\/instagoon\.app\/mook<\/loc>/.test(sitemap));
check('sitemap.xml includes Noey profile', /<loc>https:\/\/instagoon\.app\/noey<\/loc>/.test(sitemap));

// 4. Check client/public/llms.txt (AEO Standard)
console.log('\n\x1b[36m[4/4] Inspecting llms.txt (AI Engine Optimization)...\x1b[0m');
const llmsPath = path.resolve(rootDir, 'client', 'public', 'llms.txt');
const llms = fs.existsSync(llmsPath) ? fs.readFileSync(llmsPath, 'utf-8') : '';

check('llms.txt exists', fs.existsSync(llmsPath));
check('llms.txt describes Milin', /Milin\s*\(มิลิน\)/.test(llms));
check('llms.txt describes Mook', /Mook\s*\(มุก\)/.test(llms));
check('llms.txt describes Noey', /Noey\s*\(เนย\)/.test(llms));
check('llms.txt contains canonical links section', /Canonical Links/i.test(llms));

// 5. SafeSearch-Friendly Verification
console.log('\n\x1b[36m[Bonus] SafeSearch Filter Hygiene Check...\x1b[0m');
const explicitBlacklist = [
  'เย็ด', 'เซ็กส์หมู่', 'ควย', 'หี', 'porn', 'xxx', 'hentai', 'gangbang', 'creampie'
];
let foundUnsafe = false;
for (const word of explicitBlacklist) {
  if (indexHtml.toLowerCase().includes(word) || llms.toLowerCase().includes(word)) {
    foundUnsafe = true;
    check(`SafeSearch Hygiene (No "${word}")`, false, 'Explicit keyword found in public text');
  }
}
if (!foundUnsafe) {
  check('SafeSearch Hygiene: Clean public surfaces (No forbidden explicit terms)', true);
}

console.log(`\n\x1b[1m=== Audit Summary: ${passedChecks}/${totalChecks} checks passed ===\x1b[0m\n`);

if (issues.length > 0) {
  console.log('\x1b[31mAction Required:\x1b[0m');
  for (const issue of issues) {
    console.log(` - ${issue.title}: ${issue.hint}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m✔ All SEO & AEO standards are fully satisfied!\x1b[0m\n');
  process.exit(0);
}
