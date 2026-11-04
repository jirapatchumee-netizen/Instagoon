# Craft Anything — ผลวิเคราะห์และแผนการติดตั้ง skill

แหล่งอ้างอิง: https://github.com/storytold/craft-anything (clone ตื้นมาตรวจแล้วที่
`.tmp-craft-anything/`, HEAD = tree `e56379f`, release ล่าสุด **v0.3.0** published 2026-11-02)
ตรวจเครื่องเมื่อ 2026-11-03

---

## 1. มันคืออะไรจริง ๆ (สำคัญที่สุด)

repo นี้ **ไม่ใช่ "skill เดี่ยว ๆ"** แบบที่วางไฟล์ `SKILL.md` แล้วใช้ได้ มันเป็น Rust workspace ทั้งโปรเจกต์
(14 crates + 3 apps, version 0.3.0, status **early alpha**) ประกอบด้วย

| ส่วน | path | บทบาท |
|---|---|---|
| Engine | `crates/engine`, `disasm`, `analysis`, `formats`, `js`, `evidence` | reverse-engineering ล้วนใน Rust (decoder/disassembler/decompiler ของตัวเอง) |
| Tools | 314 tools (298 ใน engine + ส่วน AI/setup) | ทุก tool เป็นทั้ง CLI subcommand และ MCP tool |
| Apps | `apps/craft-anything` (egui desktop), `apps/craft-anything-cli` (CLI + MCP server), `apps/craft-anything-web` (WASM viewer) | |
| **Skill จริง** | `crates/setup/src/skill.md` + `skill_recovery.md` | فایل `SKILL.md` ที่ installer จะเอาไปวางใน agent |

**ตัว skill คืออะไร:** `SKILL.md` frontmatter `name: craft-anything`, `metadata.version: "1"` เนื้อหาเป็น
*method guide* (evidence-first investigation): สอน agent ให้เปิด investigation memory
(`core_investigation_show`, `core_brief_write`, `core_plan_update`, `core_hypothesis_record`,
`core_finding_record`, `core_handoff_write`), อ้าง evidence id (`ev_…`), แยก observed/derived/inferred,
ตาราง "เริ่มตรงไหนตามชนิด target", และ error code → วิธีแก้

**ข้อสรุปที่ต้องรู้ก่อนติดตั้ง:** skill นี้ **ไร้ความหมายถ้าไม่มี MCP server** มันสั่งให้เรียก `core_*`,
`list_toolsets`, `enable_toolset` ซึ่งมาจาก `craft-anything-cli mcp` เท่านั้น ตัว `skill.md` เองเขียนไว้ชัดว่า
"Trust the live tool list … If the tools are missing … run `craft-anything-cli doctor`"
→ การติดตั้งที่ถูกต้องคือติดตั้ง **CLI + MCP server + skill + config ของ client** พร้อมกัน ไม่ใช่ copy ไฟล์ markdown อย่างเดียว

---

## 2. ตัวติดตั้งของโครงการเอง (ไม่ต้องเขียน script เอง)

`crates/setup/` เป็น installer ที่ออกแบบดีอยู่แล้ว — มันทำ 2 อย่าง: merge entry MCP server เข้าไฟล์ config
ของ agent app (สำรองก่อน, merge แบบรักษา comment, verify, rollback อัตโนมัติเมื่อพัง) และวางไฟล์ skill

ไฟล์ที่จะถูกเขียน (`crates/setup/src/skill.rs:19-21,63-107`):

```
<skills dir>/craft-anything/SKILL.md              ← skill.md (100 บรรทัด)
<skills dir>/craft-anything/references/recovery.md ← skill_recovery.md (19 บรรทัด)
```

พฤติกรรม: เขียนเฉพาะไฟล์ที่เปลี่ยน (atomic + read-back verify), ไฟล์เดิมที่ถูกทับจะถูกเก็บเป็น
`<path>.craft-anything.backup` ครั้งเดียว, ถ้าไฟล์นั้นมีของอื่น (ไม่ใช่ของเรา) จะ mark เป็น `Foreign`
และไม่ทับ, ล้มเหลวเมื่อไหร่ rollback ทุกไฟล์ที่ยื่นไปแล้วย้อนลำดับ

CLI flags (`apps/craft-anything-cli/src/setup_cmd.rs:11-27`):

