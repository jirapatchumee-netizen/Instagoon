import { z } from 'zod';
export const Dimensions = ['closeness', 'trust', 'romance'] as const;
export type Dimension = typeof Dimensions[number];
const text = z.string().max(12000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const asset = z.string().regex(/^(|(assets|avatars|rewards|posts)\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif))$/);
export const ScoresSchema = z.object({ closeness: z.number().min(0).max(100), trust: z.number().min(0).max(100), romance: z.number().min(0).max(100) }).strict();
export const RuleSchema = z.object({ id, name: text.min(1), description: text, kind: z.enum(['semantic', 'keyword']), keywords: z.array(z.string().min(1).max(200)).max(50), positiveExamples: text, negativeExamples: text, changes: z.object({ closeness: z.number().min(-100).max(100), trust: z.number().min(-100).max(100), romance: z.number().min(-100).max(100) }).strict(), cooldown: z.number().int().min(0).max(10000), maxUses: z.number().int().min(0).max(10000), locked: z.boolean().optional() }).strict();
export const ConditionSchema = z.object({ field: z.enum(['level', 'closeness', 'trust', 'romance', 'event', 'turns']), value: z.number().min(0).max(100000), eventId: z.string().max(100) }).strict();
export const RewardSchema = z.object({ id, name: text.min(1), asset, caption: text, message: text, conditions: z.array(ConditionSchema).min(1).max(30) }).strict();
export const KnowledgeEntrySchema = z.object({ id, title:z.string().min(1).max(200), aliases:z.array(z.string().min(1).max(200)).max(30), content:z.string().min(1).max(4000), source:z.string().max(1000).refine(v=>!v||/^https?:\/\//i.test(v),'ที่มาต้องเป็น URL http หรือ https'), checkedAt:z.string().max(30) }).strict();
export const NpcObjectSchema = z.object({
  schemaVersion: z.literal('1.0'), id, name: text.min(1).max(120), handle: z.string().min(1).max(100), tagline: text, avatar: asset, color: z.string().regex(/^#[a-fA-F0-9]{6}$/), tags: z.array(z.string().max(80)).max(30), age: text, biography: text, personality: text, world: text, occupation: text, likes: text, dislikes: text, goals: text, immutableFacts: z.array(text).max(100), knowledgeBoundary: text,
  secrets: z.array(z.object({ id, content: text, minLevel: z.number().int().min(1).max(5) }).strict()).max(100), initialMemories: z.array(text).max(100),
  knowledge:z.array(KnowledgeEntrySchema).max(100).optional(), knowledgeEnabled:z.boolean().optional(), webSearchEnabled:z.boolean().optional(),
  style: z.object({ language: text, pronouns: text, tone: text, length: z.enum(['short', 'medium', 'long']), emoji: z.enum(['none', 'some', 'often']), examples: text, fallback: text.min(1), levelStyles: z.array(text).length(5) }).strict(),
  relationship: z.object({ weights: ScoresSchema, thresholds: z.array(z.number().min(0).max(100)).length(5), romanceEnabled: z.boolean() }).strict(), rules: z.array(RuleSchema).max(100), rewards: z.array(RewardSchema).max(100),
}).strict();
export const NpcSchema = NpcObjectSchema.superRefine((npc, ctx) => {
  const { thresholds, weights, romanceEnabled } = npc.relationship;
  if (thresholds[0] !== 0 || thresholds.some((v, i) => i > 0 && v <= thresholds[i - 1])) ctx.addIssue({ code: 'custom', path: ['relationship', 'thresholds'], message: 'เกณฑ์ Lv ต้องเริ่มที่ 0 และเพิ่มขึ้นตามลำดับ' });
  if (weights.closeness + weights.trust + (romanceEnabled ? weights.romance : 0) <= 0) ctx.addIssue({ code: 'custom', path: ['relationship', 'weights'], message: 'น้ำหนักที่เปิดใช้งานต้องมากกว่า 0' });
  for (const key of ['rules', 'rewards', 'secrets'] as const) if (new Set(npc[key].map(x => x.id)).size !== npc[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'ID ซ้ำกัน' });
  for (const [i, reward] of npc.rewards.entries()) for (const condition of reward.conditions) if (condition.field === 'event' && !npc.rules.some(r => r.id === condition.eventId)) ctx.addIssue({ code: 'custom', path: ['rewards', i], message: 'เงื่อนไขอ้างถึงเหตุการณ์ที่ไม่มีอยู่' });
});
export type NpcDefinition = z.infer<typeof NpcSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type Reward = z.infer<typeof RewardSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export function newNpc(npcId: string = crypto.randomUUID()): NpcDefinition {
  return NpcSchema.parse({ schemaVersion: '1.0', id: npcId, name: 'ตัวละครใหม่', handle: 'new.idol', tagline: 'ทุกบทสนทนา เริ่มต้นเรื่องราวใหม่', avatar: '', color: '#b18bf4', tags: [], age: '', biography: '', personality: '', world: 'โลกปัจจุบัน บนโซเชียลมีเดีย IG Idol', occupation: '', likes: '', dislikes: '', goals: '', immutableFacts: [], knowledgeBoundary: 'รู้เฉพาะข้อมูลตัวเองและสิ่งที่ผู้เล่นเคยบอก ห้ามแต่งข้อเท็จจริงเกี่ยวกับผู้เล่น', secrets: [], initialMemories: [], style: { language: 'ไทย', pronouns: 'เรา / คุณ', tone: 'เป็นธรรมชาติ อบอุ่น', length: 'short', emoji: 'some', examples: '', fallback: 'ขอคิดแป๊บหนึ่งนะ… เล่าเรื่องของคุณต่อได้ไหม', levelStyles: ['สุภาพ ยังไม่คุ้นเคย', 'เริ่มคุยสบายขึ้น', 'เป็นกันเองและจำเรื่องที่คุยกันได้', 'ไว้ใจและเปิดใจมากขึ้น', 'สนิทสนม ใช้ภาษาตามบุคลิกของตัวเอง'] }, relationship: { weights: { closeness: 40, trust: 40, romance: 20 }, thresholds: [0,20,40,60,80], romanceEnabled: true }, rules: [], rewards: [] });
}
