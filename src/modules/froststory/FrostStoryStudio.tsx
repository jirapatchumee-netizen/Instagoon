import { useCallback, useEffect, useState, useRef, type FormEvent, type ReactNode } from 'react';
import './froststory-studio.css';

type Row = Record<string, unknown>;
type Metrics = { eligible14: number; returned7to14: number; dmStarted: number; dmContinuedAnotherDay: number; dmCompleted: number };
type Section = 'overview' | 'npc-engine' | 'creators' | 'posts' | 'stories' | 'episodes' | 'revisions' | 'media' | 'import-export' | 'invites' | 'reports' | 'comments' | 'energy';
type Overview = Record<'creators' | 'posts' | 'stories' | 'episodes' | 'revisions' | 'invites' | 'reports' | 'users' | 'media' | 'comments', Row[]>;
type PreviewTab = 'feed' | 'stories' | 'dm';

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'ภาพรวม & สถิติ', icon: '📊' },
  { id: 'npc-engine', label: '🧠 NPC Engine & กฎ (Dev)', icon: '🛠️' },
  { id: 'creators', label: 'ไอดอล / Creator', icon: '🌟' },
  { id: 'posts', label: 'โพสต์ฟีด', icon: '📸' },
  { id: 'stories', label: '24h Stories', icon: '⭕' },
  { id: 'episodes', label: 'ตอน DM', icon: '💬' },
  { id: 'revisions', label: 'บทสนทนา & Nodes', icon: '📜' },
  { id: 'media', label: 'คลังสื่อ (R2)', icon: '🖼️' },
  { id: 'import-export', label: 'นำเข้า / สำรองข้อมูล', icon: '📦' },
  { id: 'invites', label: 'ผู้ได้รับเชิญ', icon: '✉️' },
  { id: 'reports', label: 'รายงาน', icon: '🚨' },
  { id: 'comments', label: 'คอมเมนต์', icon: '💭' },
  { id: 'energy', label: 'Energy จำลอง', icon: '⚡' },
];

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOverview(value: unknown): Overview {
  if (!isRow(value)) throw new Error('ข้อมูลภาพรวมไม่ถูกต้อง');
  const names = ['creators', 'posts', 'stories', 'episodes', 'revisions', 'invites', 'reports', 'users', 'media', 'comments'] as const;
  const result: Overview = { creators: [], posts: [], stories: [], episodes: [], revisions: [], invites: [], reports: [], users: [], media: [], comments: [] };
  for (const name of names) {
    const rows = value[name];
    if (!Array.isArray(rows) || !rows.every(isRow)) throw new Error(`ข้อมูล ${name} ไม่ถูกต้อง`);
    result[name] = rows;
  }
  return result;
}

function parseMetrics(value: unknown): Metrics {
  if (!isRow(value)) throw new Error('ข้อมูลสถิติไม่ถูกต้อง');
  const { eligible14, returned7to14, dmStarted, dmContinuedAnotherDay, dmCompleted } = value;
  if (
    typeof eligible14 !== 'number' || !Number.isSafeInteger(eligible14) || eligible14 < 0 ||
    typeof returned7to14 !== 'number' || !Number.isSafeInteger(returned7to14) || returned7to14 < 0 ||
    typeof dmStarted !== 'number' || !Number.isSafeInteger(dmStarted) || dmStarted < 0 ||
    typeof dmContinuedAnotherDay !== 'number' || !Number.isSafeInteger(dmContinuedAnotherDay) || dmContinuedAnotherDay < 0 ||
    typeof dmCompleted !== 'number' || !Number.isSafeInteger(dmCompleted) || dmCompleted < 0 ||
    returned7to14 > eligible14
  ) {
    throw new Error('ข้อมูลสถิติไม่ถูกต้อง');
  }
  return { eligible14, returned7to14, dmStarted, dmContinuedAnotherDay, dmCompleted };
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRow(body) && typeof body.error === 'string' ? body.error : `คำขอไม่สำเร็จ (${response.status})`;
    throw new Error(message);
  }
  return body;
}

type EditTarget = { kind: 'posts' | 'creators'; id: string; field: 'caption' | 'mediaKey' | 'name' | 'bio' | 'avatarKey' };
const TEXT_FIELDS = new Set(['caption', 'name', 'bio']);
const D1_MEDIA_BUDGET = 850 * 1024;

function parseTarget(el: Element | null): EditTarget | null {
  const raw = el?.closest('[data-edit]')?.getAttribute('data-edit');
  const [kind, id, field] = raw?.split(':') ?? [];
  if ((kind !== 'posts' && kind !== 'creators') || !id) return null;
  if (!['caption', 'mediaKey', 'name', 'bio', 'avatarKey'].includes(field)) return null;
  return { kind, id, field: field as EditTarget['field'] };
}

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  for (const edge of [1080, 860, 640]) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.type === 'image/webp' && blob.size <= D1_MEDIA_BUDGET) return blob;
    }
  }
  throw new Error('ภาพใหญ่เกินไป บีบอัดแล้วยังเกิน 850KB');
}

function MediaImage({ mediaKey, fallback }: { mediaKey: unknown; fallback: string }) {
  const [broken, setBroken] = useState(false);
  if (typeof mediaKey !== 'string' || !mediaKey || broken) return <div className="fs-media-placeholder">{fallback}</div>;
  return <img className="fs-media-img" src={`/api/admin/media/${encodeURIComponent(mediaKey)}`} alt="" onError={() => setBroken(true)} />;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
}

function value(form: FormData, key: string): string {
  const item = form.get(key);
  return typeof item === 'string' ? item.trim() : '';
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="fs-field"><span>{label}</span>{children}</label>;
}

function FormPanel({ title, children, submit, busy }: { title: string; children: ReactNode; submit: (data: FormData) => void; busy: boolean }) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  };
  return <form className="fs-panel fs-form" onSubmit={handleSubmit}>
    <h2>{title}</h2>{children}<button disabled={busy} type="submit">บันทึกข้อมูล</button>
  </form>;
}

