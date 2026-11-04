# วิเคราะห์ + แผนติดตั้ง obra/superpowers
วันที่ตรวจสอบ: 2026-11-03 · Repo: https://github.com/obra/superpowers · รุ่นล่าสุด `v7.0.1` (release 2026-10-21, 7.0.1 = package.json/plugin.json ตรงกันทุก manifest ผ่าน `scripts/bump-version.sh`)

## 1) มันคืออะไร
- **Agentic skills framework + methodology** สำหรับ coding agent: เป็น plugin "ศูนย์ dependency" (Node/bash เท่านั้น, ไม่มี npm runtime dependency)
- องค์ประกอบจริงใน repo (tree 300 entries, blob รวม ~1.53 MB):
  - `skills/` — **15 SKILL.md** (~436 KB ทั้งโฟลเดอร์): brainstorming, writing-plans, executing-plans, subagent-driven-development, test-driven-development, systematic-debugging, verification-before-completion, requesting/receiving-code-review, using-git-worktrees, finishing-a-development-branch, dispatching-parallel-agents, diagnosing-superpowers, writing-skills, using-superpowers
  - `hooks/hooks.json` — hook เดียวที่ plugin มี: **SessionStart** matcher `startup|clear|compact` → เรียก `hooks/run-hook.cmd session-start`
  - กลไก bootstrap (อ่านจาก `hooks/session-start` ตัวจริง): สแกน `$0` หา plugin root, อ่าน `skills/using-superpowers/SKILL.md` (**3,192 bytes**), escape เป็น JSON, then พิมพ์ `hookSpecificOutput.additionalContext` (Claude) หรือ `additional_context` (Cursor) หรือ `additionalContext` (Copilot/Muse) ตาม env ที่ harness ตั้ง
  - **จุดตัดสินใจ:** SKILL.md นี้ **ไม่มี `context`/`disable-model-invocation`** ใน frontmatter → เมื่อเป็น plugin แล้วมันถูก hoist เข้า system prompt ทุก session (nearly free แต่ติดแน่)
  - รองรับ **15 harness** ใน README: Claude Code, Antigravity, Codex App/CLI, Cursor, Devin, Factory Droid, Gemini CLI, Copilot CLI, Grok, Kimi, OpenCode, Pi, **Qwen Code**, Hermes, Muse
- License MIT · 311k stars · active (pushed 2026-11-02)

## 2) เครื่องนี้คืออะไร (ตรวจจริงแล้ว)
| รายการ | ผลตรวจ |
|---|---|
| `claude` | **2.1.312** (`~/.local/bin/claude`) — plugin system ใช้งานได้ |
| `qwen` | **0.23.2** — `qwen extensions install` มีจริง, รองรับ git URL / local path / npm / claude marketplace + `--consent --ref --scope --auto-update` |
| `hermes` | มี (`~/.local/bin/hermes`) |
| `codex` `gemini` `cursor` `agy` `devin` `droid` `grok` `pi` `muse` | **ไม่มี** — ข้ามวิธีติดตั้งเหล่านั้นได้ |
| node / git / bash | v22.22.3 · Apple Git 2.39.5 · **bash 3.2.57** (hook ใช้ parameter expansion อย่างเดียว → เข้ากันได้) |
| access GitHub | ผ่าน HTTPS ทั้ง curl และ `git ls-remote` (ไม่ต้องมี credential) |

สถานะปัจจุบันก่อนติดตั้ง:
- Claude: marketplace ที่ setup แล้ว = `anthropic-plugin-directory` (built-in), `claude-plugins-official` (anthropics/claude-plugins-official), `mattpocock` · plugin ที่ enabled = `mattpocock-skills@mattpocock` v1.3.1 · **superpowers ยังไม่มี** (search ทั้ง `~/.claude` = 0 hits)
- Qwen: `qwen extensions list` → "No extensions installed", `~/.qwen/skills` ว่าง
- **Skill name collision = none** เทียบ superpowers 15 ชื่อกับ 95 โฟลเดอร์ใน `~/.claude/skills`

## 3) ทางเลือกแหล่งติดตั้ง (ยืนยันว่ามีจริงทั้งสองทาง)
- **A. Official Anthropic marketplace** — `claude-plugins-official` มี `superpowers` (ตรวจ marketplace.json: 315 plugins, มี superpowers) และคุณ **เพิ่ม marketplace นี้ไว้ในเครื่องแล้ว** → ติดตั้งได้ทันทีโดยไม่ต้อง add อะไร, ไม่ต้องรัน TUI
- **B. Superpowers marketplace** (`obra/superpowers-marketplace`) — ชี้ source ไป `https://github.com/obra/superpowers.git`; ให้ของแถมที่ official ไม่มี: `superpowers-chrome`, `elements-of-style`, `episodic-memory`, `superpowers-lab`, `claude-session-driver`, `private-journal-mcp`, `double-shot-latte`, และ `superpowers-dev` (ref `dev`) → เลือกข้อนี้เมื่ออยากได้ ecosystem
- **C. local checkout** (`git clone` + install จาก path) — pin commit ได้, อ่าน source ก่อน active, `qwen extensions link` ใช้ path เดียวกันได้ → เหมาะกับ "ตรวจก่อนติด"

