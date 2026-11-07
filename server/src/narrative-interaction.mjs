// Conservative, grounded turn hints. These are not an exhaustive Thai intent classifier.
// Object-specific refusals must not become a global rejection. Ambiguity asks for clarification.
const clean = (value, max = 180) => typeof value === 'string' ? value.replace(/[\[\]<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
const kinds = ['food', 'travel', 'romance', 'topic', 'challenge'];
export function normalizeOffer(value) {
  const quote = clean(value?.quote);
  return kinds.includes(value?.kind) && quote ? { kind: value.kind, quote } : null;
}
export function readInteraction(value) {
  return { romancePaused: value?.romancePaused === true, conversationPaused: value?.conversationPaused === true,
    lastScope: ['none', 'food', 'travel', 'romance', 'conversation', 'offer', 'ambiguous'].includes(value?.lastScope) ? value.lastScope : 'none',
    pendingOffer: normalizeOffer(value?.pendingOffer) };
}

export function interpretNarrativeTurn(state, message) {
  const text = clean(message, 4000).toLowerCase();
  const previous = readInteraction(state.interaction);
  const quotedOrHypothetical = /^(?:ถ้า|สมมติ|คำว่า|เขา(?:บอก|พูด)ว่า)|ไม่ได้(?:บอก|พูด|หมายความ)ว่า/.test(text);
  const topicOnly = /(?:ไม่อยาก|ไม่ต้องการ|เลิก|หยุด|ไม่ต้อง)คุย(?:ต่อ)?(?:เรื่อง|เกี่ยวกับ|หัวข้อ)/.test(text);
  const noConversation = (!topicOnly && /ไม่(?:อยาก|ต้องการ)คุย|(?:หยุด|เลิก|ไม่ต้อง)คุย/.test(text)) ||
    /(?:อย่า|หยุด|เลิก|ไม่ต้อง)(?:มา)?(?:ทัก|ยุ่ง)|ขอ(?:อยู่เงียบ|อยู่คนเดียว|พักคุย)|leave me alone|stop (?:talking|messaging)/.test(text) || /^(?:หยุด|พอแล้ว|stop)[! .ๆนะครับค่ะ]*$/.test(text);
  const noRomance = /ไม่(?:อยาก|ต้องการ)(?:โดน|ให้(?:มึง|เธอ|คุณ|พี่|เชียร์|ใคร)?(?:มา)?)?จีบ|ไม่(?:ให้|อนุญาตให้)(?:มึง|เธอ|คุณ|พี่|เชียร์)?จีบ|(?:อย่า|หยุด|เลิก|ไม่ต้อง)(?:มา)?(?:จีบ|หยอด)|ไม่(?:อยากคบ|อยากเป็นแฟน|คบ|เป็นแฟน)|ยังไม่(?:พร้อมคบ|เป็นแฟน)/.test(text);
  const resumeRomance = /(?:จีบ|หยอด)(?:กู|ผม|เรา|ฉัน|หนู)?(?:ต่อได้|ได้(?:แล้ว|นะ)?|ต่อเลย)|กลับมาจีบ|อยากให้(?:มึง|เธอ|คุณ|พี่|เชียร์)?(?:มา)?จีบ/.test(text) && !noRomance && !noConversation;
  const noTravel = /ไม่(?:ไป|อยากไป|สะดวกไป|พร้อมไป)|อย่า(?:พา|ไป)|ยังไม่(?:ไป|พร้อมไป)/.test(text);
  const noFood = /ไม่(?:แดก|กิน|รับอาหาร)|ไม่เอา(?:ข้าว|อาหาร|ของกิน|จาน|เมนู)|(?:อย่า|หยุด|เลิก|ไม่ต้อง)(?:ชวน)?(?:กิน|แดก|เสนออาหาร)|กินไม่ลง|อิ่มแล้ว/.test(text);
  const preference = /ไม่กิน(?:เผ็ด|หวาน|เค็ม|เนื้อ|หมู|กุ้ง|ถั่ว)|แพ้(?:อาหาร|กุ้ง|ถั่ว|นม)/.test(text);
  const genericNo = /^(?:เออ\s*)?(?:ไม่เอา|ไม่ล่ะ|ไม่ละ|ไว้ก่อน|ไว้วันหลัง|ยังไม่|no\b)/.test(text);
  const explicitStop = /(?:อย่า|หยุด|เลิก|ไม่ต้อง)(?:มา)?(?:จีบ|หยอด|คุย)|ขออยู่(?:เงียบ|คนเดียว)/.test(text);
  const negativeQuestion = /เหรอ|หรือเปล่า|ใช่ไหม|จริงไหม|[?？]/.test(text) && /ไม่|หยุด|เลิก|อย่า/.test(text) && !explicitStop;
  const otherSuitors = /ไม่(?:อยาก|ต้องการ)ให้(?:ใคร|คนอื่น)(?:มา)?จีบ(?:มึง|เธอ|พี่|เชียร์|คุณ)/.test(text);
  let scope = 'none', intent = 'neutral';
  if ((quotedOrHypothetical && /ไม่|หยุด|เลิก|อย่า|no\b|stop/.test(text)) || negativeQuestion || otherSuitors) { scope = 'ambiguous'; intent = 'clarify'; }
  else if (noConversation) { scope = 'conversation'; intent = 'stop'; }
  else if (noRomance) { scope = 'romance'; intent = 'stop'; }
  else if (noTravel) { scope = 'travel'; intent = 'decline'; }
  else if (noFood || preference) { scope = 'food'; intent = preference ? 'preference' : 'decline'; }
  else if (topicOnly) { scope = 'offer'; intent = 'decline'; }
  else if (genericNo) {
    const kind = previous.pendingOffer?.kind || (state.pendingLocationId ? 'travel' : null);
    scope = ['food', 'travel', 'romance'].includes(kind) ? kind : kind ? 'offer' : 'ambiguous';
    intent = scope === 'ambiguous' ? 'clarify' : 'decline';
  }
  const romancePaused = scope === 'romance' || (previous.romancePaused && !resumeRomance);
  const conversationPaused = scope === 'conversation'; // A new player turn can resume a paused conversation.
  const preserveGoal = ['food', 'travel', 'offer', 'ambiguous'].includes(scope) && !romancePaused && !conversationPaused;
  const responseMove = conversationPaused ? 'acknowledge_and_pause' : romancePaused ? 'continue_without_courtship' :
    scope === 'ambiguous' ? 'clarify_the_object_without_escalating' : intent === 'preference' ? 'honor_preference_and_continue_current_offer' : preserveGoal ? 'acknowledge_specific_decline_then_change_tactic' : 'respond_and_advance_one_beat';
  const activeGoal = conversationPaused ? 'พักการสนทนาตามคำขอของผู้เล่น' : romancePaused ? 'คุยตามหัวข้อที่ผู้เล่นเลือกโดยไม่จีบ' :
    preserveGoal ? state.motivation || state.goal : state.goal;
  return { scope, intent, romancePaused, conversationPaused, resumeRomance: resumeRomance && !romancePaused,
    preserveGoal, activeGoal, responseMove, pendingOffer: previous.pendingOffer };
}

export function nextInteraction(state, turn, proposedOffer, npcReply) {
  const next = readInteraction(state.interaction);
  next.romancePaused = turn.romancePaused;
  next.conversationPaused = turn.conversationPaused;
  next.lastScope = turn.scope;
  const pending = next.pendingOffer;
  if (turn.conversationPaused || turn.romancePaused || (turn.intent === 'decline' &&
      (pending?.kind === turn.scope || (turn.scope === 'offer' && ['topic', 'challenge'].includes(pending?.kind))))) next.pendingOffer = null;
  const offer = normalizeOffer(proposedOffer);
  if (offer && clean(npcReply, 1000).includes(offer.quote) && !turn.conversationPaused &&
      !(turn.romancePaused && offer.kind === 'romance') && !(turn.intent === 'decline' && offer.kind === turn.scope)) next.pendingOffer = offer;
  return next;
}
