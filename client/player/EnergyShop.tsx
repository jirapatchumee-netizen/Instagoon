import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import jsQR from 'jsqr';
import { ArrowLeft, BadgeCheck, Check, Copy, Paperclip, Zap } from 'lucide-react';

// The shop is a scripted chat bot: every bot line is derived from server state (/api/shop and the
// order), and the player only answers with buttons. No AI, no free text: the server decides what
// a pack costs, what amount to transfer and whether energy is credited. The payment card shows
// only what the order carries; the player never types or confirms an amount in the chat.

type Energy = { free: number; purchased: number; diamonds: number; nextRefillAt: number | null };
type Product = { sku: string; name: string; priceSatang: number; energy: number; diamonds?: number; purchasedToday?: boolean };
type Order = { id: string; sku: string; priceSatang: number; amountSatang: number; energy: number; diamonds?: number; status: 'pending' | 'paid' | 'expired' | 'refunded' | 'revoked'; expiresAt: number; payTo: PayTo | null };
type PayTo = { bank: string; accountNo: string; accountName: string };
type ShopInfo = { enabled: boolean; blocked?: boolean; ageConfirmed?: boolean; purchasedToday?: boolean; purchasedSkusToday?: string[]; diamonds?: number; nextAvailableAt?: number; products: Product[]; openOrder?: Order | null };
type Msg = { id: number; from: 'bot' | 'me'; text?: string; card?: boolean; image?: string };
type Stage = 'loading' | 'closed' | 'age' | 'pick' | 'busy' | 'pay' | 'done';

