import { useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  unlocked: boolean;
  creatorUid: string | null;
  analyticsOrigin: string;
  onOpenStudio: () => void;
  onUnlocked: () => Promise<unknown>;
}

export function CosplayCreatorAccess({ lang, unlocked, creatorUid, analyticsOrigin, onOpenStudio, onUnlocked }: Props) {
  const t = TRANSLATIONS[lang];
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const redeem = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/studio/redeem', { method: 'POST', body: JSON.stringify({ token: token.trim() }) });
      setToken('');
      await onUnlocked();
    } catch {
      setError(t.studioTokenInvalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-[#15151f] p-3">
      <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-100">
        <Sparkles className="h-4 w-4 text-pink-400" /> {t.cosplayCreator}
      </h3>
      {unlocked ? (
        <>
          {creatorUid && (
            <p className="text-[10.5px] text-zinc-400">
              {t.studioCreatorUid}: <span className="select-all font-mono text-zinc-200">{creatorUid}</span>
            </p>
          )}
          <button
            type="button"
            onClick={onOpenStudio}
            className="w-full rounded-xl border border-pink-400/30 bg-pink-500/10 px-3.5 py-2.5 text-xs font-medium text-pink-200 transition active:scale-95"
          >
            {t.studioOpen}
          </button>
          {analyticsOrigin && (
            <a
              href={analyticsOrigin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[11px] text-zinc-300 hover:text-white"
            >
              <TrendingUp className="h-3.5 w-3.5 text-pink-400" /> {t.studioAnalyticsLink}
            </a>
          )}
        </>
      ) : (
        <>
          <p className="text-[10.5px] leading-relaxed text-zinc-400">{t.studioTokenHint}</p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t.studioTokenPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-100"
            />
            <button
              type="button"
              disabled={busy || !token.trim()}
              onClick={() => void redeem()}
              className="rounded-lg bg-pink-500 px-3 text-xs font-semibold text-white disabled:opacity-40"
            >
              {t.studioTokenUnlock}
            </button>
          </div>
          {error && <p className="text-[10.5px] text-rose-400">{error}</p>}
        </>
      )}
    </div>
  );
}
