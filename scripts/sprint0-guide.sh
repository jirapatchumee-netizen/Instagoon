#!/usr/bin/env bash
# Sprint 0 guide: เดินทีละขั้นกับเจ้าของงาน
# - ไม่อ่าน ไม่แสดง และไม่ส่งค่า secret ใด ๆ (ตรวจแค่ว่า "มี" หรือ "ไม่มี")
# - รันซ้ำได้ตลอด: แต่ละขั้นตรวจสภาพจริงก่อน ไม่ทำสิ่งที่เสร็จแล้วซ้ำ
# - ไม่แตะ production ไม่ deploy
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP="$ROOT/apps/Instagoon"
WORKER="$APP/worker"
DEV_VARS="$WORKER/.dev.vars"
PERSIST=/tmp/instagoon-local-staging
PORT=8799
STAGING_CONFIG="wrangler.staging.toml"

say() { printf '\n\033[1m%s\033[0m\n%s\n' "$1" "$2"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
no()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }
info(){ printf '  · %s\n' "$1"; }
hold() { printf '\n\033[33mกด Enter เมื่อเสร็จเพื่อตรวจซ้ำ\033[0m ' && read -r; }

wr() { (cd "$WORKER" && npx --yes wrangler "$@"); }

# staging secrets: names only
staging_has_secret() {
  wr secret list --config "$STAGING_CONFIG" 2>/dev/null | grep -q "\"name\": \"$1\""
}

dev_vars_ready() {
  [ -f "$DEV_VARS" ] && grep -qE '^GEMINI_API_KEY=..*' "$DEV_VARS"
}

dev_vars_ignored() { (cd "$ROOT" && git check-ignore -q "$DEV_VARS"); }

local_db_ready() { ls "$PERSIST"/state_D1_SQLITE_db_instagoon-local-staging.sqlite >/dev/null 2>&1; }

server_up() { curl -s -o /dev/null --max-time 3 "http://127.0.0.1:$PORT/privacy.html"; }

# PUBLIC_ORIGIN ของ staging อ่านจาก config เพื่อไม่ให้ hardcode
staging_origin() { grep -E '^PUBLIC_ORIGIN' "$WORKER/$STAGING_CONFIG" | sed -E 's/.*= *"([^"]*)".*/\1/'; }

# ตรวจ login จากสภาพจริง ไม่ใช่จาก secret list:
# wrangler secret list ไม่แสดง plain var (GOOGLE_CLIENT_ID ถูกตั้งเป็น var บน dashboard)
# และ wrangler.staging.toml ตั้ง keep_vars = true เพื่อไม่ให้ var นั้นหายตอน deploy
# หลักฐานที่ถูกต้องคือ: /auth/google ต้อง 302 ไป accounts.google.com (ถ้า 503 = ยังไม่ configured)
staging_signin_configured() {
  local origin code loc
  origin="$(staging_origin)"
  [ -n "$origin" ] || return 1
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$origin/auth/google")
  loc=$(curl -s -o /dev/null -w '%{redirect_url}' --max-time 20 "$origin/auth/google")
  [ "$code" = "302" ] && printf '%s' "$loc" | grep -q 'accounts.google.com'
}

# -----------------------------------------------------------------------------
say "STEP 1 — Gemini key บน staging (เจ้าของทำ)" "
ต้องตรวจ staging worker: npx wrangler secret list --config wrangler.staging.toml
สคริปต์จะพิมพ์เฉพาะชื่อ ไม่พิมพ์ค่า"

if staging_has_secret GEMINI_API_KEY; then
  ok "GEMINI_API_KEY อยู่บน staging แล้ว"
else
  no "ยังไม่พบ GEMINI_API_KEY บน staging"
  info 'รันใน terminal: cd apps/Instagoon/worker && npx wrangler secret put GEMINI_API_KEY --config wrangler.staging.toml'
  info 'แล้ววางค่า key ตามที่มันถาม (ค่าไม่ถูกเก็บใน shell history เพราะอ่านจาก stdin แบบซ่อน)'
  hold
  staging_has_secret GEMINI_API_KEY && ok "ผ่าน" || { no "ยังไม่พบ — ค้างไว้ก่อนไปข้อ 2 ไม่ได้"; exit 1; }
fi

# -----------------------------------------------------------------------------
say "STEP 2 — staging sign-in (ตรวจจากของจริง ไม่ต้องทำอะไรแล้ว)" "
staging.mjs:16 ต้องมี GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + STAGING_EMAILS ให้ครบ
ข้อสังเกตที่คนมักพลาด: GOOGLE_CLIENT_ID ถูกตั้งเป็น plain var บน Cloudflare dashboard
ซึ่ง 'wrangler secret list' ไม่แสดง และ wrangler.staging.toml ตั้ง keep_vars = true
เพื่อให้ var อยู่รอดหลัง deploy — วิธีตรวจเดียวที่เชื่อได้คือยิง /auth/google แล้วดู code"

if staging_signin_configured; then
  ok "/auth/google ตอบ 302 ไป accounts.google.com → sign-in configured แล้ว ข้ามขั้นนี้"
  info 'อย่ารัน "wrangler secret put GOOGLE_CLIENT_ID" — ชื่อ binding ถูกใช้อยู่แล้ว จะเจอ error 10053'