const TEXT = {
  th: {
    name: 'Instagoon Shop',
    sub: 'บอทเติม Energy อัตโนมัติ',
    hello: 'สวัสดีค่ะ 👋 ที่นี่เติม Energy ได้ด้วยการโอนเงินจากแอปธนาคารไหนก็ได้ แต่ละแพ็กเติมได้วันละ 1 ครั้งค่ะ',
    closed: 'ตอนนี้ร้านยังปิดอยู่ค่ะ ลองใหม่ภายหลังนะคะ',
    blocked: 'บัญชีนี้ถูกระงับการเติมเงิน เนื่องจากไม่พบยอดเงินเข้าตามสลิปที่ส่งมา หากเป็นความผิดพลาด ติดต่อทีมงานได้เลยค่ะ',
    limit: (at: string) => `วันนี้เติมครบทุกแพ็กแล้วค่ะ เติมได้อีกครั้งตั้งแต่ ${at} เป็นต้นไป`,
    diamondsInfo: (d: number, e: number) => `💎 คุณมีแต้มสะสม ${d} เพชร (แลกได้ ${e} ⚡ · อัตรา 10 เพชร = 1 Energy)`,
    exchangeBtn: (d: number, e: number) => `💎 แลก ${d} เพชร → +${e} ⚡`,
    exchangeDone: (d: number, e: number) => `แลกแต้มสำเร็จค่ะ! ใช้ ${d} 💎 ได้รับ +${e} ⚡ เรียบร้อยค่ะ 🎉`,
    ageAsk: 'ก่อนซื้อครั้งแรก ขอยืนยันว่าคุณอายุ 20 ปีบริบูรณ์ขึ้นไป และรับทราบว่า Energy ใช้ได้ในเกมเท่านั้น แลกคืนเป็นเงินไม่ได้ค่ะ',
    ageYes: 'ยืนยัน ฉันอายุ 20 ปีขึ้นไป',
    pickAsk: 'เลือกแพ็กที่ต้องการได้เลยค่ะ ⚡',
    pack: (p: Product) => `฿${p.priceSatang / 100} → ${p.energy} ⚡${p.diamonds ? ` (+${p.diamonds} 💎)` : ''}`,
    packBought: '(วันนี้ซื้อแล้ว)',
    picked: (p: Product) => `ขอแพ็ก ฿${p.priceSatang / 100} ค่ะ`,
    howTo: 'โอนตามยอดในการ์ดให้ตรงทุกสตางค์ (สตางค์ท้ายคือรหัสของรายการคุณ) แล้วกด "ส่งสลิป" ได้เลยค่ะ',
    cardTitle: (o: Order) => `แพ็ก ${o.priceSatang / 100} บาท · ${o.energy} Energy${o.diamonds ? ` · ${o.diamonds} 💎` : ''}`,
    toPay: 'ยอดที่ต้องโอน',
    exact: 'โอนให้ตรงทุกสตางค์',
    copyAmount: 'คัดลอกยอด',
    copyAccount: 'คัดลอกเลขบัญชี',
    copied: 'คัดลอกแล้ว',
    orderNo: (id: string) => `ออเดอร์ #${id}`,
    expiresIn: (s: string) => `หมดเวลาใน ${s}`,
    status: { pending: 'รอโอน', paid: 'เติมแล้ว ✓', expired: 'หมดเวลา', refunded: 'คืนเงินแล้ว', revoked: 'ยกเลิก' } as Record<Order['status'], string>,
    expired: 'รายการนี้หมดเวลาแล้วค่ะ ถ้ายังไม่ได้โอน เลือกแพ็กใหม่ได้เลย ถ้าโอนไปแล้ว ไม่ต้องห่วง ระบบจะเติมให้หลังตรวจยอดเงินเข้าค่ะ',
    sendSlip: 'ส่งสลิป',
    change: 'เปลี่ยนแพ็ก',
    reading: 'กำลังอ่านสลิป…',
    noQr: 'อ่าน QR บนสลิปไม่เจอค่ะ ส่งรูปสลิปเต็มใบจากแอปธนาคาร (ไม่ครอบตัด ไม่ถ่ายจากหน้าจอ) อีกครั้งนะคะ',
    paid: (n: number, d?: number) => `ได้รับสลิปแล้ว ✅ เติม +${n} ⚡${d ? ` และได้รับแต้มสะสม +${d} 💎` : ''} เรียบร้อยค่ะ ขอบคุณนะคะ`,
    back: 'กลับไปเล่นต่อ',
    errors: {
      slip_unreadable: 'QR บนสลิปไม่ถูกต้องค่ะ ลองส่งรูปสลิปต้นฉบับอีกครั้ง',
      slip_already_used: 'สลิปนี้ถูกใช้ไปแล้วค่ะ',
      order_expired: 'รายการนี้หมดอายุแล้วค่ะ ถ้าโอนไปแล้ว ระบบจะเติมให้หลังตรวจยอดเงินเข้า',
      too_many_slip_attempts: 'ส่งสลิปเกินจำนวนครั้งแล้วค่ะ ถ้าโอนไปแล้ว ระบบจะเติมให้หลังตรวจยอดเงินเข้า',
      daily_limit_reached: 'แพ็กนี้วันนี้เติมไปแล้วค่ะ ลองเลือกแพ็กอื่นนะคะ',
      insufficient_diamonds: 'เพชรสะสมไม่เพียงพอสำหรับการแลกค่ะ (ขั้นต่ำ 10 เพชร)',
      shop_busy: 'ตอนนี้มีคนเติมพร้อมกันเยอะ ลองใหม่ในอีกสักครู่นะคะ',
      shop_blocked: 'บัญชีนี้ถูกระงับการเติมเงินค่ะ',
      shop_unavailable: 'ร้านปิดชั่วคราวค่ะ',
    } as Record<string, string>,
    generic: 'ขออภัย เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะคะ',
  },
  en: {
    name: 'Instagoon Shop',
    sub: 'Energy top-up bot',
    hello: 'Hi 👋 Top up Energy here with a bank transfer from any Thai banking app. Each pack can be purchased once per day.',
    closed: 'The shop is closed right now. Please try again later.',
    blocked: 'Top-ups are suspended for this account because a slip had no matching bank deposit. Contact us if this is a mistake.',
    limit: (at: string) => `You have purchased all packs today. You can top up again from ${at}.`,
    diamondsInfo: (d: number, e: number) => `💎 You have ${d} diamonds (redeemable for ${e} ⚡ · 10 diamonds = 1 Energy)`,
    exchangeBtn: (d: number, e: number) => `💎 Redeem ${d} diamonds → +${e} ⚡`,
    exchangeDone: (d: number, e: number) => `Redeemed! Used ${d} 💎 to get +${e} ⚡ 🎉`,
    ageAsk: 'Before your first purchase, please confirm you are 20 or older and understand Energy is for in-game use only and cannot be exchanged for money.',
    ageYes: 'I confirm I am 20+',
    pickAsk: 'Pick a pack ⚡',
    pack: (p: Product) => `฿${p.priceSatang / 100} → ${p.energy} ⚡${p.diamonds ? ` (+${p.diamonds} 💎)` : ''}`,
    packBought: '(Bought today)',
    picked: (p: Product) => `The ฿${p.priceSatang / 100} pack, please`,
    howTo: 'Transfer the exact amount on the card (the satang identify your order), then tap "Send slip".',
    cardTitle: (o: Order) => `฿${o.priceSatang / 100} pack · ${o.energy} Energy${o.diamonds ? ` · ${o.diamonds} 💎` : ''}`,
    toPay: 'Amount to transfer',
    exact: 'Transfer the exact amount, satang included',
    copyAmount: 'Copy amount',
    copyAccount: 'Copy account no.',
    copied: 'Copied',
    orderNo: (id: string) => `Order #${id}`,
    expiresIn: (s: string) => `Expires in ${s}`,
    status: { pending: 'Awaiting transfer', paid: 'Credited ✓', expired: 'Expired', refunded: 'Refunded', revoked: 'Cancelled' } as Record<Order['status'], string>,
    expired: 'This order has expired. If you have not paid, pick a pack again. If you already paid, you will be credited once the deposit is checked.',
    sendSlip: 'Send slip',
    change: 'Change pack',
    reading: 'Reading the slip…',
    noQr: 'No QR found on the slip. Send the full slip image from your banking app (not cropped, not a photo of a screen).',
    paid: (n: number, d?: number) => `Slip received ✅ +${n} ⚡${d ? ` and +${d} 💎 added` : ''}. Thank you!`,
    back: 'Back to the game',
    errors: {
      slip_unreadable: 'The slip QR is not valid. Try the original slip image.',
      slip_already_used: 'This slip was already used.',
      order_expired: 'This order expired. If you already paid, you will be credited once the deposit is checked.',
      too_many_slip_attempts: 'Too many attempts. If you already paid, you will be credited once the deposit is checked.',
      daily_limit_reached: 'This pack has already been purchased today. Please choose another pack.',
      insufficient_diamonds: 'Not enough diamonds to redeem (minimum 10 diamonds).',
      shop_busy: 'Many players are topping up right now. Try again in a moment.',
      shop_blocked: 'Top-ups are suspended for this account.',
      shop_unavailable: 'The shop is temporarily closed.',
    } as Record<string, string>,
    generic: 'Something went wrong. Please try again.',
  },
};

