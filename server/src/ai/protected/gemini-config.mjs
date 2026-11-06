// Owner-locked zone (ADR-0013). Values here decide which model answers and how; changing one changes
// every Creator's replies. Edits need the owner's go in the commit message; tests/protected-zone.test.mjs
// fails on any unapproved change.
const deepFreeze = value => { Object.values(value).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(value); };

export const ALLOWED_GEMINI_MODELS = Object.freeze([
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite'
]);
export const DEFAULT_LITE_MODEL = 'gemini-3.5-flash-lite';

export const SAFETY_SETTINGS = deepFreeze([
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
]);

// FNV-1a over the Chat Visit id picks a stable start index in the model group: every turn of one
// visit tries the same model first, while separate visits still spread evenly across the group.
export function modelsForVisit(pool, visitId) {
 let h = 2166136261;
 for(let i = 0; i < visitId.length; i++){ h ^= visitId.charCodeAt(i); h = Math.imul(h, 16777619); }
 const offset = (h >>> 0) % pool.length;
 return [...pool.slice(offset), ...pool.slice(0, offset)];
}

// A configured model outside the allowed group falls back to the default lite model.
export const pickLiteModel = configured => {
  const model = (configured || DEFAULT_LITE_MODEL).replace(/^models\//, '');
  return ALLOWED_GEMINI_MODELS.includes(model) ? model : DEFAULT_LITE_MODEL;
};

const thinkingFor = model => model.includes('2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {};

export const chatGenerationConfig = (model, responseSchema) => ({
  responseMimeType: 'application/json',
  responseSchema,
  maxOutputTokens: 1024,
  ...thinkingFor(model)
});
export const rewriteGenerationConfig = model => ({ responseMimeType: 'application/json', temperature: 0.7, ...thinkingFor(model) });
export const summaryGenerationConfig = model => ({ responseMimeType: 'application/json', maxOutputTokens: 1024, ...thinkingFor(model) });