```
craft-anything-cli setup [--dry-run] [--client <id>]... [--all-detected] [-y] [--no-skill]
craft-anything-cli doctor [--client <id>]...
craft-anything-cli uninstall
```

แนะนำตามตัว skill เอง: `doctor` → `setup --dry-run` → แสดงแผนให้คนดูก่อน → ค่อย apply → restart/reconnect app

client ที่รองรับ + ที่วาง skill (`crates/setup/src/clients.rs:231-394`) — ตรวจพบว่าเครื่องนี้มี ✓

| id | config ที่ถูกแก้ | skills dir | เครื่องนี้ |
|---|---|---|---|
| `claude_code` | `~/.claude.json` (Jsonc, `mcpServers`) | `~/.claude/skills` ✓ | ✓ |
| `codex` | `~/.codex/config.toml` (TOML, `mcp_servers`, +`startup_timeout_sec:30`) | `~/.agents/skills` (shared) ✓ | ✓ |
| `gemini_cli` | `~/.gemini/settings.json` | `~/.agents/skills` (shared; `gem_home` = `$GEMINI_CLI_HOME` หรือ `HOME` → `HOME/.agents/skills`) | ✓ (`~/.gemini` มี) |
| `claude_desktop` | `~/Library/Application Support/Claude/claude_desktop_config.json` | shared | |
| `cursor`, `windsurf`, `vscode`, `opencode`, `qwen_code`, `hermes`, `antigravity`, `grok_build`, `trae`, `qoder`, `devin`, `commandcode`, `omp`, `pi`, `zcode` | ตามไฟล์ของตัวมันเอง | shared หรือ `<app>/skills` | |
| shared fallback | — | `~/.agents/skills` ✓ | ✓ |

> **FrostNova (`~/.frostnova/skills`) ไม่อยู่ในรายการ client ที่รองรับ** — installer จะไม่เห็นมัน
> ถ้าต้องการใช้กับ FrostNova ต้องทำ manual (ดูข้อ 5)

---

## 3. สภาพเครื่องวันนี้ (ตรวจแล้ว)

```
cargo 1.99.0 · rustc 1.99.0   ✓ ผ่าน requirement (ต้อง ≥ 1.97)
git ✓   gh ✓   ~/.local/bin ✓ (อยู่ใน PATH เพราะ `claude` เรียกได้เลย)
claude CLI → ~/.local/bin/claude → ~/.hermes/node/bin/claude ✓
มี ~/.claude/skills, ~/.codex/skills, ~/.agents/skills, ~/.frostnova/skills (120 skills)
ยังไม่มี craft-anything ติดตั้งไว้ที่ใดเลย (ตรวจ 3 ที่ → No such file)
ดิสก์ว่าง 139 GiB ✓
```

ยัง **ไม่ได้** ตรวจ: `craft-anything-cli` ยังไม่มีบน PATH, ยังไม่มี `~/.claude.json` entry ของ craft-anything,
Ghidra ติดตั้งหรือยัง (จำเป็นเฉพาะ Deep mode เต็มรูป)

---

## 4. แผนติดตั้ง — เลือก 1 เส้นทาง (Route)

### Route A — download binary จาก release (แนะนำ, เร็วสุด ~1 นาที)

`craft-anything-cli-0.3.0-macos-universal.zip` 25.3 MB, signed + notarized, ใช้ได้ทั้ง Apple silicon/Intel
ไฟล์เดียวจบ ไม่มี full Rust build

```sh
# A1 ดึง + ตรวจ checksum (ทำในโฟลเดอร์ชั่วคราว)
ver=0.3.0; cd "$(mktemp -d)"
curl -fLO "https://github.com/storytold/craft-anything/releases/download/v$ver/craft-anything-cli-$ver-macos-universal.zip"
curl -fLO "https://github.com/storytold/craft-anything/releases/download/v$ver/SHA256SUMS.txt"
shasum -a 256 -c SHA256SUMS.txt --ignore-missing   # ต้องขึ้น ": OK"

# A2 ปลดล็อก + ติดตั้งลง ~/.local/bin (README.md:276-285 แนะนำเส้นทาง curlนี้ เพื่อเลี่ยง Gatekeeper block)
ditto -x -k "craft-anything-cli-$ver-macos-universal.zip" .
mkdir -p ~/.local/bin
mv "craft-anything-cli-$ver-macos-universal/craft-anything-cli" ~/.local/bin/
xattr -d com.apple.quarantine ~/.local/bin/craft-anything-cli 2>/dev/null || true
craft-anything-cli --version        # → 0.3.0

# A3 ตรวจก่อนแตะไฟล์ใด ๆ
craft-anything-cli doctor                          # engine / agent / MCP health
craft-anything-cli setup --dry-run --client claude_code   # พิมพ์แผนออกมา ยังไม่เขียน
```

