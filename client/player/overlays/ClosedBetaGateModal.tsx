import { useState } from 'react';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type Lang } from '../i18n';
import { Modal } from '../ui';

interface Props {
  lang: Lang;
  onUnlocked: () => Promise<unknown>;
}

export function ClosedBetaGateModal({ lang, onUnlocked }: Props) {
  const t = TRANSLATIONS[lang];
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/access/redeem', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() }),
      });
      setSuccess(true);
      await onUnlocked();
    } catch {
      setError(t.closedBetaInvalidToken);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal labelledBy="closed-beta-modal-title" onClose={() => {}}>
      <section className="w-full max-w-sm rounded-2xl border border-pink-500/30 bg-[#12121a] p-6 text-center shadow-2xl shadow-pink-500/10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-pink-500/30 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-400">
          <Lock className="h-7 w-7" />
        </div>

        <h2 id="closed-beta-modal-title" className="flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-white">
          <Sparkles className="h-5 w-5 text-pink-400" />
          {t.closedBetaTitle}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t.closedBetaDesc}</p>

        {success ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <span>{t.closedBetaSuccess}</span>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t.closedBetaTokenPlaceholder}
              autoComplete="off"
              spellCheck={false}
              data-autofocus
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
            />

            {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}

            <button
              type="button"
              disabled={busy || !token.trim()}
              onClick={() => void handleRedeem()}
              className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 transition active:scale-95 disabled:opacity-40"
            >
              {busy ? '...' : t.closedBetaUnlockBtn}
            </button>
          </div>
        )}
      </section>
    </Modal>
  );
}