else
  no "/auth/google ยังไม่ 302 ไป accounts.google.com (น่าจะเป็น 503 = ยังไม่ configured)"
  info 'ทางแก้: ตั้ง GOOGLE_CLIENT_ID เป็น Variables ใน Cloudflare Workers → instagoon-staging → Settings → Variables'
  info '(หรือ npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.staging.toml ถ้าชื่อนี้ยังว่างจริง)'
  info 'ค่าเอาจาก Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs'
  hold
  staging_signin_configured && ok "ผ่าน" || { no "ยังไม่ผ่าน"; exit 1; }
fi

# -----------------------------------------------------------------------------
say "STEP 3 — .dev.vars ในเครื่อง (เจ้าของทำ) สำหรับตรวจชื่อโมเดล" "
สคริปต์นี้จะเรียก Gemini จริงจากเครื่องคุณผ่าน worker ตัวเดียวกับที่ deploy
ไฟล์นี้ต้องถูก gitignore เสมอ เพราะ repo เป็นสาธารณะ"

if ! dev_vars_ignored; then
  no ".dev.vars ยังไม่ถูก ignore — อันตราย"
  info 'เพิ่มสองบรรทัดใน .gitignore: .dev.vars และ .dev.vars.* แล้ว commit'
  exit 1
fi
ok ".dev.vars ถูก ignore แล้ว (git check-ignore ผ่าน)"

if [ ! -f "$DEV_VARS" ]; then
  (umask 077; printf 'GEMINI_API_KEY=\n' > "$DEV_VARS")
  info "สร้างแม่แบบ $DEV_VARS ให้แล้ว (สิทธิ์ 600, ค่าว่าง)"
fi

if dev_vars_ready; then
  ok "มี GEMINI_API_KEY ใน .dev.vars แล้ว"
else
  no "ค่าใน .dev.vars ยังว่าง"
  info 'เปิดใส่ค่าเอง (ห้ามวางคีย์ในแชท):'
  info "  ${EDITOR:-vi} $DEV_VARS"
  info 'หรือ: open -e '"$DEV_VARS"
  hold
  dev_vars_ready && ok "ผ่าน" || { no "ยังว่าง"; exit 1; }
fi

# -----------------------------------------------------------------------------
say "STEP 4 — build player + local D1 (คนละงาน: FrostNova ทำในแชท)" "
คำสั่งที่ต้องใช้ (ตาม worker/LOCAL_STAGING.md):
  pnpm --dir apps/Instagoon build
  cd apps/Instagoon/worker && npx wrangler d1 migrations apply instagoon-local-staging --local \\
     --config wrangler.local-staging.toml --persist-to $PERSIST"
local_db_ready && ok "local D1 มี schema แล้ว" || no "local D1 ยังไม่มี schema (รัน 2 คำสั่งข้างบน หรือบอกผมในแชท)"

# -----------------------------------------------------------------------------
say "STEP 5 — ตรวจชื่อโมเดลที่ repo อ้าง (FrostNova ทำ)" "
โมเดลที่โค้ดใช้จริง: gemini-2.5-flash, gemini-3.1-flash-lite, gemini-3.5-flash-lite (index.mjs:543-547)
โมเดลที่ /api/dev/test-models ตั้งเป็น default (index.mjs:259-264): gemini-3-flash-preview, gemini-3-flash,
gemini-2.5-flash, gemini-2.0-flash, gemini-2-flash, gemini-flash-latest
และ fallback ของ knowledge rewrite (index.mjs:640) ใช้ชื่อที่ 4: gemini-2.5-flash-lite
วิธี: รัน wrangler dev บน 127.0.0.1:$PORT → GET /auth/demo (admin เฉพาะ localhost) → POST /api/dev/test-models"

if server_up; then
  ok "worker รันอยู่ที่ 127.0.0.1:$PORT แล้ว"
else
  no "ยังไม่มี worker บน 127.0.0.1:$PORT"
  info 'รัน: cd apps/Instagoon/worker && npx wrangler dev --local --config wrangler.local-staging.toml --persist-to '"$PERSIST"' --ip 127.0.0.1 --port '"$PORT"
  info 'หรือบอกผมในแชทให้รันให้ (ผมจะยิง curl ให้เอง)'
  exit 0
fi

if server_up; then
  say "STEP 6 — รันตรวจ (เจ้าของกด Enter ให้ผม หรือผมทำในแชท)" "
เมื่อ worker ขึ้นแล้ว บอกผมในแชทว่า 'พร้อมแล้ว' — ผมจะ
  1) GET /auth/demo เก็บ cookie (ไม่แสดงค่า cookie)
  2) POST /api/dev/test-models ทั้งสองชุดชื่อ
  3) จดผลจริงลง docs/INSTAGOON_MODEL_CHECK_$(date +%Y-%m-%d).md
  4) แก้รายการทั้งสามจุดใน index.mjs ให้ตรงกัน แล้วรัน worker tests ซ้ำ"
fi
