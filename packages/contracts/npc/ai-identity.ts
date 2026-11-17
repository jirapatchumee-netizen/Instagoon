export const AI_IDENTITY_LIMIT = 16000;
const text = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

// Only missing modern fields migrate. Clearing the new editor must never resurrect old text.
export function mergeAiIdentity(draft: Record<string, unknown>): string {
  if (draft.aiIdentity !== undefined) return text(draft.aiIdentity, AI_IDENTITY_LIMIT);
  const sections: Array<[string, string]> = [
    ['บุคลิกและการตอบ', text(draft.characterBrief, 6000)],
    ['ประวัติและข้อมูลอ้างอิง', text(draft.referenceBiography, 6000)],
    ['ข้อเท็จจริงที่ต้องรักษา', text(draft.immutableFacts, 2000)],
    ['เรื่องเบื้องหลัง', text(draft.secret, 1000)],
  ];
  return sections.filter(([, value]) => value).map(([label, value]) => `${label}\n${value}`).join('\n\n');
}