**ต้องยืนยันกับ user ก่อน A4** เพราะขั้นนี้แก้ไฟล์ config ของแอปอื่น (`~/.claude.json`, สร้าง skill folder)

```sh
# A4 apply (เลือก client เอง อย่าใช้ --all-detected ถ้าไม่จำเป็น)
craft-anything-cli setup --client claude_code
craft-anything-cli doctor --client claude_code     # ยืนยันว่า MCP ตอบจริง
# แล้ว restart / reconnect Claude Code หนึ่งรอบ (skill.md:22 บังคับไว้)
```

### Route B — build จาก source (`cargo install --path apps/craft-anything-cli`)
ใช้เมื่อต้องการ HEAD ที่ใหม่กว่า release หรืออยากอ่าน/แก้ code
ข้อเสีย: workspace ใหญ่ (14 crates, dependency หนักพวก oxc, iced-x86, wasmparser, eframe) → build นานหลายสิบนาที
และ `lto = "thin"`, `codegen-units = 1` ใน release profile ช้าลงอีก ถ้าเลือก route นี้ให้รันแบบ background session

### Route C — desktop app (`craft-anything-0.3.0-macos-universal.dmg`, 128 MB)
หลัง 0.2.0 CLI ฝังในตัวแอปแล้ว (`README.md:269-270`) เหมาะเมื่ออยากใช้ GUI Simple/Advanced ด้วย
ถ้าจะเอาแค่ skill+MCP → Route A ประหยัดกว่ามาก

---

## 5. ถ้าอยากให้ FrostNova ใช้นี่ด้วย (manual, ไม่มี installer รองรับ)

FrostNova อ่าน skill จาก `~/.frostnova/skills/<id>/SKILL.md` และมี registry 2 ไฟล์
(`SKILLS.yaml`, `ROUTING.yaml`) ที่ต้องเพิ่มรายการ ไม่ใช่แค่ copy ไฟล์

1. ติดตั้ง CLI ตาม Route A (ตัว MCP server ยังไม่ต้อง register ผ่าน `setup`)
2. copy skill: `~/.frostnova/skills/craft-anything/SKILL.md` + `references/recovery.md`
   (ต้นฉบับคือ `crates/setup/src/skill.md`, `skill_recovery.md`) และเพิ่ม frontmatter ให้เข้ากับ format ของ FrostNova
   (แนวเดียวกันกับ skill ที่มีอยู่ + คีย์ `triggers:`) — **ต้อง rename `name:` หรือไม่ก็ shadow กับ `reverse-engineer-anything` ที่ active อยู่แล้ว**
3. ลงทะเบียนใน `~/.frostnova/skills/SKILLS.yaml` (`id`, `category`, `purpose`, `status`, `risk`)
   และ `ROUTING.yaml` (`entry`, `when`, `dependencies`, `risk`) — จุดนี้มี skill ที่ทำงานทับซ้อนกันอยู่แล้ว
   คือ `reverse-engineer-anything` (REA) ซึ่ง routing ปัจจุบันจับคำว่า "inspect packaged application / Mach-O / ASAR / JavaScript"
   ถ้าไม่เขียน `when:` ให้แยกชัด ระบบ routing จะคลุมเครือ
4. เพิ่ม MCP server `craft-anything-cli mcp` เข้า MCP config ของ FrostNova (มี skill `mcp-config` ช่วยขั้นนี้)
5. ตรวจ: ให้ agent เรียก `list_toolsets` / `core_investigation_show` ผ่าน MCP แล้วตอบจริงไหม

---

## 6. Checklist ความสำเร็จ (verification ไม่ใช่แค่ว่า "รันผ่าน")

