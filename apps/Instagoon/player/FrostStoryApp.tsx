import { useCallback, useEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Globe,
  Info,
  LockKeyhole,
  Phone,
  Send,
  Sparkles,
  User as UserIcon,
  Video,
  X,
  Zap,
} from 'lucide-react';
import {
  GoogleG,
  IgLogo,
  IgHeart,
  IgComment,
  IgShare,
  IgBookmark,
  IgMore,
  IgVerified,
  IgHome,
  IgSearch,
  IgCreate,
  IgReels,
  IgAudio,
} from './InstagramIcons';
import './froststory.css';

export type Lang = 'th' | 'en' | 'ja';

const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'th', label: 'ไทย', name: 'ภาษาไทย' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'ja', label: '日本語', name: '日本語' },
];
const nextLang = (lang: Lang): Lang =>
  LANGS[(LANGS.findIndex(({ id }) => id === lang) + 1) % LANGS.length].id;

const TRANSLATIONS = {
  th: {
    loading: 'กำลังโหลด instagoon…',
    loginSlogan: ['ยิ่งคุย', 'ยิ่งสนิท', 'ยิ่งปลดล็อกความลับที่คุณเท่านั้นที่รู้'],
    loginPreviewStatus: 'ข้อความใหม่ 1 รายการ',
    loginPreviewIncoming: 'เมื่อคืนคุณบอกว่าจะเล่าต่อ… ยังจำได้ไหม?',
    loginPreviewOutgoing: 'จำได้สิ ไม่คิดว่าเธอจะจำได้ด้วย',
    loginGoogle: 'เข้าสู่ระบบด้วย Google',
    loginSecret: 'จริง ๆ แล้วมีเรื่องหนึ่งที่ไม่เคยบอกใครเลย',
    loginSecretLock: 'สนิทกันอีกนิดถึงจะเห็น',
    loginAgeNote: 'สำหรับผู้มีอายุ 18 ปีขึ้นไป ครั้งแรกจะให้ยืนยันอายุก่อนเริ่มเล่น',
    loginPrivacy: 'นโยบายความเป็นส่วนตัว',
    loginTerms: 'ข้อกำหนดการใช้งาน',
    loginErrors: {
      login_cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว ลองใหม่ได้ทุกเมื่อ',
      access_revoked: 'บัญชีนี้ถูกระงับการเข้าใช้งาน',
      email_not_verified: 'อีเมล Google นี้ยังไม่ได้ยืนยัน กรุณายืนยันแล้วลองอีกครั้ง',
      google_auth_failed: 'เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองอีกครั้ง',
      invalid_oauth_state: 'หมดเวลาเข้าสู่ระบบ กรุณาลองอีกครั้ง',
    },
    consentTitle: 'ก่อนเริ่มเรื่องราว',
    consentDesc1:
      'ระบบนี้มีเนื้อหาสำหรับผู้มีอายุ 18 ปีขึ้นไป ช่วงทดลองนี้เก็บข้อมูลที่จำเป็นต่อการให้บริการและวัดผล ความคืบหน้าอาจต้องรีเซ็ตหากจำเป็น',
    consentDesc2: 'การกดยืนยันหมายความว่าคุณมีอายุ 18 ปีขึ้นไปและยอมรับเงื่อนไขการเข้าร่วมทดลอง',
    consentAccept: 'ฉันอายุ 18 ปีขึ้นไปและยอมรับ',
    logout: 'ออกจากระบบ',
    feed: 'หน้าหลัก',
    creators: 'ค้นหา',
    notifications: 'การแจ้งเตือน',
    account: 'โปรไฟล์',
    yourStory: 'เรื่องราวของคุณ',
    todayStories: 'เรื่องราววันนี้',
    energyRefillPrefix: 'พลังเติม',
    energyRefillDefault: 'พลังฟรีเติมทุก 4 ชั่วโมง',
    noPosts: 'ยังไม่มีโพสต์ใหม่ในขณะนี้',
    sendMessage: 'ส่งข้อความ',
    likesCount: (n: number) => `ถูกใจ ${n.toLocaleString()} คน`,
    commentsTitle: (n: number) => `ดูความคิดเห็นทั้งหมด ${n} รายการ`,
    delete: 'ลบ',
    report: 'รายงาน',
    reportPrompt: 'เหตุผลที่รายงานความคิดเห็นนี้',
    commentPlaceholder: 'เพิ่มความคิดเห็น…',
    postBtn: 'โพสต์',
    claimedReward: 'รับแต้มแล้ว ✓',
    firstCommentReward: '+1 ความสัมพันธ์ · 1⚡',
    firstCommentUsedHint: 'คอมเมนต์เพิ่มเติมฟรี ไม่เพิ่มความสัมพันธ์',
    firstCommentNewHint: 'คอมเมนต์แรกใช้ 1 Energy และเพิ่มความสัมพันธ์ 1 แต้ม',
    knowBetterTitle: 'ค้นพบและเชื่อมต่อ',
    charactersCount: (n: number) => `${n} ผู้ใช้`,
    openDM: 'ส่งข้อความ',
    relationship: 'ความสัมพันธ์',
    noNotifs: 'ยังไม่มีการแจ้งเตือนใหม่',
    betaUserDesc: 'บัญชีผู้ใช้ทดสอบ Closed Beta (18+)',
    languageSetting: 'ภาษา (Language)',
    deleteAccountTitle: 'ลบบัญชี',
    deleteAccountDesc:
      'ข้อมูลส่วนบุคคล ประวัติแชท และความคิดเห็นจะถูกลบ การดำเนินการนี้ย้อนกลับไม่ได้',
    deleteAccountBtn: 'ลบบัญชี',
    deleteAccountConfirm: 'ลบบัญชีและความคืบหน้าของคุณ? การดำเนินการนี้ย้อนกลับไม่ได้',
    storyOf: (name: string) => `Story ของ ${name}`,
    exclusiveStory: 'Exclusive 24h Story',
    broadcastStory: 'Story',
    unlockableGateDesc: 'เมื่อเปิดดูแล้ว Story นี้จะหมดอายุใน 24 ชั่วโมง',
    openStoryBtn: 'เปิดดู Story',
    replyStoryPlaceholder: 'ส่งข้อความตอบกลับสตอรี่นี้...',
    storyExpired: 'Story นี้หมดเวลาแล้ว',
    timeLeft: (h: number, m: number, s: number) => `เหลือเวลา ${h} ชม. ${m} นาที ${s} วินาที`,
    online: 'ออนไลน์อยู่',
    selectEpisode: 'บทสนทนา (Episodes)',
    completed: 'จบแล้ว',
    locked: 'ยังไม่ปลดล็อก',
    noChatFound: 'ไม่พบบทสนทนาที่เล่นอยู่',
    episodeEnded: '✨ จบตอนสนทนานี้แล้ว',
    selectReply: 'เลือกข้อความตอบกลับ',
    connectionError: 'ไม่สามารถเชื่อมต่อได้',
    genericError: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    you: 'คุณ',
    player: 'ผู้ใช้',
    originalAudio: 'เสียงต้นฉบับ',
    viewMore: 'ดูเพิ่มเติม',
  },
  en: {
    loading: 'Loading instagoon…',
    loginSlogan: ['Talk more.', 'Get closer.', 'Unlock the secrets only you get to know.'],
    loginPreviewStatus: '1 new message',
    loginPreviewIncoming: 'You said you’d tell me the rest last night… remember?',
    loginPreviewOutgoing: 'Of course. I didn’t think you would too.',
    loginGoogle: 'Sign in with Google',
    loginSecret: 'There’s something I’ve never told anyone…',
    loginSecretLock: 'Get closer to read this',
    loginAgeNote: 'For players 18 and over. You’ll confirm your age the first time you sign in.',
    loginPrivacy: 'Privacy Policy',
    loginTerms: 'Terms of Service',
    loginErrors: {
      login_cancelled: 'Sign-in cancelled. You can try again anytime.',
      access_revoked: 'This account has been suspended.',
      email_not_verified: 'This Google email is not verified. Verify it and try again.',
      google_auth_failed: 'Could not reach Google. Please try again.',
      invalid_oauth_state: 'Sign-in timed out. Please try again.',
    },
    consentTitle: 'Before Beginning',
    consentDesc1:
      'This simulation contains 18+ content. This preview collects data strictly necessary for operation and measurement. Progress may be reset if required.',
    consentDesc2: 'Confirming indicates you are 18+ years of age and agree to the beta terms.',
    consentAccept: 'I am 18+ and accept',
    logout: 'Log out',
    feed: 'Home',
    creators: 'Explore',
    notifications: 'Notifications',
    account: 'Profile',
    yourStory: 'Your story',
    todayStories: "Today's Stories",
    energyRefillPrefix: 'Refills at',
    energyRefillDefault: 'Free energy refills every 4 hours',
    noPosts: 'No new posts right now',
    sendMessage: 'Message',
    likesCount: (n: number) => `${n.toLocaleString()} likes`,
    commentsTitle: (n: number) => `View all ${n} comments`,
    delete: 'Delete',
    report: 'Report',
    reportPrompt: 'Reason for reporting this comment',
    commentPlaceholder: 'Add a comment…',
    postBtn: 'Post',
    claimedReward: 'Claimed ✓',
    firstCommentReward: '+1 Rel · 1⚡',
    firstCommentUsedHint: 'Additional comments are free and do not add relationship',
    firstCommentNewHint: 'First comment consumes 1 Energy and adds 1 Relationship',
    knowBetterTitle: 'Explore & Connect',
    charactersCount: (n: number) => `${n} accounts`,
    openDM: 'Message',
    relationship: 'Relationship',
    noNotifs: 'No new notifications',
    betaUserDesc: 'Beta Tester Account (18+)',
    languageSetting: 'Language',
    deleteAccountTitle: 'Delete Account',
    deleteAccountDesc:
      'Personal data, chat history, and comments will be permanently erased. This cannot be undone.',
    deleteAccountBtn: 'Delete Account',
    deleteAccountConfirm: 'Delete your account and all progress? This action is irreversible.',
    storyOf: (name: string) => `${name}'s Story`,
    exclusiveStory: 'Exclusive 24h Story',
    broadcastStory: 'Story',
    unlockableGateDesc: 'Once opened, this Story expires in 24 hours',
    openStoryBtn: 'Open Story',
    replyStoryPlaceholder: 'Reply to this story...',
    storyExpired: 'This story has expired',
    timeLeft: (h: number, m: number, s: number) => `${h}h ${m}m ${s}s remaining`,
    online: 'Active now',
    selectEpisode: 'Episodes',
    completed: 'Done',
    locked: 'Locked',
    noChatFound: 'No conversation found',
    episodeEnded: '✨ Episode completed',
    selectReply: 'Choose reply',
    connectionError: 'Unable to connect',
    genericError: 'An error occurred. Please try again.',
    you: 'You',
    player: 'User',
    originalAudio: 'Original audio',
    viewMore: 'more',
  },
  ja: {
    loading: 'instagoon を読み込み中…',
    loginSlogan: ['話すほど、', '近づくほど、', 'あなただけが知る秘密がひらく。'],
    loginPreviewStatus: '新着メッセージ 1件',
    loginPreviewIncoming: '昨日の夜、続きを話すって言ってたよね… 覚えてる？',
    loginPreviewOutgoing: 'もちろん。君も覚えてるとは思わなかった。',
    loginGoogle: 'Google でログイン',
    loginSecret: 'ほんとうはね、誰にも言ったことがない話があるの',
    loginSecretLock: 'もっと仲良くなると読めます',
    loginAgeNote: '18歳以上の方が対象です。初回ログイン時に年齢を確認します。',
    loginPrivacy: 'プライバシーポリシー',
    loginTerms: '利用規約',
    loginErrors: {
      login_cancelled: 'ログインをキャンセルしました。いつでもやり直せます。',
      access_revoked: 'このアカウントは利用停止中です。',
      email_not_verified: 'この Google メールアドレスは未確認です。確認してからもう一度お試しください。',
      google_auth_failed: 'Google に接続できませんでした。もう一度お試しください。',
      invalid_oauth_state: 'ログインの有効期限が切れました。もう一度お試しください。',
    },
    consentTitle: 'はじめる前に',
    consentDesc1:
      'このシミュレーションには18歳以上向けの内容が含まれます。このプレビューでは運営と計測に必要なデータのみを収集します。必要に応じて進行状況がリセットされる場合があります。',
    consentDesc2: '確認すると、18歳以上であり、ベータ版の規約に同意したことになります。',
    consentAccept: '18歳以上です。同意する',
    logout: 'ログアウト',
    feed: 'ホーム',
    creators: '発見',
    notifications: 'お知らせ',
    account: 'プロフィール',
    yourStory: 'ストーリーズ',
    todayStories: '今日のストーリーズ',
    energyRefillPrefix: '次の回復',
    energyRefillDefault: '無料エネルギーは4時間ごとに回復します',
    noPosts: '新しい投稿はまだありません',
    sendMessage: 'メッセージ',
    likesCount: (n: number) => `「いいね！」${n.toLocaleString()}件`,
    commentsTitle: (n: number) => `コメント${n}件をすべて見る`,
    delete: '削除',
    report: '報告する',
    reportPrompt: 'このコメントを報告する理由',
    commentPlaceholder: 'コメントを追加…',
    postBtn: '投稿する',
    claimedReward: '受け取り済み ✓',
    firstCommentReward: '+1 Rel · 1⚡',
    firstCommentUsedHint: '2回目以降のコメントは無料ですが、関係度は上がりません',
    firstCommentNewHint: '最初のコメントはエネルギーを1消費し、関係度が1上がります',
    knowBetterTitle: '見つけてつながる',
    charactersCount: (n: number) => `${n}アカウント`,
    openDM: 'メッセージ',
    relationship: '関係度',
    noNotifs: '新しいお知らせはありません',
    betaUserDesc: 'ベータテスターアカウント（18歳以上）',
    languageSetting: '言語',
    deleteAccountTitle: 'アカウントを削除',
    deleteAccountDesc:
      '個人データ、チャット履歴、コメントは完全に削除されます。元に戻すことはできません。',
    deleteAccountBtn: 'アカウントを削除',
    deleteAccountConfirm: 'アカウントとすべての進行状況を削除しますか？この操作は取り消せません。',
    storyOf: (name: string) => `${name}のストーリー`,
    exclusiveStory: '24時間限定ストーリー',
    broadcastStory: 'ストーリー',
    unlockableGateDesc: '開くと、このストーリーは24時間後に消えます',
    openStoryBtn: 'ストーリーを開く',
    replyStoryPlaceholder: 'ストーリーに返信…',
    storyExpired: 'このストーリーは期限切れです',
    timeLeft: (h: number, m: number, s: number) => `残り ${h}時間${m}分${s}秒`,
    online: 'オンライン',
    selectEpisode: 'エピソード',
    completed: '完了',
    locked: 'ロック中',
    noChatFound: '会話が見つかりません',
    episodeEnded: '✨ エピソード完了',
    selectReply: '返信を選択',
    connectionError: '接続できません',
    genericError: 'エラーが発生しました。もう一度お試しください。',
    you: 'あなた',
    player: 'ユーザー',
    originalAudio: 'オリジナル音源',
    viewMore: '続きを読む',
  },
};

