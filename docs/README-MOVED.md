# โฟลเดอร์นี้ถูกย้ายแล้ว (2026-11-02)

ที่เดิม `projects/Visual Novel` เคยปนกัน 3 อย่าง (เกม + VN ตัวเก่า + art pipeline และถูกใช้เป็น git repo)
ตอนนี้จัดใหม่เป็น:

| เนื้อหา | ที่อยู่ใหม่ | ขึ้น GitHub? |
|---|---|---|
| ตัวเกม Instagoon (player, worker, content, tests, build configs) + docs/ADR ที่เป็นกติกา | `../Instagoon` (git repo เดียวกับ github.com/jirapatchumee-netizen/Instagoon) | ใช่ |
| VN ตัวเก่า (`src/`, `games/overtime`, `public/art`, `index.html`, vite/tsconfig ตัวเก่า) | `../instagoon-workbench/legacy-visual-novel` | ไม่ |
| art / prompt pipeline (`art/`, `generated_prompts/`, `scripts/`, comfy `workflows/`) | `../instagoon-workbench/art-pipeline` | ไม่ |
| work log ของ agent (handoff, audit, eval report, dev plan) | `../instagoon-workbench/agent-worklog` | ไม่ |
| source reference / ภาพอ้างอิง / outputs / `.agents` | `../instagoon-workbench/{source-reference,outputs,agent-config}` | ไม่ |
| ประวัติ git ก่อนรื้อ (70 commits) | `../instagoon-workbench/_archive/legacy-repo.git` (mirror) + bundle ที่ `../../_restructure_backup_2026-11-02/` | ไม่ |

โฟลเดอร์ว่างนี้เหลือไว้เพื่อให้ session ที่ตั้ง cwd ไว้ที่นี่ไม่พัง — ไม่มี `.git` อยู่ในนี้ ห้าม commit ที่นี่
ถ้า agent ตัวไหนยังอ้าง path นี้ ให้อัปเดตไป `../Instagoon` (เกม) หรือ `../instagoon-workbench` (งานข้างหลัง)