- [ ] `shasum -c` ขึ้น `: OK` ของ zip ที่ใช้
- [ ] `craft-anything-cli --version` → `0.3.0`
- [ ] `doctor` ผ่านทุก check โดยเฉพาะ "MCP server answers"
- [ ] `setup --dry-run` แสดง diff ของ config + รายการไฟล์ skill (create/update) → **อ่านก่อน apply**
- [ ] หลัง apply: `~/.claude/skills/craft-anything/SKILL.md` มีบรรทัดแรกเป็น `---` และ `name: craft-anything`
- [ ] `~/.claude.json` มี `mcpServers.craft-anything` และ entry เดิมไม่หายไป (diff เทียบกับ `.backup`)
- [ ] restart Claude Code แล้ว `/mcp` เห็น tools จาก craft-anything; skill ปรากฏในรายการ skill
- [ ] ทดสอบจริง 1 รอบ: `craft-anything-cli commands` (เห็น toolsets) หรือ `craft-anything-cli rebuild - "A snake game in Rust" --rounds 1`

---

## 7. ความเสี่ยง / ข้อควรทราบ

1. **early alpha** — `docs/STATUS.md` ระบุชัดว่าบางส่วนยัง tested กับ stand-in เท่านั้น
2. **แก้ config แอปอื่น** — `setup` ถูกจัด effect เป็น `WRITES_FILESYSTEM | EXECUTES_FOREIGN_CODE` และ
   `uninstall` เพิ่ม `MAY_DISCARD_DATA` (`crates/setup/src/tools.rs`) → ต้องมี backup + dry-run ก่อนเสมอ
   ถ้าจะ revert: `craft-anything-cli uninstall` หรือกู้จาก `*.craft-anything.backup`
3. **Clean room เป็น default** — โหมดนี้ tool ที่ "อ่านของข้างใน target" จะถูก refuse (`details.reason: clean_room`)
   ถ้า user ต้องการ inspect จริงต้อง `settings_set deep_mode true` หรือ start server ด้วย `--deep`
4. **Deep mode + license/ จริยธรรม** — README ข้อ "Responsible use": ใช้กับซอฟต์แวร์ที่ owns หรือได้รับอนุญาต, ไม่ bypass DRM/login/anti-cheat
5. **เรื่อง Claude Code builder** — `docs/claude-code.md` อธิบายว่าโปรเจกต์รัน `claude` binary ของผู้ใช้ตรง ๆ (headless + MCP)
   และมี "open questions" เชิงพาณิชย์ที่ยังไม่เคลียร์ ถ้าใช้ส่วนตัวภายใต้บัญชีตนเองถือว่าอยู่ในเงื่อนไขที่ Anthropic ระบุไว้
6. **skill version แข็งกับ CLI** — `SKILL_VERSION = "1"`, ตัว skill จะถูก refresh เมื่อ CLI เวอร์ชันใหม่วางเวอร์ชันที่ต่าง
   อย่าไปแก้ไฟล์ `SKILL.md` ที่ติดตั้งแล้ว (จะกลายเป็น `Outdated`/ถูกทับ)
7. **ซอร์สเป็น MIT OR Apache-2.0** แต่แบรนด์ ArtCraft (logo/wordmark ใน `docs/brand/`) ไม่ครอบคลุม licenseนี้ — fork ต้องถอดออก
8. **ซอร์ฟแวร์ที่ inspect ได้** ต้องไม่เอา secrets / cookies / ข้อมูลส่วนตัว ไปเขียนใน brief, findings, handoff (`skill.md:87`)

---

## 8. คำแนะนำสั้น ๆ

Route A (download CLI) → `doctor` → `setup --dry-run --client claude_code` ให้ดูก่อน → apply เฉพาะ client ที่เลือก
→ restart app → ทดสอบ 1 rebuild สั้น ๆ ถ้าต้องการใช้ใน FrostNova ด้วย ให้ทำขั้นตอนในข้อ 5 แยกอีกงาน
(ต้อง resolve routing ชนกับ `reverse-engineer-anything` ก่อน ไม่งั้น skill ใหม่จะเงียบ)

---

## 9. ผลการติดตั้งจริง (ทำแล้วเมื่อ 2026-11-03, user อนุมัติ Route A + 3 clients)

