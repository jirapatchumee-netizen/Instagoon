import { TRANSLATIONS, type Lang } from '../i18n';

export function AiReferenceField({ lang, value, onChange }: { lang: Lang; value: string; onChange: (value: string) => void }) {
  const t = TRANSLATIONS[lang];
  return <div className="space-y-2">
    <label htmlFor="studio-reference-biography" className="block text-[11px] font-semibold text-pink-300">{t.studioReferenceBiographyLabel}</label>
    <p id="studio-reference-biography-intro" className="text-[11px] leading-relaxed text-zinc-300">{t.studioReferenceBiographyIntro}</p>
    <textarea id="studio-reference-biography" value={value} onChange={e => onChange(e.target.value)} rows={6} maxLength={6000}
      aria-describedby="studio-reference-biography-intro studio-reference-biography-visibility studio-reference-biography-count"
      placeholder={t.studioReferenceBiographyPlaceholder} className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed resize-y"/>
    <div className="flex items-start justify-between gap-3 text-[10px] text-zinc-400">
      <p id="studio-reference-biography-visibility" className="leading-relaxed">{t.studioReferenceBiographyVisibility}</p>
      <span id="studio-reference-biography-count" className="shrink-0 tabular-nums">{value.length}/6000</span>
    </div>
    <details className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <summary className="cursor-pointer text-[11px] font-medium text-pink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400">{t.studioReferenceGuideTitle}</summary>
      <div className="pt-3 space-y-3 text-[11px] leading-relaxed text-zinc-300">
        <p>{t.studioReferenceGuideLead}</p>
        <ul className="list-disc pl-4 space-y-1.5">{t.studioReferenceGuideTopics.map(topic => <li key={topic}>{topic}</li>)}</ul>
        <div className="border-l-2 border-pink-400/40 pl-3 space-y-1">
          <p className="text-[10px] text-zinc-400">{t.studioReferenceExampleLabel}</p>
          <p>{t.studioReferenceExample}</p>
        </div>
      </div>
    </details>
  </div>;
}
