import { useEffect, useState, useRef } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { type Lang, LANGS } from './i18n';

export function LangSelect({
  lang,
  onChange,
  className = 'fs-lang-toggle',
  short = false,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
  short?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LANGS.find(({ id }) => id === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fs-lang-select"
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <button
        type="button"
        className={`fs-lang-trigger ${className}`}
        aria-label="Language"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={12} aria-hidden="true" />
        <span lang={current.id}>{short ? current.label : current.name}</span>
        <ChevronDown size={12} aria-hidden="true" className="fs-lang-chevron" />
      </button>
      {open && (
        <div className="fs-lang-menu">
          {LANGS.map(({ id, label, name }) => (
            <button
              key={id}
              type="button"
              lang={id}
              aria-pressed={id === lang}
              onClick={() => {
                setOpen(false);
                if (id !== lang) onChange(id);
              }}
            >
              <span className="fs-lang-code">{label}</span>
              <span>{name}</span>
              {id === lang && <Check size={13} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