| ขั้นตอน | ผลที่ยืนยันได้ |
|---|---|
| download + checksum | `craft-anything-cli-0.3.0-macos-universal.zip` 25,284,278 B → `shasum -a 256 -c` = `: OK` |
| codesign | Identifier `ai.storyteller.craft-anything-cli`, Developer ID Application: Learning Machines LLC (DJ6XS33FX8) |
| ติดตั้ง | `~/.local/bin/craft-anything-cli` → `craft-anything-cli 0.3.0` |
| doctor (ก่อน) | `healthy`, MCP self-test ตอบจริง (protocol 2025-06-18, 29 tools) |
| dry-run | update `.claude.json`, update `.codex/config.toml`, **create** `.gemini/settings.json`, skill → `.claude/skills` + `.agents/skills` |
| apply | `status: configured` — `[configured] claude_code / codex / gemini_cli` |
| readback skill | `~/.claude/skills/craft-anything/SKILL.md` (6,304 B) + `references/recovery.md` (1,376 B) และสำเนาที่ `~/.agents/skills/craft-anything/` → **diff เทียบต้นฉบับ repo = identical ทุกไฟล์** |
| readback config | `.claude.json`: top-level keys คงเดิม 56, mcpServers = `penpot, frame-image-studio, craft-anything` (ของเดิมไม่หาย) · `.codex/config.toml`: 60 sections, เพิ่ม `[mcp_servers.craft-anything]`, penpot/node_repl ยังอยู่ · `.gemini/settings.json`: JSON ถูกต้อง มี key เดียว `mcpServers` |
| backup | installer สร้าง `~/.claude.json.craft-anything.backup`, `~/.codex/config.toml.craft-anything.backup` + snapshot เพิ่มเติมที่ `/tmp/ca-presnap/` (ใช้ชั่วคราว) |
| doctor (หลัง) | `[ok] registration:claude_code / codex / gemini_cli: … is connected.` → `healthy` |
| เครื่องมือจริง | `craft-anything-cli commands` แสดง tool surface 332 บรรทัด |

**ทำต่ออีก 2 อย่าง:** (1) restart Claude Code / Codex / Gemini CLI หนึ่งรอบ (skill บังคับไว้ที่ `skill.md:22`)
(2) ถ้าอยาก uninstall: `craft-anything-cli uninstall` (จะเอาทั้ง MCP entry และ skill ออก)

**ยังไม่ทำ/ข้อจำกัดที่ยังเหลือ:** ยังไม่ได้รัน rebuild เต็มจริง (ต้อง sign-in coding agent), ยังไม่ได้ลง Ghidra/adb/jadx/frida
(optional engines ที่ doctor ระบุว่า absent), FrostNova ยังไม่ได้ต่อ skill นี้ (ดูข้อ 5), โหมด default ยังเป็น clean room
ถ้าจะให้ inspect ของข้างใน target ต้องเปิด `settings_set deep_mode true` หรือ start MCP ด้วย `--deep`

---

## 10. เทียบกับ `reverse-engineer-anything` (REA) — วัดจริงบนเครื่องนี้ 2026-11-03

> การเทียบนี้คือผลเทสต์ **target เดียว** (`/bin/ls`) แบบ static — ไม่ใช่ benchmark ทั่วไป อ่านข้อจำกัดใน 10.5 ก่อนตีความ

### 10.1 ตัวที่ติดตั้งอยู่บนเครื่องนี้

| | **reverse-engineer-anything (REA)** | **Craft Anything** |
|---|---|---|
| เวอร์ชัน | `rea 6.7.0` (`~/.local/bin/rea`) | `craft-anything-cli 0.3.0` (`~/.local/bin/…`) |
| คำสั่ง/tool ที่ enumerate ได้ | **155** commands (`rea --help`) | **315** บรรทัดรายการ tool (`commands --format text`) |
| ไฟล์ skill ที่ active | `~/.frostnova/skills/reverse-engineer-anything/SKILL.md` (2,608 B) | `~/.claude/skills/craft-anything/SKILL.md` (6,304 B) + สำเนา `~/.agents/skills/` |
| ใช้ใน FrostNova ได้เลย? | **ได้** (skill active + มี adapter `rea_inspect` แบบ background read-only) | **ไม่ได้** — ต้องทำ manual ตามข้อ 5 |
| วิธีติดตั้งเข้า agent | skill ของ FrostNova + CLI ที่ลงไว้แล้ว | `craft-anything-cli setup` (19 clients) |
| maturity | 6.x | **early alpha** 0.3.0 |

