import { useEffect, useState } from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { GoogleG } from './InstagramIcons';
import { type Lang, TRANSLATIONS } from './i18n';
import { LangSelect } from './LangSelect';
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

const CREATOR_PREVIEWS: Record<string, CreatorPreviewMeta> = {
  milin: {
    id: 'milin',
    name: 'มิลิน',
    nameEn: 'Milin',
    tagline: 'สาวหวานขี้อาย ซ่อนความแซ่บ กำลังรอคุยกับคุณ...',
    emoji: '🌸',
    incoming: 'ดึกขนาดนี้... ยังไม่นอนเหรอคะ? แอบคิดถึงเราอยู่รึเปล่า...',
    outgoing: 'คิดถึงสิ... วันนี้มิลินแต่งตัวน่ารักจัง',
    secret: 'รูปชุดนอนตัวโปรดที่ยังไม่เคยโพสต์ลงที่ไหนเลย...',
    secretLock: 'ปลดล็อกเมื่อระดับความสนิทถึงเลเวล 2'
  },
  mook: {
    id: 'mook',
    name: 'มุก',
    nameEn: 'Mook',
    tagline: 'สาวมั่น Girl Crush สเน่ห์เกินต้าน กำลังรอคุณที่ระเบียงบาร์...',
    emoji: '🍸',
    incoming: 'มาสายนะ... สั่งค็อกเทลรอจนจะหมดแก้วแล้วเนี่ย มานั่งข้างๆ นี่สิ',
    outgoing: 'รถติดนิดหน่อยครับ วันนี้มุกดูเซ็กซี่มากเลยนะ',
    secret: 'คลิปลับหลังงานปาร์ตี้เลิกที่กระซิบข้างหูคุณ...',
    secretLock: 'ปลดล็อกเมื่อระดับความสนิทถึงเลเวล 2'
  },
  noey: {
    id: 'noey',
    name: 'เนย',
    nameEn: 'Noey',
    tagline: 'เด็กฝึกงานน่ารัก Gap Moe ชวนหลง ทำโอทีรอคุณอยู่...',
    emoji: '☕',
    incoming: 'พี่คะ... เอกสารเสร็จแล้ว แต่เนยยังไม่อยากกลับบ้านเลย อยู่เป็นเพื่อนเนยก่อนได้ไหมคะ?',
    outgoing: 'ได้สิ เดี๋ยวพี่สั่งขนมมาทานด้วยกันนะ',
    secret: 'รูปถอดแว่นมุมส่วนตัวที่คุณเท่านั้นจะได้เห็น...',
    secretLock: 'ปลดล็อกเมื่อระดับความสนิทถึงเลเวล 2'
  }
};

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

  const initialPathCreator = window.location.pathname.replace(/^\//, '').toLowerCase();
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(() => {
    return CREATOR_PREVIEWS[initialPathCreator] ? initialPathCreator : null;
  });

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

  const handleSelectCreator = (creatorId: string) => {
    const nextId = selectedCreatorId === creatorId ? null : creatorId;
    setSelectedCreatorId(nextId);
    if (nextId) {
      window.history.pushState(null, '', `/${nextId}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  const handleLoginClick = () => {
    if (typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'click_login_cta', {
        creator_id: selectedCreatorId || 'general',
        page_path: window.location.pathname
      });
    }
  };

  const activePreview = selectedCreatorId ? CREATOR_PREVIEWS[selectedCreatorId] : null;

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

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px' }}>
          {Object.values(CREATOR_PREVIEWS).map(c => {
            const isSelected = selectedCreatorId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCreator(c.id)}
                style={{
                  background: isSelected ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '999px',
                  color: isSelected ? '#fb7185' : '#cbd5e1',
                  padding: '4px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

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