function readable(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function Rows({ rows, empty, actions }: { rows: Row[]; empty: string; actions?: (row: Row) => ReactNode }) {
  if (!rows.length) return <p className="fs-empty">{empty}</p>;
  return <div className="fs-records">{rows.map((row, index) => <article className="fs-record" key={typeof row.id === 'string' ? row.id : index}>
    <dl>{Object.entries(row).map(([key, val]) => <div key={key}><dt>{key}</dt><dd>{readable(val)}</dd></div>)}</dl>
    {actions?.(row)}
  </article>)}</div>;
}

export default function FrostStoryStudio() {
  const [section, setSection] = useState<Section>('creators');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ kind: 'creators' | 'posts' | 'stories' | 'episodes' | 'revisions'; row: Row } | null>(null);

  // Phone Simulator state
  const [previewTab, setPreviewTab] = useState<PreviewTab>('feed');
  const [activeCreatorId, setActiveCreatorId] = useState<string>('');
  const [previewLikes, setPreviewLikes] = useState<Record<string, number>>({});
  const [previewDmInput, setPreviewDmInput] = useState('');
  const [previewDmChat, setPreviewDmChat] = useState<{ sender: 'user' | 'npc'; text: string }[]>([
    { sender: 'npc', text: 'สวัสดีค่ะ! ขอบคุณที่แวะมาคุยกันนะคะ มีอะไรอยากคุยกับเนยไหมคะ 💕' },
  ]);

  // User Perspective Simulation State
  const [perspective, setPerspective] = useState<'user' | 'edit' | 'creator'>('user');
  const [simulatedAffinity, setSimulatedAffinity] = useState<number>(0);
  const [simulatedEnergy, setSimulatedEnergy] = useState<number>(3);
  const [userNavTab, setUserNavTab] = useState<'feed' | 'explore' | 'dm' | 'profile'>('feed');
  const [simulatedComments, setSimulatedComments] = useState<Record<string, string[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  // Visual Node Flow Builder (Dify pattern)
  const [nodeEditorMode, setNodeEditorMode] = useState<'visual' | 'json'>('visual');
  const [visualNodes, setVisualNodes] = useState<{ id: string; text: string; choices: { id: string; text: string; nextNodeId: string }[]; end: boolean }[]>([
    { id: 'start', text: 'สวัสดีค่ะ... ยังไม่กลับบ้านเหรอคะ? วันนี้งานเหนื่อยไหม?', choices: [{ id: 'c1', text: 'เหนื่อยมากเลย แต่คุยกับเนยแล้วหายเหนื่อยนะ', nextNodeId: 'chat_02' }], end: false },
    { id: 'chat_02', text: 'แหม ปากหวานจังนะคะ... งั้นคืนนี้อยู่เป็นเพื่อนเนยก่อนนะ 💕', choices: [], end: true }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inspected, setInspected] = useState<EditTarget | null>(null);
  const [dropTarget, setDropTarget] = useState<string>('');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; role?: string; isAdmin?: boolean } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authTab, setAuthTab] = useState<'passcode' | 'account'>('passcode');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // NPC Engine State (Mira spec / Cognitive Rules)
  const [npcCreatorId, setNpcCreatorId] = useState<string>('mira');
  const [npcDef, setNpcDef] = useState<Record<string, unknown> | null>(null);
  const [npcLoading, setNpcLoading] = useState(false);
  const [npcRawJson, setNpcRawJson] = useState('');
  const [npcJsonTab, setNpcJsonTab] = useState<'visual' | 'json'>('visual');

  // Dev Telemetry & Quick Action State
  const [devTelemetry, setDevTelemetry] = useState<{
    closeness: number;
    trust: number;
    romance: number;
    score: number;
    level: number;
    energy: { free: number; purchased: number; maxFree: number };
    memories: { key: string; value: string }[];
  } | null>(null);
  const [devActionBusy, setDevActionBusy] = useState(false);

  const loadNpcDef = useCallback(async (cId: string) => {
    setNpcLoading(true);
    try {
      const res = await request(`/api/admin/npc/${encodeURIComponent(cId)}`) as { ok: boolean; definition: Record<string, unknown> | null };
      if (res?.definition) {
        setNpcDef(res.definition);
        setNpcRawJson(JSON.stringify(res.definition, null, 2));
      } else {
        setNpcDef(null);
        setNpcRawJson('');
      }
    } catch {
      // silently handle
    } finally {
      setNpcLoading(false);
    }
  }, []);

  const saveNpcDef = async (cId: string, def: Record<string, unknown>) => {
    setNpcLoading(true);
    try {
      await request(`/api/admin/npc/${encodeURIComponent(cId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition: def })
      });
      setNotice(`✅ บันทึกกฎและคาแรคเตอร์ของ ${cId} สำเร็จ`);
      setNpcDef(def);
      setNpcRawJson(JSON.stringify(def, null, 2));
    } catch (err) {
      setError(`บันทึกกฎไม่สำเร็จ: ${message(err)}`);
    } finally {
      setNpcLoading(false);
    }
  };

  const fetchDevTelemetry = useCallback(async (cId: string) => {
    try {
      const res = await request(`/api/chats/${encodeURIComponent(cId || 'noey')}`) as {
        closeness?: number;
        trust?: number;
        romance?: number;
        score?: number;
        level?: number;
        energy?: { free: number; purchased: number; maxFree: number };
        memories?: { key: string; value: string }[];
      } | null;
      if (res) {
        setDevTelemetry({
          closeness: res.closeness || 0,
          trust: res.trust || 0,
          romance: res.romance || 0,
          score: res.score || 0,
          level: res.level || 0,
          energy: res.energy || { free: 3, purchased: 0, maxFree: 3 },
          memories: res.memories || []
        });
        if (typeof res.closeness === 'number') {
          setSimulatedAffinity(res.score || res.closeness || 0);
        }
        if (res.energy?.free !== undefined) {
          setSimulatedEnergy(res.energy.free + (res.energy.purchased || 0));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const meRes = await request('/api/me').catch(() => null) as { user?: { id: string; email: string; role?: string; isAdmin?: boolean } } | null;
      if (meRes?.user) {
        setCurrentUser(meRes.user);
      }
      const data = parseOverview(await request('/api/admin/overview'));
      setOverview(data);
      setError('');
      if (data.creators.length > 0 && !activeCreatorId) {
        setActiveCreatorId(String(data.creators[0].id));
      }
    } catch (err) {
      setOverview(null);
      setError(message(err));
    } finally {
      setAuthChecking(false);
    }
    try {
      setMetrics(parseMetrics(await request('/api/admin/metrics')));
      setMetricsError('');
    } catch (err) {
      setMetrics(null);
      setMetricsError(message(err));
    }
  }, [activeCreatorId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (section === 'npc-engine') {
      void loadNpcDef(npcCreatorId);
    }
  }, [section, npcCreatorId, loadNpcDef]);

  useEffect(() => {
    if (activeCreatorId) {
      void fetchDevTelemetry(activeCreatorId);
    }
  }, [activeCreatorId, fetchDevTelemetry]);

  const handleDevAddEnergy = async (amount: number) => {
    setDevActionBusy(true);
    try {
      const res = await request('/api/dev/energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      }) as { ok?: boolean; energy?: { free: number; purchased: number; maxFree: number } };
      if (res?.energy) {
        const total = res.energy.free + (res.energy.purchased || 0);
        setSimulatedEnergy(total);
        setNotice(`⚡ เติม Energy +${amount} สำเร็จ (ปัจจุบันมี ${total}⚡)`);
        if (activeCreatorId) void fetchDevTelemetry(activeCreatorId);
      }
    } catch (err) {
      setError(`เติม Energy ไม่สำเร็จ: ${message(err)}`);
    } finally {
      setDevActionBusy(false);
    }
  };

  const handleDevResetCreator = async (cId: string) => {
    if (!confirm(`ต้องการรีเซ็ตประวัติแชท, ความสัมพันธ์, และความทรงจำของ ${cId} ทั้งหมดสำหรับการทดสอบใช่หรือไม่?`)) return;
    setDevActionBusy(true);
    try {
      await request('/api/dev/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: cId })
      });
      setPreviewDmChat([{ sender: 'npc', text: `(รีเซ็ตแล้ว) สวัสดีค่ะ! เริ่มคุยกันใหม่ได้เลยนะคะ 💕` }]);
      setNotice(`🔄 รีเซ็ตข้อมูลของ ${cId} เรียบร้อยแล้ว`);
      void fetchDevTelemetry(cId);
    } catch (err) {
      setError(`รีเซ็ตไม่สำเร็จ: ${message(err)}`);
    } finally {
      setDevActionBusy(false);
    }
  };

  async function handlePasscodeLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginPasscode.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioKey: loginPasscode.trim() })
      }) as { ok?: boolean; user?: { id: string; email: string; role: string } };
      if (res?.user) {
        setCurrentUser(res.user);
        await load();
      }
    } catch (err) {
      setAuthError(message(err) === 'invalid_passcode' ? 'รหัสผ่านสตูดิโอไม่ถูกต้อง' : message(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAccountAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const res = await request(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          studioKey: loginPasscode.trim() || undefined
        })
      }) as { ok?: boolean; user?: { id: string; email: string; role: string } };
      if (res?.user) {
        setCurrentUser(res.user);
        await load();
      }
    } catch (err) {
      const msg = message(err);
      if (msg === 'email_already_exists') setAuthError('อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ');
      else if (msg === 'invalid_credentials') setAuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      else if (msg === 'password_too_short') setAuthError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      else setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await request('/api/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setOverview(null);
    setAuthChecking(false);
    setError('unauthorized');
  }

  async function act(path: string, method: string, data?: unknown, raw?: File) {
    setBusy(true); setError(''); setNotice('');
    try {
      await request(path, raw ? { method, body: raw, headers: { 'Content-Type': raw.type || 'application/octet-stream' } } : {
        method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data),
      });
      setNotice('บันทึกเรียบร้อย');
      await load();
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  function save(kind: 'creators' | 'posts' | 'stories' | 'episodes' | 'revisions', payload: Row) {
    const selected = editing?.kind === kind ? editing.row : null;
    const id = selected && typeof selected.id === 'string' ? selected.id : null;
    void act(id ? `/api/admin/${kind}/${encodeURIComponent(id)}` : `/api/admin/${kind}`, id ? 'PATCH' : 'POST', payload);
  }

  function createRevision(form: FormData) {
    try {
      const nodes: unknown = JSON.parse(value(form, 'nodes'));
      if (!Array.isArray(nodes)) throw new Error('บท DM ต้องเป็นรายการโหนด');
      const episodeId = value(form, 'episodeId');
      const episode = overview?.episodes.find((item) => item.id === episodeId);
      if (!episode || typeof episode.creatorId !== 'string') { setError('เลือกตอน DM'); return; }
      save('revisions', { id: value(form, 'id'), episodeId, creatorId: episode.creatorId, nodes });
    } catch { setError('บท DM ต้องเป็น JSON ที่ถูกต้อง'); }
  }

  function handleImportJson(jsonText: string) {
    try {
      const data = JSON.parse(jsonText);
      // Support IG Idol NPC Studio Character definition
      const character = data.identity || data;
      const creatorId = character.id || `npc_${Date.now()}`;
      const creatorName = character.name || 'ไอดอลคนใหม่';
      const creatorBio = character.bio || character.personality || '';
      const avatarKey = character.avatarKey || character.profileImage || null;

      void act('/api/admin/creators', 'POST', {
        id: creatorId,
        name: creatorName,
        bio: creatorBio,
        avatarKey: avatarKey,
      });

      // Create an introductory post
      void act('/api/admin/posts', 'POST', {
        id: `post_${creatorId}_intro`,
        creatorId: creatorId,
        caption: `สวัสดีทุกคน! ฝากติดตามผลงานด้วยนะคะ ✨\n\n${creatorBio.slice(0, 100)}`,
        mediaKey: avatarKey || 'default_avatar.webp',
        publishedAt: Date.now(),
        relationshipRequired: 0,
        simulatedLikes: 120,
      });

      // Create a default episode
      void act('/api/admin/episodes', 'POST', {
        id: `ep_${creatorId}_01`,
        creatorId: creatorId,
        title: 'ทำความรู้จักกันครั้งแรก',
        relationshipRequired: 0,
        position: 1,
      });

      setNotice(`นำเข้าตัวละคร "${creatorName}" สำเร็จ พร้อมสร้างโพสต์และตอน DM เริ่มต้น`);
      setActiveCreatorId(creatorId);
    } catch (e) {
      setError(`นำเข้าไม่สำเร็จ: ${message(e)}`);
    }
  }

  function exportBackup() {
    if (!overview) return;
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      overview,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `froststory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว');
  }

  function inspect(target: EditTarget) {
    const row = overview?.[target.kind].find((r) => r.id === target.id);
    if (!row) return;
    setInspected(target);
    setEditing({ kind: target.kind, row });
    setSection(target.kind);
    window.setTimeout(() => {
      const input = document.querySelector<HTMLElement>(`.fs-authoring-column [name="${target.field}"]`);
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
    }, 60);
  }

  const patchField = (target: EditTarget, val: string) =>
    act(`/api/admin/${target.kind}/${encodeURIComponent(target.id)}/field`, 'PATCH', { field: target.field, value: val });

  function onEditClick(e: React.MouseEvent) {
    if (perspective !== 'edit') return;
    const target = parseTarget(e.target as Element);
    if ((e.target as HTMLElement).isContentEditable) return;
    e.preventDefault();
    e.stopPropagation();
    if (target) inspect(target);
  }

  function onEditDoubleClick(e: React.MouseEvent) {
    if (perspective !== 'edit') return;
    const el = (e.target as Element).closest<HTMLElement>('[data-edit]');
    const target = parseTarget(el);
    e.preventDefault();
    e.stopPropagation();
    if (!el || !target || !TEXT_FIELDS.has(target.field)) return;
    const original = el.innerText;
    el.contentEditable = 'plaintext-only';
    el.focus();
    const finish = (commit: boolean) => {
      el.contentEditable = 'false';
      el.removeEventListener('keydown', onKey);
      const next = el.innerText.trim();
      if (commit && next && next !== original.trim()) void patchField(target, next);
      else el.innerText = original;
    };
    const onKey = (k: KeyboardEvent) => {
      if (k.key === 'Escape') { k.preventDefault(); el.blur(); finish(false); }
      if (k.key === 'Enter' && !k.shiftKey) { k.preventDefault(); finish(true); }
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', () => { if (el.isContentEditable) finish(true); }, { once: true });
  }

  function onEditDragOver(e: React.DragEvent) {
    if (perspective !== 'edit') return;
    const target = parseTarget(e.target as Element);
    if (!target || (target.field !== 'mediaKey' && target.field !== 'avatarKey')) return;
    e.preventDefault();
    setDropTarget(`${target.kind}:${target.id}:${target.field}`);
  }

  async function onEditDrop(e: React.DragEvent) {
    if (perspective !== 'edit') return;
    const target = parseTarget(e.target as Element);
    setDropTarget('');
    const file = e.dataTransfer.files[0];
    if (!target || !file) return;
    e.preventDefault();
    if (!file.type.startsWith('image/')) { setError('รองรับเฉพาะไฟล์ภาพ'); return; }
    try {
      const webp = await toWebp(file);
      const folder = target.kind === 'creators' ? 'avatars' : 'posts';
      const mediaKey = `${folder}/${target.id}_${Date.now()}.webp`;
      await act(`/api/admin/media/${encodeURIComponent(mediaKey)}`, 'PUT', undefined, new File([webp], 'image.webp', { type: 'image/webp' }));
      await patchField(target, mediaKey);
      setNotice(`อัปโหลดภาพแล้ว (${Math.round(webp.size / 1024)}KB)`);
    } catch (err) { setError(message(err)); }
  }

  const activeCreator = overview?.creators.find((c) => c.id === activeCreatorId) || overview?.creators[0];
  const creatorPosts = overview?.posts.filter((p) => p.creatorId === activeCreatorId) || [];
  const creatorStories = overview?.stories.filter((s) => s.creatorId === activeCreatorId) || [];
  const creatorEpisodes = overview?.episodes.filter((e) => e.creatorId === activeCreatorId) || [];

  const creatorOptions = overview?.creators.map((creator) => {
    const id = typeof creator.id === 'string' ? creator.id : '';
    return id && <option value={id} key={id}>{readable(creator.name)} ({id})</option>;
  });

  const current = (kind: 'creators' | 'posts' | 'stories' | 'episodes' | 'revisions', field: string): string => {
    const v = editing?.kind === kind ? editing.row[field] : undefined;
    return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
  };

  const currentDate = (kind: 'posts' | 'stories') => {
    const timestamp = Number(current(kind, 'publishedAt'));
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  };

  const creatorSelect = (kind: 'posts' | 'stories' | 'episodes') => {
    if (kind === 'episodes' && editing?.kind === 'episodes') return <><input type="hidden" name="creatorId" value={current(kind, 'creatorId')} /><input value={current(kind, 'creatorId')} readOnly aria-label="Creator" /></>;
    return <select name="creatorId" required defaultValue={current(kind, 'creatorId') || activeCreatorId}><option value="" disabled>เลือก Creator</option>{creatorOptions}</select>;
  };

  const editAction = (kind: 'creators' | 'posts' | 'stories' | 'episodes' | 'revisions', row: Row) => (kind === 'creators' || row.status === 'draft') && <button className="fs-secondary" disabled={busy} onClick={() => { setEditing({ kind, row }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>แก้ไข</button>;

  const episodeOptions = overview?.episodes.map((episode) => {
    const id = typeof episode.id === 'string' ? episode.id : '';
    return id && <option key={id} value={id}>{readable(episode.title)} ({id})</option>;
  });

  const statusActions = (kind: 'posts' | 'stories' | 'revisions', row: Row) => {
    if (typeof row.id !== 'string') return null;
    const id = row.id;
    return <div className="fs-actions">
      {editAction(kind, row)}
      {row.status !== 'published' && <button disabled={busy} onClick={() => void act(`/api/admin/${kind}/${encodeURIComponent(id)}/status`, 'POST', { status: 'published' })}>เผยแพร่ Live</button>}
      {row.status !== 'suspended' && <button className="fs-danger" disabled={busy} onClick={() => { if (window.confirm('ระงับเนื้อหานี้ใช่ไหม?')) void act(`/api/admin/${kind}/${encodeURIComponent(id)}/status`, 'POST', { status: 'suspended' }); }}>ระงับ</button>}
    </div>;
  };

  const numeric = (form: FormData, key: string) => Number(value(form, key) || 0);

  if (!overview && !authChecking) {
    return (
      <div className="fs-studio fs-login-screen">
        <div className="fs-login-card">
          <div className="fs-login-header">
            <span className="fs-login-badge">CREATOR STUDIO PORTAL · 18+</span>
            <div className="fs-login-logo">🎭</div>
            <h2>instagoon Studio</h2>
            <p>ระบบสร้างคอนเทนต์ไอดอล NPC และสถานการณ์จำลอง (เฉพาะทีมงานสตูดิโอ)</p>
          </div>

          <div className="fs-login-tabs">
            <button
              type="button"
              className={authTab === 'passcode' ? 'active' : ''}
              onClick={() => { setAuthTab('passcode'); setAuthError(''); }}
            >
              🔑 รหัสผ่านสตูดิโอ (Studio Key)
            </button>
            <button
              type="button"
              className={authTab === 'account' ? 'active' : ''}
              onClick={() => { setAuthTab('account'); setAuthError(''); }}
            >
              ✉️ บัญชีทีมงาน (Email / Pass)
            </button>
          </div>

          {authError && <div className="fs-login-error" role="alert">⚠️ {authError}</div>}

          {authTab === 'passcode' ? (
            <form onSubmit={handlePasscodeLogin} className="fs-login-form">
              <label>
                <span>รหัสผ่านสตูดิโอ (Studio Access Key)</span>
                <input
                  type="password"
                  required
                  placeholder="ใส่รหัสผ่านสตูดิโอ (เช่น frost2026)"
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  autoFocus
                />
              </label>
              <button type="submit" disabled={authLoading} className="fs-login-submit-btn">
                {authLoading ? 'กำลังเข้าสู่ระบบ...' : '🔓 เข้าสู่สตูดิโอ (Unlock Studio)'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAccountAuth} className="fs-login-form">
              <label>
                <span>อีเมล (Creator Email)</span>
                <input
                  type="email"
                  required
                  placeholder="name@froststory.local"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoFocus
                />
              </label>
              <label>
                <span>รหัสผ่าน (Password อย่างน้อย 6 ตัวอักษร)</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </label>
              <button type="submit" disabled={authLoading} className="fs-login-submit-btn">
                {authLoading ? 'กำลังดำเนินการ...' : isRegistering ? '✨ สร้างบัญชีทีมงาน' : '🚀 เข้าสู่ระบบ'}
              </button>
              <div className="fs-login-switch">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                >
                  {isRegistering ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่' : 'ยังไม่มีบัญชีทีมงาน? สมัครสมาชิก'}
                </button>
              </div>
            </form>
          )}

          <div className="fs-login-footer">
            <a href="/auth/demo" className="fs-quick-demo-link">
              ⚡ 1-Click Fast Dev Sign-in (creator@froststory.local)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fs-studio">
      <header className="fs-header">
        <div>
          <p className="fs-kicker">INSTAGOON / COLLABORATIVE CONTENT STUDIO</p>
          <h1>instagoon Studio</h1>
          <p>ระบบสร้างไอดอล เขียนบทฟีด/สตอรี่/DM และพรีวิวสดแบบออนไลน์</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {currentUser && (
            <div className="fs-user-badge">
              <span className="fs-user-avatar-tag">👤</span>
              <span className="fs-user-email-tag">{currentUser.email}</span>
              <span className="fs-role-tag">{currentUser.role || 'Admin'}</span>
            </div>
          )}
          {overview?.creators && overview.creators.length > 0 && (
            <select
              style={{ background: '#191e32', color: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', fontWeight: 600 }}
              value={activeCreatorId}
              onChange={(e) => setActiveCreatorId(e.target.value)}
              aria-label="เลือกไอดอลที่กำลังพรีวิว"
            >
              {overview.creators.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  🌟 {String(c.name || c.id)}
                </option>
              ))}
            </select>
          )}
          <button className="fs-secondary" onClick={() => void load()} disabled={busy}>รีเฟรชข้อมูล</button>
          {currentUser && (
            <button className="fs-logout-btn" onClick={() => void handleLogout()} title="ออกจากระบบสตูดิโอ">
              🚪 ออก
            </button>
          )}
        </div>
      </header>

      {/* Split Screen Master Layout: LEFT = Authoring Tools, RIGHT = Live Phone Preview */}
      <div className="fs-split-container">
        {/* LEFT PANE: TOOLS & AUTHORING PANELS */}
        <main className="fs-authoring-column">
          <nav className="fs-nav-pills" aria-label="เมนูระบบ">
            {sections.map((item) => (
              <button
                className={section === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => {
                  setEditing(null);
                  setSection(item.id);
                }}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>

          {error && <p className="fs-alert fs-error" role="alert">{error}</p>}
          {notice && <p className="fs-alert fs-success" role="status">{notice}</p>}
          {!overview && !error && <p>กำลังโหลดข้อมูล…</p>}

          {overview && (
            <>
              {editing?.kind === section && (
                <div style={{ marginBottom: '15px' }}>
                  <button className="fs-secondary" onClick={() => setEditing(null)}>ยกเลิกการแก้ไข</button>
                </div>
              )}

              {/* SECTION: OVERVIEW */}
              {section === 'overview' && (
                <>
                  <h2>📊 สถิติและตัววัดผล (Metrics)</h2>
                  {metricsError && <p className="fs-alert fs-error" role="alert">โหลดสถิติไม่สำเร็จ: {metricsError}</p>}
                  {metrics && (
                    <div className="fs-stats">
                      <div className="fs-metric">
                        <span>กลับมาเล่นซ้ำ (วัน 7–14)</span>
                        <strong>{metrics.eligible14 ? `${((metrics.returned7to14 / metrics.eligible14) * 100).toFixed(1)}%` : '—'}</strong>
                        <small>{metrics.returned7to14} จาก {metrics.eligible14} คน</small>
                      </div>
                      <div className="fs-metric"><span>เริ่มเล่น DM</span><strong>{metrics.dmStarted}</strong><small>ผู้เล่น</small></div>
                      <div className="fs-metric"><span>กลับมาเล่นในวันอื่น</span><strong>{metrics.dmContinuedAnotherDay}</strong><small>ผู้เล่น</small></div>
                      <div className="fs-metric"><span>เล่นจบตอน</span><strong>{metrics.dmCompleted}</strong><small>ผู้เล่น</small></div>
                    </div>
                  )}

                  <h2 style={{ marginTop: '30px' }}>📁 ข้อมูลภาพรวมในระบบ</h2>
                  <div className="fs-stats">
                    {sections.filter((s) => s.id in overview).map((s) => (
                      <button className="fs-stat" key={s.id} onClick={() => setSection(s.id)}>
                        <span>{s.label}</span>
                        <strong>{overview[s.id as keyof Overview].length}</strong>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* SECTION: NPC ENGINE & RULES (DEV TOOL) */}
              {section === 'npc-engine' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2>🧠 NPC Cognitive Engine & กฎความสัมพันธ์ (Dev)</h2>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                        ควบคุมบุคลิก AI, กฎ Keyword / Semantic, คะแนน 3D (Closeness, Trust, Romance) และเงื่อนไขปลดล็อกความลับ
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`fs-secondary ${npcJsonTab === 'visual' ? 'active' : ''}`}
                        onClick={() => setNpcJsonTab('visual')}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: npcJsonTab === 'visual' ? '#06b6d4' : '#1e293b', color: npcJsonTab === 'visual' ? '#000' : '#f8fafc', fontWeight: 700 }}
                      >
                        🎴 Visual Cards
                      </button>
                      <button
                        className={`fs-secondary ${npcJsonTab === 'json' ? 'active' : ''}`}
                        onClick={() => setNpcJsonTab('json')}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: npcJsonTab === 'json' ? '#06b6d4' : '#1e293b', color: npcJsonTab === 'json' ? '#000' : '#f8fafc', fontWeight: 700 }}
                      >
                        📜 Raw JSON
                      </button>
                    </div>
                  </div>

                  {/* Creator Selection Chips */}
                  <div className="fs-creator-chip-bar" style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                    {['mira', 'noey', 'pim'].map((cid) => {
                      const names: Record<string, string> = { mira: '🌟 Mira (นักร้องอินดี้)', noey: '🌸 น้องเนย (เด็กฝึกงาน)', pim: '💼 พี่พิม (หัวหน้าบัญชี)' };
                      return (
                        <button
                          key={cid}
                          className={`fs-creator-chip ${npcCreatorId === cid ? 'is-active' : ''}`}
                          onClick={() => {
                            setNpcCreatorId(cid);
                            setActiveCreatorId(cid);
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '999px',
                            border: npcCreatorId === cid ? '2px solid #06b6d4' : '1px solid #334155',
                            background: npcCreatorId === cid ? 'rgba(6, 182, 212, 0.2)' : '#101626',
                            color: npcCreatorId === cid ? '#38bdf8' : '#94a3b8',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          {names[cid] || cid}
                        </button>
                      );
                    })}
                  </div>

                  {npcLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      ⏳ กำลังโหลดข้อกำหนด NPC Engine...
                    </div>
                  ) : npcJsonTab === 'json' ? (
                    <div className="fs-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ไฟล์: <code>character.json</code> (บันทึกตรงสู่ SQLite D1)</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="fs-secondary"
                            onClick={() => void loadNpcDef(npcCreatorId)}
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            🔄 โหลดใหม่
                          </button>
                          <button
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(npcRawJson);
                                void saveNpcDef(npcCreatorId, parsed);
                              } catch {
                                setError('JSON ไม่ถูกต้อง กรุณาตรวจสอบ Syntax');
                              }
                            }}
                            style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#06b6d4', color: '#000', fontWeight: 800, borderRadius: '6px', cursor: 'pointer' }}
                          >
                            💾 บันทึก JSON
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={npcRawJson}
                        onChange={(e) => setNpcRawJson(e.target.value)}
                        rows={28}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', background: '#060913', color: '#38bdf8', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}
                      />
                    </div>
                  ) : !npcDef ? (
                    <div className="fs-panel" style={{ textAlign: 'center', padding: '30px' }}>
                      <p style={{ color: '#94a3b8' }}>ยังไม่มีข้อมูล NPC Engine สำหรับ <strong>{npcCreatorId}</strong></p>
                      <button
                        onClick={() => void loadNpcDef(npcCreatorId)}
                        style={{ marginTop: '10px', background: '#06b6d4', color: '#000', padding: '6px 14px', borderRadius: '6px', fontWeight: 700 }}
                      >
                        ดึงข้อมูลเริ่มต้น
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* 1. Identity & Persona Card */}
                      <div className="fs-panel" style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#f8fafc' }}>
                              🌟 {String(npcDef.name || npcCreatorId)} ({String(npcDef.handle || '')})
                            </h3>
                            <p style={{ color: '#f472b6', fontStyle: 'italic', margin: '0 0 8px', fontSize: '0.85rem' }}>
                              "{String(npcDef.tagline || '')}"
                            </p>
                          </div>
                          <span style={{ background: '#1e293b', border: '1px solid #334155', padding: '3px 9px', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                            อายุ {String(npcDef.age || '—')} ปี • {String(npcDef.occupation || 'ไอดอล')}
                          </span>
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5, margin: '8px 0' }}>
                          <strong>นิสัย/บุคลิก:</strong> {String(npcDef.personality || '—')}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5, margin: '8px 0' }}>
                          <strong>ประวัติ:</strong> {String(npcDef.biography || '—')}
                        </p>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ข้อเท็จจริงห้ามเปลี่ยน:</span>
                          {Array.isArray(npcDef.immutableFacts) && npcDef.immutableFacts.map((fact, idx) => (
                            <span key={idx} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                              ✓ {String(fact)}
                            </span>
                          ))}
                        </div>

                        {Boolean(npcDef.knowledgeBoundary) && (
                          <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>
                            🛡️ <strong>ขอบเขตความรู้:</strong> {String(npcDef.knowledgeBoundary)}
                          </div>
                        )}
                      </div>

                      {/* 2. 3D Relationship Matrix */}
                      <div className="fs-panel" style={{ marginBottom: '18px' }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }}>
                          📊 โครงสร้างคะแนนความสัมพันธ์ 3D (3D Relationship Engine)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ color: '#22d3ee', fontWeight: 800, fontSize: '0.82rem' }}>💖 ความสนิทสนม (Closeness)</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>น้ำหนัก: <strong>40%</strong> ของคะแนนรวม</div>
                          </div>
                          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: '0.82rem' }}>🤝 ความไว้วางใจ (Trust)</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>น้ำหนัก: <strong>40%</strong> ของคะแนนรวม</div>
                          </div>
                          <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ color: '#f472b6', fontWeight: 800, fontSize: '0.82rem' }}>🌹 โรแมนติก (Romance)</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px' }}>น้ำหนัก: <strong>20%</strong> ของคะแนนรวม</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', background: '#0a0d18', padding: '6px 10px', borderRadius: '6px' }}>
                          เกณฑ์เลเวล: Lv.0 (0 pt) ➔ Lv.1 (20 pt) ➔ Lv.2 (40 pt) ➔ Lv.3 (60 pt) ➔ Lv.4 (80 pt)
                        </div>
                      </div>

                      {/* 3. Keyword Trigger Rules */}
                      <div className="fs-panel" style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>
                            🔑 กฎ Keyword ทริกเกอร์ตรงตัว (Keyword Rules)
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            ทำงานแม่นยำ ไม่เสีย Token ตรวจจับคำเฉพาะ
                          </span>
                        </div>
                        <div className="fs-rule-grid">
                          {Array.isArray(npcDef.rules) && npcDef.rules.filter((r: unknown) => isRow(r) && r.kind === 'keyword').map((rule: unknown, idx: number) => {
                            if (!isRow(rule)) return null;
                            const changes = isRow(rule.changes) ? rule.changes : {};
                            const kws = Array.isArray(rule.keywords) ? rule.keywords : [];
                            return (
                              <div className="fs-rule-card" key={String(rule.id || idx)}>
                                <div className="fs-rule-header">
                                  <span className="fs-rule-title">🔑 {String(rule.name || rule.id)}</span>
                                  <span className="fs-rule-kind keyword">Keyword</span>
                                </div>
                                <p className="fs-rule-desc">{String(rule.description || '')}</p>
                                
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '4px 0' }}>
                                  {kws.map((kw, kidx) => (
                                    <button
                                      key={kidx}
                                      type="button"
                                      className="fs-cond-tag"
                                      style={{ cursor: 'pointer', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                                      onClick={() => {
                                        setPreviewDmInput(String(kw));
                                        setPreviewTab('dm');
                                        setUserNavTab('dm');
                                      }}
                                      title="คลิกเพื่อนำคำนี้ไปใส่ในช่องแชทจำลอง"
                                    >
                                      💬 "{String(kw)}"
                                    </button>
                                  ))}
                                </div>

                                <div className="fs-rule-changes">
                                  {typeof changes.closeness === 'number' && changes.closeness !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>
                                      {changes.closeness > 0 ? `+${changes.closeness}` : changes.closeness} สนิท
                                    </span>
                                  )}
                                  {typeof changes.trust === 'number' && changes.trust !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                                      {changes.trust > 0 ? `+${changes.trust}` : changes.trust} ไว้ใจ
                                    </span>
                                  )}
                                  {typeof changes.romance === 'number' && changes.romance !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
                                      {changes.romance > 0 ? `+${changes.romance}` : changes.romance} โรแมนติก
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <span>คูลดาวน์: {String(rule.cooldown ?? 0)} เทิร์น</span>
                                  <span>ใช้ได้สูงสุด: {Number(rule.maxUses) > 0 ? `${rule.maxUses} ครั้ง` : 'ไม่จำกัด'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Semantic Rules */}
                      <div className="fs-panel" style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>
                            🧠 กฎ Semantic ตรวจจับเจตนาด้วย AI (Semantic Rules)
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Gemini 2.5 วิเคราะห์น้ำเสียงและเจตนาของผู้เล่น
                          </span>
                        </div>
                        <div className="fs-rule-grid">
                          {Array.isArray(npcDef.rules) && npcDef.rules.filter((r: unknown) => isRow(r) && r.kind === 'semantic').map((rule: unknown, idx: number) => {
                            if (!isRow(rule)) return null;
                            const changes = isRow(rule.changes) ? rule.changes : {};
                            return (
                              <div className="fs-rule-card" key={String(rule.id || idx)}>
                                <div className="fs-rule-header">
                                  <span className="fs-rule-title">🧠 {String(rule.name || rule.id)}</span>
                                  <span className="fs-rule-kind semantic">Semantic</span>
                                </div>
                                <p className="fs-rule-desc">{String(rule.description || '')}</p>
                                
                                {Boolean(rule.positiveExamples) && (
                                  <div style={{ fontSize: '0.72rem', color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', margin: '2px 0' }}>
                                    ตัวอย่างบวก: "{String(rule.positiveExamples)}"
                                  </div>
                                )}

                                <div className="fs-rule-changes">
                                  {typeof changes.closeness === 'number' && changes.closeness !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>
                                      {changes.closeness > 0 ? `+${changes.closeness}` : changes.closeness} สนิท
                                    </span>
                                  )}
                                  {typeof changes.trust === 'number' && changes.trust !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                                      {changes.trust > 0 ? `+${changes.trust}` : changes.trust} ไว้ใจ
                                    </span>
                                  )}
                                  {typeof changes.romance === 'number' && changes.romance !== 0 && (
                                    <span className="fs-change-pill" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6' }}>
                                      {changes.romance > 0 ? `+${changes.romance}` : changes.romance} โรแมนติก
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5. Secrets & Rewards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                        {/* Secrets Card */}
                        <div className="fs-panel">
                          <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }}>
                            🔒 ความลับของไอดอล (Secrets Disclosure)
                          </h3>
                          {Array.isArray(npcDef.secrets) && npcDef.secrets.map((sec: unknown, idx: number) => {
                            if (!isRow(sec)) return null;
                            return (
                              <div className="fs-secret-card" key={idx}>
                                <div className="fs-secret-text">
                                  <strong>{String(sec.id || idx)}:</strong> {String(sec.content || '')}
                                </div>
                                <span className="fs-secret-badge">
                                  Lv. {String(sec.minLevel ?? 1)}+
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Rewards Card */}
                        <div className="fs-panel">
                          <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }}>
                            🎁 ของรางวัลพิเศษ & ปลดล็อกรูป/เพลง
                          </h3>
                          {Array.isArray(npcDef.rewards) && npcDef.rewards.map((rew: unknown, idx: number) => {
                            if (!isRow(rew)) return null;
                            const conds = isRow(rew.conditions) ? rew.conditions : {};
                            return (
                              <div className="fs-reward-card" key={idx}>
                                <div className="fs-reward-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                                  🎁
                                </div>
                                <div className="fs-reward-info">
                                  <div className="fs-reward-title">{String(rew.name || rew.id)}</div>
                                  <div className="fs-reward-msg">"{String(rew.message || '')}"</div>
                                  <div className="fs-reward-conds">
                                    {typeof conds.minLevel === 'number' && <span className="fs-cond-tag">Lv ≥ {conds.minLevel}</span>}
                                    {typeof conds.minCloseness === 'number' && <span className="fs-cond-tag">สนิท ≥ {conds.minCloseness}</span>}
                                    {Boolean(conds.eventTriggered) && <span className="fs-cond-tag">อีเวนต์: {String(conds.eventTriggered)}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* SECTION: CREATORS */}
              {section === 'creators' && (
                <>
                  <FormPanel
                    key={current('creators', 'id')}
                    title={editing?.kind === 'creators' ? 'แก้ไขข้อมูล Creator' : '🌟 สร้าง Creator / ไอดอลใหม่'}
                    busy={busy}
                    submit={(f) => save('creators', {
                      id: value(f, 'id'),
                      name: value(f, 'name'),
                      bio: value(f, 'bio'),
                      avatarKey: value(f, 'avatarKey') || null,
                    })}
                  >
                    <Field label="รหัสประจำตัว (ID)"><input name="id" required defaultValue={current('creators', 'id')} readOnly={editing?.kind === 'creators'} placeholder="เช่น noey, linin, mimi" /></Field>
                    <Field label="ชื่อไอดอล"><input name="name" required defaultValue={current('creators', 'name')} placeholder="เช่น น้องเนย โอเวอร์ไทม์" /></Field>
                    <Field label="ประวัติ / นิสัย / น้ำเสียง (Bio & Tone)"><textarea name="bio" defaultValue={current('creators', 'bio')} placeholder="เด็กฝึกงานสาวขี้อายแต่แอบดื้อ..." /></Field>
                    <Field label="รหัสภาพโปรไฟล์ (Avatar Key)"><input name="avatarKey" defaultValue={current('creators', 'avatarKey')} placeholder="เช่น avatars/noey_avatar.webp" /></Field>
                  </FormPanel>
                  <h2>Creator ในระบบ ({overview.creators.length})</h2>
                  <Rows rows={overview.creators} empty="ยังไม่มี Creator" actions={(row) => editAction('creators', row)} />
                </>
              )}

              {/* SECTION: POSTS */}
              {section === 'posts' && (
                <>
                  <FormPanel
                    key={current('posts', 'id')}
                    title={editing?.kind === 'posts' ? 'แก้ไขโพสต์' : '📸 สร้างโพสต์ฟีดใหม่'}
                    busy={busy}
                    submit={(f) => save('posts', {
                      id: value(f, 'id'),
                      creatorId: value(f, 'creatorId'),
                      caption: value(f, 'caption'),
                      mediaKey: value(f, 'mediaKey'),
                      publishedAt: value(f, 'publishedAt') ? new Date(value(f, 'publishedAt')).getTime() : null,
                      relationshipRequired: numeric(f, 'relationshipRequired'),
                      simulatedLikes: numeric(f, 'simulatedLikes'),
                    })}
                  >
                    <Field label="รหัสโพสต์"><input name="id" required defaultValue={current('posts', 'id')} readOnly={editing?.kind === 'posts'} placeholder="เช่น post_noey_01" /></Field>
                    <Field label="Creator">{creatorSelect('posts')}</Field>
                    <Field label="แคปชันโพสต์"><textarea name="caption" required defaultValue={current('posts', 'caption')} placeholder="วันนี้ทำงานเหนื่อยจัง แวะมาส่งกำลังใจให้ทุกคนนะ 💕" /></Field>
                    <Field label="รหัสไฟล์ภาพ (Media Key)"><input name="mediaKey" required defaultValue={current('posts', 'mediaKey')} placeholder="posts/noey_desk.webp" /></Field>
                    <Field label="เวลาปล่อยโพสต์"><input name="publishedAt" type="datetime-local" defaultValue={currentDate('posts')} /></Field>
                    <Field label="ระดับความสัมพันธ์ขั้นต่ำ"><input name="relationshipRequired" type="number" min="0" defaultValue={current('posts', 'relationshipRequired') || '0'} /></Field>
                    <Field label="ไลก์จำลองเริ่มต้น"><input name="simulatedLikes" type="number" min="0" defaultValue={current('posts', 'simulatedLikes') || '150'} /></Field>
                  </FormPanel>
                  <h2>โพสต์ทั้งหมด ({overview.posts.length})</h2>
                  <Rows rows={overview.posts} empty="ยังไม่มีโพสต์" actions={(row) => statusActions('posts', row)} />
                </>
              )}

              {/* SECTION: STORIES */}
              {section === 'stories' && (
                <>
                  <FormPanel
                    key={current('stories', 'id')}
                    title={editing?.kind === 'stories' ? 'แก้ไข Story' : '⭕ สร้าง 24h Story ใหม่'}
                    busy={busy}
                    submit={(f) => save('stories', {
                      id: value(f, 'id'),
                      creatorId: value(f, 'creatorId'),
                      type: value(f, 'type'),
                      mediaKey: value(f, 'mediaKey'),
                      publishedAt: value(f, 'publishedAt') ? new Date(value(f, 'publishedAt')).getTime() : null,
                      relationshipRequired: numeric(f, 'relationshipRequired'),
                    })}
                  >
                    <Field label="รหัส Story"><input name="id" required defaultValue={current('stories', 'id')} readOnly={editing?.kind === 'stories'} placeholder="story_noey_01" /></Field>
                    <Field label="Creator">{creatorSelect('stories')}</Field>
                    <Field label="ประเภทสตอรี่">
                      <select name="type" defaultValue={current('stories', 'type') || 'broadcast'}>
                        <option value="broadcast">Broadcast (ทุกคนเห็นพร้อมกัน 24 ชม.)</option>
                        <option value="unlockable">Unlockable (นับเวลา 24 ชม. เมื่อเปิดดูครั้งแรก)</option>
                      </select>
                    </Field>
                    <Field label="รหัสไฟล์ภาพ/วิดีโอ (Media Key)"><input name="mediaKey" required defaultValue={current('stories', 'mediaKey')} placeholder="stories/noey_snack.webp" /></Field>
                    <Field label="เวลาเผยแพร่"><input name="publishedAt" type="datetime-local" defaultValue={currentDate('stories')} /></Field>
                    <Field label="ระดับความสัมพันธ์ขั้นต่ำ"><input name="relationshipRequired" type="number" min="0" defaultValue={current('stories', 'relationshipRequired') || '0'} /></Field>
                  </FormPanel>
                  <h2>Stories ทั้งหมด ({overview.stories.length})</h2>
                  <Rows rows={overview.stories} empty="ยังไม่มี Story" actions={(row) => statusActions('stories', row)} />
                </>
              )}

              {/* SECTION: EPISODES */}
              {section === 'episodes' && (
                <>
                  <FormPanel
                    key={current('episodes', 'id')}
                    title={editing?.kind === 'episodes' ? 'แก้ไขตอน DM' : '💬 สร้างตอน DM สนทนาใหม่'}
                    busy={busy}
                    submit={(f) => save('episodes', {
                      id: value(f, 'id'),
                      creatorId: value(f, 'creatorId'),
                      title: value(f, 'title'),
                      relationshipRequired: numeric(f, 'relationshipRequired'),
                      position: numeric(f, 'position'),
                    })}
                  >
                    <Field label="รหัสตอน"><input name="id" required defaultValue={current('episodes', 'id')} readOnly={editing?.kind === 'episodes'} placeholder="ep_noey_01" /></Field>
                    <Field label="Creator">{creatorSelect('episodes')}</Field>
                    <Field label="ชื่อตอน"><input name="title" required defaultValue={current('episodes', 'title')} placeholder="ความลับใต้โต๊ะทำงาน" /></Field>
                    <Field label="ความสัมพันธ์ขั้นต่ำ"><input name="relationshipRequired" type="number" min="0" defaultValue={current('episodes', 'relationshipRequired') || '0'} /></Field>
                    <Field label="ลำดับตอน"><input name="position" type="number" min="0" defaultValue={current('episodes', 'position') || '1'} /></Field>
                  </FormPanel>
                  <h2>ตอน DM ทั้งหมด ({overview.episodes.length})</h2>
                  <Rows rows={overview.episodes} empty="ยังไม่มีตอน DM" actions={(row) => <button className="fs-secondary" disabled={busy} onClick={() => { setEditing({ kind: 'episodes', row }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>แก้ไข</button>} />
                </>
              )}

              {/* SECTION: REVISIONS & NODES (Dify-Inspired Visual Flow Builder) */}
              {section === 'revisions' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={nodeEditorMode === 'visual' ? '' : 'fs-secondary'}
                        onClick={() => setNodeEditorMode('visual')}
                      >
                        🎨 แผนผังการ์ดบทสนทนา (Visual Cards)
                      </button>
                      <button
                        type="button"
                        className={nodeEditorMode === 'json' ? '' : 'fs-secondary'}
                        onClick={() => setNodeEditorMode('json')}
                      >
                        📜 โค้ด JSON ดิบ
                      </button>
                    </div>
                  </div>

                  {nodeEditorMode === 'visual' && (
                    <div className="fs-panel" style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#06b6d4' }}>Visual Flow Builder (Dify Pattern)</h3>
                          <small style={{ color: '#94a3b8' }}>ออกแบบการ์ดประโยคและทางเลือกตอบกลับ โดยระบบจะแปลงเป็น JSON ให้อัตโนมัติ</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = `node_${visualNodes.length + 1}`;
                            setVisualNodes(prev => [...prev, { id: newId, text: 'พิมพ์ประโยคของไอดอลที่นี่...', choices: [], end: false }]);
                          }}
                        >
                          ➕ เพิ่มประโยค (Add Node)
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {visualNodes.map((vn, idx) => (
                          <div key={vn.id} style={{ background: '#070912', border: '1px solid #1e263d', borderRadius: '10px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>โหนดที่ {idx + 1}: #{vn.id}</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={vn.end}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setVisualNodes(prev => prev.map((n, i) => i === idx ? { ...n, end: checked } : n));
                                  }}
                                />
                                จบตอนที่โหนดนี้ (End Node)
                              </label>
                            </div>

                            <textarea
                              style={{ width: '100%', background: '#0e1220', border: '1px solid #28334f', borderRadius: '8px', color: '#f8fafc', padding: '10px', fontSize: '0.88rem', minHeight: '60px', marginBottom: '10px' }}
                              value={vn.text}
                              onChange={e => {
                                const val = e.target.value;
                                setVisualNodes(prev => prev.map((n, i) => i === idx ? { ...n, text: val } : n));
                              }}
                              placeholder="คำพูดของไอดอล..."
                            />

                            {!vn.end && (
                              <div style={{ paddingLeft: '12px', borderLeft: '2px solid #06b6d4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>ทางเลือกตอบกลับของผู้เล่น ({vn.choices.length})</span>
                                  <button
                                    type="button"
                                    className="fs-secondary"
                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    onClick={() => {
                                      const nextChoiceId = `c_${Date.now().toString().slice(-4)}`;
                                      setVisualNodes(prev => prev.map((n, i) => i === idx ? {
                                        ...n,
                                        choices: [...n.choices, { id: nextChoiceId, text: 'ข้อความตอบกลับ...', nextNodeId: visualNodes[idx + 1]?.id || 'start' }]
                                      } : n));
                                    }}
                                  >
                                    ➕ เพิ่มทางเลือก
                                  </button>
                                </div>

                                {vn.choices.map((c, cIdx) => (
                                  <div key={c.id || cIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 30px', gap: '8px', marginBottom: '6px' }}>
                                    <input
                                      style={{ background: '#0e1220', border: '1px solid #28334f', borderRadius: '6px', color: '#f8fafc', padding: '6px 10px', fontSize: '0.8rem' }}
                                      value={c.text}
                                      onChange={e => {
                                        const text = e.target.value;
                                        setVisualNodes(prev => prev.map((n, i) => i === idx ? {
                                          ...n,
                                          choices: n.choices.map((item, ci) => ci === cIdx ? { ...item, text } : item)
                                        } : n));
                                      }}
                                      placeholder="ข้อความที่ผู้เล่นเลือกกด..."
                                    />
                                    <select
                                      style={{ background: '#0e1220', border: '1px solid #28334f', borderRadius: '6px', color: '#f8fafc', padding: '6px 8px', fontSize: '0.78rem' }}
                                      value={c.nextNodeId}
                                      onChange={e => {
                                        const target = e.target.value;
                                        setVisualNodes(prev => prev.map((n, i) => i === idx ? {
                                          ...n,
                                          choices: n.choices.map((item, ci) => ci === cIdx ? { ...item, nextNodeId: target } : item)
                                        } : n));
                                      }}
                                    >
                                      {visualNodes.map(targetNode => (
                                        <option key={targetNode.id} value={targetNode.id}>➔ #{targetNode.id}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      className="fs-danger"
                                      style={{ padding: '4px', fontSize: '0.75rem', borderRadius: '6px' }}
                                      onClick={() => {
                                        setVisualNodes(prev => prev.map((n, i) => i === idx ? {
                                          ...n,
                                          choices: n.choices.filter((_, ci) => ci !== cIdx)
                                        } : n));
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormPanel key={current('revisions', 'id')} title={editing?.kind === 'revisions' ? 'แก้ไขบทฉบับร่าง' : '📜 สร้างบท DM (Nodes) ฉบับใหม่'} busy={busy} submit={createRevision}>
                    <p className="fs-help">ระบบใช้ Immutable Revision Pinning — เมื่อเผยแพร่แล้วจะไม่กระทบผู้เล่นที่กำลังเล่นอยู่</p>
                    <Field label="รหัส Revision"><input name="id" required defaultValue={current('revisions', 'id')} readOnly={editing?.kind === 'revisions'} placeholder="rev_noey_01_v1" /></Field>
                    <Field label="ตอน DM"><select name="episodeId" required defaultValue={current('revisions', 'episodeId')}><option value="" disabled>เลือกตอน DM</option>{episodeOptions}</select></Field>
                    <Field label="โครงสร้างบทสนทนา (JSON Nodes)">
                      <textarea
                        name="nodes"
                        value={nodeEditorMode === 'visual' ? JSON.stringify(visualNodes, null, 2) : undefined}
                        defaultValue={nodeEditorMode === 'json' ? current('revisions', 'nodes') : undefined}
                        rows={8}
                        required
                        spellCheck={false}
                        readOnly={nodeEditorMode === 'visual'}
                        placeholder={'[\n  {"id":"start","text":"สวัสดีค่ะพี่... ว่างคุยไหมคะ?","choices":[],"end":false}\n]'}
                      />
                    </Field>
                  </FormPanel>
                  <h2>บท DM ทั้งหมด ({overview.revisions.length})</h2>
                  <Rows rows={overview.revisions} empty="ยังไม่มีบท DM" actions={(row) => statusActions('revisions', row)} />
                </>
              )}

              {/* SECTION: MEDIA ASSETS */}
              {section === 'media' && (
                <>
                  <FormPanel
                    title="🖼️ อัปโหลดสื่อเข้าคลัง"
                    busy={busy}
                    submit={(f) => {
                      const file = f.get('file');
                      if (file instanceof File && file.size > 0) {
                        void act(`/api/admin/media/${encodeURIComponent(value(f, 'key'))}`, 'PUT', undefined, file);
                      } else {
                        setError('กรุณาเลือกไฟล์ก่อนกดอัปโหลด');
                      }
                    }}
                  >
                    <Field label="รหัสสื่อ (Key)"><input name="key" required placeholder="เช่น avatars/noey.webp หรือ posts/scene_01.webp" /></Field>
                    <Field label="เลือกไฟล์ภาพ (WebP) หรือคลิปสั้น (MP4/WebM)"><input name="file" type="file" accept="image/webp,image/png,image/jpeg,video/mp4,video/webm" required /></Field>
                  </FormPanel>
                  <h2>สื่อที่อัปโหลดไว้แล้ว</h2>
                  <Rows rows={overview.media} empty="ยังไม่มีสื่อ" />
                </>
              )}

              {/* SECTION: IMPORT / EXPORT & BACKUP */}
              {section === 'import-export' && (
                <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2>📦 นำเข้าข้อมูลตัวละคร (1-Click Character Import)</h2>
                    <p className="fs-help">
                      รองรับไฟล์ <code>character.json</code> จากระบบ IG Idol NPC Studio เดิม เมื่อนำเข้าแล้วระบบจะแปลงเป็น Creator, โพสต์เปิดตัว และตอน DM ให้อัตโนมัติ
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const text = String(evt.target?.result || '');
                          handleImportJson(text);
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      เลือกไฟล์ character.json เพื่อนำเข้า
                    </button>
                  </div>

                  <hr style={{ borderColor: '#2b334c' }} />

                  <div>
                    <h2>💾 สำรองข้อมูลออฟไลน์ (Offline Snapshot Backup)</h2>
                    <p className="fs-help">
                      ดาวน์โหลดข้อมูลโครงสร้างทั้งหมด (Creators, Posts, Stories, Revisions) เป็นไฟล์ JSON ก้อนเดียวสำหรับเก็บสำรองใน Google Drive หรือเครื่อง Master
                    </p>
                    <button
                      type="button"
                      className="fs-secondary"
                      onClick={exportBackup}
                    >
                      ดาวน์โหลดไฟล์สำรองข้อมูล (JSON)
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: INVITES */}
              {section === 'invites' && (
                <>
                  <FormPanel title="เชิญผู้เล่น Closed Beta" busy={busy} submit={(f) => void act('/api/admin/invites', 'POST', { email: value(f, 'email') })}>
                    <Field label="อีเมลบัญชี Google ของผู้เล่น"><input name="email" type="email" required placeholder="tester@gmail.com" /></Field>
                  </FormPanel>
                  <h2>รายชื่อผู้ได้รับเชิญ ({overview.invites.length})</h2>
                  <Rows rows={overview.invites} empty="ยังไม่มีผู้ได้รับเชิญ" actions={(row) => typeof row.email === 'string' && <button className="fs-danger" disabled={busy} onClick={() => { if (window.confirm(`เพิกถอนสิทธิ์ ${row.email} ใช่ไหม?`)) void act(`/api/admin/invites/${encodeURIComponent(String(row.email))}`, 'DELETE'); }}>เพิกถอนสิทธิ์</button>} />
                </>
              )}

              {/* SECTION: COMMENTS & REPORTS */}
              {section === 'comments' && (
                <>
                  <h2>คอมเมนต์ทั้งหมด ({overview.comments.length})</h2>
                  <Rows rows={overview.comments} empty="ยังไม่มีคอมเมนต์" actions={(row) => typeof row.id === 'string' && <button className="fs-danger" disabled={busy} onClick={() => { if (window.confirm('ซ่อนคอมเมนต์นี้ใช่ไหม?')) void act(`/api/admin/comments/${encodeURIComponent(String(row.id))}`, 'DELETE'); }}>ซ่อนคอมเมนต์</button>} />
                </>
              )}

              {section === 'reports' && (
                <>
                  <h2>รายงานคอมเมนต์จากผู้เล่น ({overview.reports.length})</h2>
                  <Rows rows={overview.reports} empty="ไม่มีรายงาน" actions={(row) => typeof row.id === 'string' && <button className="fs-danger" disabled={busy} onClick={() => { if (window.confirm('ซ่อนคอมเมนต์ที่ถูกรายงานใช่ไหม?')) void act(`/api/admin/reports/${encodeURIComponent(String(row.id))}/hide`, 'POST'); }}>ซ่อนคอมเมนต์</button>} />
                </>
              )}

              {/* SECTION: ENERGY */}
              {section === 'energy' && (
                <>
                  <h2>ผู้เล่นในระบบ ({overview.users.length})</h2>
                  <Rows rows={overview.users} empty="ยังไม่มีผู้เล่น" />
                  <FormPanel title="⚡ เพิ่ม Energy จำลองสำหรับทดสอบ" busy={busy} submit={(f) => void act('/api/admin/energy', 'POST', { userId: value(f, 'userId'), amount: numeric(f, 'amount'), reason: value(f, 'reason') })}>
                    <p className="fs-help">ยอดนี้ใช้สำหรับทดลองเล่นใน Closed Beta</p>
                    <Field label="รหัสผู้เล่น (User ID)"><input name="userId" required placeholder="UID..." /></Field>
                    <Field label="จำนวน Energy"><input name="amount" type="number" min="1" step="1" defaultValue="5" required /></Field>
                    <Field label="เหตุผล"><textarea name="reason" required defaultValue="ทดสอบระบบโดย Content Studio" /></Field>
                  </FormPanel>
                </>
              )}
            </>
          )}
        </main>

        {/* RIGHT PANE: LIVE INTERACTIVE IPHONE 18 SIMULATOR (USER & STUDIO MODES) */}
        <aside className="fs-preview-column" aria-label="Live Phone Simulator">
          <div className="fs-preview-sticky">
            {/* 🛠️ DEV TOOLBAR & REALTIME TELEMETRY STRIP */}
            <div className="fs-studio-dev-toolbar">
              <div className="fs-dev-bar-top">
                <div className="fs-dev-bar-title">
                  <span>🛠️ DEV & TELEMETRY</span>
                  <small style={{ color: '#64748b', fontSize: '0.65rem' }}>({activeCreatorId || 'mira'})</small>
                </div>
                <div className="fs-dev-btn-group">
                  <button
                    type="button"
                    className="fs-dev-btn energy"
                    onClick={() => void handleDevAddEnergy(5)}
                    disabled={devActionBusy}
                    title="เติม Energy +5 ทันที"
                  >
                    ⚡ +5
                  </button>
                  <button
                    type="button"
                    className="fs-dev-btn energy"
                    onClick={() => void handleDevAddEnergy(10)}
                    disabled={devActionBusy}
                    title="เติม Energy +10 ทันที"
                  >
                    ⚡ +10
                  </button>
                  <button
                    type="button"
                    className="fs-dev-btn reset"
                    onClick={() => void handleDevResetCreator(activeCreatorId || 'mira')}
                    disabled={devActionBusy}
                    title="ล้างแชทและความทรงจำ AI สำหรับ NPC ตัวนี้เพื่อเริ่มทดสอบใหม่"
                  >
                    🔄 ล้างแชท AI
                  </button>
                  <button
                    type="button"
                    className="fs-dev-btn"
                    onClick={() => {
                      setNpcCreatorId(activeCreatorId || 'mira');
                      setSection('npc-engine');
                    }}
                    title="เปิดแก้ไขกฎและสมองของ NPC ตัวนี้"
                  >
                    🧠 แก้ไขกฎ
                  </button>
                </div>
              </div>

              {/* Realtime 3D Relationship Gauge */}
              <div className="fs-dev-telemetry-row">
                <span className="fs-telemetry-pill closeness" title="ความสนิทสนม">
                  💖 สนิท: {devTelemetry?.closeness ?? 0}
                </span>
                <span className="fs-telemetry-pill trust" title="ความไว้วางใจ">
                  🤝 ไว้ใจ: {devTelemetry?.trust ?? 0}
                </span>
                <span className="fs-telemetry-pill romance" title="ความโรแมนติก">
                  🌹 โรแมนติก: {devTelemetry?.romance ?? 0}
                </span>
                <span className="fs-telemetry-pill score" title="ระดับความสัมพันธ์รวม">
                  ⭐ Lv.{devTelemetry?.level ?? 0} ({devTelemetry?.score ?? 0} pt)
                </span>
                <span style={{ fontSize: '0.68rem', color: '#facc15', marginLeft: 'auto', fontWeight: 700 }}>
                  ⚡ {simulatedEnergy}/3 พลังงาน
                </span>
              </div>

              {/* Memory Inspector */}
              {devTelemetry?.memories && devTelemetry.memories.length > 0 && (
                <div className="fs-dev-memories-row">
                  <span className="fs-dev-chip-label">🧠 ความจำ AI:</span>
                  {devTelemetry.memories.slice(0, 4).map((m, idx) => (
                    <span key={idx} className="fs-dev-memory-pill" title={m.value}>
                      {m.key}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Prompt Testing Chips */}
              <div className="fs-dev-chips-row">
                <span className="fs-dev-chip-label">🧪 ทดสอบคำ:</span>
                {[
                  'อะไรอยู่หลังกีต้าเหรอ',
                  'เพลง Afterglow แต่งยังไง',
                  'สู้ๆ นะ เราเป็นกำลังใจให้',
                  'ชอบฟังเพลงแนวไหนเหรอ'
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="fs-dev-quick-prompt"
                    onClick={() => {
                      setPreviewDmInput(promptText);
                      setPreviewTab('dm');
                      setUserNavTab('dm');
                    }}
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            <div className="fs-perspective-header">
              <div className="fs-perspective-toggle">
                <button
                  type="button"
                  className={perspective === 'user' ? 'active' : ''}
                  onClick={() => {
                    setPerspective('user');
                    setUserNavTab('feed');
                  }}
                >
                  👤 ผู้เล่น (Play)
                </button>
                <button
                  type="button"
                  className={perspective === 'edit' ? 'active' : ''}
                  onClick={() => { setPerspective('edit'); setUserNavTab('feed'); }}
                >
                  ✏️ แก้บนจอ (Edit)
                </button>
                <button
                  type="button"
                  className={perspective === 'creator' ? 'active' : ''}
                  onClick={() => setPerspective('creator')}
                >
                  🛠️ Studio
                </button>
              </div>

              {perspective === 'edit' ? (
                <div className="fs-user-controls-bar fs-edit-hint">
                  <span>คลิก = เปิดฟอร์ม · ดับเบิลคลิกข้อความ = แก้บนจอ · ลากภาพมาวาง = เปลี่ยนรูป</span>
                  {inspected && <code>{inspected.kind} › {inspected.field}</code>}
                </div>
              ) : perspective === 'user' ? (
                <div className="fs-user-controls-bar">
                  <div className="fs-user-affinity-control">
                    <label>ความสัมพันธ์จำลอง:</label>
                    <select
                      value={simulatedAffinity}
                      onChange={(e) => setSimulatedAffinity(Number(e.target.value))}
                    >
                      <option value={0}>0 แต้ม (Lv.0 แฟนคลับ)</option>
                      <option value={10}>10 แต้ม (Lv.1 คนคุ้นเคย)</option>
                      <option value={20}>20 แต้ม (Lv.2 เพื่อนสนิท)</option>
                      <option value={40}>40 แต้ม (Lv.3 คนพิเศษ)</option>
                      <option value={60}>60 แต้ม (Lv.4 ความลับ)</option>
                    </select>
                  </div>
                  <span className="fs-user-energy-badge">⚡ {simulatedEnergy}/3</span>
                </div>
              ) : (
                <div className="fs-preview-tabs">
                  <button className={previewTab === 'feed' ? 'active' : ''} onClick={() => setPreviewTab('feed')}>Feed</button>
                  <button className={previewTab === 'stories' ? 'active' : ''} onClick={() => setPreviewTab('stories')}>Story ({creatorStories.length})</button>
                  <button className={previewTab === 'dm' ? 'active' : ''} onClick={() => setPreviewTab('dm')}>DM Chat</button>
                </div>
              )}
            </div>

            {/* iPhone 18 Frame */}
            <div className="fs-phone-frame">
              <div className="fs-phone-notch"><div className="fs-dynamic-island" /></div>
              
              <div
                className={`fs-phone-screen ${perspective === 'edit' ? 'fs-edit-mode' : ''}`}
                onClickCapture={onEditClick}
                onDoubleClickCapture={onEditDoubleClick}
                onDragOver={onEditDragOver}
                onDragLeave={() => setDropTarget('')}
                onDrop={(e) => void onEditDrop(e)}
              >
                {/* Simulated Phone Status Bar */}
                <div className="fs-phone-status-bar">
                  <span>9:41</span>
                  <span>5G 📶 100% 🔋</span>
                </div>

                {/* PERSPECTIVE SWITCH: USER VIEW vs CREATOR VIEW */}
                {perspective !== 'creator' ? (
                  <div className="fs-user-phone-container">
                    {/* Simulated IG Header for Player */}
                    <div className="fs-phone-ig-header">
                      <div className="fs-ig-logo">instagoon</div>
                      <div className="fs-ig-icons">
                        <span className="fs-user-pill-heart" title="ระดับความสัมพันธ์">
                          ❤️ {simulatedAffinity} pt
                        </span>
                        <span className="fs-user-pill-energy" title="พลังงาน">
                          ⚡ {simulatedEnergy}/3
                        </span>
                        <button
                          type="button"
                          className="fs-user-pill-dm"
                          onClick={() => setUserNavTab('dm')}
                          title="ข้อความ Direct"
                        >
                          ✉️
                        </button>
                      </div>
                    </div>

                    {/* Tab 1: Feed (Player Perspective) */}
                    {userNavTab === 'feed' && (
                      <div className="fs-phone-scroll-content">
                        {/* Stories Tray */}
                        <div className="fs-phone-story-tray">
                          <div
                            className="fs-story-bubble active"
                            onClick={() => setUserNavTab('dm')}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="fs-story-ring">
                              <div className="fs-story-avatar">{activeCreator?.avatarKey ? '📷' : '🌟'}</div>
                            </div>
                            <span className="fs-story-name">{String(activeCreator?.name || 'ไอดอล').slice(0, 8)}</span>
                          </div>
                          {creatorStories.map((s, idx) => (
                            <div className="fs-story-bubble" key={String(s.id || idx)}>
                              <div className="fs-story-ring">
                                <div className="fs-story-avatar">📸</div>
                              </div>
                              <span className="fs-story-name">Story #{idx + 1}</span>
                            </div>
                          ))}
                        </div>

                        {/* Feed Posts */}
                        {creatorPosts.length === 0 ? (
                          <div className="fs-phone-empty-feed">
                            <p>ยังไม่มีโพสต์ให้แสดง</p>
                            <small>เมื่อครีเอเตอร์โพสต์แล้ว เนื้อหาจะขึ้นที่นี่</small>
                          </div>
                        ) : (
                          creatorPosts.map((post) => {
                            const pid = String(post.id);
                            const isLiked = !!previewLikes[pid];
                            const likes = Number(post.simulatedLikes || 0) + (isLiked ? 1 : 0);
                            const requiredAffinity = Number(post.relationshipRequired || 0);
                            const isLocked = perspective === 'user' && requiredAffinity > simulatedAffinity;
                            const postComments = simulatedComments[pid] || [];

                            if (isLocked) {
                              return (
                                <article className="fs-phone-post-card fs-post-locked-card" key={pid}>
                                  <div className="fs-phone-post-header">
                                    <div className="fs-post-author-avatar">🔒</div>
                                    <div className="fs-post-author-info">
                                      <strong>{String(activeCreator?.name || post.creatorId)}</strong>
                                      <small>โพสต์พิเศษ (ต้องปลดล็อก)</small>
                                    </div>
                                    <span className="fs-lock-tag">🔒 ล็อก</span>
                                  </div>

                                  <div className="fs-locked-media-box">
                                    <div className="fs-locked-blur-content">
                                      <div className="fs-locked-icon-shield">🔐</div>
                                      <div className="fs-locked-title">เนื้อหาพิเศษเฉพาะคนสนิท</div>
                                      <div className="fs-locked-desc">
                                        ต้องมีความสัมพันธ์ Lv.{Math.ceil(requiredAffinity / 10)} ({requiredAffinity} แต้ม)
                                      </div>
                                      <div className="fs-affinity-progress-bar">
                                        <div
                                          className="fs-affinity-progress-fill"
                                          style={{ width: `${Math.min(100, (simulatedAffinity / requiredAffinity) * 100)}%` }}
                                        />
                                      </div>
                                      <span className="fs-affinity-count">
                                        มี {simulatedAffinity} / {requiredAffinity} แต้ม
                                      </span>
                                      <button
                                        type="button"
                                        className="fs-unlock-cta-btn"
                                        onClick={() => setUserNavTab('dm')}
                                      >
                                        💬 ทักแชทหา {String(activeCreator?.name || 'ไอดอล')} เพื่อเพิ่มแต้ม
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            }

                            return (
                              <article className="fs-phone-post-card" key={pid}>
                                <div className="fs-phone-post-header">
                                  <div className="fs-post-author-avatar" data-edit={`creators:${String(post.creatorId)}:avatarKey`} data-edit-label="Avatar"><MediaImage mediaKey={activeCreator?.avatarKey} fallback="🌟" /></div>
                                  <div className="fs-post-author-info">
                                    <strong data-edit={`creators:${String(post.creatorId)}:name`} data-edit-label="ชื่อไอดอล">{String(activeCreator?.name || post.creatorId)}</strong>
                                    <small>🟢 กำลังติดตาม</small>
                                  </div>
                                  <span className="fs-post-more">•••</span>
                                </div>

                                <div
                                  className={`fs-phone-post-media ${dropTarget === `posts:${pid}:mediaKey` ? 'fs-drop-active' : ''}`}
                                  data-edit={`posts:${pid}:mediaKey`}
                                  data-edit-label="รูปโพสต์ · ลากภาพมาวาง"
                                  onDoubleClick={() => {
                                    setPreviewLikes((prev) => ({ ...prev, [pid]: prev[pid] ? 0 : 1 }));
                                    setSimulatedAffinity((prev) => prev + 1);
                                  }}
                                >
                                  <MediaImage mediaKey={post.mediaKey} fallback={post.mediaKey ? `[Media: ${post.mediaKey}]` : '📸 ลากภาพมาวางที่นี่'} />
                                  {isLiked && <div className="fs-heart-burst">❤️</div>}
                                </div>

                                <div className="fs-phone-post-actions">
                                  <button
                                    className={`fs-action-btn ${isLiked ? 'liked' : ''}`}
                                    onClick={() => {
                                      setPreviewLikes((prev) => ({ ...prev, [pid]: prev[pid] ? 0 : 1 }));
                                      setSimulatedAffinity((prev) => prev + 1);
                                    }}
                                  >
                                    {isLiked ? '❤️' : '🤍'}
                                  </button>
                                  <button className="fs-action-btn">💬</button>
                                  <button className="fs-action-btn">↗️</button>
                                  <button className="fs-action-btn save-btn">🔖</button>
                                </div>

                                <div className="fs-phone-post-caption">
                                  <strong>{likes.toLocaleString()} ถูกใจ</strong>
                                  <p>
                                    <strong>{String(activeCreator?.name || post.creatorId)}</strong>{' '}
                                    <span data-edit={`posts:${pid}:caption`} data-edit-label="แคปชัน">{String(post.caption || '')}</span>
                                  </p>

                                  {/* Comments Section */}
                                  <div className="fs-user-comments-container">
                                    {postComments.map((cmt, cIdx) => (
                                      <div className="fs-user-comment-bubble" key={cIdx}>
                                        <span className="fs-comment-user">คุณ:</span> {cmt}
                                      </div>
                                    ))}
                                    {postComments.length > 0 && (
                                      <div className="fs-idol-comment-reply">
                                        <span className="fs-comment-user">{String(activeCreator?.name || 'เนย')}:</span> ขอบคุณที่มาคอมเมนต์นะค้าบ ดีใจมากเลย 💕
                                      </div>
                                    )}
                                  </div>

                                  {/* User Comment Input */}
                                  <form
                                    className="fs-user-comment-form"
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const text = (commentInput[pid] || '').trim();
                                      if (!text) return;
                                      setSimulatedComments((prev) => ({
                                        ...prev,
                                        [pid]: [...(prev[pid] || []), text]
                                      }));
                                      setCommentInput((prev) => ({ ...prev, [pid]: '' }));
                                      if (simulatedEnergy > 0) {
                                        setSimulatedEnergy((prev) => prev - 1);
                                      }
                                      setSimulatedAffinity((prev) => prev + 2);
                                    }}
                                  >
                                    <input
                                      placeholder="เพิ่มความคิดเห็น... (+2 แต้ม❤️, 1⚡)"
                                      value={commentInput[pid] || ''}
                                      onChange={(e) => setCommentInput((prev) => ({ ...prev, [pid]: e.target.value }))}
                                    />
                                    <button type="submit" disabled={!commentInput[pid]?.trim()}>ส่ง</button>
                                  </form>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Tab 2: Explore */}
                    {userNavTab === 'explore' && (
                      <div className="fs-phone-scroll-content fs-explore-view">
                        <div className="fs-explore-header">
                          <h4>ค้นพบไอดอลทั้งหมด</h4>
                          <p>เลือกไอดอลเพื่อติดตามและสานสัมพันธ์</p>
                        </div>
                        <div className="fs-creators-card-list">
                          {(overview?.creators || []).map((c) => (
                            <div className="fs-explore-creator-card" key={String(c.id)}>
                              <div className="fs-explore-card-top">
                                <div className={`fs-explore-card-avatar ${dropTarget === `creators:${String(c.id)}:avatarKey` ? 'fs-drop-active' : ''}`} data-edit={`creators:${String(c.id)}:avatarKey`} data-edit-label="Avatar · ลากภาพมาวาง"><MediaImage mediaKey={c.avatarKey} fallback="🌟" /></div>
                                <div className="fs-explore-card-info">
                                  <strong data-edit={`creators:${String(c.id)}:name`} data-edit-label="ชื่อ">{String(c.name || c.id)}</strong>
                                  <small>@{String(c.id)}</small>
                                </div>
                              </div>
                              <p className="fs-explore-bio" data-edit={`creators:${String(c.id)}:bio`} data-edit-label="Bio">{String(c.bio || 'ไอดอลสาวขี้อ้อนแห่ง FrostStory')}</p>
                              <div className="fs-explore-affinity-track">
                                <div className="fs-track-label">
                                  <span>ความสัมพันธ์:</span>
                                  <strong>{c.id === activeCreatorId ? `${simulatedAffinity} แต้ม` : '5 แต้ม'}</strong>
                                </div>
                                <div className="fs-affinity-progress-bar">
                                  <div
                                    className="fs-affinity-progress-fill"
                                    style={{ width: `${Math.min(100, ((c.id === activeCreatorId ? simulatedAffinity : 5) / 50) * 100)}%` }}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className="fs-explore-chat-btn"
                                onClick={() => {
                                  setActiveCreatorId(String(c.id));
                                  setUserNavTab('dm');
                                }}
                              >
                                💬 ทักแชททันที
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: DM Chat */}
                    {userNavTab === 'dm' && (
                      <div className="fs-phone-dm-view">
                        <div className="fs-dm-chat-header">
                          <div className="fs-dm-avatar">🌟</div>
                          <div className="fs-dm-header-meta">
                            <strong>{String(activeCreator?.name || 'ไอดอล')}</strong>
                            <small>🟢 ออนไลน์ • ความสัมพันธ์ Lv.{Math.ceil(simulatedAffinity / 10) || 1}</small>
                          </div>
                        </div>

                        <div className="fs-dm-messages-container">
                          {previewDmChat.map((msg, index) => (
                            <div className={`fs-dm-bubble ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`} key={index}>
                              {msg.text}
                            </div>
                          ))}
                        </div>

                        <form
                          className="fs-dm-input-bar"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const text = previewDmInput.trim();
                            if (!text) return;
                            setPreviewDmChat((prev) => [...prev, { sender: 'user', text }]);
                            setPreviewDmInput('');
                            if (simulatedEnergy > 0) setSimulatedEnergy((prev) => prev - 1);
                            setSimulatedAffinity((prev) => prev + 1);

                            try {
                              const res = await request(`/api/chats/${encodeURIComponent(activeCreatorId || 'noey')}/message`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: text })
                              });
                              if (res && typeof res === 'object' && 'reply' in res && typeof res.reply === 'string') {
                                setPreviewDmChat((prev) => [...prev, { sender: 'npc', text: String(res.reply) }]);
                                void fetchDevTelemetry(activeCreatorId || 'noey');
                                return;
                              }
                            } catch {
                              setPreviewDmChat((prev) => [
                                ...prev,
                                { sender: 'npc', text: `(เนย) แวะมาคุยแบบนี้เนยดีใจจังเลยค่ะ 💕 คืนนี้อย่าลืมพักผ่อนเยอะๆ น้า` }
                              ]);
                            }
                          }}
                        >
                          <input
                            placeholder="พิมพ์คุยกับไอดอล (+1แต้ม, 1⚡)..."
                            value={previewDmInput}
                            onChange={(e) => setPreviewDmInput(e.target.value)}
                          />
                          <button type="submit">ส่ง</button>
                        </form>
                      </div>
                    )}

                    {/* Tab 4: Player Profile */}
                    {userNavTab === 'profile' && (
                      <div className="fs-phone-scroll-content fs-user-profile-view">
                        <div className="fs-profile-header-card">
                          <div className="fs-profile-avatar-large">👤</div>
                          <h4>โปรดิวเซอร์ / ผู้เล่น</h4>
                          <span className="fs-profile-role-tag">VIP Beta Player</span>
                        </div>

                        <div className="fs-profile-stats-grid">
                          <div className="fs-profile-stat-box">
                            <span className="fs-stat-icon">⚡</span>
                            <strong>{simulatedEnergy} / 3</strong>
                            <small>พลังงานประจำวัน</small>
                          </div>
                          <div className="fs-profile-stat-box">
                            <span className="fs-stat-icon">❤️</span>
                            <strong>{simulatedAffinity}</strong>
                            <small>แต้มความสัมพันธ์รวม</small>
                          </div>
                        </div>

                        <div className="fs-profile-idols-list">
                          <h5>ความสัมพันธ์กับไอดอล</h5>
                          {(overview?.creators || []).map((c) => (
                            <div className="fs-profile-idol-row" key={String(c.id)}>
                              <span>🌟 {String(c.name || c.id)}</span>
                              <span className="fs-idol-score">
                                {c.id === activeCreatorId ? `${simulatedAffinity} แต้ม` : '5 แต้ม'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="fs-profile-actions">
                          <button
                            type="button"
                            className="fs-profile-reset-btn"
                            onClick={() => {
                              setSimulatedAffinity(0);
                              setSimulatedEnergy(3);
                              setSimulatedComments({});
                              setPreviewLikes({});
                            }}
                          >
                            🔄 รีเซ็ตการจำลองมุมมองผู้เล่น
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom 4-Tab Navigation Bar */}
                    <nav className="fs-user-bottom-nav">
                      <button
                        type="button"
                        className={`fs-user-nav-btn ${userNavTab === 'feed' ? 'active' : ''}`}
                        onClick={() => setUserNavTab('feed')}
                        title="ฟีดข่าว"
                      >
                        🏠
                      </button>
                      <button
                        type="button"
                        className={`fs-user-nav-btn ${userNavTab === 'explore' ? 'active' : ''}`}
                        onClick={() => setUserNavTab('explore')}
                        title="ค้นหาไอดอล"
                      >
                        🔍
                      </button>
                      <button
                        type="button"
                        className={`fs-user-nav-btn ${userNavTab === 'dm' ? 'active' : ''}`}
                        onClick={() => setUserNavTab('dm')}
                        title="ข้อความ"
                      >
                        💬
                      </button>
                      <button
                        type="button"
                        className={`fs-user-nav-btn ${userNavTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setUserNavTab('profile')}
                        title="โปรไฟล์"
                      >
                        👤
                      </button>
                    </nav>
                  </div>
                ) : (
                  /* CREATOR PERSPECTIVE VIEW */
                  <div className="fs-creator-phone-container">
                    <div className="fs-phone-ig-header">
                      <div className="fs-ig-logo">instagoon (Studio)</div>
                      <div className="fs-ig-icons">
                        <span>❤️</span>
                        <span>⚡ 3</span>
                        <span>✉️</span>
                      </div>
                    </div>

                    {/* View 1: FEED PREVIEW */}
                    {previewTab === 'feed' && (
                      <div className="fs-phone-scroll-content">
                        {/* Story Tray at Top */}
                        <div className="fs-phone-story-tray">
                          <div className="fs-story-bubble active">
                            <div className="fs-story-ring">
                              <div className="fs-story-avatar">{activeCreator?.avatarKey ? '📷' : '🌟'}</div>
                            </div>
                            <span className="fs-story-name">{String(activeCreator?.name || 'ไอดอล').slice(0, 8)}</span>
                          </div>
                          {creatorStories.map((s, idx) => (
                            <div className="fs-story-bubble" key={String(s.id || idx)}>
                              <div className="fs-story-ring">
                                <div className="fs-story-avatar">📸</div>
                              </div>
                              <span className="fs-story-name">Story #{idx + 1}</span>
                            </div>
                          ))}
                        </div>

                        {/* Posts Feed */}
                        {creatorPosts.length === 0 ? (
                          <div className="fs-phone-empty-feed">
                            <p>ยังไม่มีโพสต์ของไอดอลคนนี้</p>
                            <small>สร้างโพสต์ทางแท็บซ้ายมือเพื่อดูตัวอย่างที่นี่</small>
                          </div>
                        ) : (
                          creatorPosts.map((post) => {
                            const pid = String(post.id);
                            const isLiked = !!previewLikes[pid];
                            const likes = Number(post.simulatedLikes || 0) + (isLiked ? 1 : 0);
                            return (
                              <article className="fs-phone-post-card" key={pid}>
                                <div className="fs-phone-post-header">
                                  <div className="fs-post-author-avatar">🌟</div>
                                  <div className="fs-post-author-info">
                                    <strong>{String(activeCreator?.name || post.creatorId)}</strong>
                                    <small>{post.status === 'published' ? '🟢 เผยแพร่แล้ว' : '🟡 ฉบับร่าง'}</small>
                                  </div>
                                  <span className="fs-post-more">•••</span>
                                </div>

                                <div
                                  className="fs-phone-post-media"
                                  onDoubleClick={() => setPreviewLikes((prev) => ({ ...prev, [pid]: prev[pid] ? 0 : 1 }))}
                                >
                                  <div className="fs-media-placeholder">
                                    {post.mediaKey ? `[Media: ${post.mediaKey}]` : '📸 รูปภาพโพสต์'}
                                  </div>
                                  {isLiked && <div className="fs-heart-burst">❤️</div>}
                                </div>

                                <div className="fs-phone-post-actions">
                                  <button
                                    className={`fs-action-btn ${isLiked ? 'liked' : ''}`}
                                    onClick={() => setPreviewLikes((prev) => ({ ...prev, [pid]: prev[pid] ? 0 : 1 }))}
                                  >
                                    {isLiked ? '❤️' : '🤍'}
                                  </button>
                                  <button className="fs-action-btn">💬</button>
                                  <button className="fs-action-btn">↗️</button>
                                  <button className="fs-action-btn save-btn">🔖</button>
                                </div>

                                <div className="fs-phone-post-caption">
                                  <strong>{likes.toLocaleString()} ถูกใจ</strong>
                                  <p>
                                    <strong>{String(activeCreator?.name || post.creatorId)}</strong>{' '}
                                    {String(post.caption || '')}
                                  </p>
                                  <span className="fs-comments-link">ดูความคิดเห็นทั้งหมด (1⚡ เพิ่มความสัมพันธ์)</span>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* View 2: STORIES PREVIEW */}
                    {previewTab === 'stories' && (
                      <div className="fs-phone-story-view">
                        {creatorStories.length === 0 ? (
                          <div className="fs-phone-empty-feed">
                            <p>ยังไม่มี Stories ของไอดอลคนนี้</p>
                            <small>เพิ่ม Story ทางแท็บซ้ายมือได้เลย</small>
                          </div>
                        ) : (
                          <div className="fs-story-card-preview">
                            <div className="fs-story-progress-bar">
                              {creatorStories.map((_, i) => (
                                <div className={`fs-progress-seg ${i === 0 ? 'active' : ''}`} key={i} />
                              ))}
                            </div>
                            <div className="fs-story-creator-bar">
                              <span className="fs-story-avatar-mini">🌟</span>
                              <strong>{String(activeCreator?.name || 'ไอดอล')}</strong>
                              <span className="fs-story-badge">{String(creatorStories[0].type || 'broadcast')}</span>
                            </div>
                            <div className="fs-story-image-placeholder">
                              📸 [Story Media: {String(creatorStories[0].mediaKey)}]
                            </div>
                            <div className="fs-story-bottom-input">
                              <input placeholder="ส่งข้อความตอบกลับสตอรี่นี้..." readOnly />
                              <span>❤️</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* View 3: DM CHAT PREVIEW */}
                    {previewTab === 'dm' && (
                      <div className="fs-phone-dm-view">
                        <div className="fs-dm-chat-header">
                          <div className="fs-dm-avatar">🌟</div>
                          <div className="fs-dm-header-meta">
                            <strong>{String(activeCreator?.name || 'ไอดอล')}</strong>
                            <small>ออนไลน์ • {creatorEpisodes.length} ตอน • ความสัมพันธ์ Lv 1</small>
                          </div>
                        </div>

                        <div className="fs-dm-messages-container">
                          {previewDmChat.map((msg, index) => (
                            <div className={`fs-dm-bubble ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`} key={index}>
                              {msg.text}
                            </div>
                          ))}
                        </div>

                        <form
                          className="fs-dm-input-bar"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const text = previewDmInput.trim();
                            if (!text) return;
                            setPreviewDmChat((prev) => [...prev, { sender: 'user', text }]);
                            setPreviewDmInput('');
                            try {
                              const res = await request(`/api/chats/${encodeURIComponent(activeCreatorId || 'noey')}/message`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: text })
                              });
                              if (res && typeof res === 'object' && 'reply' in res && typeof res.reply === 'string') {
                                setPreviewDmChat((prev) => [...prev, { sender: 'npc', text: String(res.reply) }]);
                                void fetchDevTelemetry(activeCreatorId || 'noey');
                                return;
                              }
                            } catch {
                              setPreviewDmChat((prev) => [
                                ...prev,
                                { sender: 'npc', text: `(เนย) แวะมาคุยแบบนี้เนยดีใจจังเลยค่ะ 💕 คืนนี้อย่าลืมพักผ่อนเยอะๆ น้า` }
                              ]);
                            }
                          }}
                        >
                          <input
                            placeholder="พิมพ์ข้อความคุยกับไอดอล..."
                            value={previewDmInput}
                            onChange={(e) => setPreviewDmInput(e.target.value)}
                          />
                          <button type="submit">ส่ง</button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
