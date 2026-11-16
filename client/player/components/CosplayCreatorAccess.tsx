import { useState, useEffect, useCallback } from 'react';
import { Sparkles, TrendingUp, Mail, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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

interface AccountEmailResponse {
  email: string;
  pendingEmail: string | null;
  history?: Array<{ email: string; firstSeenAt: number; lastSeenAt: number }>;
}

export function CosplayCreatorAccess({ lang, unlocked, creatorUid, analyticsOrigin, onOpenStudio, onUnlocked }: Props) {
  const t = TRANSLATIONS[lang];
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Email Move Management State
  const [emailInfo, setEmailInfo] = useState<AccountEmailResponse | null>(null);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEmailInfo = useCallback(async () => {
    try {
      const res = await api<AccountEmailResponse>('/api/account/email');
      setEmailInfo(res);
      if (res.pendingEmail) {
        setShowEmailSection(true);
      }
    } catch {
      // not critical if fails
    }
  }, []);

  useEffect(() => {
    void fetchEmailInfo();
  }, [fetchEmailInfo]);

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

  const mapEmailError = (errCode: string): string => {
    switch (errCode) {
      case 'invalid_email':
        return t.emailErrInvalidEmail;
      case 'same_email':
        return t.emailErrSameEmail;
      case 'email_taken':
        return t.emailErrTaken;
      case 'too_many_attempts':
        return t.emailErrTooMany;
      case 'invalid_code':
        return t.emailErrInvalidCode;
      case 'expired':
        return t.emailErrExpired;
      case 'email_transport_missing':
        return t.emailErrTransport;
      default:
        return t.emailErrGeneric;
    }
  };

  const requestEmailCode = async () => {
    if (!newEmail.trim()) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await api<{ ok?: boolean; error?: string; devCode?: string }>('/api/account/email/request', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (res.error) {
        setEmailMsg({ type: 'error', text: mapEmailError(res.error) });
      } else {
        const hint = t.emailCodeSentHint.replace('{email}', newEmail.trim());
        setEmailMsg({ type: 'success', text: hint + (res.devCode ? ` [DEV: ${res.devCode}]` : '') });
        await fetchEmailInfo();
      }
    } catch (e: unknown) {
      const err = e as { error?: string };
      setEmailMsg({ type: 'error', text: mapEmailError(err?.error || '') });
    } finally {
      setEmailBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!verifyCode.trim()) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await api<{ ok?: boolean; error?: string; email?: string }>('/api/account/email/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      if (res.error) {
        setEmailMsg({ type: 'error', text: mapEmailError(res.error) });
      } else {
        setEmailMsg({ type: 'success', text: t.emailMoveSuccess });
        setVerifyCode('');
        setNewEmail('');
        await fetchEmailInfo();
      }
    } catch (e: unknown) {
      const err = e as { error?: string };
      setEmailMsg({ type: 'error', text: mapEmailError(err?.error || '') });
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#15151f] p-3.5">
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

      {/* Account Email Management Section */}
      <div className="mt-2 border-t border-white/5 pt-2.5">
        <button
          type="button"
          onClick={() => setShowEmailSection((prev) => !prev)}
          className="flex w-full items-center justify-between text-left text-[11px] font-medium text-zinc-300 hover:text-white"
        >
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-zinc-400" /> {t.emailMoveTitle}
            {emailInfo?.pendingEmail && (
              <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                {t.emailPendingBadge}
              </span>
            )}
          </span>
          {showEmailSection ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
        </button>

        {showEmailSection && (
          <div className="mt-2 space-y-2 rounded-lg bg-black/20 p-2.5 text-xs">
            {emailInfo?.email && (
              <div className="flex items-center justify-between text-[10.5px] text-zinc-400">
                <span>{t.emailCurrent}:</span>
                <span className="font-mono text-zinc-200">{emailInfo.email}</span>
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-zinc-500">{t.emailMoveDesc}</p>

            {emailInfo?.pendingEmail ? (
              <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                <p className="text-[10.5px] text-amber-200">
                  {t.emailPendingBadge}: <span className="font-mono font-bold text-amber-100">{emailInfo.pendingEmail}</span>
                </p>
                <div className="flex gap-2">
                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder={t.emailCodePlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-zinc-100"
                  />
                  <button
                    type="button"
                    disabled={emailBusy || !verifyCode.trim()}
                    onClick={() => void verifyEmailCode()}
                    className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {t.emailVerifyBtn}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Request New Email Form */}
            <div className="flex gap-2 pt-1">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t.emailNewPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <button
                type="button"
                disabled={emailBusy || !newEmail.trim()}
                onClick={() => void requestEmailCode()}
                className="rounded-lg border border-white/10 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
              >
                {t.emailSendCodeBtn}
              </button>
            </div>

            {emailMsg && (
              <div
                className={`flex items-start gap-1.5 rounded-lg p-2 text-[10.5px] ${
                  emailMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                {emailMsg.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{emailMsg.text}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