### 10.2 Head-to-head บน `/bin/ls` (fat binary จริง = `x86_64` + `arm64e`)

| | REA 6.7.0 | Craft Anything 0.3.0 |
|---|---|---|
| คำสั่งหลัก | `rea analyze /bin/ls` → **fail**: code `provider_unavailable`, operation `read_binary_inventory_summary`, candidates `ghidra,hopper,ida,kuna`, `retryable: true` | `core-target-open` (default) → **refused**: `feature_missing`, `details.reason: clean_room`, `retryable: false` |
| ทางที่ทำได้โดยไม่ต้องติดตั้งอะไรเพิ่ม | `rea inspect-macho` ผ่าน (provider `native-macos`) | `--deep` ครั้งเดียวได้ overview ครบ |
| ผลที่ได้ | `evidence_id ev_a4f1dbdd…`, `subject.digest.sha256 d6b646ec…`, `format mach-o-universal`, `architecture arm64`, `analysis_profile` | `evidence ev_cc1b9908…`, **138 functions · 3,679 instructions · 852 basic blocks · 1,493 xrefs · 92 symbols · 101 strings · 91 imports · 1 exports · 3 jump tables · 52 ฟังก์ชันที่ได้ชื่อจาก generator**, entry `0x100000978`, image base `0x100000000` |
| engine ที่ใช้ | `native-macos` (utility ของ macOS, ไม่ได้ decompile) | `builtin` — disassembler/decompiler ของโปรเจกต์เอง (`engine_version 0.3.0`, host `macos-aarch64`) **ไม่ต้องมี Ghidra/Hopper/IDA** |
| การคุมขนาด output สำหรับ agent | `--token-count` → **862 tokens**, มี `--token-limit`, `--llms` | `native_functions_list` ตอบ `coverage: partial, examined 4/138, next_offset 4` (pagination ให้ agent รับทีละก้อน) |
| limitation ที่ประกาศเอง | diagnostics + remediation ราย provider | `indirect_jumps_unresolved` (1 จุด), `static_analysis_only` |
| เวลา (wall clock ของ shell block) | 1.9 s (`inspect-macho`) / 2.8 s (`analyze` ที่ fail) | 0.107 s รวม 3 calls |

**จุดที่ทั้งคู่ไม่ตรง ground truth:** `lipo -archs /bin/ls` → `x86_64 arm64e`. REA ติด label slice ว่า `arm64` (ไม่ระบุ `arm64e`), Craft วิเคราะห์แล้วรายงาน `architecture: x86_64` (คนละ slice กับที่เครื่องนี้รัน) → **อย่าเชื่อ field `architecture` ตัวเดียว** ให้ยืนยันด้วย `lipo`/`vtool` ก่อนสรุปผลทุกครั้ง

### 10.3 ใครแข็งกว่ากันด้านไหน

| ด้าน | ตัวที่ชนะ | เหตุผล/หลักฐานจาก command surface |
|---|---|---|
| ความกว้างของ workflow (APK/adb, web/Electron/browser capture, firmware, WASM, PE-CLI managed, EVM, sigrok, Interface Builder, dynamic debug gdb/rizin/cutter, JEB) | **REA** | 155 commands มี `capture-adb-screen`, `debug-with-gdb`, `execute-rizin-command`, `extract-firmware`, `decode-android-resources`, `identify-flutter-build`, `compare-*` |
| decompile ระดับอุตสาหกรรม + ผลลึกถึง pseudocode | **REA** *เมื่อลง provider* | `decompile`, `function`, `analyze-javascript-application` ต้องใช้ Ghidra/Hopper/IDA/Kuna — บนเครื่องนี้ `rea doctor` รายงาน **`missing_analysis_engine` ครบทั้ง 4** จึงยังทำไม่ได้จริง |
| analysis ครบวงจรจาก binary ล้วน ๆ โดย dependencyภายนอก = ศูนย์ | **Craft** | ได้ function/xref/strings/instruction counts ทันที ไม่ต้องติดตั้งโปรแกรมเพิ่ม |
| ความเข้มของ evidence model | **REA** | canonical Evidence JSON + subject digest + provider attribution + `evidence-export/import` + `compare` + `build-reconstruction-obligation-ledger` + `evaluate-reconstruction-coverage` (fail-closed) |
| โครง investigation สำหรับ agent (brief/plan/hypothesis/finding/handoff) | **Craft** | ชุด `core_*` + `SKILL.md` 6,304 B สอน method แบบ evidence-first |
| วาง skill เข้า agent หลายตัวในคำสั่งเดียว | **Craft** | `setup --client …` 19 clients / มี backup+rollback |
| output สำหรับป้อน LLM | **REA** | token budget จริงวัดได้ (862 tokens) + `--format md/json` + `--llms` |
| ลูป "สร้าง → ตรวจ → แก้" (rebuild, ไม่ใช่แค่วิเคราะห์) | **Craft** | `rebuild`, `goal`, `design`, `diagnose` |
| GUI สำหรับคน | **Craft** | desktop app (egui) + web viewer; REA เน้น CLI/agent |

