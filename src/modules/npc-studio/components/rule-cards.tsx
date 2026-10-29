'use client';

import { useRef, useState } from 'react';
import { AlertDialog, Dialog } from 'radix-ui';
import { Check, ChevronRight, Clock3, LockKeyhole, Plus, Sparkles, Trash2, UnlockKeyhole, X } from 'lucide-react';
import { Dimensions, dimensionLabels, newRule, RuleSchema } from '../lib/npc/schema.ts';
import type { Reward, Rule } from '../lib/npc/schema.ts';
import { Field, NumberField } from './editor-fields.tsx';

export function RuleCards({rules,rewards,onChange}:{rules:Rule[];rewards:Reward[];onChange:(rules:Rule[])=>void}) {
  const [editing,setEditing] = useState<{rule:Rule;isNew:boolean}|null>(null);
  const [deletingId,setDeletingId] = useState<string|null>(null);
  const [error,setError] = useState('');
  const returnFocus = useRef<HTMLButtonElement|null>(null);
  const addButton = useRef<HTMLButtonElement|null>(null);
  const deleting = rules.find(rule => rule.id === deletingId);
  const references = rewards.filter(reward => reward.conditions.some(condition => condition.field === 'event' && condition.eventId === deletingId));
  const patch = (change:Partial<Rule>) => setEditing(current => current ? {...current,rule:{...current.rule,...change}} : current);
  const closeEditor = () => {setEditing(null);setError('');};
  const restoreFocus = (event:Event) => {
    event.preventDefault();
    const target = returnFocus.current?.isConnected ? returnFocus.current : addButton.current;
    target?.focus();
  };
  function apply() {
    if (!editing) return;
    const rule = {...editing.rule,name:editing.rule.name.trim(),keywords:editing.rule.keywords.map(word => word.trim()).filter(Boolean)};
    const parsed = RuleSchema.safeParse(rule);
    if (!parsed.success) {setError('กรุณากรอกชื่อเหตุการณ์ และตรวจคะแนนให้อยู่ระหว่าง −100 ถึง 100 รวมถึงจำนวนรอบและจำนวนครั้งให้เป็นจำนวนเต็ม 0–10000');return;}
    onChange(editing.isNew ? [...rules,parsed.data] : rules.map(current => current.id === rule.id ? parsed.data : current));
    closeEditor();
  }
  function remove() {
    // Check current data again even if a confirmation dialog is already open.
    if (!deleting || deleting.locked || references.length) return;
    onChange(rules.filter(rule => rule.id !== deleting.id));
    setDeletingId(null);
  }
  return <>
    <div className="panel-heading"><span className="section-index">02</span><div><h2>กฎเฉพาะตัว <span className="rule-count">{rules.length}</span></h2><p>กดการ์ดเพื่อแก้ไข · ล็อกเพื่อป้องกันการลบ</p></div><button ref={addButton} className="button small secondary" onClick={event=>{returnFocus.current=event.currentTarget;setError('');setEditing({rule:newRule(),isNew:true});}}><Plus/>เพิ่มกฎ</button></div>
    {!rules.length && <div className="empty-inline">ยังไม่มีกฎ เพิ่มเหตุการณ์ที่ทำให้ตัวละครเปิดใจหรือถอยห่าง</div>}
    <div className="rule-card-grid">{rules.map((rule,index)=><article className={'rule-summary-card '+(rule.locked?'is-locked':'')} key={rule.id}>
      <div className="rule-card-top"><span className="rule-number">RULE {String(index+1).padStart(2,'0')}</span>{rule.locked&&<span className="rule-lock-badge"><LockKeyhole/>ล็อกการลบ</span>}<div className="rule-card-actions">
        <button className={'icon-button '+(rule.locked?'lock-active':'')} aria-label={(rule.locked?'ปลดล็อกกฎ ':'ล็อกกฎ ')+rule.name} aria-pressed={Boolean(rule.locked)} title={rule.locked?'ปลดล็อกเพื่อให้ลบได้':'ล็อกเพื่อป้องกันการลบ'} onClick={()=>onChange(rules.map(current=>current.id===rule.id?{...current,locked:!current.locked}:current))}>{rule.locked?<LockKeyhole/>:<UnlockKeyhole/>}</button>
        <button className="icon-button danger-hover" aria-label={'ลบกฎ '+rule.name} disabled={Boolean(rule.locked)} title={rule.locked?'ปลดล็อกกฎก่อนลบ':'ลบกฎ'} onClick={event=>{returnFocus.current=event.currentTarget;setDeletingId(rule.id);}}><Trash2/></button>
      </div></div>
      <button className="rule-card-open" aria-label={'แก้ไขกฎ '+rule.name} onClick={event=>{returnFocus.current=event.currentTarget;setError('');setEditing({rule:structuredClone(rule),isNew:false});}}>
        <span className="rule-kind">{rule.kind==='semantic'?<Sparkles/>:<span className="keyword-mark">#</span>}{rule.kind==='semantic'?'AI ตีความหมาย':'คำสำคัญตรงตัว'}</span>
        <strong className="rule-card-title">{rule.name}</strong>
        <span className="rule-card-description">{rule.description||'ยังไม่มีคำอธิบายเงื่อนไข'}</span>
        <span className="rule-score-list">{Dimensions.filter(dimension=>rule.changes[dimension]!==0).map(dimension=><span key={dimension} className={'rule-score '+(rule.changes[dimension]<0?'negative':'positive')}>{dimensionLabels[dimension]} <b>{rule.changes[dimension]>0?'+':''}{rule.changes[dimension]}</b></span>)}{Dimensions.every(dimension=>rule.changes[dimension]===0)&&<span className="rule-score neutral">บันทึกเหตุการณ์ · ไม่เปลี่ยนคะแนน</span>}</span>
        <span className="rule-card-limits"><span><Clock3/>{rule.cooldown?`เว้น ${rule.cooldown} รอบ`:'รับคะแนนได้ทุกรอบ'}</span><span>{rule.maxUses?`สูงสุด ${rule.maxUses} ครั้ง / ผู้เล่น`:'ไม่จำกัดครั้ง'}</span></span>
        <span className="rule-card-edit">แก้ไขกฎ <ChevronRight/></span>
      </button>
    </article>)}</div>
    <p className="field-note rule-save-hint">การล็อกป้องกันเฉพาะการลบ ยังแก้ไขกฎได้ · กด “บันทึกตัวละคร” เพื่อเก็บการเปลี่ยนแปลง</p>

    <Dialog.Root open={Boolean(editing)} onOpenChange={open=>{if(!open)closeEditor();}}>
      <Dialog.Portal><Dialog.Overlay className="rule-modal-overlay"/><Dialog.Content className="rule-modal rule-edit-modal" onCloseAutoFocus={restoreFocus} onPointerDownOutside={event=>event.preventDefault()}>
        <div className="rule-modal-heading"><div><span className="eyebrow">RELATIONSHIP RULE</span><Dialog.Title>{editing?.isNew?'เพิ่มกฎเฉพาะตัว':'แก้ไขกฎเฉพาะตัว'}</Dialog.Title><Dialog.Description>กำหนดเหตุการณ์และผลต่อความสัมพันธ์ของตัวละคร</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="ปิดหน้าต่างแก้ไขกฎ"><X/></Dialog.Close></div>
        {editing&&<form onSubmit={event=>{event.preventDefault();apply();}}>
          <div className="rule-modal-body"><div className="form-grid">
            <Field label="ชื่อเหตุการณ์ *" value={editing.rule.name} onChange={name=>patch({name})}/>
            <label className="field"><span>วิธีตรวจ</span><select value={editing.rule.kind} onChange={event=>patch({kind:event.target.value as Rule['kind']})}><option value="semantic">AI ตีความหมาย</option><option value="keyword">คำสำคัญตรงตัว</option></select></label>
            <Field label="คำอธิบายเงื่อนไข" value={editing.rule.description} onChange={description=>patch({description})} multiline/>
            {editing.rule.kind==='keyword'&&<Field label="คำสำคัญ (หนึ่งคำต่อบรรทัด)" value={editing.rule.keywords.join('\n')} onChange={value=>patch({keywords:value.split('\n')})} multiline/>}
            <Field label="ตัวอย่างที่เข้าเงื่อนไข" value={editing.rule.positiveExamples} onChange={positiveExamples=>patch({positiveExamples})} multiline/>
            <Field label="ตัวอย่างที่ไม่เข้าเงื่อนไข" value={editing.rule.negativeExamples} onChange={negativeExamples=>patch({negativeExamples})} multiline/>
          </div><div className="subsection-heading"><h3>คะแนนเมื่อเข้าเงื่อนไข</h3></div><div className="form-grid thirds">{Dimensions.map(dimension=><NumberField key={dimension} min={-100} label={'เพิ่ม/ลด '+dimensionLabels[dimension]} value={editing.rule.changes[dimension]} onChange={value=>patch({changes:{...editing.rule.changes,[dimension]:value}})}/>)}</div>
          <div className="subsection-heading"><h3>การรับคะแนนซ้ำ</h3></div><div className="form-grid"><NumberField label="เว้นกี่รอบก่อนรับคะแนนซ้ำ" max={10000} value={editing.rule.cooldown} onChange={cooldown=>patch({cooldown})}/><NumberField label="จำนวนครั้งสูงสุด (0 = ไม่จำกัด)" max={10000} value={editing.rule.maxUses} onChange={maxUses=>patch({maxUses})}/></div>
          {editing.rule.locked&&<p className="rule-modal-lock-note"><LockKeyhole/>กฎนี้ล็อกการลบอยู่ การแก้ไขจะคงสถานะล็อกไว้</p>}
          {error&&<p className="rule-form-error" role="alert">{error}</p>}</div>
          <div className="rule-modal-footer"><span>กดบันทึกตัวละครอีกครั้งเพื่อเก็บข้อมูล</span><div><Dialog.Close asChild><button type="button" className="button secondary">ยกเลิก</button></Dialog.Close><button type="submit" className="button primary"><Check/>{editing.isNew?'เพิ่มกฎ':'ใช้การแก้ไข'}</button></div></div>
        </form>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>

    <AlertDialog.Root open={Boolean(deleting)} onOpenChange={open=>{if(!open)setDeletingId(null);}}>
      <AlertDialog.Portal><AlertDialog.Overlay className="rule-modal-overlay"/><AlertDialog.Content className="rule-modal rule-delete-modal" onCloseAutoFocus={restoreFocus}>
        <span className="rule-delete-icon"><Trash2/></span><AlertDialog.Title>ลบกฎนี้จริงหรือไม่?</AlertDialog.Title>
        <AlertDialog.Description>กฎ “{deleting?.name}” จะถูกนำออกจากตัวละคร เมื่อบันทึกแล้วจะเรียกคืนผ่านหน้านี้ไม่ได้</AlertDialog.Description>
        {!!references.length&&<p className="rule-form-error" role="alert">กฎนี้ยังใช้เป็นเงื่อนไขของภาพพิเศษ: {references.map(reward=>reward.name).join(', ')} กรุณาแก้เงื่อนไขภาพเหล่านั้นก่อนลบกฎ</p>}
        {deleting?.locked&&<p className="rule-form-error">กฎนี้ถูกล็อกไว้ กรุณาปลดล็อกก่อนลบ</p>}
        <div className="rule-delete-actions"><AlertDialog.Cancel asChild><button className="button secondary">ยกเลิก</button></AlertDialog.Cancel><button className="button rule-delete-confirm" disabled={Boolean(deleting?.locked)||Boolean(references.length)} onClick={remove}><Trash2/>ยืนยันลบกฎ</button></div>
      </AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  </>;
}