**แนะนำ: A สำหรับ Claude Code (เร็ว, อัปเดตอัตโนมัติ) + C/Qwen-GitHub-URL สำหรับ Qwen Code; ถ้าอยากได้ companion plugins ค่อยสลับไป B ทีหลัง (ถอน A แล้ว add B ได้ ไม่ชนกัน)**

## 4) แผนติดตั้ง — Claude Code (runเป็นขั้นตอน, ตรวจผลทุกขั้น)
```bash
# 0) baseline (ตรวจซ้ำว่ายังไม่มี + จับ token cost ก่อน)
claude plugin list
claude plugin marketplace list

# 1) ติดตั้งจาก official marketplace ที่เครื่องมีอยู่แล้ว
claude plugin install superpowers@claude-plugins-official --json

# 2) ยืนยันการ install + ดู inventory/token cost
claude plugin list
claude plugin details superpowers

# 3) ปิด telemetry ของ vendor (logo on-demand จาก primeradiant.com)
#    ใส่ใน shell profile หรือ env ที่ Claude Code ใช้
export SUPERPOWERS_DISABLE_TELEMETRY=1

# 4) เปิด session ใหม่ แล้วรัน acceptance test ของโครงการ (จาก AGENTS.md)
#    พิมพ์:  Let's make a react todo list
#    ผ่าน = brainstorming skill โดน trigger ก่อนมีการเขียน code

# 5) ตรวจ hook ที่ถูก inject จริง (session-start ต้อง exit 0, ไม่มี error diagnostic)
```
อัปเดตภายหลัง: `claude plugin marketplace update claude-plugins-official` แล้ว install/`/plugin` ตามปกติ · ถอน: `claude plugin disable superpowers` แล้ว `claude plugin uninstall`/ลบจาก `enabledPlugins` ใน `~/.claude/settings.json`

## 5) แผนติดตั้ง — Qwen Code
```bash
qwen extensions install obra/superpowers --consent        # หรือ --ref v7.0.1 เพื่อ pin
qwen extensions list
qwen extensions update superpowers                        # ภายหลัง
```
- Qwen 0.23.2 อ่าน manifest แบบ Claude plugin ได้ (`install --help` ระบุ "or claude marketplace (marketplace-url:plugin-name)") แต่ **ต้อง verify เองว่า SessionStart bootstrap ถูก inject จริง** ใน Qwen — ถ้า hook ไม่ทำงานให้ fallback แบบ C: `git clone https://github.com/obra/superpowers.git ~/tools/superpowers && qwen extensions link ~/tools/superpowers`

## 6) ความเสี่ยงที่ต้องตัดสินใจก่อนติด (บนเครื่องนี้)
1. **ทับซ้อนกับ stack เดิม** — `~/.claude/skills` มี 95 ตัว incl. `poteto-mode`, `pstack`, `tdd`, `how`, `architect`, `principle-*` ที่ทำงานแนว process-first อยู่แล้ว; superpowers จะ inject bootstrap "ต้อง invoke skill ก่อนตอบ ทุกกรณี" ทุก session (incl. after compact) → เสี่ยง **skill ชิง trigger + token บวม** แม้ไม่มี collision ด้านชื่อไฟล์
2. **Cost ต่อ session** — bootstrap ~3.2 KB ต่อ session ใหม่/clear/compact ถาวร, + skill metadata 15 ตัว
3. **Workflow ของมันบังคับเข้า git worktree** (`using-git-worktrees` หลัง design approval) → ต้องมี git repo; ถ้าเอาแต่ debugging/TDD skills ก็ยังใช้ได้อิสระ
4. **brainstorming visual companion** เปิด local HTTP server (`127.0.0.1`, random high port, idle timeout 4h) และโหลดโลโก้จากเว็บ vendor → ปิด telemetry ได้, และอย่าเปิด `--host 0.0.0.0` นอกจากจำเป็น
5. **Fork/branch**: อย่าเผลอ install `superpowers-dev` (ref `dev`) เพื่อใช้งานจริง — ตัว released คือ `main`/tag
6. **contributing**: repo ไม่รับ PR จาก agent ที่ nobody ask (94% rejection) — ถ้าจะแก้ skill ต้อง fork/PR ตาม `.claude-plugin` conventions และรัน `tests/skill-size/test-skill-size.sh` (SKILL.md ห้ามเกิน 20,000 bytes)

## 7) ขั้นตอนปฏิบัติที่แนะนำ (เรียงตามความเสี่ยง)
1. ติด **Claude Code อย่างเดียวก่อน** (ข้อ 4.A) — 1 harness ต่อ 1 install, อย่าติดหลายตัวพร้อมกัน
2. รัน acceptance test ในโปรเจกต์ throwaway → ดู token cost จาก `claude plugin details`
3. ถ้า bootstrap ทำให้ skill เดิม (poteto-mode/pstack) เพี้ยน: `claude plugin disable superpowers` (กลับสถานะได้, ไม่ใช่ทาง delete) หรือกันไว้เฉพาะโปรเจกต์โดยติดตั้งแบบ project-scope / ไม่ใส่ใน global `enabledPlugins`
4. พอใจแล้วค่อยต่อ Qwen Code ด้วยคำสั่งข้อ 5, และ **copy เครื่องมือเดียวกันนี้ต้องเพิ่ม env `SUPERPOWERS_DISABLE_TELEMETRY=1` ใน shell profile ก่อน**
