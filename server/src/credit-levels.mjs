// Credits are the energy units actually charged for a successful DM. They are never charged again at a level-up.
export const DEFAULT_LEVEL_COSTS = [100, 200, 300, 400];
export const DEFAULT_ADULT_LEVELS = [false, false, false, false, false];
export const validLevelCosts = v => Array.isArray(v) && v.length === 4 && v.every(n => Number.isSafeInteger(n) && n >= 1 && n <= 100000);
export const validAdultLevels = v => Array.isArray(v) && v.length === 5 && v.every(n => typeof n === 'boolean');
export const usesCreditLevels = def => def?.relationship?.creditProgression?.mode === 'credits';
export function creditConfig(def) {
  const c = def?.relationship?.creditProgression;
  const costs = validLevelCosts(c?.costs) ? [...c.costs] : [...DEFAULT_LEVEL_COSTS];
  return { costs, version: 'credits-v1:' + costs.join(','), adultLevels: validAdultLevels(c?.adultLevels) ? c.adultLevels : DEFAULT_ADULT_LEVELS };
}
export function creditLevel(spent, costs) {
  let threshold = 0, level = 1;
  for (const cost of costs) { threshold += cost; if (spent >= threshold) level++; }
  return level;
}
export const levelScore = level => (Math.min(5, Math.max(1, level)) - 1) * 20;
export function creditProgress(def, row, legacyLevel = 1) {
  if (!usesCreditLevels(def)) return null;
  const current = creditConfig(def);
  let costs = current.costs;
  try { const saved = JSON.parse(row?.costs_json || 'null'); if (validLevelCosts(saved)) costs = saved; } catch {}
  const spent = row?.credits_spent || 0;
  const level = Math.max(row?.level || legacyLevel, creditLevel(spent, costs));
  const nextAt = level < 5 ? costs.slice(0, level).reduce((a, b) => a + b, 0) : null;
  return { mode: 'credits', creditsSpent: spent, costs, version: row?.config_version || current.version, level,
    nextLevelAt: nextAt, creditsRemaining: nextAt === null ? 0 : Math.max(0, nextAt - spent),
    adultAllowed: current.adultLevels[level - 1] === true };
}
export async function readCreditProgress(env, userId, creatorId, def, legacyLevel = 1) {
  if (!usesCreditLevels(def)) return null;
  const row = await env.DB.prepare('SELECT * FROM chat_credit_progress WHERE user_id=? AND creator_id=?').bind(userId, creatorId).first();
  return creditProgress(def, row, creatorId.startsWith('cosp_') ? legacyLevel : 1);
}
export function nextCreditProgress(def, progress) {
  return creditProgress(def, { credits_spent: progress.creditsSpent + 1, level: progress.level,
    costs_json: JSON.stringify(progress.costs), config_version: progress.version });
}
// These statements MUST share the D1 transaction that stores the assistant reply and its receipt.
export function creditProgressStatement(env, userId, creatorId, progress, now) {
  return env.DB.prepare(`INSERT INTO chat_credit_progress(user_id,creator_id,credits_spent,level,costs_json,config_version,updated_at)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,creator_id) DO UPDATE SET credits_spent=excluded.credits_spent,
    level=MAX(chat_credit_progress.level,excluded.level),updated_at=excluded.updated_at`)
    .bind(userId, creatorId, progress.creditsSpent, progress.level, JSON.stringify(progress.costs), progress.version, now);
}
