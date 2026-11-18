import { Fragment, useEffect, useLayoutEffect, useState, useRef, type ReactNode } from 'react';
import { readSceneHeader, sceneHeaderLabels, hasNarrativeActions, splitNarrativeBody, quoteDialogue, parseRealityBubbleTags } from './message-format';
export { parseMagicAcademyMessage } from './message-format';
import { Send, Sparkles } from 'lucide-react';
import { IgHeart, IgComment, IgShare, IgMore, IgVerified, IgAudio, IgBookmark } from './InstagramIcons';
import { type Lang, TRANSLATIONS } from './i18n';
import { type Story, type RealityState, type WorldSeasonEvent, type CrossComment, type ProceduralMeme, type HousePointStanding, type User } from './types';

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
export function AvatarImg({ src, name, alt = name, className = 'w-full h-full object-cover object-top' }: { src: string; name: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return <span aria-label={alt || undefined}>{Array.from(name)[0] ?? ''}</span>;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

// Thai writes vowels and tone marks as combining code points stacked on the consonant, so slicing by code unit
// or code point can leave a dangling mark. Cluster on "base + its marks" instead.
export function truncate(text: string | undefined, max: number): string {
  if (!text) return '';
  const clusters = text.match(/\P{M}\p{M}*/gu);
  if (!clusters || clusters.length <= max) return text;
  return clusters.slice(0, max).join('');
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
    .replace(/\[(?:episode|draft|catalyst|locked-media):[^\]]*\]\n?/gi, '')
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

function renderFormattedLine(line: string): ReactNode {
  if (!line || !line.includes('[REDACTED BY EDICT 42]')) return line;
  const parts = line.split('[REDACTED BY EDICT 42]');
  return (
    <>
      {parts.map((p, idx) => (
        <Fragment key={idx}>
          {p}
          {idx < parts.length - 1 && (
            <span className="fs-edict-redacted" title="เซนเซอร์โดยกฤษฎีกาที่ 42">
              👁️ [REDACTED BY EDICT 42]
            </span>
          )}
        </Fragment>
      ))}
    </>
  );
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
  const { episodeBanner, howler, catalyst, lockedMedia, cleanBody } = parseRealityBubbleTags(body);
  let bodyText = cleanBody;

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
        ? <div key={index} className="fs-visual-box"><span className="fs-visual-text">{renderFormattedLine(part.text)}</span></div>
        : <div key={index} className="fs-bubble-text">{renderFormattedLine(quoteDialogue(part.text))}</div>;
    })}</div>;
  } else if (!imgRegex.test(bodyText)) {
    bodyNodes = (
      <span className="fs-bubble-text">
        {(scene ? quoteDialogue(bodyText) : bodyText).split('\n').map((line, lineIdx, arr) => (
          <Fragment key={lineIdx}>
            {renderFormattedLine(line)}
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
                    {renderFormattedLine(line)}
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

  if (sceneLabels || mood || thought || visual || episodeBanner || howler || catalyst || lockedMedia) {
    return (
      <div className="fs-bubble-with-meta">
        {episodeBanner && (
          <div className="fs-episode-milestone-banner" role="status">
            🎬 EPISODE {episodeBanner.number}: {episodeBanner.title}{episodeBanner.subtitle ? ` · ${episodeBanner.subtitle}` : ''}
          </div>
        )}
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
        {howler && (
          <div className="fs-howler-scroll" title="จดหมายกัมปนาท (Banshee Scroll)">
            <span className="fs-howler-icon">📜🔥</span>
            <span className="fs-howler-text">BANSHEE SCROLL: {howler}</span>
          </div>
        )}
        {visual && (
          <div className="fs-visual-box" title="ภาพเหตุการณ์ / กิริยาท่าทาง">
            <span className="fs-visual-text">{visual}</span>
          </div>
        )}
        {bodyNodes}
        {catalyst && (
          <div className="fs-reality-catalyst-card">
            <div className="fs-reality-catalyst-title">🎲 {catalyst.title}</div>
            <div className="fs-reality-catalyst-prompt">{catalyst.prompt}</div>
          </div>
        )}
        {lockedMedia && (
          <div className="fs-locked-media-card">
            <span className="fs-locked-media-icon">🔒</span>
            <div>
              <strong>{lockedMedia.title}</strong>
              <p>{lockedMedia.hint}</p>
            </div>
          </div>
        )}
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

export function LivingRealityStatusBar({
  realityState,
  lang,
}: {
  realityState?: RealityState | null;
  lang: Lang;
}) {
  if (!realityState) return null;
  const epLabel =
    lang === 'en'
      ? `Ep ${realityState.currentEpisode}/5 · ${realityState.episodeTitle}`
      : lang === 'ja'
        ? `Ep ${realityState.currentEpisode}/5 · ${realityState.episodeTitle}`
        : `Ep ${realityState.currentEpisode}/5 · ${realityState.episodeSubtitle || realityState.episodeTitle}`;

  return (
    <div className="fs-reality-status-bar" role="status" aria-label="Reality Episode Status">
      <div className="fs-reality-status-top">
        {realityState.academicYear ? (
          <span className="fs-reality-academic-pill">
            🏰 Y{realityState.academicYear} · {realityState.bastionHouse || 'Aethelgard'}
          </span>
        ) : null}
        <span className="fs-reality-ep-pill">🎬 {epLabel}</span>
        {realityState.isCloseFriend && (
          <span className="fs-reality-cf-badge" title="Close Friends Unlocked">
            🟢 CF
          </span>
        )}
        {realityState.jealousy?.active && (
          <span className="fs-reality-jealousy-badge">
            {realityState.jealousy.groupAmbush
              ? `💥 Ambush: ${realityState.jealousy.rivalName}`
              : lang === 'en'
                ? `👀 Watching ${realityState.jealousy.rivalName}`
                : `😤 แอบหึง ${realityState.jealousy.rivalName}`}
          </span>
        )}
      </div>
      <div className="fs-reality-meters">
        <span title="Affection">💖 {realityState.affectionLevel}%</span>
        <span title="Stress">⚡ {realityState.stressLevel}%</span>
        <span title="Clout">📈 {realityState.cloutLevel}%</span>
      </div>
    </div>
  );
}

export function QuickPillsBar({
  pills,
  disabled,
  onSelect,
}: {
  pills?: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
}) {
  if (!Array.isArray(pills) || pills.length === 0) return null;
  return (
    <div className="fs-quick-pills-bar" aria-label="Quick Action Replies">
      {pills.slice(0, 3).map((pill, idx) => (
        <button
          key={`${idx}-${pill}`}
          type="button"
          className="fs-quick-pill-btn"
          disabled={disabled}
          onClick={() => onSelect(pill)}
        >
          {pill}
        </button>
      ))}
    </div>
  );
}

export function WorldEventsBanner({ events }: { events?: WorldSeasonEvent[] }) {
  if (!Array.isArray(events) || events.length === 0) return null;
  return (
    <section className="fs-world-events-banner" aria-label="World Season Events">
      {events.slice(0, 2).map((ev) => (
        <div key={ev.id} className={`fs-world-event-card is-${ev.eventKind || 'moderator'}`}>
          <div className="fs-world-event-headline">{ev.headline}</div>
          <p className="fs-world-event-content">{ev.content}</p>
        </div>
      ))}
    </section>
  );
}

export function CrossCommentsList({ comments }: { comments?: CrossComment[] }) {
  if (!Array.isArray(comments) || comments.length === 0) return null;
  return (
    <div className="fs-cross-comments-list">
      {comments.map((cc) => (
        <div key={cc.id} className="fs-cross-comment-item">
          <strong className="fs-cross-comment-author">{cc.creatorName}</strong>{' '}
          <span className="fs-cross-comment-badge">✨</span>{' '}
          <span className="fs-cross-comment-text">{cc.content}</span>
        </div>
      ))}
    </div>
  );
}

export function BastionHousePointsHeader({
  standings
}: {
  standings?: HousePointStanding[];
}) {
  if (!Array.isArray(standings) || standings.length === 0) return null;
  const iconMap: Record<string, string> = {
    'Aethel-Pyre': '🦁',
    'Nocturn-Coil': '🐍',
    'Zephyr-Crown': '🦅',
    'Terra-Root': '🦡'
  };

  return (
    <div className="fs-bastion-house-points-bar" aria-label="Bastion House Standings">
      {standings.map((h) => {
        const name = h.bastion_name || h.bastionName || '';
        const pts = typeof h.points === 'number'
          ? (Number.isInteger(h.points) ? h.points.toString() : h.points.toFixed(2))
          : '500';
        return (
          <div key={name} className="fs-bastion-point-pill">
            <span className="fs-bastion-icon">{iconMap[name] || '✨'}</span>
            <span className="fs-bastion-pts">{pts}</span>
            <span className="fs-bastion-name">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProceduralMemeCard({
  meme,
  user
}: {
  meme?: ProceduralMeme | null;
  onQuickReply?: (reply: {
    reply_id?: string;
    replyId?: string;
    post_instance_id?: string;
    postInstanceId?: string;
    label: string;
    affection_target?: string;
    affectionTarget?: string;
    delta?: number;
    followup_dm_trigger?: string;
    followupTrigger?: string;
  }) => void;
  user?: User;
}) {
  if (!meme) return null;

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(412);
  const [isSaved, setIsSaved] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userCommentInput, setUserCommentInput] = useState('');
  const [customUserComments, setCustomUserComments] = useState<string[]>([]);

  // Identify channel branding
  let channelName = 'The Silver Quill';
  let channelAudio = 'the_silver_quill';
  let avatarSrc = 'avatars/celeste_avatar.png';

  if (meme.channel === 'the_underground_parchment') {
    channelName = 'The Underground Parchment';
    channelAudio = 'the_underground_parchment';
    avatarSrc = 'avatars/barnaby_avatar.png';
  } else if (meme.channel === 'spotted_aethelgard' || meme.channel === 'spotted') {
    channelName = 'Spotted: Aethelgard';
    channelAudio = 'spotted_aethelgard';
    avatarSrc = 'avatars/vivica_avatar.png';
  }

  const handleToggleLike = (fromDoubleTap = false) => {
    if (fromDoubleTap) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 900);
      if (!isLiked) {
        setIsLiked(true);
        setLikeCount((c) => c + 1);
      }
      return;
    }
    setIsLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUserCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCommentInput.trim()) return;
    setCustomUserComments((prev) => [...prev, userCommentInput.trim()]);
    setUserCommentInput('');
    showToast('โพสต์ความคิดเห็นแล้ว ✨');
  };

  const handleQuickEmoji = (emoji: string) => {
    setCustomUserComments((prev) => [...prev, emoji]);
    showToast(`ส่งปฏิกิริยา ${emoji}`);
  };

  const totalCommentsCount = (meme.npcComments?.length || 0) + customUserComments.length + 42;

  const fanAvatars = [
    PRESET_AVATARS[1]?.src || '/avatars/user_f2.webp',
    PRESET_AVATARS[3]?.src || '/avatars/user_f1.webp',
    PRESET_AVATARS[4]?.src || '/avatars/user_m2.webp',
  ];

  return (
    <>
      {/* Authentic Instagram Post (Identical to peer posts in feed) */}
      <article className="fs-insta-post" aria-label={channelName}>
        {/* Post Header */}
        <div className="fs-post-header">
          <div className="fs-post-author">
            <div className="fs-avatar-ring">
              <div className="fs-avatar">
                <AvatarImg src={media(avatarSrc)} name={channelName} />
              </div>
            </div>
            <div className="fs-post-author-info">
              <div className="fs-author-title">
                <span className="fs-author-name">{channelName}</span>
                <IgVerified size={13} className="fs-verified" />
              </div>
              <div className="fs-audio-subtitle">
                <IgAudio size={11} />
                <span>เสียงต้นฉบับ · {channelAudio}</span>
              </div>
            </div>
          </div>

          <div className="fs-post-header-right">
            <button
              type="button"
              className="fs-more-btn"
              aria-label="Options"
              onClick={() => showToast(`ตัวเลือกสำหรับ ${channelName}`)}
            >
              <IgMore size={20} />
            </button>
          </div>
        </div>

        {/* Media Frame (Clean Quote Backdrop matching other text posts) */}
        <div
          className="fs-post-media-frame fs-post-media-quote"
          onDoubleClick={() => handleToggleLike(true)}
        >
          <div className="fs-quote-backdrop">
            <p className="fs-quote-text" style={{ fontSize: '0.94rem', lineHeight: '1.6', textAlign: 'left', fontWeight: '400', color: '#f8fafc' }}>
              “{meme.content}”
            </p>
            <span className="fs-quote-author" style={{ display: 'block', textAlign: 'right', marginTop: '14px', fontSize: '0.78rem', opacity: 0.85, color: '#38bdf8' }}>
              — {channelName}
            </span>
          </div>

          {heartBurst && (
            <div className="fs-heart-burst" aria-hidden="true">
              <IgHeart size={92} filled />
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="fs-post-actions-row">
          <div className="fs-post-actions-left">
            <button
              type="button"
              className={`fs-action-icon-btn ${isLiked ? 'is-liked' : ''}`}
              aria-label={isLiked ? 'Unlike' : 'Like'}
              aria-pressed={isLiked}
              onClick={() => handleToggleLike(false)}
            >
              <IgHeart size={24} filled={isLiked} />
            </button>

            <button
              type="button"
              className="fs-action-icon-btn"
              aria-label="Comment"
              onClick={() => {
                const el = document.getElementById(`comment-input-${meme.channel}`);
                el?.focus();
              }}
            >
              <IgComment size={24} />
            </button>

            <button
              type="button"
              className="fs-action-icon-btn"
              aria-label="Share"
              onClick={() => showToast('แชร์โพสต์แล้ว')}
            >
              <IgShare size={24} />
            </button>
          </div>

          <div className="fs-post-actions-right">
            <button
              type="button"
              className={`fs-action-icon-btn ${isSaved ? 'is-saved' : ''}`}
              aria-label="Bookmark"
              aria-pressed={isSaved}
              onClick={() => setIsSaved(!isSaved)}
            >
              <IgBookmark size={24} filled={isSaved} />
            </button>
          </div>
        </div>

        {/* Post Body: Liked-By Crowd + Caption + Comments */}
        <div className="fs-post-body">
          <div className="fs-liked-by-row">
            <div className="fs-liked-by-stack">
              {fanAvatars.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="fs-liked-by-avatar"
                  style={{ zIndex: 3 - i }}
                />
              ))}
            </div>
            <span className="fs-liked-by-text">
              {isLiked
                ? `ถูกใจโดย คุณ และคนอื่นๆ อีก ${likeCount} คน`
                : `ถูกใจโดย alex.k และคนอื่นๆ อีก ${likeCount} คน`}
            </span>
          </div>

          <p className="fs-caption-line">
            <strong className="fs-caption-author">{channelName}</strong>{' '}
            <span className="text-zinc-300">
              {meme.content.length > 70 ? `${meme.content.slice(0, 70)}... ` : `${meme.content} `}
              <span className="text-sky-400 font-medium">#{channelAudio} #AethelgardHerald</span>
            </span>
          </p>

          {/* Inline NPC & Student Comments (Expandable inline, NO pop-up!) */}
          {((meme.npcComments?.length || 0) > 0 || customUserComments.length > 0) && (
            <div className="fs-comments-preview-list">
              {(showAllComments
                ? meme.npcComments || []
                : (meme.npcComments || []).slice(0, 1)
              ).map((c, idx) => (
                <div className="fs-comment-preview-item" key={idx}>
                  <strong className="fs-comment-author">{c.handle}</strong>{' '}
                  <span className="fs-comment-content">{c.text}</span>
                </div>
              ))}

              {customUserComments.map((text, idx) => (
                <div className="fs-comment-preview-item" key={`user-${idx}`}>
                  <strong className="fs-comment-author" style={{ color: '#ec4899' }}>
                    {user?.nickname || 'คุณ (You)'}
                  </strong>{' '}
                  <span className="fs-comment-content">{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Toggle All Comments Inline (NO pop-up!) */}
          {(meme.npcComments?.length || 0) > 1 && (
            <button
              type="button"
              className="fs-view-comments-btn"
              onClick={() => setShowAllComments(!showAllComments)}
            >
              {showAllComments
                ? 'ย่อความคิดเห็น'
                : `ดูความคิดเห็นทั้งหมด ${totalCommentsCount} รายการ`}
            </button>
          )}

          {/* Authentic Instagram Inline Comment Input (NO pop-up!) */}
          <form
            className="fs-comment-input-row"
            onSubmit={handleUserCommentSubmit}
          >
            <div className="fs-avatar fs-avatar-tiny fs-comment-user-avatar">
              {user?.avatarId && getAvatarSrc(user.avatarId) ? (
                <img src={getAvatarSrc(user.avatarId)!} alt="" className="fs-avatar-img" />
              ) : (
                user?.nickname?.slice(0, 1) || 'U'
              )}
            </div>
            <div className="fs-comment-input-wrap">
              <input
                id={`comment-input-${meme.channel}`}
                type="text"
                className="fs-comment-input-field"
                placeholder="เพิ่มความคิดเห็นในฐานะนักเรียน..."
                value={userCommentInput}
                onChange={(e) => setUserCommentInput(e.target.value)}
              />
              {userCommentInput.trim() ? (
                <button
                  type="submit"
                  className="fs-comment-submit-btn"
                >
                  โพสต์
                </button>
              ) : (
                <div className="fs-comment-quick-emojis">
                  {['❤️', '🙌', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="fs-quick-emoji-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickEmoji(emoji);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      </article>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300">
          <div className="bg-zinc-900/95 text-white text-xs font-medium px-4 py-2 rounded-full border border-purple-500/50 shadow-xl backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}
