import { useEffect, useState } from 'react';
import { LockKeyhole, Sparkles, Ticket, CheckCircle2 } from 'lucide-react';
import { GoogleG } from './InstagramIcons';
import { type Lang, TRANSLATIONS } from './i18n';
import { LangSelect } from './LangSelect';
import { api } from './api';
import './froststory.css';

interface CreatorPreviewMeta {
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  emoji: string;
  incoming: string;
  outgoing: string;
  secret: string;
  secretLock: string;
}


export function LoginScreen({
  t,
  lang,
  onSetLang,
  error,
}: {
  t: (typeof TRANSLATIONS)[Lang];
  lang: Lang;
  onSetLang: (lang: Lang) => void;
  error: string;
}) {
  const creatorPreviews: Record<string, CreatorPreviewMeta> = t.creatorPreviews;

  const [authError] = useState(() =>
    new URLSearchParams(window.location.search).get('auth_error')
  );

  const initialPathCreator = window.location.pathname.replace(/^\//, '').toLowerCase();
  const [selectedCreatorId] = useState<string | null>(() => {
    return creatorPreviews[initialPathCreator] ? initialPathCreator : null;
  });

  const [inviteToken, setInviteToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('token') || params.get('code') || params.get('invite');
    if (fromUrl) {
      const clean = fromUrl.trim();
      sessionStorage.setItem('instagoon_pending_token', clean);
      return clean;
    }
    return sessionStorage.getItem('instagoon_pending_token') || '';
  });

  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [tokenRole, setTokenRole] = useState<'player' | 'creator' | 'admin' | null>(null);

  const checkToken = async (tok: string) => {
    const clean = tok.trim();
    if (!clean) return;
    setTokenStatus('checking');
    try {
      const res = await api<{ ok: boolean; role?: 'player' | 'creator' | 'admin' }>('/api/access/check', {
        method: 'POST',
        body: JSON.stringify({ token: clean }),
      });
      if (res.ok) {
        setTokenStatus('valid');
        setTokenRole(res.role || 'player');
        sessionStorage.setItem('instagoon_pending_token', clean);
      } else {
        setTokenStatus('invalid');
      }
    } catch {
      setTokenStatus('invalid');
    }
  };

  useEffect(() => {
    if (inviteToken) {
      void checkToken(inviteToken);
    }
  }, []);

  useEffect(() => {
    if (authError) window.history.replaceState(null, '', window.location.pathname);
  }, [authError]);

  useEffect(() => {
    const creator = selectedCreatorId || 'general';
    if (typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'view_creator_preview', {
        creator_id: creator,
        page_path: window.location.pathname
      });
    }
  }, [selectedCreatorId]);

  const handleLoginClick = () => {
    if (inviteToken.trim()) {
      sessionStorage.setItem('instagoon_pending_token', inviteToken.trim());
    }
    if (typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'click_login_cta', {
        creator_id: selectedCreatorId || 'general',
        page_path: window.location.pathname
      });
    }
  };

  const activePreview = selectedCreatorId ? creatorPreviews[selectedCreatorId] : null;

  const message = authError
    ? (Object.entries(t.loginErrors).find(([code]) => code === authError)?.[1] ?? t.genericError)
    : error;

  const loginTargetUrl = selectedCreatorId
    ? `/auth/google?redirect=/${selectedCreatorId}`
    : '/auth/google';

  return (
    <main className="fs-gate fs-login" lang={lang}>
      <div className="fs-login-device">
      <div className="fs-login-screen">
      <span className="fs-login-island" aria-hidden="true" />
      <div className="fs-login-column">
        <div className="fs-login-topbar">
          <span className="fs-login-wordmark">instagoon</span>
          <LangSelect lang={lang} onChange={onSetLang} className="fs-login-langs" />
        </div>

        <h1 className="fs-login-slogan">
          {t.loginSlogan.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>

        <div className="fs-login-preview" aria-hidden="true">
          <div className="fs-login-preview-head">
            <span className="fs-login-avatar">
              <span>
                {activePreview ? activePreview.emoji : <Sparkles size={15} />}
              </span>
            </span>
            <strong>
              {activePreview ? `${activePreview.name} (${activePreview.nameEn})` : t.loginPreviewStatus}
            </strong>
            <i className="fs-login-online" />
          </div>
          <p className="fs-login-bubble">
            {activePreview ? activePreview.incoming : t.loginPreviewIncoming}
          </p>
          <p className="fs-login-bubble fs-login-bubble-own">
            {activePreview ? activePreview.outgoing : t.loginPreviewOutgoing}
          </p>
          <div className="fs-login-secret">
            <p className="fs-login-bubble">
              {activePreview ? activePreview.secret : t.loginSecret}
            </p>
            <span className="fs-login-lock">
              <LockKeyhole size={14} strokeWidth={2.4} />
              {activePreview ? activePreview.secretLock : t.loginSecretLock}
            </span>
          </div>
        </div>

        <div className="fs-login-actions">
          {message && (
            <p role="alert" className="fs-login-error">
              {message}
            </p>
          )}

          <div className="fs-login-invite">
            <div className="fs-login-invite-header">
              <Ticket size={14} className="fs-login-invite-icon" />
              <span>{t.loginInviteCodeLabel}</span>
            </div>
            <div className="fs-login-invite-row">
              <input
                type="text"
                className="fs-login-invite-input"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  setTokenStatus('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void checkToken(inviteToken);
                  }
                }}
                placeholder={t.loginInviteCodePlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="fs-login-invite-btn"
                disabled={tokenStatus === 'checking' || !inviteToken.trim()}
                onClick={() => void checkToken(inviteToken)}
              >
                {tokenStatus === 'checking' ? t.loginInviteCodeChecking : t.loginInviteCodeApply}
              </button>
            </div>
            {tokenStatus === 'valid' && (
              <p className="fs-login-invite-msg is-valid">
                <CheckCircle2 size={13} />
                <span>
                  {tokenRole === 'creator'
                    ? t.loginInviteCodeValidCreator
                    : tokenRole === 'admin'
                    ? t.loginInviteCodeValidAdmin
                    : t.loginInviteCodeValidPlayer}
                </span>
              </p>
            )}
            {tokenStatus === 'invalid' && (
              <p className="fs-login-invite-msg is-invalid">
                <span>{t.loginInviteCodeInvalid}</span>
              </p>
            )}
          </div>

          <a
            className="fs-login-google"
            href={loginTargetUrl}
            onClick={handleLoginClick}
          >
            <GoogleG size={20} />
            <span>
              {activePreview
                ? `${t.loginGoogle} (${activePreview.name})`
                : t.loginGoogle}
            </span>
          </a>
          <p className="fs-login-note">{t.loginAgeNote}</p>
          <nav className="fs-login-legal">
            <a href="/privacy.html">{t.loginPrivacy}</a>
            <a href="/terms.html">{t.loginTerms}</a>
          </nav>
        </div>
      </div>
      </div>
      </div>
    </main>
  );
}
