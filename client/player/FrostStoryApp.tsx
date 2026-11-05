import { Fragment, useCallback, useEffect, useLayoutEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Globe,
  LockKeyhole,
  MessageSquareX,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import {
  GoogleG,
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

export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'th', label: 'ไทย', name: 'ภาษาไทย' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'ja', label: 'JP', name: '日本語' },
];

function LangSelect({
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

export const TRANSLATIONS = {
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
      not_allowed: 'บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้งานเว็บนี้',
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
    chatTab: 'แชท',
    storyTab: 'เนื้อเรื่อง',
    resetChat: 'รีเซ็ตแชท',
    resetChatConfirm: 'เริ่มบทสนทนาใหม่ (ล้างประวัติแชท AI) สำหรับตัวละครนี้ใช่หรือไม่?',
    resetStory: 'รีเซ็ตเนื้อเรื่อง',
    resetStoryConfirm: 'เริ่มเนื้อเรื่องใหม่สำหรับตัวละครนี้ใช่หรือไม่?',
    chatSettings: 'ตั้งค่าแชท',
    sendFailed: 'ส่งไม่สำเร็จ · แตะเพื่อลองใหม่',
    chatLoading: 'กำลังเปิดแชท',
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
      not_allowed: 'This account does not have access to this site.',
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
    chatTab: 'Chat',
    storyTab: 'Story',
    resetChat: 'Reset Chat',
    resetChatConfirm: 'Reset AI chat history with this character?',
    resetStory: 'Reset Story',
    resetStoryConfirm: 'Restart the story for this character?',
    chatSettings: 'Chat settings',
    sendFailed: 'Not sent · Tap to retry',
    chatLoading: 'Opening chat',
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
      not_allowed: 'このアカウントにはこのサイトへのアクセス権がありません。',
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
    chatTab: 'チャット',
    storyTab: 'ストーリー',
    resetChat: 'チャットリセット',
    resetChatConfirm: 'このキャラクターとのAIチャット履歴をリセットしますか？',
    resetStory: 'ストーリーリセット',
    resetStoryConfirm: 'このキャラクターのストーリーを最初からやり直しますか？',
    chatSettings: 'チャット設定',
    sendFailed: '送信できませんでした · タップして再送',
    chatLoading: 'チャットを開いています',
  },
};

type Energy = { free: number; purchased: number; nextRefillAt: number | null; unlimited?: boolean };
type User = {
  id: string;
  email: string;
  ageVerifiedAt: number | null;
  consentVersion: string | null;
  isAdmin?: boolean;
};
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
  unlockedRewards?: string[];
  closeness?: number;
  trust?: number;
  romance?: number;
  score?: number;
  definition?: Record<string, unknown>;
};
type Screen = 'feed' | 'creators' | 'notifications' | 'account';

type ProfileVaultItem = {
  id: string;
  name: string;
  asset: string;
  caption: string;
  message: string;
  minLevel: number;
  unlocked: boolean;
};

type ProfileData = {
  creator: Creator & {
    tagline?: string;
    tags?: string[];
    closeness?: number;
    trust?: number;
    romance?: number;
    level?: number;
  };
  posts: Post[];
  vault: ProfileVaultItem[];
  episodes: { id: string; title: string; completed: boolean; accessible: boolean }[];
};

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