const baht = (satang: number) => `฿${(satang / 100).toFixed(2)}`;
// What a banking app accepts when pasted: no ฿, no comma, no dashes.
const plainAmount = (satang: number) => (satang / 100).toFixed(2);
const accountLabel = (no: string) => no.replace(/^(\d{3})(\d)(\d{5})(\d)$/, '$1-$2-$3-$4');

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data && typeof data.error === 'string' ? data.error : `http_${res.status}`);
  return data as T;
}

// Slip QR codes are small; try a downscaled pass first (fast), then full resolution.
async function readSlipQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  for (const max of [1600, 4096]) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
    if (found?.data) return found.data;
    if (scale === 1) break;
  }
  return null;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function EnergyShop({ lang, onClose, onEnergy }: { lang: string; onClose: () => void; onEnergy: (energy: Energy) => void }) {
  const t = lang === 'th' ? TEXT.th : TEXT.en;
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [diamonds, setDiamonds] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState('');

  const say = (from: Msg['from'], body: Omit<Msg, 'id' | 'from'>) => setMsgs((list) => [...list, { id: nextId.current++, from, ...body }]);
  const explain = (e: unknown) => say('bot', { text: t.errors[e instanceof Error ? e.message : ''] || t.generic });
  const until = (at?: number) => (at ? new Date(at).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

  const showOrder = (o: Order) => {
    setOrder(o);
    say('bot', { card: true, text: t.howTo });
    setStage('pay');
  };

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) {
      try {
        element.showModal();
      } catch (err) {
        console.error('showModal error:', err);
      }
    }
    say('bot', { text: t.hello });
    call<ShopInfo>('/api/shop')
      .then((s) => {
        setInfo(s);
        const userDiamonds = s.diamonds ?? 0;
        setDiamonds(userDiamonds);
        if (!s.enabled) return (say('bot', { text: t.closed }), setStage('closed'));
        if (s.blocked) return (say('bot', { text: t.blocked }), setStage('closed'));
        if (s.openOrder?.payTo) return showOrder(s.openOrder);
        if (userDiamonds >= 10) {
          say('bot', { text: t.diamondsInfo(userDiamonds, Math.floor(userDiamonds / 10)) });
        }
        if (s.purchasedToday) return (say('bot', { text: t.limit(until(s.nextAvailableAt)) }), setStage('closed'));
        if (!s.ageConfirmed) return (say('bot', { text: t.ageAsk }), setStage('age'));
        say('bot', { text: t.pickAsk });
        setStage('pick');
      })
      .catch(() => (say('bot', { text: t.closed }), setStage('closed')));
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, stage]);

  useEffect(() => {
    if (stage !== 'pay' || !order) return;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= order.expiresAt) {
        window.clearInterval(timer);
        setOrder({ ...order, status: 'expired' });
        say('bot', { text: t.expired });
        say('bot', { text: t.pickAsk });
        setStage('pick');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, order]);

  function confirmAge() {
    say('me', { text: t.ageYes });
    setInfo((s) => (s ? { ...s, ageConfirmed: true } : s));
    say('bot', { text: t.pickAsk });
    setStage('pick');
  }

  async function choose(p: Product) {
    if (p.purchasedToday) return;
    say('me', { text: t.picked(p) });
    setStage('busy');
    try {
      const res = await call<{ order: Order }>('/api/shop/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sku: p.sku, requestId: crypto.randomUUID(), confirmAge20: true }),
      });
      showOrder(res.order);
    } catch (e) {
      explain(e);
      const code = e instanceof Error ? e.message : '';
      setStage(code === 'shop_blocked' ? 'closed' : 'pick');
    }
  }

  async function exchangeDiamonds() {
    const exchangeable = Math.floor(diamonds / 10) * 10;
    if (exchangeable < 10) return;
    say('me', { text: t.exchangeBtn(exchangeable, Math.floor(exchangeable / 10)) });
    setStage('busy');
    try {
      const res = await call<{ ok: boolean; exchangedDiamonds: number; energyGained: number; energy: Energy }>('/api/shop/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ diamonds: exchangeable }),
      });
      onEnergy(res.energy);
      setDiamonds(res.energy.diamonds ?? 0);
      say('bot', { text: t.exchangeDone(res.exchangedDiamonds, res.energyGained) });
      setStage(info?.purchasedToday ? 'done' : 'pick');
    } catch (e) {
      explain(e);
      setStage(info?.purchasedToday ? 'done' : 'pick');
    }
  }

  async function sendSlip(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !order) return;
    say('me', { image: URL.createObjectURL(file) });
    setStage('busy');
    const slipQr = await readSlipQr(file).catch(() => null);
    if (!slipQr) {
      say('bot', { text: t.noQr });
      setStage('pay');
      return;
    }
    try {
      const res = await call<{ order: Order; energy: Energy }>(`/api/shop/orders/${order.id}/slip`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slipQr }),
      });
      onEnergy(res.energy);
      setDiamonds(res.energy.diamonds ?? 0);
      setInfo((s) => s ? {
        ...s,
        diamonds: res.energy.diamonds,
        purchasedSkusToday: [...(s.purchasedSkusToday || []), order.sku],
        products: s.products.map(p => p.sku === order.sku ? { ...p, purchasedToday: true } : p)
      } : s);
      // The server drops the account once paid; keep it so the card stays and just shows "credited".
      setOrder((o) => ({ ...res.order, payTo: res.order.payTo ?? o?.payTo ?? null }));
      say('bot', { text: t.paid(res.order.energy, res.order.diamonds) });
      setStage('done');
    } catch (err) {
      explain(err);
      const code = err instanceof Error ? err.message : '';
      setStage(code === 'order_expired' || code === 'too_many_slip_attempts' ? 'closed' : 'pay');
    }
  }

  async function copy(what: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied((c) => (c === what ? '' : c)), 1500);
    } catch {
      setCopied('');
    }
  }

  function changePack() {
    say('me', { text: t.change });
    setOrder(null);
    say('bot', { text: t.pickAsk });
    setStage('pick');
  }

  // One card per order, always drawn from the current order, so its status changes in place.
  const cardId = [...msgs].reverse().find((m) => m.card)?.id;

  return (
    <dialog
      ref={ref}
      className="fs-overlay"
      aria-label={t.name}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <section className="fs-shopchat">
        <header className="fs-shopchat-head">
          <button type="button" className="fs-shopchat-back" onClick={onClose} aria-label="back">
            <ArrowLeft size={22} />
          </button>
          <span className="fs-shopchat-avatar" aria-hidden="true"><Zap size={18} /></span>
          <div>
            <strong>{t.name} <BadgeCheck size={14} className="fs-shopchat-verified" /></strong>
            <span>{t.sub}</span>
          </div>
          {diamonds > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
              💎 {diamonds}
            </span>
          )}
        </header>

        <div className="fs-shopchat-list" ref={listRef} aria-live="polite">
          {msgs.map((m) => (
            <div key={m.id} className={`fs-shopchat-row is-${m.from}`}>
              <div className="fs-shopchat-bubble">
                {m.card && m.id === cardId && order?.payTo && (
                  <div className={`fs-paycard is-${order.status}`}>
                    <div className="fs-paycard-head"><Zap size={14} /> {t.cardTitle(order)} <span className="fs-paycard-status">{t.status[order.status]}</span></div>
                    <span className="fs-paycard-label">{t.toPay}</span>
                    <div className="fs-paycard-row">
                      <strong className="fs-paycard-amount">{baht(order.amountSatang)}</strong>
                      <button type="button" onClick={() => void copy('amount', plainAmount(order.amountSatang))}>
                        {copied === 'amount' ? <Check size={14} /> : <Copy size={14} />} {copied === 'amount' ? t.copied : t.copyAmount}
                      </button>
                    </div>
                    <span className="fs-paycard-warn">⚠ {t.exact}</span>
                    <span className="fs-paycard-label">{order.payTo.bank}</span>
                    <div className="fs-paycard-row">
                      <strong className="fs-paycard-account">{accountLabel(order.payTo.accountNo)}</strong>
                      <button type="button" onClick={() => void copy('account', order.payTo!.accountNo)}>
                        {copied === 'account' ? <Check size={14} /> : <Copy size={14} />} {copied === 'account' ? t.copied : t.copyAccount}
                      </button>
                    </div>
                    <span>{order.payTo.accountName}</span>
                    <small className="fs-paycard-foot">
                      {t.orderNo(order.id.slice(0, 6).toUpperCase())}
                      {stage === 'pay' && order.status === 'pending' && ` · ${t.expiresIn(clock(order.expiresAt - now))}`}
                    </small>
                  </div>
                )}
                {m.image && <img className="fs-shopchat-slip" src={m.image} alt="slip" />}
                {m.text && <p>{m.text}</p>}
              </div>
            </div>
          ))}
          {(stage === 'loading' || stage === 'busy') && (
            <div className="fs-shopchat-row is-bot">
              <div className="fs-shopchat-bubble fs-shopchat-typing" aria-label={t.reading}><i /><i /><i /></div>
            </div>
          )}
        </div>

        <footer className="fs-shopchat-replies">
          {stage === 'age' && <button type="button" onClick={confirmAge}>{t.ageYes}</button>}
          {stage === 'pick' && (
            <>
              {info?.products.map((p) => (
                <button
                  type="button"
                  key={p.sku}
                  disabled={p.purchasedToday}
                  className={p.purchasedToday ? 'is-disabled' : undefined}
                  onClick={() => !p.purchasedToday && void choose(p)}
                >
                  {t.pack(p)} {p.purchasedToday ? t.packBought : ''}
                </button>
              ))}
              {diamonds >= 10 && (
                <button type="button" className="is-diamond" onClick={() => void exchangeDiamonds()}>
                  {t.exchangeBtn(Math.floor(diamonds / 10) * 10, Math.floor(diamonds / 10))}
                </button>
              )}
            </>
          )}
          {stage === 'closed' && diamonds >= 10 && (
            <button type="button" className="is-diamond" onClick={() => void exchangeDiamonds()}>
              {t.exchangeBtn(Math.floor(diamonds / 10) * 10, Math.floor(diamonds / 10))}
            </button>
          )}
          {stage === 'pay' && (
            <>
              <button type="button" className="is-primary" onClick={() => fileRef.current?.click()}><Paperclip size={15} /> {t.sendSlip}</button>
              <button type="button" onClick={changePack}>{t.change}</button>
            </>
          )}
          {(stage === 'done' || stage === 'closed') && <button type="button" className="is-primary" onClick={onClose}>{t.back}</button>}
        </footer>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void sendSlip(e)} />
      </section>
    </dialog>
  );
}
