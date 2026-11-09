import { Fragment, useEffect, useLayoutEffect, useState, useRef, type ReactNode } from 'react';
import { readSceneHeader, sceneHeaderLabels, hasNarrativeActions, splitNarrativeBody, quoteDialogue } from './message-format';
import { Send, Sparkles } from 'lucide-react';
import { type Lang, TRANSLATIONS } from './i18n';
import { type Story } from './types';

export function ChatComposer({
  placeholder,
  disabled,
  onSend,
}: {
  placeholder: string;
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText('');
    ref.current?.focus();
  };

  return (
    <div className="fs-dm-composer-wrap">
      <form
        className="fs-dm-input-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={ref}
          rows={1}
          className="fs-dm-text-input"
          placeholder={placeholder}
          value={text}
          enterKeyHint="send"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter is a new line; Enter that confirms an IME (Thai/Japanese) candidate is ignored.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className="fs-dm-send-btn"
          aria-label="Send"
          disabled={!text.trim() || disabled}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export const media = (key: string) => `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;

// A creator avatar that falls back to the name's first letter when the picture is missing, instead of
// the browser's broken-image icon and alt text spilling out of the circle.
export function AvatarImg({ src, name, alt = name }: { src: string; name: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return <span aria-label={alt || undefined}>{Array.from(name)[0] ?? ''}</span>;
  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
}

export function Media({
  mediaKey,
  label,
  className,
}: {
  mediaKey: string;
  label: string;
  className: string;
}) {
  return /\.(mp4|webm)$/i.test(mediaKey) ? (
    <video className={className} src={media(mediaKey)} controls playsInline aria-label={label} />
  ) : (
    <img className={className} src={media(mediaKey)} alt={label} loading="lazy" decoding="async" />
  );
}

export function hasSpokenDialogue(text: string): boolean {
  if (!text) return false;
  const stripped = text
    .replace(/\[scene:[^\]]*\]\n?/gi, '')
    .replace(/^\[(?:mood|reaction|toast):\s*[\s\S]*?\]\n?/gi, '')
    .replace(/^\[thought:\s*[\s\S]*?\]\n?/gi, '')
    .replace(/\[thought:\s*[\s\S]*?\]/gi, '')
    .replace(/^\[(?:visual|action):\s*[\s\S]*?\]\n?/gi, '')
    .replace(/\[(?:visual|action):\s*[\s\S]*?\]/gi, '')
    .replace(/^\*\[?[\s\S]*?\]?\*\n?/g, '')
    .replace(/\*\[?[\s\S]*?\]?\*/g, '')
    .replace(/\[img:[^\]]+\]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
  return stripped.length > 0;
}

export function renderBubbleContent(
  text: string,
  onExpandMedia?: (key: string) => void,
  onFastForward?: (ff: { time?: string; location: string; label: string }) => void
) {
  if (!text) return null;

  let mood: string | null = null;
  let thought: string | null = null;
  let visual: string | null = null;
  const { scene, body } = readSceneHeader(text);
  const sceneLabels = scene ? sceneHeaderLabels(scene) : null;
  let bodyText = body;

  const moodMatch = bodyText.match(/^\[(?:mood|reaction|toast):\s*([\s\S]*?)\]\n?/);
  if (moodMatch) {
    mood = moodMatch[1].trim();
    bodyText = bodyText.substring(moodMatch[0].length);
  }

  const thoughtMatch = bodyText.match(/^\[thought:\s*([\s\S]*?)\]\n?/);
  if (thoughtMatch) {
    thought = thoughtMatch[1].trim();
    bodyText = bodyText.substring(thoughtMatch[0].length);
  }

  const visualMatch =
    bodyText.match(/^\[(?:visual|action):\s*([\s\S]*?)\]\n?/i) ||
    bodyText.match(/^\*\[?([\s\S]*?)\]?\*\n?/);
  if (visualMatch) {
    visual = visualMatch[1].trim().replace(/^(?:action|visual)\s*:\s*/i, '');
    bodyText = bodyText.substring(visualMatch[0].length);
  }

  const imgRegex = /\[img:([^\]]+)\]/g;
  let bodyNodes: React.ReactNode;
  if (hasNarrativeActions(bodyText)) {
    // Scene replies retain the order of dialogue and character-owned gestures.
    bodyNodes = <div className="fs-narrative-beats">{splitNarrativeBody(bodyText).map((part, index) => {
      return part.kind === 'action'
        ? <div key={index} className="fs-visual-box"><span className="fs-visual-text">{part.text}</span></div>
        : <div key={index} className="fs-bubble-text">{quoteDialogue(part.text)}</div>;
    })}</div>;
  } else if (!imgRegex.test(bodyText)) {
    bodyNodes = (
      <span className="fs-bubble-text">
        {(scene ? quoteDialogue(bodyText) : bodyText).split('\n').map((line, lineIdx, arr) => (
          <Fragment key={lineIdx}>
            {line}
            {lineIdx < arr.length - 1 && <br />}
          </Fragment>
        ))}
      </span>
    );
  } else {
    imgRegex.lastIndex = 0;
    const parts: (string | { type: 'img'; key: string })[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(bodyText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(bodyText.substring(lastIndex, match.index));
      }
      parts.push({ type: 'img', key: match[1].trim() });
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < bodyText.length) {
      parts.push(bodyText.substring(lastIndex));
    }

    bodyNodes = (
      <>
        {parts.map((part, i) => {
          if (typeof part === 'string') {
            return (
              <span key={i} className="fs-bubble-text">
                {part.split('\n').map((line, lineIdx, arr) => (
                  <Fragment key={`${i}-${lineIdx}`}>
                    {line}
                    {lineIdx < arr.length - 1 && <br />}
                  </Fragment>
                ))}
              </span>
            );
          }
          return (
            <div
              key={`img-${i}`}
              className={`fs-bubble-image-wrap${onExpandMedia ? ' is-clickable' : ''}`}
              role={onExpandMedia ? 'button' : undefined}
              tabIndex={onExpandMedia ? 0 : undefined}
              title={onExpandMedia ? 'แตะเพื่อดูภาพขนาดเต็ม' : undefined}
              onClick={() => onExpandMedia?.(part.key)}
              onKeyDown={(e) => {
                if (onExpandMedia && (e.key === 'Enter' || e.key === ' ')) {
                  onExpandMedia(part.key);
                }
              }}
            >
              <img
                src={media(part.key)}
                alt="Sent photo"
                className="fs-bubble-image"
                loading="lazy"
              />
              {onExpandMedia && (
                <div className="fs-bubble-image-expand-hint">🔍 แตะเพื่อขยาย</div>
              )}
            </div>
          );
        })}
      </>
    );
  }

  if (sceneLabels || mood || thought || visual) {
    return (
      <div className="fs-bubble-with-meta">
        {sceneLabels && (
          <div className="fs-scene-header" aria-label="เวลาและสถานที่ของฉาก">
            <div title={sceneLabels.date}>⏰ เวลา : {sceneLabels.time} น.</div>
            <div>📍 สถานที่ : {sceneLabels.location}</div>
          </div>
        )}
        {mood && !thought && (
          <div className="fs-mood-box" title="ความรู้สึกของตัวละคร">
            <span className="fs-mood-icon">💕</span>
            <span className="fs-mood-text">{mood}</span>
          </div>
        )}
        {thought && (
          <div className="fs-thought-box" title="ความคิดในใจ">
            <span className="fs-thought-icon">💭</span>
            <span className="fs-thought-text">ความคิดในใจ : {thought}</span>
          </div>
        )}
        {visual && (
          <div className="fs-visual-box" title="ภาพเหตุการณ์ / กิริยาท่าทาง">
            <span className="fs-visual-text">{visual}</span>
          </div>
        )}
        {bodyNodes}
        {scene?.fastForward && onFastForward && (
          <div className="fs-inbubble-fastforward">
            <button
              type="button"
              className="fs-fastforward-btn"
              onClick={() => onFastForward(scene.fastForward!)}
            >
              <Sparkles size={14} className="fs-fastforward-icon" />
              <span>{scene.fastForward.label}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (scene?.fastForward && onFastForward) {
    return (
      <div className="fs-bubble-with-meta">
        {bodyNodes}
        <div className="fs-inbubble-fastforward">
          <button
            type="button"
            className="fs-fastforward-btn"
            onClick={() => onFastForward(scene.fastForward!)}
          >
            <Sparkles size={14} className="fs-fastforward-icon" />
            <span>{scene.fastForward.label}</span>
          </button>
        </div>
      </div>
    );
  }

  return bodyNodes;
}

export const formatDateTime = (value: number, lang: Lang) =>
  new Date(value).toLocaleString({ th: 'th-TH', en: 'en-US', ja: 'ja-JP' }[lang], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

export function StoryContent({ story, name, lang }: { story: Story; name: string; lang: Lang }) {
  const [now, setNow] = useState(Date.now());
  const t = TRANSLATIONS[lang];
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = story.expiresAt === null ? null : Math.max(0, story.expiresAt - now);
  if (remaining === 0) return <p className="fs-story-expired">{t.storyExpired}</p>;
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  return (
    <div className="fs-story-stage">
      {seconds !== null && (
        <div className="fs-story-timer-pill">
          {t.timeLeft(
            Math.floor(seconds / 3600),
            Math.floor((seconds % 3600) / 60),
            seconds % 60
          )}
        </div>
      )}
      {story.mediaKey && (
        <Media
          className="fs-story-image"
          mediaKey={story.mediaKey}
          label={t.storyOf(name)}
        />
      )}
    </div>
  );
}

export function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    // Land focus on the content, not the first button, so no focus ring flashes on open.
    element?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="fs-overlay"
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export const PRESET_AVATARS = [
  { id: 'user_m1', label: 'หนุ่มหล่อ CEO', src: '/avatars/user_m1.webp' },
  { id: 'user_m2', label: 'หนุ่มแบดบอย', src: '/avatars/user_m2.webp' },
  { id: 'user_m3', label: 'หนุ่มแว่นสุขุม', src: '/avatars/user_m3.webp' },
  { id: 'user_f1', label: 'สาวชิค เกิร์ลครัช', src: '/avatars/user_f1.webp' },
  { id: 'user_f2', label: 'สาวหวาน หรูหรา', src: '/avatars/user_f2.webp' },
  { id: 'user_f3', label: 'สาวมั่น คมเฉี่ยว', src: '/avatars/user_f3.webp' },
];

export function getAvatarSrc(avatarId?: string | null) {
  const found = PRESET_AVATARS.find((a) => a.id === avatarId);
  return found ? found.src : null;
}