function ChatComposer({
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

function renderBubbleContent(text: string, onExpandMedia?: (key: string) => void) {
  if (!text) return null;

  let mood: string | null = null;
  let thought: string | null = null;
  let visual: string | null = null;
  let bodyText = text;

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
    bodyText.match(/^\[(?:visual|action):\s*([\s\S]*?)\]\n?/) ||
    bodyText.match(/^\*\[?([\s\S]*?)\]?\*\n?/);
  if (visualMatch) {
    visual = visualMatch[1].trim();
    bodyText = bodyText.substring(visualMatch[0].length);
  }

  const imgRegex = /\[img:([^\]]+)\]/g;
  let bodyNodes: React.ReactNode;
  if (!imgRegex.test(bodyText)) {
    bodyNodes = (
      <span className="fs-bubble-text">
        {bodyText.split('\n').map((line, lineIdx, arr) => (
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

  if (mood || thought || visual) {
    return (
      <div className="fs-bubble-with-meta">
        {mood && (
          <div className="fs-mood-box" title="ความรู้สึกของตัวละคร">
            <span className="fs-mood-icon">💕</span>
            <span className="fs-mood-text">{mood}</span>
          </div>
        )}
        {thought && (
          <div className="fs-thought-box" title="ความคิดในใจ">
            <span className="fs-thought-icon">💭</span>
            <span className="fs-thought-text">{thought}</span>
          </div>
        )}
        {visual && (
          <div className="fs-visual-box" title="ภาพเหตุการณ์ / กิริยาท่าทาง">
            <span className="fs-visual-icon">🎬</span>
            <span className="fs-visual-text">{visual}</span>
          </div>
        )}
        {bodyNodes}
      </div>
    );
  }

  return bodyNodes;
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
  const msgsRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const chatOpenedAtRef = useRef(0);
  const episodesBarRef = useRef<HTMLDivElement>(null);
  const isDraggingEpisodesRef = useRef(false);
  const startEpisodesXRef = useRef(0);
  const scrollEpisodesLeftRef = useRef(0);
  const hasEpisodesDraggedRef = useRef(false);

  const handleEpisodesMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!episodesBarRef.current) return;
    isDraggingEpisodesRef.current = true;
    hasEpisodesDraggedRef.current = false;
    startEpisodesXRef.current = e.pageX - episodesBarRef.current.offsetLeft;
    scrollEpisodesLeftRef.current = episodesBarRef.current.scrollLeft;
  };

  const handleEpisodesMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingEpisodesRef.current || !episodesBarRef.current) return;
    const x = e.pageX - episodesBarRef.current.offsetLeft;
    const walk = x - startEpisodesXRef.current;
    if (Math.abs(walk) > 4) {
      hasEpisodesDraggedRef.current = true;
    }
    episodesBarRef.current.scrollLeft = scrollEpisodesLeftRef.current - walk;
  };

  const handleEpisodesMouseUpOrLeave = () => {
    isDraggingEpisodesRef.current = false;
  };

  // AI Free-Text DM Chat State
  const [aiDmTab, setAiDmTab] = useState<'ai' | 'story'>('ai');
  const [dmMenuOpen, setDmMenuOpen] = useState(false);
  const dmMenuRef = useRef<HTMLDivElement | null>(null);
  const [aiSending, setAiSending] = useState(false);
  const [pending, setPending] = useState<{ id: string; content: string; failed?: string }[]>([]);
  const [unlockedRewards, setUnlockedRewards] = useState<string[]>([]);
  const [memoryPanel, setMemoryPanel] = useState<{ open: boolean; items: { key: string; value: string }[] }>({ open: false, items: [] });
  const [unlockedStoryModal, setUnlockedStoryModal] = useState<{
    open: boolean;
    creatorName: string;
    avatarKey?: string | null;
    episodeTitle?: string;
  }>({ open: false, creatorName: '' });

  // Reset menu lives behind the gear icon; dismiss on any click outside it.
  useEffect(() => {
    if (!dmMenuOpen) return;
    function dismiss(event: MouseEvent) {
      if (!dmMenuRef.current?.contains(event.target as Node)) setDmMenuOpen(false);
    }
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [dmMenuOpen]);

  // Lightbox / Fullscreen Image Viewer Modal (constrained to app screen)
  const [expandedMedia, setExpandedMedia] = useState<{
    mediaKey: string;
    title?: string;
    caption?: string;
  } | null>(null);

  // Creator Profile & Close Friends Vault State (ADR 0012)
  const [profileCreator, setProfileCreator] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileTab, setProfileTab] = useState<'feed' | 'vault' | 'episodes'>('feed');
  const [profileLoading, setProfileLoading] = useState(false);
  const [storyToast, setStoryToast] = useState<string | null>(null);
  const [storyReplyText, setStoryReplyText] = useState('');

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

  async function sendAiMessage(text: string, retryId?: string) {
    if (!selectedCreator || !chat || aiSending) return;
    const id = retryId ?? crypto.randomUUID();
    setPending((prev) =>
      retryId
        ? prev.map((item) => (item.id === id ? { id, content: text } : item))
        : [...prev, { id, content: text }]
    );
    stickToBottomRef.current = true;
    setAiSending(true);
    try {
      const res = await api<{
        ok: boolean;
        reply: string;
        suggestedReplies?: string[];
        moodToast?: string | null;
        mediaKey: string | null;
        messages: AiChatMessage[];
        unlockedRewards?: string[];
        relationship: number;
        energy: Energy;
      }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/message`, json({ message: text }));

      setPending((prev) => prev.filter((item) => item.id !== id));
      if (res.messages) setChat((prev) => (prev ? { ...prev, aiMessages: res.messages } : prev));
      if (res.energy) setEnergy(res.energy);
      if (res.unlockedRewards) setUnlockedRewards(res.unlockedRewards);
      if (typeof res.relationship === 'number') {
        const prevRel = selectedCreator.relationship || 0;
        if (prevRel < 100 && res.relationship >= 100) {
          alert(`🎉 ยินดีด้วย! ความสัมพันธ์ครบ 100 คุณได้รับตรา "💎 แฟนตัวยง" ของ ${selectedCreator.name} แล้ว!`);
        }
        setSelectedCreator((prev) => (prev ? { ...prev, relationship: res.relationship } : prev));
        setCreators((prev) =>
          prev.map((c) => (c.id === selectedCreator.id ? { ...c, relationship: res.relationship } : c))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const reason = msg.includes('thread_busy')
        ? `${selectedCreator.name} กำลังพิมพ์ตอบข้อความก่อนหน้าอยู่`
        : msg.includes('energy_empty')
          ? 'พลังงานหมด (1⚡ ต่อข้อความ) รอรีเฟรชพรุ่งนี้'
          : msg.includes('rate_limit')
            ? 'ระบบ AI มีคนใช้เยอะ รอสักครู่ คืนพลังงานให้แล้ว'
            : msg.includes('ai_unavailable')
              ? 'AI ตอบไม่ได้ชั่วคราว คืนพลังงานให้แล้ว'
              : msg;
      setPending((prev) => prev.map((item) => (item.id === id ? { ...item, failed: reason } : item)));
    } finally {
      setAiSending(false);
    }
  }

  async function unlockReward(mediaKey: string, method: 'level' | 'energy') {
    if (!selectedCreator) return;
    try {
      const res = await api<{ ok: boolean; unlocked: boolean; energy?: Energy }>(
        `/api/chats/${encodeURIComponent(selectedCreator.id)}/rewards/unlock`,
        json({ mediaKey, method })
      );
      if (res.unlocked) {
        setUnlockedRewards((prev) => (prev.includes(mediaKey) ? prev : [...prev, mediaKey]));
        if (res.energy) setEnergy(res.energy);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('level_too_low')) {
        alert('ระดับความสัมพันธ์ยังไม่ถึงเกณฑ์ หรือสามารถเลือกกดปลดล็อกทันทีด้วย 3⚡ ได้ค่ะ');
      } else if (msg.includes('energy_empty')) {
        alert('พลังงานไม่พอ (ต้องการ 3⚡) รอรีเฟรชพรุ่งนี้ได้เลยค่ะ');
      } else {
        setError(msg);
      }
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

  const chatLoaded = Boolean(chat);
  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
  }, [chatLoaded, selectedCreator?.id, aiDmTab]);

  useEffect(() => {
    const el = msgsRef.current;
    if (el && stickToBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat?.aiMessages?.length, chat?.history.length, chat?.currentNodeId, pending, aiSending]);

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
    setError('');
    setChat(null);
    setPending([]);
    setDmMenuOpen(false);
    setSelectedCreator(creator);
    chatOpenedAtRef.current = Date.now();
    try {
      const result = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(creator.id)}`);
      setChat(result.chat);
      setUnlockedRewards(result.chat.unlockedRewards || []);
    } catch (e) {
      if (e instanceof Error && e.message === 'content_suspended') {
        try {
          await api(`/api/chats/${encodeURIComponent(creator.id)}/reset`, { method: 'POST' });
          const retry = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(creator.id)}`);
          setChat(retry.chat);
          setUnlockedRewards(retry.chat.unlockedRewards || []);
          return;
        } catch {}
      }
      setSelectedCreator(null);
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  async function resetCurrentStory() {
    if (!selectedCreator) return;
    if (!window.confirm(t.resetStoryConfirm)) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/reset-story`, { method: 'POST' });
      const result = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}`);
      setChat(result.chat);
      setUnlockedRewards(result.chat.unlockedRewards || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  async function resetAiChat() {
    if (!selectedCreator) return;
    if (!window.confirm(t.resetChatConfirm)) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/reset-chat`, { method: 'POST' });
      const result = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}`);
      setChat(result.chat);
      setPending([]);
      setMemoryPanel({ open: false, items: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  function closeChat() {
    setSelectedCreator(null);
    setChat(null);
    setPending([]);
    setDmMenuOpen(false);
  }

  async function openProfile(creator: Creator, defaultTab: 'feed' | 'vault' | 'episodes' = 'feed') {
    setProfileCreator(creator);
    setProfileTab(defaultTab);
    setProfileLoading(true);
    try {
      const res = await api<ProfileData>(`/api/creators/${encodeURIComponent(creator.id)}/profile`);
      setProfileData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดโปรไฟล์ได้');
    } finally {
      setProfileLoading(false);
    }
  }

  function closeProfile() {
    setProfileCreator(null);
    setProfileData(null);
  }

  async function reactToStory(story: Story, reaction: string) {
    setHeartBurstPostId(`story-${story.id}`);
    window.setTimeout(() => setHeartBurstPostId(null), 800);
    try {
      const res = await api<{ ok: boolean; reaction: string; relationship: number }>(
        `/api/stories/${encodeURIComponent(story.id)}/react`,
        json({ reaction })
      );
      setCreators((prev) =>
        prev.map((c) => (c.id === story.creatorId ? { ...c, relationship: res.relationship } : c))
      );
      setStoryToast(`ส่งความรู้สึก ${reaction} ถึง ${creatorName(story.creatorId)} แล้ว 💕`);
      window.setTimeout(() => setStoryToast(null), 3000);
    } catch {
      // silent
    }
  }

  async function submitStoryReply(story: Story, text: string) {
    const val = text.trim();
    if (!val) return;
    const creator = getCreator(story.creatorId);
    if (!creator) return;
    setSelectedStory(null);
    setStoryReplyText('');
    await openChat(creator);
    void sendAiMessage(`[ตอบกลับสตอรี่]: ${val}`);
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

  if (loading) return null;

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
            <LangSelect lang={lang} onChange={handleSetLang} short />
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
            <span className="fs-wordmark">instagoon</span>
          </div>

          <div className="fs-header-actions">
            <LangSelect lang={lang} onChange={handleSetLang} short />

            {/* Energy Telemetry */}
            <span
              className="fs-energy"
              title={
                energy?.unlimited ? 'Staging: Energy ไม่จำกัด' : energy?.nextRefillAt
                  ? `${t.energyRefillPrefix} ${formatDateTime(energy.nextRefillAt, lang)}`
                  : t.energyRefillDefault
              }
            >
              <Zap size={13} className="fs-energy-icon" />
              {energy?.unlimited ? '∞' : energy ? `${energy.free} + ${energy.purchased}` : '–'}
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
                          if (creator) void openProfile(creator);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && creator) void openProfile(creator);
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
                            {creator && creator.relationship >= 100 && (
                              <span className="fs-top-fan-pill" title="คุณคือแฟนตัวยง (ความสัมพันธ์ครบ 100)">
                                💎 แฟนตัวยง
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
                                {comment.own && creator && creator.relationship >= 100 && (
                                  <span className="fs-comment-topfan-badge" title="คุณคือแฟนตัวยง">
                                    💎 แฟนตัวยง
                                  </span>
                                )}
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
                <h1>{t.knowBetterTitle}</h1>
              </div>
              <span className="fs-muted">{t.charactersCount(creators.length)}</span>
            </div>

            <div className="fs-creator-list">
              {creators.map((creator) => (
                <article
                  className="fs-creator-dm-row"
                  key={creator.id}
                  onClick={() => void openProfile(creator)}
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
                      {creator.relationship >= 100 ? (
                        <span className="fs-top-fan-pill" title="คุณคือแฟนตัวยง (ความสัมพันธ์ครบ 100)">
                          💎 แฟนตัวยง
                        </span>
                      ) : (
                        <span className="fs-rel-pill">
                          {creator.relationship}/100
                        </span>
                      )}
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
                <LangSelect lang={lang} onChange={handleSetLang} />
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

            {heartBurstPostId === `story-${selectedStory.id}` && (
              <div className="fs-heart-burst">❤️</div>
            )}
            {storyToast && (
              <div className="fs-story-reaction-toast">{storyToast}</div>
            )}

            <div className="fs-story-bottom-bar">
              <div className="fs-story-reactions-row">
                {['😍', '🔥', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="fs-story-reaction-btn"
                    onClick={() => void reactToStory(selectedStory, emoji)}
                    aria-label={`Send reaction ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form
                className="fs-story-reply-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitStoryReply(selectedStory, storyReplyText);
                }}
              >
                <input
                  type="text"
                  className="fs-story-reply-input"
                  placeholder={`ส่งข้อความหา ${creatorName(selectedStory.creatorId)}…`}
                  value={storyReplyText}
                  onChange={(e) => setStoryReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  className="fs-story-reply-send"
                  disabled={!storyReplyText.trim()}
                  aria-label="Send Story Reply"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </section>
        </Modal>
      )}

      {/* Creator Profile Modal (Close Friends Vault & 3 Tabs - ADR 0012) */}
      {profileCreator && (
        <Modal labelledBy="fs-profile-title" onClose={closeProfile}>
          <section className="fs-profile-modal">
            <header className="fs-profile-top-bar">
              <button
                type="button"
                className="fs-dm-back"
                onClick={closeProfile}
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 id="fs-profile-title">
                {profileCreator.name}
                <IgVerified size={15} />
              </h2>
              <div style={{ width: 22 }} />
            </header>

            <div className="fs-profile-body">
              {profileLoading || !profileData ? (
                <div className="fs-dm-skeleton" role="status" aria-label="Loading profile">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <>
                  <div className="fs-profile-hero">
                    <div className="fs-profile-avatar-wrap">
                      {profileData.creator.avatarKey ? (
                        <img src={media(profileData.creator.avatarKey)} alt={profileData.creator.name} />
                      ) : (
                        <div className="fs-avatar-letter">{profileData.creator.name.slice(0, 1)}</div>
                      )}
                    </div>
                    <div className="fs-profile-name-row">
                      <h1>{profileData.creator.name}</h1>
                      <IgVerified size={18} />
                    </div>
                    <span className="fs-profile-handle">
                      @{profileData.creator.id === 'milin' ? 'milin.zip' : profileData.creator.id}
                    </span>
                    {profileData.creator.tagline && (
                      <p className="fs-profile-tagline">{profileData.creator.tagline}</p>
                    )}
                    {profileData.creator.tags && profileData.creator.tags.length > 0 && (
                      <div className="fs-profile-tags">
                        {profileData.creator.tags.map((tag, i) => (
                          <span key={i} className="fs-profile-tag">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Relationship 3D Dimension Box & Top Fan Status */}
                    <div className="fs-profile-rel-card">
                      <div className="fs-profile-rel-top">
                        {(profileData.creator.relationship ?? 0) >= 100 ? (
                          <span className="fs-profile-topfan-badge" title="คุณคือแฟนตัวยง (ความสัมพันธ์ครบ 100)">
                            💎 แฟนตัวยง (TOP FAN)
                          </span>
                        ) : (
                          <span className="fs-profile-topfan-target">
                            สะสมครบ 100 เพื่อรับตราแฟนตัวยง
                          </span>
                        )}
                        <span className="fs-profile-score-text">
                          ความสัมพันธ์: {profileData.creator.relationship || 0}/100
                        </span>
                      </div>
                      <div className="fs-profile-dim-bars">
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>🤍 ใกล้ชิด</span>
                            <span>{profileData.creator.closeness || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.closeness || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>✨ ไว้ใจ</span>
                            <span>{profileData.creator.trust || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.trust || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>💖 โรแมนติก</span>
                            <span>{profileData.creator.romance || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.romance || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="fs-profile-dm-btn"
                      onClick={() => {
                        const c = profileCreator;
                        closeProfile();
                        void openChat(c);
                      }}
                    >
                      <Sparkles size={16} /> ส่งข้อความ (DM)
                    </button>
                  </div>

                  {/* 3 Tabs Navigation */}
                  <div className="fs-profile-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'feed'}
                      className={`fs-profile-tab-btn ${profileTab === 'feed' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('feed')}
                    >
                      📸 โพสต์ ({profileData.posts.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'vault'}
                      className={`fs-profile-tab-btn ${profileTab === 'vault' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('vault')}
                    >
                      ⭐ Close Friends Vault ({profileData.vault.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'episodes'}
                      className={`fs-profile-tab-btn ${profileTab === 'episodes' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('episodes')}
                    >
                      📖 ตอนทั้งหมด ({profileData.episodes.length})
                    </button>
                  </div>

                  {/* Tab 1: Posts Grid */}
                  {profileTab === 'feed' && (
                    <div className="fs-profile-posts-grid">
                      {profileData.posts.length === 0 ? (
                        <p className="fs-dm-empty" style={{ gridColumn: '1 / -1' }}>ยังไม่มีโพสต์</p>
                      ) : (
                        profileData.posts.map((p) => (
                          <div key={p.id} className="fs-profile-post-thumb">
                            {p.mediaKey ? (
                              <img src={media(p.mediaKey)} alt="" loading="lazy" />
                            ) : (
                              <div className="fs-profile-post-quote">{p.caption.slice(0, 40)}…</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 2: Close Friends Vault */}
                  {profileTab === 'vault' && (
                    <div className="fs-profile-vault-grid">
                      {profileData.vault.length === 0 ? (
                        <p className="fs-dm-empty" style={{ gridColumn: '1 / -1' }}>ยังไม่มีรางวัลในคลัง</p>
                      ) : (
                        profileData.vault.map((item) => (
                          <div key={item.id} className="fs-vault-card">
                            {item.unlocked ? (
                              <div
                                className="fs-vault-card-inner is-clickable"
                                role="button"
                                tabIndex={0}
                                title="แตะเพื่อดูภาพขนาดเต็ม"
                                onClick={() =>
                                  setExpandedMedia({
                                    mediaKey: item.asset,
                                    title: item.name,
                                    caption: item.caption || item.message,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    setExpandedMedia({
                                      mediaKey: item.asset,
                                      title: item.name,
                                      caption: item.caption || item.message,
                                    });
                                  }
                                }}
                              >
                                <img src={media(item.asset)} alt={item.name} className="fs-vault-img" />
                                <div className="fs-vault-badge-unlocked">✨ {item.name} · แตะขยาย 🔍</div>
                              </div>
                            ) : (
                              <>
                                <img src={media(item.asset)} alt={item.name} className="fs-vault-img is-blurred" />
                                <div className="fs-vault-overlay">
                                  <div className="fs-vault-lock-icon">🔒</div>
                                  <p className="fs-vault-title">{item.name}</p>
                                  <p className="fs-vault-req">ใช้ 3⚡ ปลดล็อกดูภาพส่วนตัว</p>
                                  <div className="fs-vault-btns">
                                    <button
                                      type="button"
                                      className="fs-teaser-btn fs-teaser-btn-instant"
                                      onClick={async () => {
                                        await unlockReward(item.asset, 'energy');
                                        if (profileCreator) void openProfile(profileCreator, 'vault');
                                      }}
                                    >
                                      ⚡ ปลดล็อกทันที (3⚡)
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Episodes List */}
                  {profileTab === 'episodes' && (
                    <div className="fs-profile-episodes-list">
                      {profileData.episodes.length === 0 ? (
                        <p className="fs-dm-empty">ยังไม่มีตอนในเนื้อเรื่อง</p>
                      ) : (
                        profileData.episodes.map((ep) => (
                          <button
                            key={ep.id}
                            type="button"
                            className="fs-profile-ep-card"
                            disabled={!ep.accessible}
                            onClick={() => {
                              const c = profileCreator;
                              closeProfile();
                              void openChat(c);
                            }}
                          >
                            <span className="fs-profile-ep-title">{ep.title}</span>
                            <span
                              className={`fs-profile-ep-status ${
                                ep.completed ? 'is-done' : !ep.accessible ? 'is-locked' : ''
                              }`}
                            >
                              {ep.completed ? '✨ จบแล้ว' : ep.accessible ? '▶️ เล่นได้' : '🔒 ล็อกอยู่'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </Modal>
      )}

      {/* Direct message sheet */}
      {selectedCreator && (
        <Modal labelledBy="fs-chat-title" onClose={closeChat}>
          <section className="fs-dm-modal" aria-busy={!chat}>
            <header className="fs-dm-header">
              <button className="fs-dm-back" aria-label="Back" onClick={closeChat}>
                <ArrowLeft size={22} />
              </button>
              <div
                className="fs-dm-header-author"
                onClick={() => void openProfile(selectedCreator)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void openProfile(selectedCreator);
                }}
                title={`ดูโปรไฟล์ของ ${selectedCreator.name}`}
              >
                <div className="fs-creator-avatar-wrap">
                  <div className="fs-avatar">
                    {selectedCreator.avatarKey ? (
                      <img src={media(selectedCreator.avatarKey)} alt={selectedCreator.name} />
                    ) : (
                      selectedCreator.name.slice(0, 1)
                    )}
                  </div>
                  <span className="fs-online-dot" />
                </div>
                <div className="fs-dm-header-text">
                  <div className="fs-dm-title-row">
                    <h2 id="fs-chat-title">{selectedCreator.name}</h2>
                    <IgVerified size={14} />
                    {selectedCreator.relationship >= 100 && (
                      <span className="fs-top-fan-badge" title="คุณคือแฟนตัวยง (ความสัมพันธ์ครบ 100)">
                        💎 แฟนตัวยง
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="fs-dm-header-actions" ref={dmMenuRef}>
                <button
                  type="button"
                  className="fs-dm-gear-btn"
                  aria-label={t.chatSettings}
                  title={t.chatSettings}
                  aria-haspopup="menu"
                  aria-expanded={dmMenuOpen}
                  onClick={() => setDmMenuOpen((open) => !open)}
                >
                  <Settings size={18} />
                </button>
                {dmMenuOpen && (
                  <div className="fs-dm-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-dm-menu-item fs-dm-reset-chat-btn"
                      onClick={() => {
                        setDmMenuOpen(false);
                        void resetAiChat();
                      }}
                    >
                      <MessageSquareX size={15} />
                      {t.resetChat}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-dm-menu-item fs-dm-reset-story-btn"
                      onClick={() => {
                        setDmMenuOpen(false);
                        void resetCurrentStory();
                      }}
                    >
                      <RotateCcw size={15} />
                      {t.resetStory}
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="fs-dm-mode-toggle" role="tablist" data-active={aiDmTab}>
              <span className="fs-dm-mode-thumb" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={aiDmTab === 'ai'}
                className="fs-dm-mode-btn"
                onClick={() => setAiDmTab('ai')}
              >
                {t.chatTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aiDmTab === 'story'}
                className="fs-dm-mode-btn"
                onClick={() => setAiDmTab('story')}
              >
                {t.storyTab}
              </button>
            </div>

            {aiDmTab === 'story' && chat && chat.episodes?.length > 0 && (
              <div
                className="fs-episodes"
                ref={episodesBarRef}
                onMouseDown={handleEpisodesMouseDown}
                onMouseMove={handleEpisodesMouseMove}
                onMouseUp={handleEpisodesMouseUpOrLeave}
                onMouseLeave={handleEpisodesMouseUpOrLeave}
                aria-label={t.selectEpisode}
              >
                {chat.episodes.map((episode) => (
                  <button
                    className="fs-episode-pill"
                    key={episode.id}
                    aria-current={episode.id === chat.episodeId ? 'true' : undefined}
                    disabled={busy || !episode.accessible || episode.id === chat.episodeId}
                    onClick={() => {
                      if (hasEpisodesDraggedRef.current) return;
                      void action(async () => {
                        const result = await api<{ chat: Chat }>(
                          `/api/chats/${encodeURIComponent(selectedCreator.id)}/episode`,
                          json({ episodeId: episode.id })
                        );
                        setChat(result.chat);
                      });
                    }}
                  >
                    {episode.title}
                    {episode.completed ? ` · ${t.completed}` : ''}
                    {!episode.accessible ? ` · ${t.locked}` : ''}
                  </button>
                ))}
              </div>
            )}

            <div
              className="fs-dm-messages"
              ref={msgsRef}
              tabIndex={-1}
              data-autofocus
              onScroll={(event) => {
                const el = event.currentTarget;
                stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
              }}
            >
              <div className="fs-dm-bio-card">
                <div className="fs-avatar fs-avatar-large fs-dm-bio-avatar">
                  {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt={selectedCreator.name} />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                </div>
                <strong>{selectedCreator.name}</strong>
                <span className="fs-dm-handle">@{selectedCreator.id === 'milin' ? 'milin.zip' : selectedCreator.id}</span>
                <p>{selectedCreator.bio}</p>
              </div>

              {!chat ? (
                <div className="fs-dm-skeleton" role="status" aria-label={t.chatLoading}>
                  <span />
                  <span />
                  <span />
                </div>
              ) : aiDmTab === 'ai' ? (
                <>
                  {(chat.aiMessages ?? []).length === 0 && pending.length === 0 && (
                    <div className="fs-dm-row-left fs-group-end fs-msg-in">
                      <div className="fs-avatar fs-avatar-tiny">
                        {selectedCreator.avatarKey ? (
                          <img src={media(selectedCreator.avatarKey)} alt="" />
                        ) : (
                          selectedCreator.name.slice(0, 1)
                        )}
                      </div>
                      <div className="fs-bubble">
                        {selectedCreator.id === 'milin'
                          ? 'จัดห้องเสร็จแล้ว มัวแต่นั่งมองเพดาน... ดีใจจังที่แวะเข้ามาหา 🥺✨ วันนี้ทำงานเหนื่อยไหมน้า?'
                          : `สวัสดีค่ะ แวะมาคุยกับ ${selectedCreator.name} ได้ตลอดเลยน้า ✨`}
                      </div>
                    </div>
                  )}
                  {(chat.aiMessages ?? []).map((msg, index, list) => {
                    const next = list[index + 1];
                    const groupEnd = !next || next.role !== msg.role || (pending.length > 0 && index === list.length - 1);
                    const isNew = msg.role === 'assistant' && msg.createdAt > chatOpenedAtRef.current;
                    return msg.role === 'user' ? (
                      <div key={msg.id} className={`fs-dm-row-right${groupEnd ? ' fs-group-end' : ''}`}>
                        <div className="fs-answer">{msg.content}</div>
                      </div>
                    ) : (
                      <div key={msg.id} className={`fs-dm-row-left${groupEnd ? ' fs-group-end' : ''}${isNew ? ' fs-msg-in' : ''}`}>
                        <div className={`fs-avatar fs-avatar-tiny${groupEnd ? '' : ' is-spacer'}`} aria-hidden={!groupEnd}>
                          {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                        </div>
                        <div className="fs-dm-msg-col">
                          <div className="fs-bubble">
                            {renderBubbleContent(msg.content, (k) =>
                              setExpandedMedia({
                                mediaKey: k,
                                title: `ภาพจาก ${selectedCreator.name}`,
                              })
                            )}
                          </div>
                          {msg.mediaKey && (
                            <div className="fs-blurred-teaser-card">
                              {unlockedRewards.includes(msg.mediaKey) ? (
                                <div
                                  className="fs-teaser-media-wrap is-unlocked is-clickable"
                                  role="button"
                                  tabIndex={0}
                                  title="แตะเพื่อดูภาพขนาดเต็ม"
                                  onClick={() =>
                                    setExpandedMedia({
                                      mediaKey: msg.mediaKey!,
                                      title: `ภาพพิเศษจาก ${selectedCreator.name}`,
                                      caption: 'Exclusive Photo · ปลดล็อกแล้ว',
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      setExpandedMedia({
                                        mediaKey: msg.mediaKey!,
                                        title: `ภาพพิเศษจาก ${selectedCreator.name}`,
                                        caption: 'Exclusive Photo · ปลดล็อกแล้ว',
                                      });
                                    }
                                  }}
                                >
                                  <img src={media(msg.mediaKey)} alt="Exclusive photo" className="fs-teaser-img" />
                                  <div className="fs-teaser-badge fs-badge-unlocked">✨ ปลดล็อกแล้ว · แตะขยาย 🔍</div>
                                </div>
                              ) : (
                                <div className="fs-teaser-media-wrap is-locked">
                                  <img src={media(msg.mediaKey)} alt="Locked photo teaser" className="fs-teaser-img is-blurred" />
                                  <div className="fs-teaser-overlay">
                                    <div className="fs-teaser-lock-icon">🔒</div>
                                    <p className="fs-teaser-hint">รูปถ่ายส่วนตัวจาก {selectedCreator.name}</p>
                                    <div className="fs-teaser-actions">
                                      <button
                                        type="button"
                                        className="fs-teaser-btn fs-teaser-btn-instant"
                                        onClick={() => void unlockReward(msg.mediaKey!, 'energy')}
                                      >
                                        ⚡ ปลดล็อกทันที (3⚡)
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {msg.affectionDelta ? (
                            <span className="fs-dm-affection">+{msg.affectionDelta} 💖</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {pending.map((item) => (
                    <div key={item.id} className="fs-dm-row-right fs-group-end fs-msg-out">
                      {item.failed ? (
                        <button
                          type="button"
                          className="fs-dm-failed"
                          disabled={aiSending}
                          onClick={() => void sendAiMessage(item.content, item.id)}
                        >
                          <span className="fs-answer is-failed">{item.content}</span>
                          <span className="fs-dm-failed-note" role="alert">
                            {item.failed} · {t.sendFailed}
                          </span>
                        </button>
                      ) : (
                        <div className="fs-answer is-sending">{item.content}</div>
                      )}
                    </div>
                  ))}
                  {aiSending && (
                    <div className="fs-dm-row-left fs-group-end fs-msg-in">
                      <div className="fs-avatar fs-avatar-tiny">
                        {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                      </div>
                      <div className="fs-ai-typing" aria-label={`${selectedCreator.name} is typing`}>
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                      </div>
                    </div>
                  )}
                </>
              ) : node ? (
                <>
                  {chat.history.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="fs-dm-turn">
                      <div className="fs-dm-row-left fs-group-end">
                        <div className="fs-avatar fs-avatar-tiny">
                          {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                        </div>
                        <div className="fs-dm-msg-col">
                          <div className="fs-bubble">
                            {renderBubbleContent(entry.text, (k) =>
                              setExpandedMedia({
                                mediaKey: k,
                                title: `ภาพจาก ${selectedCreator.name}`,
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      {entry.choiceText && (
                        <div className="fs-dm-row-right fs-group-end">
                          <div className="fs-answer">{entry.choiceText}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="fs-dm-row-left fs-group-end fs-msg-in" key={node.id}>
                    <div className="fs-avatar fs-avatar-tiny">
                      {selectedCreator.avatarKey ? (
                            <img src={media(selectedCreator.avatarKey)} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                    </div>
                    <div className="fs-dm-msg-col">
                      <div className="fs-bubble">
                        {renderBubbleContent(node.text, (k) =>
                          setExpandedMedia({
                            mediaKey: k,
                            title: `ภาพจาก ${selectedCreator.name}`,
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="fs-empty">{t.noChatFound}</p>
              )}
            </div>

            {aiDmTab === 'ai' && chat && (
              <div className="fs-dm-memory">
                <button type="button" className="fs-dm-memory-toggle" aria-expanded={memoryPanel.open} onClick={toggleMemoryPanel}>
                  🧠 สิ่งที่ {selectedCreator.name} จำเกี่ยวกับคุณ
                </button>
                {memoryPanel.open &&
                  (memoryPanel.items.length === 0 ? (
                    <p className="fs-dm-memory-empty">ยังไม่มีเรื่องที่จำไว้</p>
                  ) : (
                    <ul className="fs-dm-memory-list">
                      {memoryPanel.items.map((m) => (
                        <li key={m.key}>
                          <span>{m.value}</span>
                          <button type="button" onClick={() => forgetMemory(m.key)}>
                            ลืม
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}
              </div>
            )}

            {aiDmTab === 'ai' ? (
              <ChatComposer
                placeholder={`ส่งข้อความหา ${selectedCreator.name}…`}
                disabled={!chat || aiSending}
                onSend={(text) => void sendAiMessage(text)}
              />
            ) : (
              <footer className="fs-dm-footer">
                {node ? (
                  node.end ? (
                    <div className="fs-dm-ended-box">
                      <p className="fs-dm-ended">✨ {t.episodeEnded}</p>
                      <button
                        type="button"
                        className="fs-dm-switch-chat-btn"
                        onClick={() => setAiDmTab('ai')}
                      >
                        <Sparkles size={14} /> สานสัมพันธ์ต่อในแชทอิสระ &rarr;
                      </button>
                    </div>
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
                                `/api/chats/${encodeURIComponent(selectedCreator.id)}/choose`,
                                json({ choiceId: choice.id })
                              );
                              setChat(result.chat);
                              const nextNode = result.chat.nodes.find((n) => n.id === result.chat.currentNodeId);
                              if (nextNode?.end) {
                                setUnlockedStoryModal({
                                  open: true,
                                  creatorName: selectedCreator.name,
                                  avatarKey: selectedCreator.avatarKey,
                                  episodeTitle: result.chat.episodes?.find((e) => e.id === result.chat.episodeId)?.title || ''
                                });
                              }
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

      {unlockedStoryModal.open && (
        <div
          className="fs-glossy-modal-backdrop"
          onClick={() => setUnlockedStoryModal({ open: false, creatorName: '' })}
          role="dialog"
          aria-modal="true"
        >
          <div className="fs-glossy-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fs-glossy-glow" aria-hidden="true" />
            <div className="fs-glossy-badge">
              <Sparkles size={13} />
              <span>ปลดล็อกเนื้อเรื่องสำเร็จ!</span>
            </div>
            <div className="fs-glossy-avatar-wrap">
              <div className="fs-avatar fs-avatar-large fs-glossy-avatar">
                {unlockedStoryModal.avatarKey ? (
                  <img src={media(unlockedStoryModal.avatarKey)} alt={unlockedStoryModal.creatorName} />
                ) : (
                  unlockedStoryModal.creatorName.slice(0, 1)
                )}
              </div>
              <div className="fs-glossy-avatar-ring" aria-hidden="true" />
            </div>
            <h3 className="fs-glossy-title">
              พร้อมคุยกับน้อง{unlockedStoryModal.creatorName}แล้ว! ✨
            </h3>
            <p className="fs-glossy-desc">
              ปลดล็อกเนื้อเรื่องสำเร็จ! สานสัมพันธ์กับน้อง{unlockedStoryModal.creatorName}ต่อในแชทได้ตลอดเวลาเลยนะ 🐱🤍
            </p>
            <div className="fs-glossy-actions">
              <button
                type="button"
                className="fs-btn-glossy-primary"
                onClick={() => {
                  setUnlockedStoryModal({ open: false, creatorName: '' });
                  setAiDmTab('ai');
                }}
              >
                <Sparkles size={16} />
                <span>เริ่มคุยกับ{unlockedStoryModal.creatorName}เลย 💬</span>
              </button>
              <button
                type="button"
                className="fs-btn-glossy-secondary"
                onClick={() => setUnlockedStoryModal({ open: false, creatorName: '' })}
              >
                ดูเนื้อเรื่องต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer Modal (constrained to app screen) */}
      {expandedMedia && (
        <Modal labelledBy="fs-lightbox-title" onClose={() => setExpandedMedia(null)}>
          <section className="fs-lightbox-modal">
            <header className="fs-lightbox-header">
              <button
                type="button"
                className="fs-lightbox-back-btn"
                aria-label="ย้อนกลับไปหน้าแชท"
                onClick={() => setExpandedMedia(null)}
              >
                <ArrowLeft size={18} />
                <span>ย้อนกลับไปหน้าแชท</span>
              </button>
              {expandedMedia.title && (
                <span id="fs-lightbox-title" className="fs-lightbox-title">
                  {expandedMedia.title}
                </span>
              )}
            </header>
            <div className="fs-lightbox-body" onClick={() => setExpandedMedia(null)}>
              <img
                src={media(expandedMedia.mediaKey)}
                alt={expandedMedia.title || 'Expanded Photo'}
                className="fs-lightbox-img"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {expandedMedia.caption && (
              <footer className="fs-lightbox-footer">
                <p>{expandedMedia.caption}</p>
              </footer>
            )}
          </section>
        </Modal>
      )}

      {/* Dev Tools Telemetry Drawer */}
    </div>
  );
}