type Energy = { free: number; purchased: number; nextRefillAt: number | null };
type User = { id: string; email: string; ageVerifiedAt: number | null; consentVersion: string | null };
type Creator = { id: string; name: string; bio: string; avatarKey: string | null; relationship: number };
type Comment = { id: string; content: string; createdAt: number; own: boolean };
type Post = {
  id: string;
  creatorId: string;
  creatorName: string;
  caption: string;
  mediaKey: string | null;
  publishedAt: number;
  relationshipRequired: number;
  simulatedLikes: number;
  likes: number;
  comments: Comment[];
  firstCommentUsed: boolean;
};
type Story = {
  id: string;
  creatorId: string;
  type: 'broadcast' | 'unlockable';
  mediaKey: string | null;
  publishedAt: number;
  expiresAt: number | null;
  firstViewedAt: number | null;
};
type Choice = { id: string; text: string; nextNodeId: string };
type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mediaKey?: string | null;
  affectionDelta?: number;
  createdAt: number;
};
type PlayerMemory = {
  key: string;
  value: string;
  createdAt: number;
};
type Chat = {
  revisionId: string;
  episodeId: string;
  episodes: { id: string; title: string; completed: boolean; accessible: boolean }[];
  currentNodeId: string;
  nodes: { id: string; text: string; choices: Choice[]; end: boolean }[];
  history: { id: string; text: string; end: boolean; choiceText?: string }[];
  aiMessages?: AiChatMessage[];
  memories?: PlayerMemory[];
  closeness?: number;
  trust?: number;
  romance?: number;
  score?: number;
  definition?: Record<string, unknown>;
};
type Screen = 'feed' | 'creators' | 'notifications' | 'account';

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `เกิดข้อผิดพลาด (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

const media = (key: string) => `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;

