import { useState, useEffect, useRef } from 'react';
import { TRANSLATIONS, type Lang } from '../i18n';
import { Sparkles, User, MessageCircle, ShieldCheck, Play, Check, Send, Heart, RotateCcw, Camera, X, Loader2, Image as ImageIcon, Trash2, Plus, Gem } from 'lucide-react';
import { media } from '../ui';
import { resizeImageToStandard } from '../lib/image-resizer';
import { api } from '../api';

interface CosplayCreatorTabProps {
  lang: Lang;
  onOpenRecentChats?: () => void;
  onOpenLiveChat?: (creatorId: string) => void;
}

type StudioState = { draft: Record<string, unknown> | null; creatorId: string | null; status: 'none' | 'draft' | 'live' };

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
  const [cropTarget, setCropTarget] = useState<'avatar' | 'reward'>('avatar');
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Pillar 1: Identity & Visual
  const [name, setName] = useState('Yuki');
  const [handle, setHandle] = useState('yuki.cosplay');
  const [concept, setConcept] = useState('');
  const [age, setAge] = useState('');
  const [studio, setStudio] = useState<StudioState>({ draft: null, creatorId: null, status: 'none' });
  const [busyAction, setBusyAction] = useState<'' | 'save' | 'launch' | 'unpublish'>('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [avatar, setAvatar] = useState('');
  const [tags, setTags] = useState('cosplay, anime, assassin, cute');
  const [likes, setLikes] = useState('Macaron, photography, cute anime');
  const [dislikes, setDislikes] = useState('Rude messages, bugs');

  // Pillar 2: Voice & Tone
  const [pronouns, setPronouns] = useState('เค้า / ตัวเอง');
  const [voiceTone, setVoiceTone] = useState('ขี้อ้อน อบอุ่น');
  const [sampleQuotes, setSampleQuotes] = useState('ขอบคุณที่แวะมาถ่ายรูปด้วยกันนะคะ! / งอนแล้วนะ ไม่ยอมมากดหัวใจให้โพสต์เค้าเลย');
  const [levelStyles, setLevelStyles] = useState<string[]>([
    'สวัสดีค่ะ ยินดีที่ได้คุยกันนะคะ วันนี้มีอะไรให้ช่วยไหมคะ',
    'อ๊ะ จำได้สิคะ! แฟนคลับที่แวะมาหาบ่อยๆ วันนี้เป็นไงบ้าง',
    'ดีใจจังที่เธอทักมา กำลังคิดถึงอยู่พอดีเลย วันนี้เหนื่อยไหม',
    'จริงๆ วันนี้เค้าเหนื่อยมากเลย แต่พอได้คุยกับเธอก็ยิ้มออกนะ',
    'คิดถึงที่สุดเลย! อย่าหายไปไหนนานๆ อีกนะ เค้าเหงามาก',
  ]);

  // Pillar 3: Safety & Secrets
  const [ruleNoAddress, setRuleNoAddress] = useState(true);
  const [ruleNoMeet, setRuleNoMeet] = useState(true);
  const [rulePoliteReject, setRulePoliteReject] = useState(true);
  const [secret, setSecret] = useState('จริงๆ แล้วชุดคอสเพลย์ชุดนี้ ซิปข้างหลังเกือบแตกหลังเวที ดีนะที่เอาเข็มกลัดไปด้วย!');
  const [immutableFacts, setImmutableFacts] = useState('เลี้ยงแมวส้มชื่อบ็อบบี้ 1 ตัว / ทำชุดคอสเพลย์เองเกือบทุกชุด');

  // Pillar 4: First Meeting & Live Simulation
  const [openingLocation, setOpeningLocation] = useState('หลังเวทีงานคอสเพลย์');
  const [openingGreeting, setOpeningGreeting] = useState('*(ยิ้มเขินๆ พลางจัดวิกผม)* สวัสดีค่ะ แวะมาทักทายเค้าเหรอคะ? ชุดวันนี้เป็นไงบ้าง?');
  const [testLevel, setTestLevel] = useState<number>(1);
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'creator'; text: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Pillar 5: Vault & Missions
  const [rewards, setRewards] = useState<RewardDraft[]>([]);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardAsset, setNewRewardAsset] = useState('');
  const [newRewardRarity, setNewRewardRarity] = useState<'R' | 'SR' | 'SSR' | 'UR'>('SSR');
  const [newRewardUnlockType, setNewRewardUnlockType] = useState<'mission' | 'diamond_gacha'>('mission');
  const [newRewardHint, setNewRewardHint] = useState('ปรับความเข้าใจคืนดีกันไว้ใจกัน');
  const [newRewardTurns, setNewRewardTurns] = useState(40);
  const [newRewardTrust, setNewRewardTrust] = useState(100);
  const [newRewardRomance, setNewRewardRomance] = useState(50);
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
      trust: Number(newRewardTrust) || 0,
      romance: Number(newRewardRomance) || 0,
      energyFallback: Number(newRewardFallback) || 5,
    };
    setRewards([...rewards, item]);
    setNewRewardTitle('');
  };

  const handleDeleteReward = (id: string) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyDraft = (data: any) => {
    if (!data || typeof data !== 'object') return;
    if (data.name) setName(data.name);
    if (data.handle) setHandle(data.handle);
    if (data.concept) setConcept(data.concept);
    if (data.age) setAge(String(data.age));
    if (data.avatar) setAvatar(data.avatar);
    if (data.tags) setTags(data.tags);
    if (data.likes) setLikes(data.likes);
    if (data.dislikes) setDislikes(data.dislikes);
    if (data.pronouns) setPronouns(data.pronouns);
    if (data.voiceTone) setVoiceTone(data.voiceTone);
    if (data.sampleQuotes) setSampleQuotes(data.sampleQuotes);
    if (Array.isArray(data.levelStyles) && data.levelStyles.length === 5) setLevelStyles(data.levelStyles);
    if (typeof data.ruleNoAddress === 'boolean') setRuleNoAddress(data.ruleNoAddress);
    if (typeof data.ruleNoMeet === 'boolean') setRuleNoMeet(data.ruleNoMeet);
    if (typeof data.rulePoliteReject === 'boolean') setRulePoliteReject(data.rulePoliteReject);
    if (data.secret) setSecret(data.secret);
    if (data.immutableFacts) setImmutableFacts(data.immutableFacts);
    if (data.openingLocation) setOpeningLocation(data.openingLocation);
    if (data.openingGreeting) setOpeningGreeting(data.openingGreeting);
    if (Array.isArray(data.rewards)) setRewards(data.rewards);
  };

  // Drafts live in D1 per account. A draft saved by the older localStorage-only Studio is loaded once as a starting point.
  useEffect(() => {
    api<StudioState>('/api/studio/draft')
      .then((res) => {
        setStudio(res);
        if (res.draft) applyDraft(res.draft);
        else {
          try { applyDraft(JSON.parse(localStorage.getItem('ig_cosplay_creator_draft') || 'null')); } catch { /* ignore */ }
        }
      })
      .catch(() => setNotice({ ok: false, text: t.studioActionError }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize test messages if empty
  useEffect(() => {
    if (testMessages.length === 0) {
      setTestMessages([
        { sender: 'creator', text: openingGreeting },
      ]);
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

    // reset input so the same file can be selected again
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
    name, handle, concept, age: Number(age) || 0, avatar, tags, likes, dislikes, pronouns, voiceTone, sampleQuotes,
    levelStyles, ruleNoAddress, ruleNoMeet, rulePoliteReject, secret, immutableFacts, openingLocation, openingGreeting, rewards,
  });

  const problemLabels: Record<string, string> = {
    name: t.studioNameLabel, handle: t.studioHandleLabel, concept: t.studioConceptLabel, age: `${t.studioAgeLabel} (${t.studioAgeHint})`,
    avatar: t.studioAvatarLabel, voiceTone: t.studioVoiceToneLabel, levelStyles: t.studioLevelsLabel,
  };
  const missingText = (problems: string[]) => `${t.studioMissing} ${problems.map((p) => problemLabels[p] || p).join(', ')}`;
  const flash = (ok: boolean, text: string) => { setNotice({ ok, text }); setTimeout(() => setNotice(null), 6000); };

  const handleSaveDraft = async () => {
    setBusyAction('save');
    try {
      const res = await api<StudioState & { problems: string[] }>('/api/studio/draft', { method: 'PUT', body: JSON.stringify(collectDraft()) });
      setStudio(res);
      try { localStorage.removeItem('ig_cosplay_creator_draft'); } catch { /* ignore */ }
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
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(collectDraft()),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) { setStudio(data); flash(true, t.studioLaunched); }
      else if (data?.error === 'draft_incomplete') flash(false, missingText(data.problems || []));
      else if (data?.error === 'handle_taken') flash(false, t.studioHandleTaken);
      else flash(false, t.studioActionError);
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

  const handleAiAutoTuneLevels = () => {
    const isAffectionate = voiceTone.includes('อ้อน') || voiceTone.includes('อบอุ่น');
    const pMe = pronouns.split('/')[0]?.trim() || 'เค้า';
    const pYou = pronouns.split('/')[1]?.trim() || 'ตัวเอง';

    setLevelStyles([
      `สวัสดีค่ะ ยินดีที่ได้คุยกันนะคะ วันนี้มีเรื่องอะไรเกี่ยวกับชุดคอสเพลย์อยากถามไหมคะ`,
      `อ๊ะ จำได้สิคะ! ${pYou}ที่แวะมาคอมเมนต์บ่อยๆ ขอบคุณที่คอยซัพพอร์ต${pMe}นะคะ`,
      `ดีใจจังที่${pYou}ทักมา ${pMe}กำลังคิดถึงอยู่พอดีเลย วันนี้เหนื่อยไหมคะ มีอะไรเล่าให้ฟังได้นะ`,
      `จริงๆ วันนี้${pMe}เหนื่อยมากเลย ซ้อมคอสเพลย์ทั้งวัน แต่พอเปิดข้อความเห็น${pYou}ทักมาก็ยิ้มออกเลย`,
      `คิดถึงที่สุดเลย! ${isAffectionate ? 'อย่าปล่อยให้เค้ารอนานนะ' : 'อยากคุยด้วยตลอดเวลาเลย'} สัญญาแล้วนะว่าจะอยู่เป็นกำลังใจให้กันตลอดไป 💕`,
    ]);
  };

  const handleSendTestMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    const newMsgs = [...testMessages, { sender: 'user' as const, text }];
    setTestMessages(newMsgs);
    setInputMessage('');

    setTimeout(() => {
      let reply = '';
      const style = levelStyles[testLevel - 1] || levelStyles[0];
      const pMe = pronouns.split('/')[0]?.trim() || 'เค้า';

      if (testLevel === 1) {
        reply = `(ยิ้มต้อนรับอย่างสุภาพ) ขอบคุณสำหรับข้อความนะคะ! ${style}`;
      } else if (testLevel === 2) {
        reply = `(หัวเราะเบาๆ) แซวเก่งจังเลยนะคะ! ${style}`;
      } else if (testLevel === 3) {
        reply = `(ตาเป็นประกาย) จำเรื่องนี้ได้ด้วยเหรอคะ ดีใจจัง! ${pMe}ชอบที่${pronouns.split('/')[1]?.trim() || 'เธอ'}ใส่ใจนะ`;
      } else if (testLevel === 4) {
        reply = `(กระซิบเบาๆ) มีแค่เธอคนเดียวนะที่${pMe}กล้าเล่าเรื่องนี้ให้ฟัง... รู้สึกสบายใจเวลาได้คุยกับเธอจัง`;
      } else {
        reply = `(กอดแขนอ้อน) น่ารักที่สุดเลย! ถ้าวันไหนไม่ได้คุยกับเธอ ${pMe}คงนอนไม่หลับแน่ๆ เลย 💕`;
      }

      setTestMessages([...newMsgs, { sender: 'creator', text: reply }]);
    }, 400);
  };

  const handleTuneReply = (kind: 'cute' | 'formal' | 'short') => {
    if (testMessages.length === 0) return;
    const lastMsg = testMessages[testMessages.length - 1];
    if (lastMsg.sender !== 'creator') return;

    let tunedText = lastMsg.text;
    if (kind === 'cute') {
      tunedText = tunedText.replace(/นะคะ|ครับ|ค่ะ/g, 'นะค้าบ~') + ' 💕✨';
    } else if (kind === 'formal') {
      tunedText = tunedText.replace(/~|💕|✨/g, '') + ' ขอบคุณมากค่ะ ยินดีที่ได้คุยด้วยนะคะ';
    } else if (kind === 'short') {
      tunedText = tunedText.split('!')[0] + '! 😊';
    }

    const updated = [...testMessages];
    updated[updated.length - 1] = { ...lastMsg, text: tunedText };
    setTestMessages(updated);
  };

  return (
    <div className="fs-cosplay-studio">
      {/* Studio Header Banner */}
      <div className="fs-studio-banner">
        <div className="fs-studio-badge">
          <Sparkles size={14} className="text-pink-400" />
          <span>{t.studioBadge}</span>
        </div>
        <h1 className="fs-studio-title">{t.studioTitle}</h1>
        <p className="fs-studio-subtitle">{t.studioSubtitle}</p>
      </div>

      {/* 4 Pillars Navigation Bar */}
      <div className="fs-studio-nav">
        <button
          type="button"
          className={`fs-studio-tab-btn ${activeTab === 'identity' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('identity')}
        >
          <User size={15} />
          <span>{t.studioTabIdentity}</span>
        </button>
        <button
          type="button"
          className={`fs-studio-tab-btn ${activeTab === 'voice' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <MessageCircle size={15} />
          <span>{t.studioTabVoice}</span>
        </button>
        <button
          type="button"
          className={`fs-studio-tab-btn ${activeTab === 'safety' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          <ShieldCheck size={15} />
          <span>{t.studioTabSafety}</span>
        </button>
        <button
          type="button"
          className={`fs-studio-tab-btn ${activeTab === 'sandbox' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
        >
          <Play size={15} />
          <span>{t.studioTabSandbox}</span>
        </button>
        <button
          type="button"
          className={`fs-studio-tab-btn ${activeTab === 'gallery' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <ImageIcon size={15} />
          <span>{t.studioTabGallery}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="fs-studio-alert-success">
          <Check size={16} />
          <span>{t.studioSavedNotice}</span>
        </div>
      )}

      {uploadError && (
        <div className="fs-studio-alert-error" role="alert">
          <X size={16} />
          <span>{t.studioUploadError}</span>
        </div>
      )}

      {uploadSuccessNotice && (
        <div className="fs-studio-alert-success">
          <Check size={16} />
          <span>{t.studioUploadSuccess}</span>
        </div>
      )}

      {/* Tab 1: Identity & Visual */}
      {activeTab === 'identity' && (
        <div className="fs-studio-card">
          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioAvatarLabel}</label>
            <div className="fs-studio-avatar-row">
              <div className="fs-studio-current-avatar">
                {avatar ? (
                  <img src={studioSrc(avatar)} alt={name} className="fs-studio-avatar-img" />
                ) : (
                  <span className="fs-studio-avatar-placeholder">{(name.trim()[0] || '?').toUpperCase()}</span>
                )}
              </div>

              {/* Upload & Auto-Resize Controls */}
              <div className="fs-studio-avatar-controls">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  className="fs-studio-upload-btn"
                  onClick={() => {
                    setCropTarget('avatar');
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  <Camera size={14} />
                  <span>{uploading ? t.studioUploading : t.studioUploadBtn}</span>
                </button>
              </div>

            </div>
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioNameLabel}</label>
            <input
              type="text"
              className="fs-studio-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yuki, Mira, Noey"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioHandleLabel}</label>
            <input
              type="text"
              className="fs-studio-input"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="e.g. yuki.cosplay"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioAgeLabel} <span className="fs-studio-hint">({t.studioAgeHint})</span></label>
            <input
              type="number"
              inputMode="numeric"
              min={20}
              max={99}
              className="fs-studio-input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="20+"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioConceptLabel}</label>
            <textarea
              className="fs-studio-textarea"
              rows={2}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. นักสืบสาวในชุดกิโมโนสีน้ำเงิน ขี้อายแต่แอบแกร่ง"
            />
          </div>

          <div className="fs-studio-grid-2">
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioLikesLabel}</label>
              <input
                type="text"
                className="fs-studio-input"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="e.g. มาการอง, ถ่ายรูป"
              />
            </div>
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioDislikesLabel}</label>
              <input
                type="text"
                className="fs-studio-input"
                value={dislikes}
                onChange={(e) => setDislikes(e.target.value)}
                placeholder="e.g. แมลง, คำหยาบคาย"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Voice & Tone */}
      {activeTab === 'voice' && (
        <div className="fs-studio-card">
          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioPronounsLabel}</label>
            <div className="fs-studio-chips">
              {['เค้า / ตัวเอง', 'หนู / พี่', 'เรา / เธอ', 'ฉัน / คุณ'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`fs-studio-chip ${pronouns === p ? 'is-active' : ''}`}
                  onClick={() => setPronouns(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioVoiceToneLabel}</label>
            <input
              type="text"
              className="fs-studio-input"
              value={voiceTone}
              onChange={(e) => setVoiceTone(e.target.value)}
              placeholder="e.g. ขี้อ้อน อบอุ่น, ร่าเริง กวนๆ"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioSampleQuotesLabel}</label>
            <textarea
              className="fs-studio-textarea"
              rows={2}
              value={sampleQuotes}
              onChange={(e) => setSampleQuotes(e.target.value)}
              placeholder="พิมพ์ประโยคคำพูดจริง 2-3 ประโยค..."
            />
          </div>

          <div className="fs-studio-ai-action">
            <button
              type="button"
              className="fs-studio-ai-btn"
              onClick={handleAiAutoTuneLevels}
            >
              <Sparkles size={16} />
              <span>{t.studioAiGenerate}</span>
            </button>
          </div>

          {/* 5 Levels Preview */}
          <div className="fs-studio-levels-stack">
            {[t.studioLevel1Label, t.studioLevel2Label, t.studioLevel3Label, t.studioLevel4Label, t.studioLevel5Label].map((lvlTitle, i) => (
              <div key={lvlTitle} className="fs-studio-level-item">
                <span className="fs-studio-level-title">{lvlTitle}</span>
                <input
                  type="text"
                  className="fs-studio-input"
                  value={levelStyles[i] || ''}
                  onChange={(e) => {
                    const copy = [...levelStyles];
                    copy[i] = e.target.value;
                    setLevelStyles(copy);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Safety & Secrets */}
      {activeTab === 'safety' && (
        <div className="fs-studio-card">
          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioSafetyRulesLabel}</label>
            <div className="fs-studio-checkbox-stack">
              <label className="fs-studio-checkbox-label">
                <input
                  type="checkbox"
                  checked={ruleNoAddress}
                  onChange={(e) => setRuleNoAddress(e.target.checked)}
                />
                <span>{t.studioRuleNoAddress}</span>
              </label>
              <label className="fs-studio-checkbox-label">
                <input
                  type="checkbox"
                  checked={ruleNoMeet}
                  onChange={(e) => setRuleNoMeet(e.target.checked)}
                />
                <span>{t.studioRuleNoMeet}</span>
              </label>
              <label className="fs-studio-checkbox-label">
                <input
                  type="checkbox"
                  checked={rulePoliteReject}
                  onChange={(e) => setRulePoliteReject(e.target.checked)}
                />
                <span>{t.studioRulePoliteReject}</span>
              </label>
            </div>
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">ข้อเท็จจริงห้ามลืม (Immutable Facts)</label>
            <textarea
              className="fs-studio-textarea"
              rows={2}
              value={immutableFacts}
              onChange={(e) => setImmutableFacts(e.target.value)}
              placeholder="e.g. เลี้ยงแมวชื่อบ็อบบี้, ถ่ายคอสเพลย์มาแล้ว 3 ปี"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioSecretLabel}</label>
            <textarea
              className="fs-studio-textarea"
              rows={2}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ความลับที่จะเล่าเฉพาะเมื่อค่าความสนิทถึง Lv.3-4..."
            />
          </div>
        </div>
      )}

      {/* Tab 4: First Meeting & Live Simulation */}
      {activeTab === 'sandbox' && (
        <div className="fs-studio-card">
          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioOpeningSceneLabel}</label>
            <input
              type="text"
              className="fs-studio-input"
              value={openingLocation}
              onChange={(e) => setOpeningLocation(e.target.value)}
              placeholder="e.g. หลังเวทีงานคอสเพลย์, คาเฟ่หลังเลิกงาน"
            />
          </div>

          <div className="fs-studio-field">
            <label className="fs-studio-label">{t.studioGreetingLabel}</label>
            <textarea
              className="fs-studio-textarea"
              rows={2}
              value={openingGreeting}
              onChange={(e) => setOpeningGreeting(e.target.value)}
              placeholder="คำทักทายแรกเมื่อแฟนคลับเปิดแชทเข้ามา..."
            />
          </div>

          {/* Live DM Sandbox Box */}
          <div className="fs-studio-sandbox-box">
            <div className="fs-studio-sandbox-header">
              <span className="fs-studio-sandbox-title">{t.studioTestChatTitle}</span>
              <div className="fs-studio-level-pills">
                <span className="text-xs text-zinc-400">{t.studioTestSimulateLevel}</span>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`fs-studio-lvl-pill ${testLevel === lvl ? 'is-active' : ''}`}
                    onClick={() => setTestLevel(lvl)}
                  >
                    Lv.{lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Refine Action Bar */}
            <div className="fs-studio-quick-tunes">
              <button
                type="button"
                className="fs-studio-tune-btn"
                onClick={() => handleTuneReply('cute')}
              >
                <Heart size={12} className="text-pink-400" />
                <span>{t.studioToneCuter}</span>
              </button>
              <button
                type="button"
                className="fs-studio-tune-btn"
                onClick={() => handleTuneReply('formal')}
              >
                <ShieldCheck size={12} className="text-blue-400" />
                <span>{t.studioToneFormal}</span>
              </button>
              <button
                type="button"
                className="fs-studio-tune-btn"
                onClick={() => handleTuneReply('short')}
              >
                <RotateCcw size={12} className="text-yellow-400" />
                <span>{t.studioToneShorter}</span>
              </button>
            </div>

            {/* Message Stream */}
            <p className="fs-studio-mock-notice">{t.studioMockNotice}</p>
            <div className="fs-studio-chat-stream">
              {testMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`fs-studio-msg ${msg.sender === 'user' ? 'is-user' : 'is-creator'}`}
                >
                  {msg.sender === 'creator' && (
                    avatar ? <img src={studioSrc(avatar)} alt="" className="fs-studio-msg-avatar" /> : null
                  )}
                  <div className="fs-studio-msg-bubble">{msg.text}</div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <form className="fs-studio-composer" onSubmit={handleSendTestMessage}>
              <input
                type="text"
                className="fs-studio-composer-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.studioTestPlaceholder}
              />
              <button type="submit" className="fs-studio-send-btn" disabled={!inputMessage.trim()}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pillar 5: Vault & Missions */}
      {activeTab === 'gallery' && (
        <div className="fs-studio-pane">
          <div className="fs-studio-card">
            <h2 className="fs-studio-card-title">{t.studioAddReward}</h2>

            {/* Photo preview & upload */}
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioAvatarLabel}</label>
              <div className="fs-studio-avatar-row">
                <div className="fs-studio-current-avatar" style={{ aspectRatio: '4/5', width: 90, height: 112, borderRadius: 12 }}>
                  {newRewardAsset ? <img src={studioSrc(newRewardAsset)} alt="" className="fs-studio-avatar-img" /> : <span className="fs-studio-avatar-placeholder"><ImageIcon size={22} /></span>}
                </div>
                <button
                  type="button"
                  className="fs-studio-btn-upload"
                  onClick={() => {
                    setCropTarget('reward');
                    fileInputRef.current?.click();
                  }}
                >
                  <Camera size={15} />
                  <span>{t.studioUploadBtn}</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioPhotoTitle}</label>
              <input
                type="text"
                className="fs-studio-input"
                value={newRewardTitle}
                onChange={(e) => setNewRewardTitle(e.target.value)}
                placeholder="เช่น เรื่องที่เป็นไปไม่ได้, ชุดราตรีลับเฉพาะ"
              />
            </div>

            {/* Rarity */}
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioRewardRarity}</label>
              <div className="fs-studio-chips">
                {(['R', 'SR', 'SSR', 'UR'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`fs-studio-chip ${newRewardRarity === r ? 'is-active' : ''}`}
                    onClick={() => setNewRewardRarity(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Unlock Type */}
            <div className="fs-studio-field">
              <label className="fs-studio-label">{t.studioUnlockType}</label>
              <div className="fs-studio-chips">
                <button
                  type="button"
                  className={`fs-studio-chip ${newRewardUnlockType === 'mission' ? 'is-active' : ''}`}
                  onClick={() => setNewRewardUnlockType('mission')}
                >
                  <MessageCircle size={13} />
                  <span>{t.studioMissionMode}</span>
                </button>
                <button
                  type="button"
                  className={`fs-studio-chip ${newRewardUnlockType === 'diamond_gacha' ? 'is-active' : ''}`}
                  onClick={() => setNewRewardUnlockType('diamond_gacha')}
                >
                  <Gem size={13} />
                  <span>{t.studioGachaMode}</span>
                </button>
              </div>
            </div>

            {/* If Mission: Target turns, trust, romance, hint */}
            {newRewardUnlockType === 'mission' ? (
              <>
                <div className="fs-studio-grid-2">
                  <div className="fs-studio-field">
                    <label className="fs-studio-label">{t.studioTargetTurns}</label>
                    <input
                      type="number"
                      className="fs-studio-input"
                      value={newRewardTurns}
                      onChange={(e) => setNewRewardTurns(Number(e.target.value))}
                    />
                  </div>
                  <div className="fs-studio-field">
                    <label className="fs-studio-label">{t.studioTargetTrust}</label>
                    <input
                      type="number"
                      className="fs-studio-input"
                      value={newRewardTrust}
                      onChange={(e) => setNewRewardTrust(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="fs-studio-field">
                  <label className="fs-studio-label">{t.studioTargetRomance}</label>
                  <input
                    type="number"
                    className="fs-studio-input"
                    value={newRewardRomance}
                    onChange={(e) => setNewRewardRomance(Number(e.target.value))}
                  />
                </div>

                <div className="fs-studio-field">
                  <label className="fs-studio-label">{t.studioMissionHint}</label>
                  <input
                    type="text"
                    className="fs-studio-input"
                    value={newRewardHint}
                    onChange={(e) => setNewRewardHint(e.target.value)}
                    placeholder="เช่น ปรับความเข้าใจคืนดีกันไว้ใจกัน"
                  />
                </div>
              </>
            ) : (
              <div className="fs-studio-field">
                <label className="fs-studio-label">{t.studioFallbackEnergy}</label>
                <input
                  type="number"
                  className="fs-studio-input"
                  value={newRewardFallback}
                  onChange={(e) => setNewRewardFallback(Number(e.target.value))}
                />
              </div>
            )}

            <button
              type="button"
              className="fs-studio-ai-btn"
              onClick={handleAddReward}
              disabled={!newRewardTitle.trim()}
              style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
            >
              <Plus size={16} />
              <span>{t.studioAddReward}</span>
            </button>
          </div>

          {/* List of existing rewards */}
          <div className="fs-studio-card">
            <h2 className="fs-studio-card-title">{t.studioSavedRewards} ({rewards.length})</h2>
            <div className="fs-studio-vault-grid">
              {rewards.map((r) => (
                <div key={r.id} className="fs-studio-vault-card">
                  <div className="fs-studio-vault-thumb">
                    {r.asset ? <img src={studioSrc(r.asset)} alt="" /> : null}
                    <div style={{ position: 'absolute', top: 6, left: 6 }}>
                      <span className={`fs-rarity-badge rarity-${r.rarity.toLowerCase()}`}>
                        {r.rarity}
                      </span>
                    </div>
                  </div>
                  <div className="fs-studio-vault-details">
                    <strong className="fs-studio-vault-name">{r.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                      {r.unlockType === 'mission' ? `💬 ภารกิจ (${r.turns} ข้อความ)` : `💎 ตู้สุ่ม (+${r.energyFallback} ⚡)`}
                    </span>
                    <button
                      type="button"
                      className="fs-studio-vault-del-btn"
                      onClick={() => handleDeleteReward(r.id)}
                    >
                      <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                      <span>{t.studioDelete}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {notice && (
        <div className={notice.ok ? 'fs-studio-alert-success' : 'fs-studio-alert-error'} role="status">
          {notice.ok ? <Check size={16} /> : <X size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {studio.status === 'live' && studio.creatorId && (
        <div className="fs-studio-live-row">
          <span className="fs-studio-live-badge">{t.studioLiveBadge(handle)}</span>
          <button type="button" className="fs-studio-btn-save" onClick={() => onOpenLiveChat?.(studio.creatorId!)}>
            <MessageCircle size={14} /> {t.studioOpenLiveChat}
          </button>
          <button type="button" className="fs-studio-btn-save" disabled={!!busyAction} onClick={handleUnpublish}>
            {t.studioUnpublish}
          </button>
        </div>
      )}

      <div className="fs-studio-footer-actions">
        <button
          type="button"
          className="fs-studio-btn-save"
          disabled={!!busyAction}
          onClick={handleSaveDraft}
        >
          {busyAction === 'save' ? <Loader2 size={14} className="animate-spin" /> : t.studioSaveDraft}
        </button>
        <button
          type="button"
          className="fs-studio-btn-launch"
          disabled={!!busyAction}
          onClick={handleLaunch}
        >
          {busyAction === 'launch' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span>{busyAction === 'launch' ? t.studioLaunching : studio.status === 'live' ? t.studioRelaunch : t.studioLaunch}</span>
        </button>
      </div>

      {/* Interactive 512x640 Auto-Resize and Crop Modal */}
      {cropModalOpen && stagingPreview && (
        <div className="fs-studio-crop-modal-overlay">
          <div className="fs-studio-crop-modal">
            <div className="fs-studio-crop-header">
              <span className="fs-studio-crop-title">{t.studioResizeTitle}</span>
              <button
                type="button"
                className="fs-studio-crop-close"
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
                <span className="fs-studio-crop-slider-label">{t.studioZoomLabel} ({zoom.toFixed(1)}x)</span>
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
                className="fs-studio-btn-cancel"
                onClick={() => setCropModalOpen(false)}
              >
                {t.studioCancel}
              </button>
              <button
                type="button"
                className="fs-studio-btn-apply"
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