### 10.4 สรุปเลือกตัวไหน

- ถอดของจริงที่วางขาย (Mach-O / Electron-ASAR / APK / JS bundle / web capture) และต้องการผลที่ตรวจย้อนหลังได้ + มี Ghidra/Hopper อยู่แล้ว → **REA** ( maturity 6.x vs alpha 0.3)
- ต้องการ analysis ที่รันได้ทันทีไม่ต้องติดตั้งอะไรเพิ่ม, เก็บ investigation memory เป็นระบบ, และวาง skill เข้า Claude Code/Codex/Gemini พร้อมกัน → **Craft Anything**
- สำหรับ **FrostNova วันนี้ → REA ตัวเดียวที่ใช้ได้ทันที**; Craft ต้องทำตามข้อ 5 และยังชน routing กับ `reverse-engineer-anything`
- ใช้ **คู่กัน** ได้ประโยชน์สุด: Craft เป็นแกน investigation, REA เป็นผู้ตรวจหลักฐาน (digest/slice/compare evidence)

### 10.5 ข้อจำกัดของเทสต์นี้ (ห้ามตีความเกิน)

1. ตัวอย่างเดียว `/bin/ls` เป็น Apple system binary, fat, ไม่มี DWARF เต็ม — ไม่ใช่ตัวแทนแอปจริง
2. REA ถูกวัดตอน **ไม่มี analysis provider ติดตั้งเลย** ดังนั้น `rea analyze` fail เป็นเรื่อง environment ไม่ใช่คุณภาพเครื่องมือ; ถ้าลง Ghidra แล้วผลจะคนละเรื่อง (ยังไม่ได้วัด)
3. Craft ต้องเปิด `--deep` (สละ clean room) ถึงจะได้ผลระดับนี้ — clean-room เป็น policy ไม่ใช่บั๊ก แต่แปลว่าใน default โหมด Craft ทำสิ่งที่ `rea inspect-macho` ทำไม่ได้
4. ตัวเลขเวลาเป็น wall clock ของทั้ง shell block (0.107 s รวม 3 calls) ไม่ใช่ per-tool latency ที่คุมตัวแปร
5. **ยังไม่ได้วัดคุณภาพ pseudocode/decompile จริงของทั้งคู่** — attempts แรกพังเพราะชื่อ flag ไม่ตรง: `core-overview-show` ไม่รับ `--path` (ต้องใส่ positional), `native-function-pseudocode` ไม่รับ `--name` (ต้องใช้ `--function`) — เป็น note เชิง ergonomics ของ Craft 0.3.0 ที่ควรจำ
6. หลักฐานแต่ละข้อมี `evidence id` กำกับ: Craft `ev_cc1b9908…` (overview), REA `ev_a4f1dbdd…` (mach-o) — ตรวจซ้ำได้ด้วยการรันคำสั่งเดิม

---

**ไฟล์ที่เกี่ยวข้อง:** เอกสารนี้ (`craft-anything-install-plan.md`) · clone ชั่วคราว `.tmp-craft-anything/` และไฟล์ดาวน์โหลด
ถูกย้ายไป `FrostNovaWorkspace/To_Delete/2026-11-03-agent-ad1b8188/` (กู้คืนได้ ยังไม่ได้ลบถาวร)
