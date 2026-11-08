# Energy top-up (PromptPay + slip QR + daily KBank statement)

The shop is the "Instagoon Shop" chat bot (`client/player/EnergyShop.tsx`), opened from the ⚡ pill
or when energy runs out. It is scripted: the player answers with buttons only, and every amount
and credit decision comes from the Worker (`server/src/shop/`). No AI, no payment gateway fee.

## Player flow

1. First purchase only: confirm age 20+ (Thai Civil and Commercial Code s.19-21).
2. Pick a pack: ฿29 / ฿59 / ฿99, energy = price x 2 (58 / 118 / 198). One pack per Bangkok
   calendar day; refunded or revoked purchases still count.
3. The bot quotes the price plus a random satang tail, e.g. **฿29.64**, and shows a PromptPay QR
   locked to that exact amount. **Decided 2026-11-08, not implemented yet:** the QR is replaced by the bank
   name, account number and account name (KBank 177-1-50013-3, บจก. แมช มูฟ อัลฟ่า) with copy buttons; the
   player types the amount, so wrong amounts land in "เงินเข้าที่ไม่ตรงรายการใด". The tail is unique among live orders and stays reserved for 24 h
   after expiry, so a bank deposit identifies its order. The QR is valid for 30 minutes.
4. After paying, the player sends the slip image. The app reads the slip's mini QR (`jsqr`), the
   Worker checks its CRC and that the transaction reference was never used, then credits at once.

## Why a slip QR alone is not proof

Anyone can fabricate a slip or a slip QR. Crediting on the slip is optimistic; the bank statement
is the real check. The daily limit caps what one account can take before that check (one pack,
at most ฿99).

## Daily admin routine (about 2 minutes)

1. Export the KBank statement as CSV (K BIZ or K PLUS) covering the last day.
2. Open the game as an admin -> Profile -> "ตรวจยอดเติมเงิน" -> choose the file -> "ตรวจยอด".
3. The report shows:
   - **ยืนยัน**: slipped orders whose deposit was found (amount + time).
   - **เติมให้**: deposits for orders whose slip never arrived; credited automatically.
   - **ส่งสลิปแต่ไม่พบเงินเข้า**: suspects. Check once more in the bank app, then
     "ยกเลิก + ระงับ" takes the energy back and blocks the shop for that player.
   - **เงินเข้าที่ไม่ตรงรายการใด**: e.g. a rounded or wrong amount; handle by hand with
     `POST /api/admin/orders/:id/credit` (needs the bank reference) or a refund.
4. Uploading an overlapping statement again is safe: rows are de-duplicated by hash.

Matching window: deposit time between order creation − 10 min and slip time + 10 min (or up to
24 h after expiry for orders never slipped). Only deposits in the statement's span are judged.

## Configuration

| Var | Where | Value |
|---|---|---|
| `BANK_NAME` | `[vars]` or dashboard | `ธนาคารกสิกรไทย` |
| `BANK_ACCOUNT_NO` | `[vars]` or dashboard | `177-1-50013-3` (dashes optional; must be 10 digits) |
| `BANK_ACCOUNT_NAME` | `[vars]` or dashboard | `บจก. แมช มูฟ อัลฟ่า` |

| `REPORTS_API_TOKEN` | `wrangler secret` (never in a file) | Random key, 32+ characters, for the owner's agent |

Reports API (read-only, `Authorization: Bearer <REPORTS_API_TOKEN>`; returns 404 while the secret is unset):
`GET /api/reports/reports` (list of daily files), `GET /api/reports/reports/YYYY-MM-DD.txt` (the
nightly summary file), `GET /api/reports/daily?day=YYYY-MM-DD` (live summary + every payment's
amount and time), `GET /api/reports/daily.txt?month=YYYY-MM`. There is no admin page for these.

The shop reports itself closed until all three bank vars are set. They are shown to every player on the
payment card, so they are not secrets. `PROMPTPAY_ID` is no longer used.

## Before going live, verify against real data

- **KBank CSV layout**: `server/src/shop/statement.mjs` finds columns by Thai/English header names
  (วันที่, เวลา, ฝากเงิน / Date, Time, Deposit) and accepts BE or CE dates. Run one real export
  through the admin panel and compare with the bank app before relying on it.
- **Slip mini QR**: `server/src/shop/slipqr.mjs` follows the Bank of Thailand slip format
  (tag 00 = API id 000001 + bank code + reference, tag 51 = TH, tag 91 = CRC). Test slips from
  KBank, SCB, KTB, BBL and a TrueMoney transfer; a format a bank uses differently shows up as
  "อ่าน QR บนสลิปไม่เจอ" or `slip_unreadable`.
- Make one real ฿29 transfer on staging end to end, including the statement upload.

## Endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/api/shop` | player: catalog, daily state, open order |
| POST | `/api/shop/orders` `{sku, requestId, confirmAge20}` | player |
| POST | `/api/shop/orders/:id/slip` `{slipQr}` | player |
| GET | `/api/admin/orders[?status=]` | admin |
| POST | `/api/admin/orders/reconcile` (CSV body) | admin |
| POST | `/api/admin/orders/:id/credit` `{reason, transRef}` | admin |
| POST | `/api/admin/orders/:id/refund` `{reason}` | admin |
| POST | `/api/admin/orders/:id/revoke` `{reason}` | admin (unconfirmed orders only) |

## Accounting rule locked in (2026-11-08)

Pack prices ฿29/฿59/฿99 are **VAT-inclusive selling prices**: the system never adds 7% on top of what it
asks the player to pay. The daily document to accounting follows the accountant's template wording, but each
line is the **amount actually received** for that pack, satang tails included (the accountant confirmed tails
carry VAT; owner chose this layout 2026-11-08), e.g. 294.61 / 299.37 / 198.61 = ฿792.59, which equals the day's
KBank deposits. VAT is carved out of that document total: base = total × 100/107, VAT = total − base (round base
to 2 decimals, once per document). Nominal totals (`price_satang` × count) are kept for internal reports only.
Full spec, table/endpoint design and open questions:
`docs/ACCOUNTING_DAILY_CLOSE.md` (not implemented yet — the endpoints above are the current, ledger-only layer).
