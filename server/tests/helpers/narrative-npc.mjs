// Minimal synthetic test data; never included in the published content bundle.
import { newNpc } from '../../../packages/contracts/npc/schema.ts';

export function narrativeNpc() {
  const npc = newNpc('narrative-tester');
  npc.name = 'นัท';
  npc.age = '24';
  npc.userRole = 'ผู้ใหญ่ที่เพิ่งเริ่มทำความรู้จัก ยังไม่ได้ตกลงคบกัน';
  npc.style.pronouns = 'กู/มึงในบทพูด บรรยายด้วยชื่อหรือเธอ';
  npc.style.length = 'long';
  npc.style.emoji = 'none';
  npc.secrets = [{ id: 'test-secret', content: 'ความลับสำหรับทดสอบเท่านั้น', minLevel: 5 }];
  const quote = 'ลองคบกับกูไหม ถ้าหิวกูทำข้าวให้ได้';
  npc.narrative = {
    enabled: true, courtshipStyle: 'competitive',
    openingLocation: { id: 'test-cafeteria', name: 'โรงอาหารทดสอบ', description: 'โต๊ะว่างข้างหน้าต่าง' },
    openingActivity: 'นั่งคุย', openingGoal: 'ทำความรู้จักอีกฝ่าย',
    opening: { innerThought: 'อยากรู้ว่าจะคุยกันถูกคอไหม', beats: [
      { kind: 'action', text: 'นัทนั่งลงที่โต๊ะ' },
      { kind: 'dialogue', text: 'กูนัท มีเรื่องอยากชวนมึงคุย' },
      { kind: 'dialogue', text: quote }
    ], offer: { kind: 'romance', quote } }
  };
  return npc;
}