function Media({
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
    <img className={className} src={media(mediaKey)} alt={label} />
  );
}

const formatDateTime = (value: number, lang: Lang) =>
  new Date(value).toLocaleString({ th: 'th-TH', en: 'en-US', ja: 'ja-JP' }[lang], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const json = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });

function StoryContent({ story, name, lang }: { story: Story; name: string; lang: Lang }) {
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

function Modal({
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

function LoginScreen({
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
          <div className="fs-login-langs" role="group" aria-label="Language">
            {LANGS.map(({ id, label, name }) => (
              <button
                key={id}
                type="button"
                lang={id}
                aria-label={name}
                aria-pressed={lang === id}
                onClick={() => onSetLang(id)}
              >
                {label}
              </button>
            ))}
          </div>
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

export function FrostStoryApp() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('froststory_lang');
      if (LANGS.some(({ id }) => id === saved)) return saved as Lang;
    }
    return 'th';
  });

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_lang', newLang);
      document.documentElement.lang = newLang;
    }
  };

  const t = TRANSLATIONS[lang];

  const [user, setUser] = useState<User | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>('feed');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});
  const [heartBurstPostId, setHeartBurstPostId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    { id: string; text: string; createdAt: number }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Free-Text DM Chat State
  const [aiDmTab, setAiDmTab] = useState<'ai' | 'story'>('ai');
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [memoryPanel, setMemoryPanel] = useState<{ open: boolean; items: { key: string; value: string }[] }>({ open: false, items: [] });

  useEffect(() => {
    setMemoryPanel({ open: false, items: [] });
  }, [selectedCreator?.id]);

  async function toggleMemoryPanel() {
    if (!selectedCreator) return;
    if (memoryPanel.open) {
      setMemoryPanel({ open: false, items: [] });
      return;
    }
    try {
      const res = await api<{ memories: { key: string; value: string }[] }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/memories`);
      setMemoryPanel({ open: true, items: res.memories });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function forgetMemory(key: string) {
    if (!selectedCreator) return;
    if (!window.confirm(`ให้ ${selectedCreator.name} ลืมเรื่องนี้ใช่ไหม?`)) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/memories/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setMemoryPanel((prev) => ({ ...prev, items: prev.items.filter((m) => m.key !== key) }));
      if (chat?.memories) setChat({ ...chat, memories: chat.memories.filter((m) => m.key !== key) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSendAiMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCreator || !aiInput.trim() || aiSending) return;
    const text = aiInput.trim();
    setAiInput('');
    setAiSending(true);
    setError('');
    try {
      const res = await api<{
        ok: boolean;
        reply: string;
        mediaKey: string | null;
        messages: AiChatMessage[];
        relationship: number;
        energy: Energy;
      }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/message`, json({ message: text }));

      if (res.messages && chat) {
        setChat({ ...chat, aiMessages: res.messages });
      }
      if (res.energy) {
        setEnergy(res.energy);
      }
      if (typeof res.relationship === 'number') {
        setSelectedCreator({ ...selectedCreator, relationship: res.relationship });
        setCreators((prev) =>
          prev.map((c) =>
            c.id === selectedCreator.id ? { ...c, relationship: res.relationship } : c
          )
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('thread_busy')) {
        setAiInput(text);
        setError(`${selectedCreator.name} กำลังพิมพ์ตอบข้อความก่อนหน้าอยู่… รอสักครู่แล้วส่งใหม่นะคะ`);
      } else if (msg.includes('energy_empty')) {
        setError('พลังงานหมดแล้ว! (1⚡/ข้อความ) รอรีเฟรชพลังงานฟรีวันพรุ่งนี้');
      } else if (msg.includes('rate_limit')) {
        setError('ขณะนี้ระบบ AI ติดขีดจำกัดชั่วคราว (Rate Limit) กรุณารอสักครู่แล้วลองส่งใหม่อีกครั้งนะคะ (คืนพลังงานให้เรียบร้อยแล้ว)');
      } else {
        setError(msg);
      }
    } finally {
      setAiSending(false);
    }
  }

  // Dev Tools State & Actions
  const [showDevBar, setShowDevBar] = useState(false);
  const [devActionLoading, setDevActionLoading] = useState(false);

  async function handleDevRefill(amount: number) {
    setDevActionLoading(true);
    try {
      const res = await api<{ ok: boolean; energy: Energy }>('/api/dev/energy', json({ amount }));
      if (res.energy) setEnergy(res.energy);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refill failed');
    } finally {
      setDevActionLoading(false);
    }
  }

  async function handleDevReset() {
    if (!selectedCreator) return;
    if (!window.confirm(`ต้องการรีเซ็ตแชทและค่าความสัมพันธ์ของ ${selectedCreator.name} ทั้งหมดใช่หรือไม่?`)) return;
    setDevActionLoading(true);
    try {
      await api('/api/dev/reset', json({ creatorId: selectedCreator.id }));
      const refreshed = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}`);
      setChat(refreshed.chat);
      setSelectedCreator({ ...selectedCreator, relationship: 0 });
      setCreators((prev) =>
        prev.map((c) => (c.id === selectedCreator.id ? { ...c, relationship: 0 } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setDevActionLoading(false);
    }
  }

  const loadMe = useCallback(async () => {
    const result = await api<{ user: User; energy: Energy }>('/api/me');
    setUser(result.user);
    setEnergy(result.energy);
    return result.user;
  }, []);

  const loadFeed = useCallback(async () => {
    const [feed, people, highlights] = await Promise.all([
      api<{ posts: Post[] }>('/api/feed'),
      api<{ creators: Creator[] }>('/api/creators'),
      api<{ stories: Story[] }>('/api/stories'),
    ]);
    setPosts(feed.posts);
    setCreators(people.creators);
    setStories(highlights.stories);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await loadMe();
        if (me.ageVerifiedAt) await loadFeed();
      } catch (e) {
        if (active && !(e instanceof ApiError && e.status === 401))
          setError(e instanceof Error ? e.message : t.connectionError);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMe, loadFeed, t.connectionError]);

  useEffect(() => {
    if (chat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function consent() {
    await action(async () => {
      await api('/api/consent', json({ consentVersion: 'beta-2026-10' }));
      await loadMe();
      await loadFeed();
    });
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, post: Post) {
    event.preventDefault();
    const content = comments[post.id]?.trim();
    if (!content) return;
    await action(async () => {
      await api(
        `/api/posts/${encodeURIComponent(post.id)}/comments`,
        json({ content, requestId: crypto.randomUUID() })
      );
      setComments((previous) => ({ ...previous, [post.id]: '' }));
      await Promise.all([loadMe(), loadFeed()]);
    });
  }

  async function likePost(postId: string, showBurst = false) {
    if (showBurst) {
      setHeartBurstPostId(postId);
      window.setTimeout(() => {
        setHeartBurstPostId((prev) => (prev === postId ? null : prev));
      }, 750);
    }
    setLikedPostIds((prev) => ({ ...prev, [postId]: true }));
    await action(async () => {
      await api(`/api/posts/${encodeURIComponent(postId)}/like`, json({}));
      await loadFeed();
    });
  }

  async function openChat(creator: Creator) {
    await action(async () => {
      const result = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(creator.id)}`);
      setSelectedCreator(creator);
      setChat(result.chat);
    });
  }

  async function openStory(story: Story) {
    await action(async () => {
      const result = await api<{ story: Story }>(
        `/api/stories/${encodeURIComponent(story.id)}/view`,
        json({})
      );
      setSelectedStory(result.story);
      await loadFeed();
    });
  }

  const openNotifications = () => {
    setScreen('notifications');
    void action(async () => {
      const result = await api<{
        notifications: { id: string; text: string; createdAt: number }[];
      }>('/api/notifications');
      setNotifications(result.notifications);
    });
  };

  if (loading)
    return (
      <main className="fs-gate" aria-busy="true">
        {t.loading}
      </main>
    );

  if (!user)
    return (
      <LoginScreen
        t={t}
        lang={lang}
        onSetLang={handleSetLang}
        error={error}
      />
    );

  if (!user.ageVerifiedAt)
    return (
      <main className="fs-gate">
        <div className="fs-card fs-welcome">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fs-eyebrow">PRIVATE BETA</span>
            <button
              type="button"
              className="fs-lang-toggle"
              onClick={() => handleSetLang(nextLang(lang))}
            >
              <Globe size={13} />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>
          <h1>{t.consentTitle}</h1>
          <p>{t.consentDesc1}</p>
          <p>{t.consentDesc2}</p>
          {error && <p role="alert">{error}</p>}
          <button className="fs-primary" disabled={busy} onClick={consent}>
            {t.consentAccept}
          </button>
          <button
            className="fs-link"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await api('/api/logout', json({}));
                setUser(null);
                setEnergy(null);
              })
            }
          >
            {t.logout}
          </button>
        </div>
      </main>
    );

  const getCreator = (id: string) => creators.find((creator) => creator.id === id);
  const creatorName = (id: string) => getCreator(id)?.name ?? 'Creator';
  const node = chat?.nodes.find((item) => item.id === chat.currentNodeId);

  return (
    <div className="fs-app">
      {/* Authentic Instagram iOS 18 Top Bar */}
      <header className="fs-insta-header">
        <div className="fs-insta-header-inner">
          <div
            className="fs-brand"
            onClick={() => setScreen('feed')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setScreen('feed')}
            title="Instagram"
          >
            <IgLogo size={96} className="fs-real-logo" />
          </div>

          <div className="fs-header-actions">
            {/* 2-Language Toggle Button */}
            <button
              type="button"
              className="fs-lang-toggle"
              onClick={() => handleSetLang(nextLang(lang))}
              title={LANGS.find(({ id }) => id === nextLang(lang))?.name}
            >
              <Globe size={12} />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Energy Telemetry */}
            <span
              className="fs-energy"
              title={
                energy?.nextRefillAt
                  ? `${t.energyRefillPrefix} ${formatDateTime(energy.nextRefillAt, lang)}`
                  : t.energyRefillDefault
              }
            >
              <Zap size={13} className="fs-energy-icon" />
              {energy ? `${energy.free} + ${energy.purchased}` : '–'}
            </span>

            {/* Official Instagram Heart (Activity / Notifications) */}
            <button
              type="button"
              aria-label={t.notifications}
              title={t.notifications}
              className={`fs-icon-btn ${screen === 'notifications' ? 'is-active' : ''}`}
              onClick={openNotifications}
            >
              <IgHeart size={24} filled={screen === 'notifications'} />
              <span className="fs-notif-dot" />
            </button>

            {/* Official Instagram Paper Airplane (Direct Messages) */}
            <button
              type="button"
              aria-label="Direct Messages"
              title="Direct Messages (DM)"
              className="fs-icon-btn fs-dm-btn-wrap"
              onClick={() => {
                if (creators.length > 0) {
                  setScreen('creators');
                }
              }}
            >
              <IgShare size={23} />
              {creators.length > 0 && (
                <span className="fs-dm-badge">{creators.length}</span>
              )}
            </button>

            {/* Dev Tools Quick Toggle Button */}
            <button
              type="button"
              className={`fs-dev-toggle-btn ${showDevBar ? 'is-active' : ''}`}
              onClick={() => setShowDevBar(!showDevBar)}
              title="เปิดแถบเครื่องมือ Dev & Telemetry"
            >
              🛠️ DEV
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="fs-error" role="alert">
          <span>{error}</span>
          <button aria-label="Close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Centered Instagram iOS Column */}
      <main className="fs-main">
        {screen === 'feed' && (
          <>
            {/* Instagram Stories Row with Exact Gradient Ring */}
            <section className="fs-stories-bar" aria-label="Stories">
              <div
                className="fs-story-item"
                onClick={() => setScreen('account')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setScreen('account')}
              >
                <div className="fs-story-your-ring">
                  <div className="fs-story-your-inner">{t.you}</div>
                  <span className="fs-story-plus">+</span>
                </div>
                <span className="fs-story-name">{t.yourStory}</span>
              </div>

              {stories.map((story) => {
                const creator = getCreator(story.creatorId);
                const name = creator?.name ?? 'Creator';
                const isUnlockable = story.type === 'unlockable';
                const isViewed = !!story.firstViewedAt;
                return (
                  <button
                    key={story.id}
                    className="fs-story-item"
                    onClick={() => {
                      if (isUnlockable && !isViewed) setSelectedStory(story);
                      else void openStory(story);
                    }}
                  >
                    <span
                      className={`fs-story-ring ${
                        isUnlockable
                          ? 'fs-story-unlock'
                          : isViewed
                          ? 'fs-story-viewed'
                          : 'fs-story-unviewed'
                      }`}
                    >
                      <span className="fs-story-ring-inner">
                        {creator?.avatarKey ? (
                          <img alt={name} src={media(creator.avatarKey)} />
                        ) : (
                          name.slice(0, 1)
                        )}
                      </span>
                    </span>
                    <span className="fs-story-name">{name}</span>
                  </button>
                );
              })}

              {creators
                .filter((c) => !stories.some((s) => s.creatorId === c.id))
                .map((creator) => (
                  <button
                    key={`creator-ring-${creator.id}`}
                    className="fs-story-item"
                    onClick={() => void openChat(creator)}
                  >
                    <span className="fs-story-ring fs-story-viewed">
                      <span className="fs-story-ring-inner">
                        {creator.avatarKey ? (
                          <img alt={creator.name} src={media(creator.avatarKey)} />
                        ) : (
                          creator.name.slice(0, 1)
                        )}
                      </span>
                    </span>
                    <span className="fs-story-name">{creator.name}</span>
                  </button>
                ))}
            </section>

            {posts.length === 0 && (
              <p className="fs-empty">{t.noPosts}</p>
            )}

            {/* Instagram Authentic Post Feed */}
            <div className="fs-posts">
              {posts.map((post) => {
                const creator = getCreator(post.creatorId);
                const isLiked = !!likedPostIds[post.id] || post.likes > 0;
                const isSaved = !!savedPostIds[post.id];
                const totalLikes = post.likes + post.simulatedLikes;

                return (
                  <article className="fs-insta-post" key={post.id}>
                    {/* Instagram Post Header */}
                    <div className="fs-post-header">
                      <div
                        className="fs-post-author"
                        onClick={() => {
                          if (creator) void openChat(creator);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && creator) void openChat(creator);
                        }}
                      >
                        <div className="fs-avatar-ring">
                          <div className="fs-avatar">
                            {creator?.avatarKey ? (
                              <img src={media(creator.avatarKey)} alt={post.creatorName} />
                            ) : (
                              post.creatorName.slice(0, 1)
                            )}
                          </div>
                        </div>
                        <div className="fs-post-author-meta">
                          <div className="fs-post-author-row">
                            <strong>{post.creatorName}</strong>
                            <IgVerified size={15} />
                            {creator && (
                              <span className="fs-rel-pill">
                                Lv.{creator.relationship}
                              </span>
                            )}
                          </div>
                          <div className="fs-audio-subtitle">
                            <IgAudio size={11} />
                            <span>{t.originalAudio} · {creator?.id || 'creator'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="fs-post-header-right">
                        <button
                          type="button"
                          className="fs-more-btn"
                          aria-label="Options"
                          onClick={() => {
                            if (creator) void openChat(creator);
                          }}
                        >
                          <IgMore size={20} />
                        </button>
                      </div>
                    </div>

                    {/* True Edge-to-Edge Media with Double-Tap Heart */}
                    <div
                      className={`fs-post-media-frame ${
                        post.mediaKey ? '' : 'fs-post-media-quote'
                      }`}
                      onDoubleClick={() => void likePost(post.id, true)}
                    >
                      {post.mediaKey ? (
                        <Media
                          className="fs-post-image"
                          mediaKey={post.mediaKey}
                          label={post.caption}
                        />
                      ) : (
                        <div className="fs-quote-backdrop">
                          <p className="fs-quote-text">“{post.caption}”</p>
                          <span className="fs-quote-author">— {post.creatorName}</span>
                        </div>
                      )}

                      {/* Floating Reward Pill */}
                      <span
                        className={`fs-energy-float-tag ${
                          post.firstCommentUsed ? 'is-claimed' : ''
                        }`}
                      >
                        {post.firstCommentUsed
                          ? t.claimedReward
                          : t.firstCommentReward}
                      </span>

                      {/* Instagram Double-Tap Heart Pop */}
                      {heartBurstPostId === post.id && (
                        <div className="fs-heart-burst" aria-hidden="true">
                          <IgHeart size={92} filled />
                        </div>
                      )}
                    </div>

                    {/* Official Instagram Action Bar */}
                    <div className="fs-post-actions-bar">
                      <div className="fs-post-actions-left">
                        <button
                          type="button"
                          className={`fs-action-icon-btn ${isLiked ? 'is-liked' : ''}`}
                          disabled={busy}
                          onClick={() => void likePost(post.id, true)}
                          title="Like"
                        >
                          <IgHeart size={25} filled={isLiked} />
                        </button>

                        <label
                          htmlFor={`comment-${post.id}`}
                          className="fs-action-icon-btn"
                          title="Comment"
                        >
                          <IgComment size={24} />
                        </label>

                        <button
                          type="button"
                          className="fs-action-icon-btn"
                          title="Share / DM"
                          onClick={() => {
                            if (creator) void openChat(creator);
                          }}
                        >
                          <IgShare size={24} />
                        </button>
                      </div>

                      <div className="fs-post-actions-right">
                        <button
                          type="button"
                          className={`fs-action-icon-btn ${isSaved ? 'is-saved' : ''}`}
                          aria-label="Bookmark"
                          onClick={() =>
                            setSavedPostIds((prev) => ({
                              ...prev,
                              [post.id]: !prev[post.id],
                            }))
                          }
                        >
                          <IgBookmark size={24} filled={isSaved} />
                        </button>
                      </div>
                    </div>

                    {/* Instagram Post Body */}
                    <div className="fs-post-body">
                      <div className="fs-likes-count">
                        {t.likesCount(totalLikes)}
                      </div>

                      <p className="fs-caption-line">
                        <strong className="fs-caption-author">{post.creatorName}</strong>{' '}
                        <span>{post.caption}</span>
                      </p>

                      {/* View Comments Link */}
                      {post.comments.length > 0 && (
                        <button
                          type="button"
                          className="fs-view-comments-btn"
                          onClick={() => {
                            if (creator) void openChat(creator);
                          }}
                        >
                          {t.commentsTitle(post.comments.length)}
                        </button>
                      )}

                      {/* Comments Preview */}
                      {post.comments.length > 0 && (
                        <div className="fs-comments-preview-list">
                          {post.comments.slice(-2).map((comment) => (
                            <div className="fs-comment-item" key={comment.id}>
                              <strong className="fs-comment-author">
                                {comment.own ? t.you : t.player}
                              </strong>{' '}
                              <span className="fs-comment-txt">{comment.content}</span>
                              {comment.own ? (
                                <button
                                  type="button"
                                  className="fs-comment-act-btn"
                                  disabled={busy}
                                  onClick={() =>
                                    void action(async () => {
                                      await api(
                                        `/api/comments/${encodeURIComponent(comment.id)}`,
                                        { method: 'DELETE' }
                                      );
                                      await loadFeed();
                                    })
                                  }
                                >
                                  {t.delete}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="fs-comment-act-btn"
                                  disabled={busy}
                                  onClick={() => {
                                    const reason = window.prompt(t.reportPrompt);
                                    if (reason?.trim())
                                      void action(async () => {
                                        await api(
                                          `/api/comments/${encodeURIComponent(
                                            comment.id
                                          )}/report`,
                                          json({ reason: reason.trim() })
                                        );
                                      });
                                  }}
                                >
                                  {t.report}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="fs-post-timestamp">
                        {formatDateTime(post.publishedAt, lang)}
                      </div>

                      {/* Native Style Inline Comment Input with User Avatar */}
                      <form
                        className="fs-comment-form"
                        onSubmit={(event) => void submitComment(event, post)}
                      >
                        <div className="fs-avatar fs-avatar-tiny">
                          <UserIcon size={14} />
                        </div>
                        <input
                          id={`comment-${post.id}`}
                          maxLength={1000}
                          placeholder={t.commentPlaceholder}
                          value={comments[post.id] ?? ''}
                          onChange={(event) =>
                            setComments((previous) => ({
                              ...previous,
                              [post.id]: event.target.value,
                            }))
                          }
                        />
                        {comments[post.id]?.trim() && (
                          <button
                            disabled={busy}
                            type="submit"
                            className="fs-comment-post-btn"
                          >
                            {t.postBtn}
                          </button>
                        )}
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {screen === 'creators' && (
          <div className="fs-section-pad">
            <div className="fs-section-heading">
              <div>
                <span className="fs-eyebrow">DIRECT MESSAGES</span>
                <h1>{t.knowBetterTitle}</h1>
              </div>
              <span className="fs-muted">{t.charactersCount(creators.length)}</span>
            </div>

            <div className="fs-creator-list">
              {creators.map((creator) => (
                <article
                  className="fs-creator-dm-row"
                  key={creator.id}
                  onClick={() => void openChat(creator)}
                >
                  <div className="fs-creator-avatar-wrap">
                    <div className="fs-avatar fs-avatar-large">
                      {creator.avatarKey ? (
                        <img src={media(creator.avatarKey)} alt={creator.name} />
                      ) : (
                        creator.name.slice(0, 1)
                      )}
                    </div>
                    <span className="fs-online-dot" />
                  </div>

                  <div className="fs-creator-info">
                    <div className="fs-creator-title-row">
                      <h2>{creator.name}</h2>
                      <IgVerified size={15} />
                      <span className="fs-rel-pill">
                        {t.relationship} {creator.relationship}
                      </span>
                    </div>
                    <p>{creator.bio}</p>
                  </div>

                  <button
                    type="button"
                    className="fs-dm-pill-btn"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      void openChat(creator);
                    }}
                  >
                    {t.openDM}
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {screen === 'notifications' && (
          <div className="fs-section-pad">
            <div className="fs-section-heading">
              <div>
                <span className="fs-eyebrow">ACTIVITY</span>
                <h1>{t.notifications}</h1>
              </div>
            </div>
            {notifications.length ? (
              notifications.map((notice) => (
                <article className="fs-card fs-notice" key={notice.id}>
                  <div className="fs-notice-dot" />
                  <div>
                    <p>{notice.text}</p>
                    <small>{formatDateTime(notice.createdAt, lang)}</small>
                  </div>
                </article>
              ))
            ) : (
              <p className="fs-empty">{t.noNotifs}</p>
            )}
          </div>
        )}

        {screen === 'account' && (
          <div className="fs-section-pad">
            <div className="fs-section-heading">
              <div>
                <span className="fs-eyebrow">PROFILE</span>
                <h1>{t.account}</h1>
              </div>
            </div>
            <section className="fs-card fs-account">
              <div className="fs-account-profile">
                <div className="fs-avatar fs-avatar-large">
                  <UserIcon size={24} />
                </div>
                <div>
                  <strong>{user.email}</strong>
                  <span className="fs-muted">{t.betaUserDesc}</span>
                </div>
              </div>

              <div className="fs-account-lang">
                <span>{t.languageSetting}</span>
                <div className="fs-lang-buttons">
                  {LANGS.map(({ id, name }) => (
                    <button
                      key={id}
                      type="button"
                      className={lang === id ? 'is-active' : ''}
                      onClick={() => handleSetLang(id)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="fs-small"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api('/api/logout', json({}));
                    setUser(null);
                    setEnergy(null);
                  })
                }
              >
                {t.logout}
              </button>
              <hr />
              <h2>{t.deleteAccountTitle}</h2>
              <p>{t.deleteAccountDesc}</p>
              <button
                className="fs-danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t.deleteAccountConfirm))
                    void action(async () => {
                      await api('/api/account', { method: 'DELETE' });
                      setUser(null);
                      setEnergy(null);
                    });
                }}
              >
                {t.deleteAccountBtn}
              </button>
            </section>
          </div>
        )}
      </main>

      {/* Official Instagram iOS Bottom Tab Navigation Bar */}
      <nav className="fs-insta-bottom-bar" aria-label="Bottom Navigation">
        <button
          type="button"
          className={`fs-nav-tab ${screen === 'feed' ? 'is-active' : ''}`}
          onClick={() => setScreen('feed')}
          title={t.feed}
        >
          <IgHome size={25} active={screen === 'feed'} />
        </button>

        <button
          type="button"
          className={`fs-nav-tab ${screen === 'creators' ? 'is-active' : ''}`}
          onClick={() => setScreen('creators')}
          title={t.creators}
        >
          <IgSearch size={25} active={screen === 'creators'} />
        </button>

        <button
          type="button"
          className="fs-nav-tab"
          onClick={() => {
            if (creators.length > 0) void openChat(creators[0]);
          }}
          title="Create"
        >
          <IgCreate size={25} />
        </button>

        <button
          type="button"
          className="fs-nav-tab"
          onClick={() => {
            if (stories.length > 0) void openStory(stories[0]);
          }}
          title="Reels / Stories"
        >
          <IgReels size={25} />
        </button>

        <button
          type="button"
          className={`fs-nav-tab fs-profile-tab ${screen === 'account' ? 'is-active' : ''}`}
          onClick={() => setScreen('account')}
          title={t.account}
        >
          <div className="fs-avatar fs-avatar-tiny fs-bottom-user-avatar">
            <UserIcon size={14} />
          </div>
        </button>
      </nav>

      {/* Fullscreen 9:16 Instagram Story Viewer Modal */}
      {selectedStory && (
        <Modal labelledBy="fs-story-title" onClose={() => setSelectedStory(null)}>
          <section className="fs-story-modal-card">
            <div className="fs-story-top-overlay">
              <div className="fs-story-progress-track">
                <div className="fs-story-progress-bar" />
              </div>
              <div className="fs-story-header-row">
                <div className="fs-story-author">
                  <div className="fs-avatar">
                    {getCreator(selectedStory.creatorId)?.avatarKey ? (
                      <img
                        src={media(getCreator(selectedStory.creatorId)!.avatarKey!)}
                        alt=""
                      />
                    ) : (
                      creatorName(selectedStory.creatorId).slice(0, 1)
                    )}
                  </div>
                  <div>
                    <h2 id="fs-story-title">
                      {creatorName(selectedStory.creatorId)}
                    </h2>
                    <span className="fs-story-sub">
                      {selectedStory.type === 'unlockable'
                        ? t.exclusiveStory
                        : t.broadcastStory}
                    </span>
                  </div>
                </div>
                <button
                  className="fs-story-close"
                  aria-label="Close"
                  onClick={() => setSelectedStory(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="fs-story-body">
              {selectedStory.type === 'unlockable' && !selectedStory.firstViewedAt ? (
                <div className="fs-story-unlock-gate">
                  <Sparkles size={36} className="fs-unlock-icon" />
                  <p>{t.unlockableGateDesc}</p>
                  <button
                    className="fs-primary"
                    disabled={busy}
                    onClick={() => void openStory(selectedStory)}
                  >
                    {t.openStoryBtn}
                  </button>
                </div>
              ) : (
                <StoryContent
                  story={selectedStory}
                  name={creatorName(selectedStory.creatorId)}
                  lang={lang}
                />
              )}
            </div>

            <div className="fs-story-bottom-bar">
              <button
                type="button"
                className="fs-story-reply-btn"
                onClick={() => {
                  const creator = getCreator(selectedStory.creatorId);
                  setSelectedStory(null);
                  if (creator) void openChat(creator);
                }}
              >
                <span>{t.replyStoryPlaceholder}</span>
                <Send size={15} />
              </button>
            </div>
          </section>
        </Modal>
      )}

      {/* Instagram Direct Message (DM) Active Chat Modal */}
      {selectedCreator && chat && (
        <Modal
          labelledBy="fs-chat-title"
          onClose={() => {
            setSelectedCreator(null);
            setChat(null);
          }}
        >
          <section className="fs-dm-modal">
            {/* Sticky Instagram DM Header */}
            <header className="fs-dm-header">
              <div className="fs-dm-header-left">
                <button
                  className="fs-dm-back"
                  aria-label="Back"
                  onClick={() => {
                    setSelectedCreator(null);
                    setChat(null);
                  }}
                >
                  <ArrowLeft size={22} />
                </button>
                <div className="fs-creator-avatar-wrap">
                  <div className="fs-avatar">
                    {selectedCreator.avatarKey ? (
                      <img
                        src={media(selectedCreator.avatarKey)}
                        alt={selectedCreator.name}
                      />
                    ) : (
                      selectedCreator.name.slice(0, 1)
                    )}
                  </div>
                  <span className="fs-online-dot" />
                </div>
                <div>
                  <div className="fs-dm-title-row">
                    <h2 id="fs-chat-title">{selectedCreator.name}</h2>
                    <IgVerified size={15} />
                  </div>
                  <span className="fs-dm-status">
                    {t.online} · {t.relationship} Lv.{selectedCreator.relationship}
                  </span>
                </div>
              </div>

              <div className="fs-dm-header-icons" aria-hidden="true">
                <Phone size={18} />
                <Video size={18} />
                <Info size={18} />
              </div>
            </header>

            {/* Mode Switcher: 100% Free AI Chatbot vs Scripted Story */}
            <div className="fs-dm-mode-toggle">
              <button
                type="button"
                className={`fs-dm-mode-btn ${aiDmTab === 'ai' ? 'active' : ''}`}
                onClick={() => setAiDmTab('ai')}
              >
                <Sparkles size={13} />
                <span>💬 คุยสด AI (100% Free Chat)</span>
              </button>
              <button
                type="button"
                className={`fs-dm-mode-btn ${aiDmTab === 'story' ? 'active' : ''}`}
                onClick={() => setAiDmTab('story')}
              >
                <span>📖 บทเนื้อเรื่อง (Story)</span>
              </button>
            </div>

            {/* Episode Switcher Bar (Only in Story mode) */}
            {aiDmTab === 'story' && chat.episodes?.length > 0 && (
              <div className="fs-episodes" aria-label={t.selectEpisode}>
                {chat.episodes.map((episode) => (
                  <button
                    className="fs-episode-pill"
                    key={episode.id}
                    aria-current={episode.id === chat.episodeId ? 'true' : undefined}
                    disabled={
                      busy || !episode.accessible || episode.id === chat.episodeId
                    }
                    onClick={() =>
                      void action(async () => {
                        const result = await api<{ chat: Chat }>(
                          `/api/chats/${encodeURIComponent(
                            selectedCreator.id
                          )}/episode`,
                          json({ episodeId: episode.id })
                        );
                        setChat(result.chat);
                      })
                    }
                  >
                    {episode.title}
                    {episode.completed ? ` · ${t.completed}` : ''}
                    {!episode.accessible ? ` · ${t.locked}` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Instagram DM Messages Scroll Area */}
            <div className="fs-dm-messages">
              {/* Creator Bio Header inside Chat */}
              <div className="fs-dm-bio-card">
                <div className="fs-avatar fs-avatar-large fs-dm-bio-avatar">
                  {selectedCreator.avatarKey ? (
                    <img
                      src={media(selectedCreator.avatarKey)}
                      alt={selectedCreator.name}
                    />
                  ) : (
                    selectedCreator.name.slice(0, 1)
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <strong>{selectedCreator.name}</strong>
                  <IgVerified size={15} />
                </div>
                <span className="fs-dm-handle">@{selectedCreator.id}</span>
                <p>{selectedCreator.bio}</p>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  <span>💖 สนิทสนม: {selectedCreator.relationship}/100</span>
                  <span>⚡ พลังงาน: {(energy?.free || 0) + (energy?.purchased || 0)}</span>
                </div>
              </div>

              {aiDmTab === 'ai' ? (
                <>
                  {chat.aiMessages && chat.aiMessages.length > 0 ? (
                    chat.aiMessages.map((msg) =>
                      msg.role === 'user' ? (
                        <div key={msg.id} className="fs-dm-row-right">
                          <div className="fs-answer" style={{ maxWidth: '82%', wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div key={msg.id} className="fs-dm-row-left" style={{ alignItems: 'flex-start' }}>
                          <div className="fs-avatar fs-avatar-tiny">
                            {selectedCreator.avatarKey ? (
                              <img src={media(selectedCreator.avatarKey)} alt="" />
                            ) : (
                              selectedCreator.name.slice(0, 1)
                            )}
                          </div>
                          <div style={{ maxWidth: '82%' }}>
                            {msg.mediaKey && (
                              <div>
                                <span className="fs-reward-badge">🎁 ปลดล็อกรูปรางวัลพิเศษ!</span>
                                <img src={media(msg.mediaKey)} alt="Reward" className="fs-reward-photo" />
                              </div>
                            )}
                            <div className="fs-bubble" style={{ wordBreak: 'break-word' }}>
                              {msg.content}
                            </div>
                            {msg.affectionDelta ? (
                              <span style={{ fontSize: '0.65rem', color: '#f472b6', marginTop: '2px', display: 'inline-block' }}>
                                +{msg.affectionDelta} 💖 ความสนิทสนม
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                      <p>✨ ทักทาย <strong>{selectedCreator.name}</strong> ได้เลยค่ะ!</p>
                      <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>พิมพ์ข้อความคุยสดแบบ AI Chatbot 100% ฟรีสไตล์ (ใช้ 1⚡ ต่อข้อความ)</p>
                    </div>
                  )}

                  {aiSending && (
                    <div className="fs-dm-row-left">
                      <div className="fs-avatar fs-avatar-tiny">
                        {selectedCreator.avatarKey ? (
                          <img src={media(selectedCreator.avatarKey)} alt="" />
                        ) : (
                          selectedCreator.name.slice(0, 1)
                        )}
                      </div>
                      <div className="fs-ai-typing">
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              ) : node ? (
                <>
                  {chat.history.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="fs-dm-turn">
                      <div className="fs-dm-row-left">
                        <div className="fs-avatar fs-avatar-tiny">
                          {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                        </div>
                        <div className="fs-bubble">{entry.text}</div>
                      </div>
                      {entry.choiceText && (
                        <div className="fs-dm-row-right">
                          <div className="fs-answer">{entry.choiceText}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="fs-dm-row-left">
                    <div className="fs-avatar fs-avatar-tiny">
                      {selectedCreator.avatarKey ? (
                        <img src={media(selectedCreator.avatarKey)} alt="" />
                      ) : (
                        selectedCreator.name.slice(0, 1)
                      )}
                    </div>
                    <div className="fs-bubble">{node.text}</div>
                  </div>

                  <div ref={chatEndRef} />
                </>
              ) : (
                <p className="fs-empty">{t.noChatFound}</p>
              )}
            </div>

            {/* Player Memory: what this Creator remembers about the player */}
            {aiDmTab === 'ai' && (
              <div style={{ padding: '6px 12px', fontSize: 12 }}>
                <button type="button" onClick={toggleMemoryPanel} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}>
                  🧠 สิ่งที่ {selectedCreator.name} จำเกี่ยวกับคุณ {memoryPanel.open ? '▲' : '▼'}
                </button>
                {memoryPanel.open && (
                  memoryPanel.items.length === 0 ? (
                    <p style={{ margin: '6px 0 0', opacity: 0.7 }}>ยังไม่มีเรื่องที่จำไว้</p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                      {memoryPanel.items.map((m) => (
                        <li key={m.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span>{m.value}</span>
                          <button type="button" onClick={() => forgetMemory(m.key)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>
                            ลืม
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            )}

            {/* Bottom Interactive Tray */}
            {aiDmTab === 'ai' ? (
              <form className="fs-dm-input-form" onSubmit={handleSendAiMessage}>
                <input
                  type="text"
                  className="fs-dm-text-input"
                  placeholder={`ส่งข้อความหา ${selectedCreator.name}... (1⚡)`}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={aiSending}
                />
                <button
                  type="submit"
                  className="fs-dm-send-btn"
                  disabled={!aiInput.trim() || aiSending}
                >
                  <Send size={14} />
                  <span>{aiSending ? '...' : 'ส่ง'}</span>
                </button>
              </form>
            ) : (
              <footer className="fs-dm-footer">
                {node ? (
                  node.end ? (
                    <p className="fs-dm-ended">{t.episodeEnded}</p>
                  ) : (
                    <div className="fs-dm-choices">
                      <span className="fs-dm-choices-label">
                        <Sparkles size={12} /> {t.selectReply}
                      </span>
                      {node.choices.map((choice) => (
                        <button
                          key={choice.id}
                          className="fs-choice"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              const result = await api<{ chat: Chat }>(
                                `/api/chats/${encodeURIComponent(
                                  selectedCreator.id
                                )}/choose`,
                                json({ choiceId: choice.id })
                              );
                              setChat(result.chat);
                            })
                          }
                        >
                          <Sparkles size={14} className="fs-choice-sparkle" />
                          <span>{choice.text}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : null}
              </footer>
            )}
          </section>
        </Modal>
      )}

      {/* Dev Tools Telemetry Drawer */}
      {showDevBar && (
        <aside className="fs-dev-drawer" aria-label="แถบเครื่องมือ Dev">
          <div className="fs-dev-drawer-header">
            <div className="fs-dev-drawer-title">
              <span>🛠️ Dev Tools & Telemetry Monitor</span>
            </div>
            <button
              type="button"
              className="fs-dev-close-btn"
              onClick={() => setShowDevBar(false)}
              aria-label="Close Dev Drawer"
            >
              ✕
            </button>
          </div>

          {/* Quick Energy Refill */}
          <div className="fs-dev-card">
            <div className="fs-dev-card-label">
              <span>⚡ พลังงานทดสอบ (Energy)</span>
              <strong style={{ color: '#38bdf8' }}>
                {(energy?.free || 0) + (energy?.purchased || 0)} ⚡
              </strong>
            </div>
            <div className="fs-dev-btn-group">
              <button
                type="button"
                className="fs-dev-action-btn success"
                disabled={devActionLoading}
                onClick={() => void handleDevRefill(5)}
              >
                +5⚡ เติมด่วน
              </button>
              <button
                type="button"
                className="fs-dev-action-btn success"
                disabled={devActionLoading}
                onClick={() => void handleDevRefill(10)}
              >
                +10⚡ เติมเต็ม
              </button>
            </div>
          </div>

          {/* 3D Relationship Telemetry */}
          {selectedCreator && (
            <div className="fs-dev-card">
              <div className="fs-dev-card-label">
                <span>💖 3D Relationship ({selectedCreator.name})</span>
                <span style={{ color: '#f472b6' }}>
                  Lv.{Math.min(5, Math.floor((selectedCreator.relationship || 0) / 20) + 1)}
                </span>
              </div>
              <div className="fs-dev-stat-grid">
                <div className="fs-dev-stat-item">
                  <span className="fs-dev-stat-num">{chat?.closeness ?? 0}</span>
                  <div className="fs-dev-stat-title">Closeness</div>
                </div>
                <div className="fs-dev-stat-item">
                  <span className="fs-dev-stat-num">{chat?.trust ?? 0}</span>
                  <div className="fs-dev-stat-title">Trust</div>
                </div>
                <div className="fs-dev-stat-item">
                  <span className="fs-dev-stat-num">{chat?.romance ?? 0}</span>
                  <div className="fs-dev-stat-title">Romance</div>
                </div>
                <div className="fs-dev-stat-item">
                  <span className="fs-dev-stat-num" style={{ color: '#f472b6' }}>
                    {selectedCreator.relationship}
                  </span>
                  <div className="fs-dev-stat-title">Score</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Memories Inspector */}
          {chat?.memories && chat.memories.length > 0 && (
            <div className="fs-dev-card">
              <div className="fs-dev-card-label">
                <span>🧠 AI Memories ({chat.memories.length})</span>
              </div>
              <div className="fs-dev-memory-list">
                {chat.memories.map((m) => (
                  <div key={m.key} className="fs-dev-memory-tag">
                    <strong style={{ color: '#38bdf8' }}>{m.key}</strong>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset & Quick Links */}
          <div className="fs-dev-card">
            <div className="fs-dev-card-label">
              <span>🔧 คำสั่งจัดการด่วน</span>
            </div>
            <div className="fs-dev-btn-group">
              {selectedCreator && (
                <button
                  type="button"
                  className="fs-dev-action-btn danger"
                  disabled={devActionLoading}
                  onClick={() => void handleDevReset()}
                >
                  🔄 รีเซ็ตแชท {selectedCreator.name}
                </button>
              )}
              <a
                href="/studio"
                target="_blank"
                rel="noreferrer"
                className="fs-dev-action-btn"
                style={{ textDecoration: 'none' }}
              >
                🛠️ เปิด Creator Studio ➔
              </a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
