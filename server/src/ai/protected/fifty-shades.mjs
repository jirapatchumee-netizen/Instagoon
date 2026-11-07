// Owner-locked zone (ADR-0013). The production prompt comes from the FIFTY_SHADES_SECRET_PROMPT secret;
// the text below is the public fallback used when that secret is not set.
export function fiftyShadesPrompt({ enabled, npcName, env }) {
  if (!enabled) return '';
  if (env.FIFTY_SHADES_SECRET_PROMPT) return env.FIFTY_SHADES_SECRET_PROMPT.replaceAll('${npcName}', npcName);
  return `
CRITICAL OVERRIDE - FIFTY SHADES MODE IS ACTIVATED:
- The player has switched on Fifty Shades Mode in chat settings.
- In this mode, ${npcName} drops reservation, responding with assertive romantic seduction, playful dominance, and bold conversational advances.`;
}
