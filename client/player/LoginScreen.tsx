import { useEffect, useState } from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { GoogleG } from './InstagramIcons';
import { type Lang, TRANSLATIONS } from './i18n';
import { LangSelect } from './LangSelect';
import './froststory.css';

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
  const [authError] = useState(() =>
    new URLSearchParams(window.location.search).get('auth_error')
  );

  useEffect(() => {
    if (authError) window.history.replaceState(null, '', window.location.pathname);
  }, [authError]);

  const message = authError
    ? (Object.entries(t.loginErrors).find(([code]) => code === authError)?.[1] ?? t.genericError)
    : error;

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
                <Sparkles size={15} />
              </span>
            </span>
            <strong>{t.loginPreviewStatus}</strong>
            <i className="fs-login-online" />
          </div>
          <p className="fs-login-bubble">{t.loginPreviewIncoming}</p>
          <p className="fs-login-bubble fs-login-bubble-own">{t.loginPreviewOutgoing}</p>
          <div className="fs-login-secret">
            <p className="fs-login-bubble">{t.loginSecret}</p>
            <span className="fs-login-lock">
              <LockKeyhole size={14} strokeWidth={2.4} />
              {t.loginSecretLock}
            </span>
          </div>
        </div>

        <div className="fs-login-actions">
          {message && (
            <p role="alert" className="fs-login-error">
              {message}
            </p>
          )}
          <a className="fs-login-google" href="/auth/google">
            <GoogleG size={20} />
            <span>{t.loginGoogle}</span>
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
