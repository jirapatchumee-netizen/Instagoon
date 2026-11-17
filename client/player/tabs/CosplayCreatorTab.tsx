import { useState, useEffect, useRef } from 'react';
import { TRANSLATIONS, type Lang } from '../i18n';
import {
  Sparkles,
  User,
  MessageCircle,
  ShieldCheck,
  Play,
  Check,
  Send,
  RotateCcw,
  Camera,
  X,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Plus,
  Gem,
} from 'lucide-react';
import { media } from '../ui';
import { resizeImageToStandard } from '../lib/image-resizer';
import { api } from '../api';
import './cosplay-studio.css';
import { AiIdentityField } from '../components/AiIdentityField';
import { mergeAiIdentity } from '../../../packages/contracts/npc/ai-identity';

interface CosplayCreatorTabProps {
  lang: Lang;
  onOpenRecentChats?: () => void;
  onOpenLiveChat?: (creatorId: string) => void;
}

type StudioState = {
  draft: Record<string, unknown> | null;
  creatorId: string | null;
  status: 'none' | 'draft' | 'live';
};

export interface RewardDraft {
  id: string;
  name: string;
  asset: string;
  caption: string;
  message: string;
  rarity: 'R' | 'SR' | 'SSR' | 'UR';
  unlockType: 'mission' | 'diamond_gacha';
  hint: string;
  turns: number;
  trust: number;
  romance: number;
  minLevel?: number;
  energyFallback: number;
}

// Uploaded drafts come back as media keys (studio-drafts/<uid>/...). Older local drafts may hold data URLs.
const studioSrc = (key: string) => (!key ? '' : key.startsWith('data:') ? key : media(key));

export function CosplayCreatorTab({ lang, onOpenLiveChat }: CosplayCreatorTabProps) {
  const t = TRANSLATIONS[lang];
  const [activeTab, setActiveTab] = useState<'identity' | 'voice' | 'safety' | 'sandbox' | 'gallery'>('identity');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  // File upload & crop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagingFile, setStagingFile] = useState<File | null>(null);
  const [stagingPreview, setStagingPreview] = useState<string>('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'reward' | 'post'>('avatar');
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Pillar 1: Identity & Visual
  const [name, setName] = useState('Yuki');
  const [handle, setHandle] = useState('yuki.cosplay');
  const [tagline, setTagline] = useState('มาแบ่งปันโลกคอสเพลย์ไปด้วยกันนะ');
  const [profileDescription, setProfileDescription] = useState('คอสเพลเยอร์ที่ชอบทำชุดด้วยตัวเอง ยินดีแบ่งปันเบื้องหลังการทำงานและพูดคุยเรื่องคอสเพลย์กับทุกคน');
  const [aiIdentity, setAiIdentity] = useState('');
  const [age, setAge] = useState('24');
  const [studio, setStudio] = useState<StudioState>({ draft: null, creatorId: null, status: 'none' });
  const [busyAction, setBusyAction] = useState<'' | 'save' | 'launch' | 'unpublish'>('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatar, setAvatar] = useState('');
  const [tags, setTags] = useState('cosplay, anime, assassin, cute');
  const [likes, setLikes] = useState('มาการอง, ถ่ายรูป, อนิเมะน่ารัก');
  const [dislikes, setDislikes] = useState('ข้อความหยาบคาย, แมลง');

  // Pillar 2: Voice & Tone
  const [pronouns, setPronouns] = useState('เค้า / ตัวเอง');
  const [voiceTone, setVoiceTone] = useState('ขี้อ้อน อบอุ่น');
  const [sampleQuotes, setSampleQuotes] = useState('');
  // Preserve old authoring text in saved drafts; it no longer controls the conversation.
  const [legacyLevelStyles, setLegacyLevelStyles] = useState<string[]>([]);
  const [levelCosts, setLevelCosts] = useState<number[]>([100, 200, 300, 400]);
  const [adultContent, setAdultContent] = useState(false);
  const [adultPreferences, setAdultPreferences] = useState('');
  const [testAdultMode, setTestAdultMode] = useState(false);
  const validCosts = levelCosts.length === 4 && levelCosts.every(n => Number.isInteger(n) && n >= 1 && n <= 100000);

  // Pillar 3: Safety & Secrets
  const [ruleNoAddress, setRuleNoAddress] = useState(true);
  const [ruleNoMeet, setRuleNoMeet] = useState(true);
  const [rulePoliteReject, setRulePoliteReject] = useState(true);

  // Pillar 4: First Meeting & Live Simulation
  const [openingLocation, setOpeningLocation] = useState('หลังเวทีงานคอสเพลย์');
  const [openingGreeting, setOpeningGreeting] = useState('*(ยิ้มเขินๆ พลางจัดวิกผม)* สวัสดีค่ะ แวะมาถ่ายรูปเหรอคะ? ชุดวันนี้เป็นไงบ้าง?');
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'creator'; text: string; action?: string }>>([]);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [testMessages, sandboxBusy]);
  const [posts, setPosts] = useState<Array<{ media: string; caption: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Pillar 5: Vault & Missions
  const [rewards, setRewards] = useState<RewardDraft[]>([]);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardAsset, setNewRewardAsset] = useState('');
  const [newRewardRarity, setNewRewardRarity] = useState<'R' | 'SR' | 'SSR' | 'UR'>('SSR');
  const [newRewardUnlockType, setNewRewardUnlockType] = useState<'mission' | 'diamond_gacha'>('mission');
  const [newRewardHint, setNewRewardHint] = useState('ปรับความเข้าใจคืนดีกันไว้ใจกัน');
  const [newRewardTurns, setNewRewardTurns] = useState(40);
  const [newRewardLevel, setNewRewardLevel] = useState(2);
  const [newRewardFallback, setNewRewardFallback] = useState(5);

  const handleAddReward = () => {
    if (!newRewardTitle.trim()) return;
    const item: RewardDraft = {
      id: 'reward-' + Date.now(),
      name: newRewardTitle.trim(),
      asset: newRewardAsset,
      caption: newRewardTitle.trim(),
      message: `ปลดล็อกรูปภาพ ${newRewardTitle.trim()} แล้วนะ!`,
      rarity: newRewardRarity,
      unlockType: newRewardUnlockType,
      hint: newRewardHint.trim(),
      turns: Number(newRewardTurns) || 0,
      trust: 0,
      romance: 0,
      minLevel: newRewardLevel,
      energyFallback: Number(newRewardFallback) || 5,
    };
    setRewards([...rewards, item]);
    setNewRewardTitle('');
    setNewRewardAsset('');
  };

  const handleDeleteReward = (id: string) => {
    setRewards(rewards.filter((r) => r.id !== id));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyDraft = (data: any) => {
    if (!data || typeof data !== 'object') return;
    if (data.name) setName(data.name);
    if (data.handle) setHandle(data.handle);
    const legacyConcept = typeof data.concept === 'string' ? data.concept : '';
    setTagline(typeof data.tagline === 'string' ? data.tagline : legacyConcept.slice(0, 200));
    setProfileDescription(typeof data.profileDescription === 'string' ? data.profileDescription : legacyConcept);
    setAiIdentity(mergeAiIdentity(data));
    if (data.age) setAge(String(data.age));
    if (data.avatar) setAvatar(data.avatar);
    if (data.tags) setTags(data.tags);
    if (data.likes) setLikes(data.likes);
    if (data.dislikes) setDislikes(data.dislikes);
    if (data.pronouns) setPronouns(data.pronouns);
    if (data.voiceTone) setVoiceTone(data.voiceTone);
    setSampleQuotes(typeof data.sampleQuotes === 'string' ? data.sampleQuotes : '');
    if (Array.isArray(data.levelStyles) && data.levelStyles.length === 5) setLegacyLevelStyles(data.levelStyles);
    if (Array.isArray(data.levelCosts) && data.levelCosts.length === 4) setLevelCosts(data.levelCosts);
    setAdultContent(typeof data.adultContent === 'boolean' ? data.adultContent
      : Array.isArray(data.adultLevels) && data.adultLevels.some((v: unknown) => v === true));
    setAdultPreferences(typeof data.adultPreferences === 'string' ? data.adultPreferences : '');
    if (typeof data.ruleNoAddress === 'boolean') setRuleNoAddress(data.ruleNoAddress);
    if (typeof data.ruleNoMeet === 'boolean') setRuleNoMeet(data.ruleNoMeet);
    if (typeof data.rulePoliteReject === 'boolean') setRulePoliteReject(data.rulePoliteReject);
    if (data.openingLocation) setOpeningLocation(data.openingLocation);
    if (typeof data.openingGreeting === 'string') setOpeningGreeting(data.openingGreeting);
    if (Array.isArray(data.rewards)) setRewards(data.rewards);
    if (Array.isArray(data.posts)) setPosts(data.posts);
  };

  useEffect(() => {
    api<StudioState>('/api/studio/draft')
      .then((res) => {
        setStudio(res);
        if (res.draft) applyDraft(res.draft);
        else {
          try {
            applyDraft(JSON.parse(localStorage.getItem('ig_cosplay_creator_draft') || 'null'));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => setNotice({ ok: false, text: t.studioActionError }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (testMessages.length === 0) {
      setTestMessages([{ sender: 'creator', text: openingGreeting }]);
    }
  }, [openingGreeting, testMessages.length]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStagingFile(file);
    setZoom(1.0);
    setPanX(0);
    setPanY(0);

    const reader = new FileReader();
    reader.onload = () => {
      setStagingPreview(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleApplyCropAndUpload = async () => {
    if (!stagingFile) return;
    setUploading(true);
    try {
      const resized = await resizeImageToStandard(stagingFile, {
        targetWidth: 512,
        targetHeight: 640,
        zoom,
        panX,
        panY,
      });

      const res = await api<{ ok: boolean; mediaKey: string }>('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'image/webp' },
        body: resized.blob,
      });
      if (cropTarget === 'avatar') {
        setAvatar(res.mediaKey);
      } else if (cropTarget === 'post') {
        setPosts((list) => [...list, { media: res.mediaKey, caption: '' }].slice(0, 3));
      } else {
        setNewRewardAsset(res.mediaKey);
      }

      setUploadSuccessNotice(true);
      setTimeout(() => setUploadSuccessNotice(false), 3000);
      setCropModalOpen(false);
    } catch (err) {
      console.error('Failed to resize and upload', err);
      setUploadError(true);
      setTimeout(() => setUploadError(false), 4000);
    } finally {
      setUploading(false);
    }
  };

  const collectDraft = () => ({
    name,
    handle,
    tagline,
    profileDescription,
    aiIdentity,
    age: Number(age) || 0,
    avatar,
    tags,
    likes,
    dislikes,
    pronouns,
    voiceTone,
    sampleQuotes,
    levelStyles: legacyLevelStyles,
    levelCosts,
    adultContent,
    adultPreferences,
    ruleNoAddress,
    ruleNoMeet,
    rulePoliteReject,
    openingLocation,
    openingGreeting,
    rewards,
    posts,
  });

  const problemLabels: Record<string, string> = {
    name: t.studioNameLabel,
    handle: t.studioHandleLabel,
    concept: t.studioConceptLabel,
    tagline: t.studioTaglineLabel,
    profileDescription: t.studioProfileDescriptionLabel,
    aiIdentity: t.studioReferenceBiographyLabel,
    age: `${t.studioAgeLabel} (${t.studioAgeHint})`,
    avatar: t.studioAvatarLabel,
    voiceTone: t.studioVoiceToneLabel,
    levelCosts: 'เครดิตที่ใช้เลื่อนระดับ (จำนวนเต็ม 1–100,000)',
    adultContent: t.studioAdultContentLabel,
    adultPreferences: t.studioAdultPreferencesLabel,
    likes: t.studioLikesLabel,
    dislikes: t.studioDislikesLabel,
    pronouns: t.studioPronounsLabel,
    sampleQuotes: t.studioSampleQuotesLabel,
    tags: 'Tags',
    openingLocation: t.studioOpeningSceneLabel,
    openingGreeting: t.studioGreetingLabel,
    rewards: t.studioTabGallery,
  };
  const problemText = (p: string) =>
    p.startsWith('unsafe:') ? t.studioUnsafe(problemLabels[p.slice(7)] || p.slice(7)) : problemLabels[p] || p;
  const missingText = (problems: string[]) => `${t.studioMissing} ${problems.map(problemText).join(', ')}`;

  const checklist: Array<[string, boolean]> = [
    ['avatar', !!avatar],
    ['name', !!name.trim()],
    ['handle', /^@?[a-zA-Z0-9._]{3,30}$/.test(handle.trim())],
    ['age', Number(age) >= 20],
    ['tagline', !!tagline.trim()],
    ['profileDescription', !!profileDescription.trim()],
    ['voiceTone', !!voiceTone.trim()],
    ['levelCosts', validCosts],
  ];
  const readyCount = checklist.filter(([, ok]) => ok).length;
  const flash = (ok: boolean, text: string) => {
    setNotice({ ok, text });
    setTimeout(() => setNotice(null), 6000);
  };

  const handleSaveDraft = async () => {
    setBusyAction('save');
    try {
      const res = await api<StudioState & { problems: string[] }>('/api/studio/draft', {
        method: 'PUT',
        body: JSON.stringify(collectDraft()),
      });
      setStudio(res);
      try {
        localStorage.removeItem('ig_cosplay_creator_draft');
      } catch {
        /* ignore */
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (res.problems.length) flash(false, missingText(res.problems));
    } catch {
      flash(false, t.studioActionError);
    } finally {
      setBusyAction('');
    }
  };

  const handleLaunch = async () => {
    setBusyAction('launch');
    try {
      const res = await fetch('/api/studio/launch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectDraft()),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setStudio(data);
        flash(true, t.studioLaunched);
      } else if (data?.error === 'draft_incomplete') {
        flash(false, missingText(data.problems || []));
      } else if (data?.error === 'handle_taken') {
        flash(false, t.studioHandleTaken);
      } else if (data?.error === 'launch_quota_exceeded') {
        flash(false, t.studioLaunchQuota);
      } else {
        flash(false, t.studioActionError);
      }
    } catch {
      flash(false, t.studioActionError);
    } finally {
      setBusyAction('');
    }
  };

  const handleUnpublish = async () => {
    setBusyAction('unpublish');
    try {
      setStudio(await api<StudioState>('/api/studio/unpublish', { method: 'POST' }));
      flash(true, t.studioUnpublished);
    } catch {
      flash(false, t.studioActionError);
    } finally {
      setBusyAction('');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sandboxCall = async (payload: Record<string, unknown>): Promise<{ ok: boolean; data: any }> => {
    const res = await fetch('/api/studio/sandbox', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: collectDraft(), adultMode: testAdultMode && adultContent, requestId: crypto.randomUUID(), ...payload }),
    });
    return { ok: res.ok, data: await res.json().catch(() => null) };
  };

  const handleSendTestMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || sandboxBusy) return;
    setTestMessages((list) => [...list, { sender: 'user', text }]);
    setInputMessage('');
    setSandboxBusy(true);
    try {
      const { ok, data } = await sandboxCall({ message: text });
      if (ok) {
        const beats: Array<{ kind: string; text: string }> = Array.isArray(data?.beats) ? data.beats : [];
        const said = beats.filter((x) => x.kind === 'dialogue').map((x) => x.text).join(' ') || data?.reply || '';
        const acted = beats.filter((x) => x.kind === 'action').map((x) => x.text).join(' ') || data?.action || '';
        setTestMessages((list) => [...list, { sender: 'creator', text: said, action: acted || undefined }]);
      } else if (data?.error === 'draft_incomplete') {
        flash(false, missingText(data.problems || []));
      } else {
        flash(false, data?.error === 'energy_empty' ? t.studioEnergyEmpty : t.studioActionError);
      }
    } catch {
      flash(false, t.studioActionError);
    } finally {
      setSandboxBusy(false);
    }
  };

  const handleResetSandbox = async () => {
    setSandboxBusy(true);
    try {
      await sandboxCall({ reset: true });
    } catch {
      /* the local view resets either way */
    }
    setTestMessages(openingGreeting ? [{ sender: 'creator', text: openingGreeting }] : []);
    setSandboxBusy(false);
  };

  const handlePreviewCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const sheen = card.querySelector('.holo-foil-sheen') as HTMLElement | null;
    if (sheen) {
      sheen.style.setProperty('--px', `${px}%`);
      sheen.style.setProperty('--py', `${py}%`);
    }
  };

  const handlePreviewCardPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const sheen = card.querySelector('.holo-foil-sheen') as HTMLElement | null;
    if (sheen) {
      sheen.style.setProperty('--px', '50%');
      sheen.style.setProperty('--py', '50%');
    }
  };

  const isLive = studio.status === 'live';

  return (
    <div className="fs-cosplay-studio relative flex flex-col gap-4 px-3.5 pb-28 pt-3 text-zinc-100 font-sans antialiased">
      {/* Ambient Holographic Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[240px] bg-gradient-to-b from-fuchsia-600/15 via-cyan-500/10 to-transparent blur-3xl z-0"
      />

      {/* 1. STUDIO TITLE HEADER */}
      <section className="relative z-10 text-center space-y-1.5 pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-cyan-400/15 border border-pink-400/35 text-[11px] font-medium text-pink-200 shadow-sm">
          <span>✨</span>
          <span>{t.studioBadge || 'Cosplay AI Twin'}</span>
        </div>
        <h1 className="text-[20px] font-bold tracking-tight text-white">
          Cosplay Creator <span className="holo-text-shimmer">Studio</span>
        </h1>
        <p className="text-[11.5px] text-zinc-400">
          {t.studioSubtitle || 'สร้าง AI Digital Twin จากคาแรคเตอร์คอสเพลย์ของคุณ'}
        </p>
      </section>

      {/* 2. LIVE COLLECTIBLE TCG CARD PREVIEW BANNER */}
      <section
        id="live-tcg-preview"
        onPointerMove={handlePreviewCardPointerMove}
        onPointerLeave={handlePreviewCardPointerLeave}
        className="holo-tcg-card relative z-10 p-3.5 overflow-hidden shadow-xl select-none"
      >
        <div className="holo-foil-sheen absolute inset-0 pointer-events-none" />
        <div className="holo-sparkle-grain absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          {/* Holographic Portrait */}
          <div className="avatar-foil-ring w-14 h-14 rounded-2xl shrink-0 shadow-lg">
            <div className="w-full h-full rounded-[13px] overflow-hidden bg-zinc-900 flex items-center justify-center font-bold text-white text-base">
              {avatar ? (
                <img src={studioSrc(avatar)} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span>{(name.trim()[0] || 'Y').toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Card Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider bg-gradient-to-r from-amber-200 via-pink-300 to-cyan-200 text-zinc-950 shadow-sm">
                UR • FOIL
              </span>
              <span className="text-[10.5px] text-cyan-300 font-medium truncate">
                @{handle.replace(/^@/, '') || 'yuki.cosplay'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h2 className="text-sm font-bold text-white truncate">{name || 'Yuki'}</h2>
              <span className="text-[10px] text-zinc-400">• {age || '24'} ปี</span>
            </div>
            <p className="text-[10.5px] text-zinc-300 truncate mt-0.5 font-light">
              {tagline}
            </p>
          </div>

          {/* Card Edition Stamp */}
          <div className="shrink-0 text-right">
            <span className="block text-[8px] uppercase tracking-widest text-zinc-500">TCG TWIN</span>
            <span className="text-[11px] font-bold holo-text-shimmer">#001</span>
          </div>
        </div>
      </section>

      {/* 3. 5-TAB SEGMENTED NAVIGATION */}
      <nav aria-label="Studio Sections" className="relative z-10 bg-[#111119] border border-white/10 rounded-2xl p-1.5 grid grid-cols-5 gap-1 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          aria-pressed={activeTab === 'identity'}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer ${
            activeTab === 'identity'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/15 border border-pink-400/60 text-pink-200 shadow-sm shadow-pink-500/20'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <User className="w-4 h-4 mb-1" />
          <span className="text-[9.5px] leading-[1.2] font-medium">โปรไฟล์ &<br />รูปภาพ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          aria-pressed={activeTab === 'voice'}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/15 border border-pink-400/60 text-pink-200 shadow-sm shadow-pink-500/20'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <MessageCircle className="w-4 h-4 mb-1" />
          <span className="text-[9.5px] leading-[1.2] font-medium">ตัวตน &<br />การสนทนา</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('safety')}
          aria-pressed={activeTab === 'safety'}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer ${
            activeTab === 'safety'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/15 border border-pink-400/60 text-pink-200 shadow-sm shadow-pink-500/20'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-1" />
          <span className="text-[9.5px] leading-[1.2] font-medium">เนื้อหา &<br />ขอบเขต</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sandbox')}
          aria-pressed={activeTab === 'sandbox'}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer ${
            activeTab === 'sandbox'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/15 border border-pink-400/60 text-pink-200 shadow-sm shadow-pink-500/20'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <Play className="w-4 h-4 mb-1" />
          <span className="text-[9.5px] leading-[1.2] font-medium">ทดลองคุย<br />สด</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          aria-pressed={activeTab === 'gallery'}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/15 border border-pink-400/60 text-pink-200 shadow-sm shadow-pink-500/20'
              : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <ImageIcon className="w-4 h-4 mb-1" />
          <span className="text-[9.5px] leading-[1.2] font-medium">คลังภาพ &<br />รางวัล</span>
        </button>
      </nav>

      {/* NOTICES */}
      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-300 flex items-center gap-2">
          <Check size={16} />
          <span>{t.studioSavedNotice || 'บันทึกข้อมูลร่างเรียบร้อยแล้ว'}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-300 flex items-center gap-2" role="alert">
          <X size={16} />
          <span>{t.studioUploadError || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'}</span>
        </div>
      )}

      {uploadSuccessNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-300 flex items-center gap-2">
          <Check size={16} />
          <span>{t.studioUploadSuccess || 'อัปโหลดรูปภาพสำเร็จ'}</span>
        </div>
      )}

      {notice && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${notice.ok ? 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-300' : 'bg-rose-500/15 border border-rose-400/35 text-rose-300'}`}>
          {notice.ok ? <Check size={16} /> : <X size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* ==========================================
           TAB 1: ตัวตน & ภาพลักษณ์ (IDENTITY & APPEARANCE)
           ========================================== */}
      {activeTab === 'identity' && (
        <section className="studio-panel relative z-10 p-4 space-y-4">
          <p className="text-xs text-zinc-400">สิ่งที่แฟนคลับเห็นบนโปรไฟล์</p>
          {/* Avatar Upload Row */}
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioAvatarLabel}</label>
            <div className="flex items-center gap-3">
              <div className="avatar-foil-ring w-14 h-14 rounded-full shrink-0 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center font-bold text-white text-base">
                  {avatar ? (
                    <img src={studioSrc(avatar)} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(name.trim()[0] || '?').toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCropTarget('avatar');
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="px-3.5 py-2 rounded-xl bg-[#181824] hover:bg-[#222232] border border-white/15 hover:border-pink-400/50 text-xs font-medium text-white flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-400" />
                  <span>{uploading ? t.studioUploading : t.studioUploadBtn}</span>
                </button>
                <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-2.5 py-1 rounded-full">
                  ลุค: {name} Cosplay
                </span>
              </div>
            </div>
          </div>

          {/* Debut Posts (0/3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-300">
                {t.studioPostsLabel} <span className="text-pink-400 font-semibold">({posts.length}/3)</span>
              </label>
              <span className="text-[10px] text-zinc-500">แตะช่องเพื่อเพิ่มภาพการ์ด</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {posts.map((p, i) => (
                <div key={p.media} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-pink-400/50 group shadow-md bg-zinc-900">
                  <img src={studioSrc(p.media)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                    <button
                      type="button"
                      onClick={() => setPosts((list) => list.filter((_, j) => j !== i))}
                      className="self-end p-1 rounded-full bg-rose-600/80 text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                    <input
                      type="text"
                      className="w-full bg-black/70 border border-white/20 rounded px-1.5 py-0.5 text-[9.5px] text-white"
                      value={p.caption}
                      placeholder={t.studioPostCaption}
                      onChange={(e) =>
                        setPosts((list) => list.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))
                      }
                    />
                  </div>
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-cyan-300 font-bold">
                    #{i + 1}
                  </span>
                </div>
              ))}
              {posts.length < 3 && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    setCropTarget('post');
                    fileInputRef.current?.click();
                  }}
                  className="aspect-[3/4] rounded-2xl bg-[#0e0e15] hover:bg-[#151520] border border-dashed border-white/15 hover:border-pink-400/50 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-pink-200 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{t.studioPostAdd}</span>
                </button>
              )}
            </div>
          </div>

          {/* Creator Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioNameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yuki, Mira, Noey"
              className="studio-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          {/* Handle IG */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioHandleLabel}</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. yuki.cosplay"
              className="studio-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">
              {t.studioAgeLabel} <span className="text-zinc-500">({t.studioAgeHint})</span>
            </label>
            <input
              type="number"
              min={20}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="20+"
              className="studio-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          {/* Public introduction: never derive either field from the private character brief. */}
          <div className="space-y-1.5">
            <label htmlFor="studio-tagline" className="block text-[11px] font-medium text-zinc-300">{t.studioTaglineLabel}</label>
            <textarea
              id="studio-tagline" maxLength={200} aria-describedby="studio-tagline-hint"
              rows={2}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed"
            />
            <p id="studio-tagline-hint" className="text-[10px] text-zinc-400">{t.studioTaglineHint} ({tagline.length}/200)</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="studio-profile-description" className="block text-[11px] font-medium text-zinc-300">{t.studioProfileDescriptionLabel}</label>
            <textarea id="studio-profile-description" maxLength={4000} aria-describedby="studio-profile-description-hint" rows={5}
              value={profileDescription} onChange={e => setProfileDescription(e.target.value)}
              className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed"/>
            <p id="studio-profile-description-hint" className="text-[10px] text-zinc-400">{t.studioProfileDescriptionHint} ({profileDescription.length}/4000)</p>
          </div>

          {/* Likes & Dislikes (2-Column Grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioLikesLabel}</label>
              <input
                type="text"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="มาการอง, ถ่ายรูป"
                className="studio-input w-full px-3 py-2.5 text-[11.5px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioDislikesLabel}</label>
              <input
                type="text"
                value={dislikes}
                onChange={(e) => setDislikes(e.target.value)}
                placeholder="ข้อความหยาบคาย, แมลง"
                className="studio-input w-full px-3 py-2.5 text-[11.5px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
           TAB 2: น้ำเสียง & สไตล์พูด (VOICE & SPEAKING STYLE)
           ========================================== */}
      {activeTab === 'voice' && (
        <section className="studio-panel relative z-10 p-4 space-y-4">
          <p className="text-xs text-zinc-400">ข้อมูลที่ AI ใช้ถ่ายทอดความเป็นคุณ</p>
          <AiIdentityField lang={lang} value={aiIdentity} onChange={setAiIdentity}/>
          {/* Pronouns Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioPronounsLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['เค้า / ตัวเอง', 'หนู / พี่', 'เรา / เธอ', 'ฉัน / คุณ'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPronouns(p)}
                  className={`px-3 py-2 rounded-xl text-[11px] transition cursor-pointer ${
                    pronouns === p
                      ? 'font-semibold bg-gradient-to-r from-pink-500/25 to-purple-500/25 border border-pink-400 text-pink-200'
                      : 'font-medium bg-[#0e0e15] border border-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioVoiceToneLabel}</label>
            <input
              type="text"
              value={voiceTone}
              onChange={(e) => setVoiceTone(e.target.value)}
              placeholder="e.g. ขี้อ้อน อบอุ่น"
              className="studio-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          {/* Catchphrases */}
          <div className="space-y-1.5">
            <label htmlFor="studio-sample-quotes" className="block text-[11px] font-medium text-zinc-300">{t.studioSampleQuotesLabel}</label>
            <textarea
              id="studio-sample-quotes"
              rows={8}
              value={sampleQuotes}
              onChange={(e) => setSampleQuotes(e.target.value)}
              placeholder={t.studioSampleQuotesPlaceholder}
              className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed"
            />
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">{t.studioConsistentVoiceHint}</p>
        </section>
      )}

      {/* ==========================================
           TAB 3: ความลับ & ขอบเขต (SECRETS & BOUNDARIES)
           ========================================== */}
      {activeTab === 'safety' && (
        <section className="studio-panel relative z-10 p-4 space-y-4">
          <div className="p-3 rounded-xl bg-[#0e0e15] border border-pink-400/20 space-y-2">
            <label className="flex items-center gap-3 text-xs font-semibold text-white cursor-pointer">
              <input type="checkbox" checked={adultContent} onChange={e => { setAdultContent(e.target.checked); setTestAdultMode(false); }} className="w-4 h-4 accent-pink-500"/>
              {t.studioAdultContentLabel}
            </label>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{t.studioAdultContentHint}</p>
            {adultContent && <div className="space-y-2 pt-2">
              <label htmlFor="studio-adult-preferences" className="block text-[11px] font-semibold text-pink-300">{t.studioAdultPreferencesLabel}</label>
              <textarea id="studio-adult-preferences" rows={10} maxLength={2000}
                aria-describedby="studio-adult-preferences-hint studio-adult-preferences-count"
                value={adultPreferences} onChange={e => setAdultPreferences(e.target.value)}
                placeholder={t.studioAdultPreferencesPlaceholder}
                className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed resize-y"/>
              <div className="flex items-start justify-between gap-3 text-[10px] text-zinc-400">
                <p id="studio-adult-preferences-hint" className="leading-relaxed">{t.studioAdultPreferencesHint}</p>
                <span id="studio-adult-preferences-count" className="shrink-0 tabular-nums">{adultPreferences.length.toLocaleString()}/2,000</span>
              </div>
            </div>}
          </div>
          {/* Security Guard Checkboxes */}
          <div className="space-y-2.5">
            <label className="block text-[11.5px] font-semibold text-white">
              กฎเหล็กความปลอดภัย <span className="text-zinc-400 font-normal">({t.studioSafetyRulesLabel})</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0e0e15] border border-white/[0.07] cursor-pointer hover:border-pink-400/40 transition">
              <input
                type="checkbox"
                checked={ruleNoAddress}
                onChange={(e) => setRuleNoAddress(e.target.checked)}
                className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-200">{t.studioRuleNoAddress}</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0e0e15] border border-white/[0.07] cursor-pointer hover:border-pink-400/40 transition">
              <input
                type="checkbox"
                checked={ruleNoMeet}
                onChange={(e) => setRuleNoMeet(e.target.checked)}
                className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-200">{t.studioRuleNoMeet}</span>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0e0e15] border border-white/[0.07] cursor-pointer hover:border-pink-400/40 transition">
              <input
                type="checkbox"
                checked={rulePoliteReject}
                onChange={(e) => setRulePoliteReject(e.target.checked)}
                className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-200">{t.studioRulePoliteReject}</span>
            </label>
          </div>

        </section>
      )}

      {/* ==========================================
           TAB 4: ทดลองคุยสด (LIVE DM SANDBOX)
           ========================================== */}
      {activeTab === 'sandbox' && (
        <section className="studio-panel relative z-10 p-4 space-y-3.5">
          {/* Opening Scene */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioOpeningSceneLabel}</label>
            <input
              type="text"
              value={openingLocation}
              onChange={(e) => setOpeningLocation(e.target.value)}
              placeholder="หลังเวทีงานคอสเพลย์"
              className="studio-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          {/* First Greeting */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-300">{t.studioGreetingLabel}</label>
            <textarea
              rows={2}
              value={openingGreeting}
              onChange={(e) => setOpeningGreeting(e.target.value)}
              placeholder="*(ยิ้มเขินๆ พลางจัดวิกผม)* สวัสดีค่ะ แวะมาถ่ายรูปเหรอคะ?"
              className="studio-input w-full px-3.5 py-2.5 text-xs leading-relaxed"
            />
          </div>

          {/* Live DM Sandbox Box */}
          <div className="rounded-2xl bg-[#0c0c13] border border-white/10 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-bold text-white">{t.studioTestChatTitle || 'ตู้ทดสอบคุยสด (Live DM Sandbox)'}</div>
                <div className="text-[10px] text-zinc-400">{t.studioSandboxVoiceHint}</div>
              </div>


            </div>

            <button
              type="button"
              onClick={handleResetSandbox}
              disabled={sandboxBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161622] hover:bg-[#1f1f2e] border border-white/10 text-[11px] font-medium text-zinc-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-cyan-300" />
              <span>{t.studioSandboxReset || 'เริ่มบทสนทนาใหม่'}</span>
            </button>

            {/* Amber Notice Banner */}
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[10px] text-amber-300 leading-relaxed">
              {t.studioMockNotice || 'ตอบด้วย AI จริงจากร่างปัจจุบัน (ไม่ต้องบันทึกก่อน) • หัก 1 พลังงานต่อข้อความ • ผู้เล่นคนอื่นไม่เห็น'}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              <input type="checkbox" checked={testAdultMode && adultContent} disabled={!adultContent || sandboxBusy} onChange={e => setTestAdultMode(e.target.checked)}/>
              {t.studioSandboxAdultLabel} {!adultContent && t.studioSandboxAdultDisabled}
            </label>
            <p className="text-[10px] text-zinc-500">ห้องทดลองไม่สะสมเครดิตหรือเปลี่ยน Lv. ของผู้เล่นจริง</p>
            {/* Chat Log */}
            <div ref={streamRef} className="h-44 overflow-y-auto space-y-2.5 pr-1 text-xs no-scrollbar">
              {testMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'creator' && (
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-pink-400/40 bg-zinc-800">
                      {avatar ? <img src={studioSrc(avatar)} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 max-w-[82%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'btn-holo-pink text-white rounded-tr-sm'
                        : 'bg-[#181826] border border-white/10 text-zinc-100 rounded-tl-sm'
                    }`}
                  >
                    {msg.action && <em className="block text-[10px] text-pink-300 not-italic mb-0.5">{msg.action}</em>}
                    <span>{msg.text}</span>
                  </div>
                </div>
              ))}
              {sandboxBusy && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-pink-400/40 bg-zinc-800" />
                  <div className="bg-[#181826] border border-white/10 text-zinc-100 rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 size={14} className="animate-spin text-pink-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Sandbox Input Form */}
            <form onSubmit={handleSendTestMessage} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.studioTestPlaceholder || 'ลองพิมพ์คุยกับ AI Twin ของคุณ...'}
                className="flex-1 bg-[#14141f] border border-white/10 focus:border-pink-400 focus:outline-none rounded-full px-3.5 py-2 text-xs text-white placeholder-zinc-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sandboxBusy}
                className="w-8 h-8 rounded-full btn-holo-pink flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>
      )}

      {/* ==========================================
           TAB 5: คลังภาพ & รางวัล (GALLERY & REWARDS)
           ========================================== */}
      {activeTab === 'gallery' && (
        <section className="relative z-10 space-y-4">
          <div className="studio-panel p-4 space-y-3">
            <h2 className="text-sm font-bold text-white">{t.studioRewardLevelsTitle}</h2>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{t.studioRewardLevelsHint}</p>
            <p className="text-[11px] text-zinc-400">{t.studioRewardCostsHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {levelCosts.map((cost, i) => (
                <div key={i} className="space-y-1">
                  <label htmlFor={`level-cost-${i}`} className="block text-xs text-pink-300">Lv.{i + 1} → Lv.{i + 2} · {t.studioCreditsUnit}</label>
                  <input id={`level-cost-${i}`} type="number" min={1} max={100000} step={1} value={Number.isNaN(cost) ? '' : cost}
                    onChange={e => setLevelCosts(prev => prev.map((v, j) => j === i ? e.target.valueAsNumber : v))}
                    className="studio-input w-full px-3 py-2 text-xs"/>
                  <p className="text-[10px] text-zinc-400">{validCosts ? t.studioRewardCumulative(levelCosts.slice(0, i + 1).reduce((a, b) => a + b, 0)) : t.studioRewardCostsInvalid}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="studio-panel p-4 space-y-4">
            <h2 className="text-sm font-bold text-white">{t.studioAddReward || 'เพิ่มภาพภารกิจ / ตู้สุ่ม'}</h2>

            {/* Reward Image Picker */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioAvatarLabel}</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 rounded-2xl bg-[#0e0e15] border border-dashed border-pink-400/45 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {newRewardAsset ? (
                    <img src={studioSrc(newRewardAsset)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-zinc-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCropTarget('reward');
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t.studioUploadBtn}</span>
                </button>
              </div>
            </div>

            {/* Reward Title */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioPhotoTitle}</label>
              <input
                type="text"
                value={newRewardTitle}
                onChange={(e) => setNewRewardTitle(e.target.value)}
                placeholder="เช่น เรื่องที่เป็นไปไม่ได้, ชุดราตรีลับเฉพาะ"
                className="studio-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>

            {/* Rarity Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioRewardRarity}</label>
              <div className="flex items-center gap-2">
                {(['R', 'SR', 'SSR', 'UR'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRewardRarity(r)}
                    className={`w-11 h-9 rounded-full text-xs font-bold transition cursor-pointer ${
                      newRewardRarity === r
                        ? 'bg-pink-500/20 border border-pink-400 text-pink-200 shadow-sm shadow-pink-500/30'
                        : 'bg-[#0e0e15] border border-white/15 text-zinc-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Unlock Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-zinc-300">{t.studioUnlockType}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRewardUnlockType('mission')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    newRewardUnlockType === 'mission'
                      ? 'bg-pink-500/20 border border-pink-400 text-pink-200'
                      : 'bg-[#0e0e15] border border-white/10 text-zinc-400'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t.studioMissionMode || 'ภารกิจแชท'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewRewardUnlockType('diamond_gacha')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    newRewardUnlockType === 'diamond_gacha'
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
                      : 'bg-[#0e0e15] border border-white/10 text-zinc-400'
                  }`}
                >
                  <Gem className="w-3.5 h-3.5" />
                  <span>{t.studioGachaMode || 'ตู้สุ่มเพชร'}</span>
                </button>
              </div>
            </div>

            {/* Numeric Targets */}
            {newRewardUnlockType === 'mission' ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-medium text-zinc-300">{t.studioTargetTurns}</label>
                    <input
                      type="number"
                      value={newRewardTurns}
                      onChange={(e) => setNewRewardTurns(Number(e.target.value))}
                      className="studio-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reward-min-level" className="block text-[10.5px] font-medium text-zinc-300">ระดับที่ปลดล็อกภาพ</label>
                    <input
                      id="reward-min-level"
                      type="number"
                      min={1} max={5} step={1}
                      value={newRewardLevel}
                      onChange={(e) => setNewRewardLevel(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                      className="studio-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400">ใช้ Lv. จากเครดิตแชทและจำนวนข้อความที่ตอบสำเร็จเป็นเงื่อนไข ภาพเดิมที่ยังไม่มี Lv. จะเริ่มที่ Lv.2 เมื่ออัปเดตตัวละคร</p>

                <div className="space-y-1">
                  <label className="block text-[10.5px] font-medium text-zinc-300">{t.studioMissionHint}</label>
                  <input
                    type="text"
                    value={newRewardHint}
                    onChange={(e) => setNewRewardHint(e.target.value)}
                    placeholder="ปรับความเข้าใจคืนดีกันไว้ใจกัน"
                    className="studio-input w-full px-3.5 py-2 text-xs"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="block text-[10.5px] font-medium text-zinc-300">{t.studioFallbackEnergy}</label>
                <input
                  type="number"
                  value={newRewardFallback}
                  onChange={(e) => setNewRewardFallback(Number(e.target.value))}
                  className="studio-input w-full px-3 py-2 text-xs"
                />
              </div>
            )}

            {/* Add Reward CTA */}
            <button
              type="button"
              onClick={handleAddReward}
              disabled={!newRewardTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-700/80 via-fuchsia-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-500 border border-pink-400/35 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg transition active:scale-98 cursor-pointer disabled:opacity-40"
            >
              <span>+ {t.studioAddReward || 'เพิ่มภาพภารกิจ / ตู้สุ่ม'}</span>
            </button>
          </div>

          {/* Vault Grid Card */}
          <div className="studio-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {t.studioSavedRewards || 'ภาพทั้งหมดในคลัง'} <span className="text-cyan-300">({rewards.length})</span>
              </h3>
              <span className="text-[10px] text-zinc-400">การ์ดสะสม TCG Foil</span>
            </div>

            {rewards.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                ยังไม่มีภาพรางวัลในคลัง กดปุ่ม "+ เพิ่มภาพภารกิจ / ตู้สุ่ม" ด้านบนเพื่อสร้างการ์ดสะสม
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {rewards.map((r) => (
                  <div key={r.id} className="holo-tcg-card p-2.5 space-y-2 overflow-hidden">
                    <div className="holo-sparkle-grain absolute inset-0 pointer-events-none" />
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/15 bg-zinc-900">
                      {r.asset ? <img src={studioSrc(r.asset)} alt="" className="w-full h-full object-cover" /> : null}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-gradient-to-r from-amber-200 via-pink-300 to-cyan-200 text-zinc-950 shadow">
                        {r.rarity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReward(r.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 text-zinc-200 hover:text-rose-400 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="relative z-10">
                      <div className="text-xs font-bold text-white truncate">{r.name}</div>
                      <div className="text-[10px] text-cyan-300 mt-0.5">
                        {r.unlockType === 'mission'
                          ? `Lv.${r.minLevel || 2} • ${r.turns} ข้อความ`
                          : `💎 ${r.energyFallback} เพชร`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==========================================
           5. PERSISTENT LAUNCH READINESS & ACTION FOOTER
           ========================================== */}
      <section className="studio-panel relative z-10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            {t.studioChecklistTitle || 'ความพร้อมเปิดตัว'}{' '}
            <span className={readyCount === checklist.length ? 'text-emerald-400' : 'text-amber-400'}>
              {readyCount}/{checklist.length}
            </span>
          </span>
          <span className="text-[10px] text-cyan-300 font-medium">
            {readyCount === checklist.length ? '✨ พร้อมเผยแพร่สู่หน้าหลัก' : 'กำลังจัดเตรียมข้อมูล'}
          </span>
        </div>

        {/* 7 Check Pills */}
        <div className="flex flex-wrap gap-1.5">
          {checklist.map(([k, ok]) => (
            <span
              key={k}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${
                ok
                  ? 'bg-emerald-500/12 border border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-800/40 border border-white/10 text-zinc-400'
              }`}
            >
              {ok ? '✓' : '•'} {problemLabels[k]}
            </span>
          ))}
        </div>
      </section>

      {/* Online Status & 2x2 Action Button Grid */}
      <section className="relative z-10 space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
            }`}
          />
          <span className={`text-[11px] font-medium ${isLive ? 'text-emerald-400' : 'text-zinc-400'}`}>
            {isLive ? 'ออนไลน์อยู่' : 'ปิดชั่วคราว (Draft)'}
          </span>
          <span className="text-[11px] text-zinc-500">• @{handle.replace(/^@/, '') || 'yuki.cosplay'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!isLive || !studio.creatorId}
            onClick={() => {
              if (studio.creatorId) onOpenLiveChat?.(studio.creatorId);
            }}
            className="py-3 px-3 rounded-xl bg-[#14141d] hover:bg-[#1c1c28] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <MessageCircle className="w-3.5 h-3.5 text-cyan-300" />
            <span>{t.studioOpenLiveChat || 'คุยกับตัวละครจริง'}</span>
          </button>

          <button
            type="button"
            disabled={!isLive || !!busyAction}
            onClick={handleUnpublish}
            className="py-3 px-3 rounded-xl bg-[#14141d] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-xs font-semibold text-zinc-200 hover:text-rose-200 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {busyAction === 'unpublish' ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{t.studioUnpublish || 'ถอดตัวละคร'}</span>
          </button>

          <button
            type="button"
            disabled={!!busyAction}
            onClick={handleSaveDraft}
            className="py-3 px-3 rounded-xl bg-[#14141d] hover:bg-[#1c1c28] border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {busyAction === 'save' ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{t.studioSaveDraft || 'บันทึกข้อมูล'}</span>
          </button>

          <button
            type="button"
            disabled={!!busyAction}
            onClick={handleLaunch}
            className="btn-holo-pink py-3 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {busyAction === 'launch' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{isLive ? t.studioRelaunch || 'อัปเดตตัวละคร' : t.studioLaunch || 'เปิดตัวตัวละคร'}</span>
          </button>
        </div>
      </section>

      {/* Interactive 512x640 Auto-Resize and Crop Modal */}
      {cropModalOpen && stagingPreview && (
        <div className="fs-studio-crop-modal-overlay">
          <div className="fs-studio-crop-modal">
            <div className="fs-studio-crop-header">
              <span className="fs-studio-crop-title">{t.studioResizeTitle}</span>
              <button
                type="button"
                className="fs-studio-crop-close cursor-pointer"
                onClick={() => setCropModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="fs-studio-crop-preview-wrap">
              <div className="fs-studio-crop-viewport">
                <img
                  src={stagingPreview}
                  alt="Crop Preview"
                  className="fs-studio-crop-img"
                  style={{
                    transform: `translate(${panX}%, ${panY}%) scale(${zoom})`,
                  }}
                />
                <div className="fs-studio-crop-avatar-guide" />
              </div>
            </div>

            <div className="fs-studio-crop-controls">
              <div className="fs-studio-crop-slider-row">
                <span className="fs-studio-crop-slider-label">
                  {t.studioZoomLabel} ({zoom.toFixed(1)}x)
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>
              <div className="fs-studio-crop-slider-row">
                <span className="fs-studio-crop-slider-label">{t.studioPanYLabel}</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={panY}
                  onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                />
              </div>
              <div className="fs-studio-crop-slider-row">
                <span className="fs-studio-crop-slider-label">{t.studioPanXLabel}</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={panX}
                  onChange={(e) => setPanX(parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="fs-studio-crop-actions">
              <button
                type="button"
                className="fs-studio-btn-cancel cursor-pointer"
                onClick={() => setCropModalOpen(false)}
              >
                {t.studioCancel}
              </button>
              <button
                type="button"
                className="fs-studio-btn-apply cursor-pointer"
                onClick={handleApplyCropAndUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t.studioUploading}</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{t.studioCropApplyBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
