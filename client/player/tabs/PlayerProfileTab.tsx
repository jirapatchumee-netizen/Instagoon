import { useState, useEffect } from 'react';
import { type User, type Creator, type Post } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { getAvatarSrc, media, AvatarImg, truncate } from '../ui';
import { LangSelect } from '../LangSelect';
import { Bookmark, Sparkles, User as UserIcon, Users, Volume2, Smartphone, LifeBuoy, Gem, Lock, CheckCircle2, Zap, MessageCircle, Shield, Heart } from 'lucide-react';
import { IgVerified } from '../InstagramIcons';
import { api } from '../api';

interface UnlockedCard {
  id: string;
  name: string;
  asset: string;
  caption: string;
  rarity: 'R' | 'SR' | 'SSR' | 'UR';
  unlockType: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  unlockedAt: number;
}

interface MissionData {
  creator: { id: string; name: string; avatarKey?: string };
  stats: { closeness: number; trust: number; romance: number; turns: number; level: number; score: number };
  missions: Array<{
    id: string;
    name: string;
    asset: string;
    caption: string;
    message: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    unlockType: string;
    hint?: string;
    unlocked: boolean;
    conditions: Array<{
      field: string;
      target: number;
      current: number;
      satisfied: boolean;
      eventId?: string;
    }>;
  }>;
  gachaPool: Array<{
    id: string;
    name: string;
    asset: string;
    caption: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    unlocked: boolean;
  }>;
  diamonds: number;
  energy: number;
}

interface PlayerProfileTabProps {
  user: User;
  creators: Creator[];
  posts: Post[];
  savedPostIds: Record<string, boolean>;
  lang: Lang;
  busy: boolean;
  onSetLang: (lang: Lang) => void;
  onEditProfile: () => void;
  onViewProfile: (creator: Creator) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onReportIssue?: () => void;
}

export function PlayerProfileTab({
  user,
  creators,
  posts,
  savedPostIds,
  lang,
  busy,
  onSetLang,
  onEditProfile,
  onViewProfile,
  onLogout,
  onDeleteAccount,
  onReportIssue,
}: PlayerProfileTabProps) {
  const t = TRANSLATIONS[lang];
  const [activeSubTab, setActiveSubTab] = useState<'saved' | 'collection' | 'following'>('saved');

  // Sound and Haptics settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('froststory_sound');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('froststory_haptics');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_sound', String(next));
    }
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_haptics', String(next));
    }
  };

  const savedPosts = posts.filter((p) => savedPostIds[p.id]);
  const followingCreators = creators.filter((c) => c.following);

  // Collection & Mission states
  const [collectionCards, setCollectionCards] = useState<UnlockedCard[]>([]);
  const [collectionSubTab, setCollectionSubTab] = useState<'album' | 'missions'>('missions');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(() => creators[0]?.id || 'milin');
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [pullingGacha, setPullingGacha] = useState(false);
  const [gachaResult, setGachaResult] = useState<{
    wonCard: boolean;
    isDuplicate: boolean;
    card?: { name: string; asset: string; rarity: 'R' | 'SR' | 'SSR' | 'UR'; caption?: string } | null;
    energyAwarded: number;
  } | null>(null);

  const fetchCollection = async () => {
    try {
      const res = await api<{ cards: UnlockedCard[] }>('/api/user/collection');
      if (res?.cards) setCollectionCards(res.cards);
    } catch {
      // ignore
    }
  };

  const fetchMissions = async (cid: string) => {
    try {
      const res = await api<MissionData>(`/api/creators/${cid}/missions`);
      if (res) setMissionData(res);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeSubTab === 'collection') {
      fetchCollection();
      if (selectedCreatorId) {
        fetchMissions(selectedCreatorId);
      }
    }
  }, [activeSubTab, selectedCreatorId]);

  const handlePullGacha = async () => {
    if (!selectedCreatorId || pullingGacha) return;
    setPullingGacha(true);
    try {
      const res = await api<{
        ok: boolean;
        wonCard: boolean;
        isDuplicate: boolean;
        card?: { name: string; asset: string; rarity: 'R' | 'SR' | 'SSR' | 'UR'; caption?: string } | null;
        energyAwarded: number;
        energy: { free: number; purchased: number; diamonds: number };
      }>(`/api/creators/${selectedCreatorId}/gacha/pull`, { method: 'POST' });

      setGachaResult(res);
      fetchMissions(selectedCreatorId);
      fetchCollection();
    } catch (err: any) {
      alert(err.message === 'insufficient_diamonds' ? t.notEnoughDiamonds : (err.message || 'Error'));
    } finally {
      setPullingGacha(false);
    }
  };

  return (
    <div className="fs-player-profile-tab">
      {/* Profile Header */}
      <div className="fs-player-header">
        <div className="fs-player-avatar-col">
          <div className="fs-avatar fs-avatar-large">
            {user.avatarId && getAvatarSrc(user.avatarId) ? (
              <img
                src={getAvatarSrc(user.avatarId)!}
                alt={user.nickname || user.email}
                className="fs-avatar-img"
              />
            ) : (
              <UserIcon size={32} />
            )}
          </div>
        </div>

        <div className="fs-player-details">
          <div className="fs-account-name-row">
            <h2 className="fs-player-name">{user.nickname || user.email.split('@')[0]}</h2>
            <button
              type="button"
              className="fs-profile-edit-btn"
              onClick={onEditProfile}
            >
              {t.editProfile}
            </button>
          </div>
          <span className="fs-muted">{user.email}</span>
          <span className="fs-player-badge">{t.betaUserDesc}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="fs-player-stats-bar">
        <div className="fs-player-stat-item">
          <strong>{followingCreators.length}</strong>
          <span>{t.following}</span>
        </div>
        <div className="fs-player-stat-item">
          <strong>{savedPosts.length}</strong>
          <span>{t.saved}</span>
        </div>
        <div className="fs-player-stat-item">
          <strong>0</strong>
          <span>{t.collection}</span>
        </div>
      </div>

      {/* Sub Tabs: Saved / Collection / Following */}
      <div className="fs-player-subtabs" role="tablist">
        <button
          type="button"
          className={`fs-player-subtab ${activeSubTab === 'saved' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('saved')}
          role="tab"
          aria-selected={activeSubTab === 'saved'}
        >
          <Bookmark size={18} />
          <span>{t.saved}</span>
        </button>

        <button
          type="button"
          className={`fs-player-subtab ${activeSubTab === 'collection' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('collection')}
          role="tab"
          aria-selected={activeSubTab === 'collection'}
        >
          <Sparkles size={18} />
          <span>{t.collection}</span>
        </button>

        <button
          type="button"
          className={`fs-player-subtab ${activeSubTab === 'following' ? 'is-active' : ''}`}
          onClick={() => setActiveSubTab('following')}
          role="tab"
          aria-selected={activeSubTab === 'following'}
        >
          <Users size={18} />
          <span>{t.following}</span>
        </button>
      </div>

      {/* Subtab Contents */}
      <div className="fs-player-subtab-content">
        {activeSubTab === 'saved' && (
          savedPosts.length > 0 ? (
            <div className="fs-saved-grid">
              {savedPosts.map((post) => (
                <div key={post.id} className="fs-saved-grid-item">
                  {post.mediaKey ? (
                    <img src={media(post.mediaKey)} alt={post.caption} />
                  ) : (
                    <div className="fs-saved-quote">
                      <p>“{post.caption}”</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="fs-empty-state">
              <div className="fs-empty-icon-circle">
                <Bookmark size={28} />
              </div>
              <h2>{t.emptySavedTitle}</h2>
              <p>{t.emptySavedDesc}</p>
            </div>
          )
        )}

        {activeSubTab === 'collection' && (
          <div className="fs-mission-container">
            {/* Diamond Gacha Banner */}
            <div className="fs-gacha-banner-card">
              <div className="fs-gacha-banner-header">
                <div className="fs-gacha-banner-title-row">
                  <Gem size={18} className="text-pink-400" />
                  <span className="fs-gacha-banner-title">{t.diamondGacha}</span>
                </div>
                <div className="fs-gacha-diamond-chip">
                  <Gem size={12} />
                  <span>{missionData?.diamonds ?? 0} 💎</span>
                </div>
              </div>
              <p className="fs-gacha-banner-desc">{t.diamondGachaDesc}</p>

              {/* Creator Selector Pills */}
              {creators.length > 1 && (
                <div className="fs-studio-chips" style={{ marginBottom: 4 }}>
                  {creators.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`fs-studio-chip ${selectedCreatorId === c.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedCreatorId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="fs-gacha-pull-btn"
                onClick={handlePullGacha}
                disabled={pullingGacha || (missionData?.diamonds ?? 0) < 10}
              >
                <Sparkles size={16} />
                <span>{pullingGacha ? t.pulling : t.pullGachaBtn}</span>
              </button>
            </div>

            {/* Sub-mode switch: Missions vs Album */}
            <div className="fs-studio-chips" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <button
                type="button"
                className={`fs-studio-chip ${collectionSubTab === 'missions' ? 'is-active' : ''}`}
                onClick={() => setCollectionSubTab('missions')}
              >
                <MessageCircle size={13} />
                <span>{t.missionsTitle}</span>
              </button>
              <button
                type="button"
                className={`fs-studio-chip ${collectionSubTab === 'album' ? 'is-active' : ''}`}
                onClick={() => setCollectionSubTab('album')}
              >
                <Sparkles size={13} />
                <span>{t.collection} ({collectionCards.length})</span>
              </button>
            </div>

            {collectionSubTab === 'missions' && (
              missionData ? (
                <>
                  {/* Locked Missions */}
                  <h3 className="fs-mission-section-title">
                    {t.lockedMissions} ({missionData.missions.filter((m) => !m.unlocked).length})
                  </h3>

                  {missionData.missions.filter((m) => !m.unlocked).map((mission) => (
                    <div key={mission.id} className="fs-mission-card">
                      <div className="fs-mission-card-header">
                        <span className="fs-mission-card-title">{mission.name}</span>
                      </div>

                      <div className="fs-mission-card-preview">
                        <img
                          src={media(mission.asset) || mission.asset}
                          alt=""
                          className="fs-mission-card-img is-locked"
                        />
                        <div className="fs-mission-preview-badge">
                          <span className={`fs-rarity-badge rarity-${mission.rarity.toLowerCase()}`}>
                            {mission.rarity}
                          </span>
                        </div>
                        <div className="fs-mission-lock-overlay">
                          <div className="fs-mission-lock-circle">
                            <Lock size={20} />
                          </div>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="fs-mission-conditions-wrap">
                        <span className="fs-mission-cond-label">{t.missionsTitle}</span>

                        {mission.hint && (
                          <div className="fs-mission-cond-row">
                            <div className="fs-mission-cond-info">
                              <span className="fs-mission-cond-left">
                                <Sparkles size={13} className="text-purple-400" />
                                <span>{t.missionScenario}</span>
                              </span>
                              <span>0/1</span>
                            </div>
                            <span className="fs-mission-cond-hint">
                              {t.missionHint}: {mission.hint}
                            </span>
                          </div>
                        )}

                        {mission.conditions.map((cond, idx) => {
                          let fillClass = 'fill-turns';
                          let icon = <MessageCircle size={13} className="text-zinc-400" />;
                          let label = t.missionMessages;
                          if (cond.field === 'trust') {
                            fillClass = 'fill-trust';
                            icon = <Shield size={13} className="text-sky-400" />;
                            label = t.missionTrust;
                          } else if (cond.field === 'romance') {
                            fillClass = 'fill-romance';
                            icon = <Heart size={13} className="text-pink-400" />;
                            label = t.missionRomance;
                          } else if (cond.field === 'closeness') {
                            fillClass = 'fill-trust';
                            icon = <Sparkles size={13} className="text-indigo-400" />;
                            label = t.missionCloseness;
                          }
                          const pct = Math.max(0, Math.min(100, Math.round((cond.current / (cond.target || 1)) * 100)));

                          return (
                            <div key={idx} className="fs-mission-cond-row">
                              <div className="fs-mission-cond-info">
                                <span className="fs-mission-cond-left">
                                  {icon}
                                  <span>{label}</span>
                                </span>
                                <span>{cond.current}/{cond.target}</span>
                              </div>
                              <div className="fs-mission-progress-bg">
                                <div
                                  className={`fs-mission-progress-fill ${fillClass}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Unlocked Missions */}
                  <h3 className="fs-mission-section-title">
                    {t.unlockedMissions} ({missionData.missions.filter((m) => m.unlocked).length})
                  </h3>
                  {missionData.missions.filter((m) => m.unlocked).length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#71717a' }}>-</p>
                  ) : (
                    <div className="fs-studio-vault-grid">
                      {missionData.missions.filter((m) => m.unlocked).map((mission) => (
                        <div key={mission.id} className="fs-studio-vault-card">
                          <div className="fs-studio-vault-thumb">
                            <img src={media(mission.asset) || mission.asset} alt="" />
                            <div style={{ position: 'absolute', top: 6, left: 6 }}>
                              <span className={`fs-rarity-badge rarity-${mission.rarity.toLowerCase()}`}>
                                {mission.rarity}
                              </span>
                            </div>
                          </div>
                          <div className="fs-studio-vault-details">
                            <strong className="fs-studio-vault-name">{mission.name}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} />
                              <span>{t.unlockedMissions}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="fs-empty-state">
                  <div className="fs-empty-icon-circle">
                    <Sparkles size={28} />
                  </div>
                  <h2>{t.emptyCollectionTitle}</h2>
                  <p>{t.emptyCollectionDesc}</p>
                </div>
              )
            )}

            {collectionSubTab === 'album' && (
              collectionCards.length > 0 ? (
                <div className="fs-studio-vault-grid">
                  {collectionCards.map((card) => (
                    <div key={card.id} className="fs-studio-vault-card">
                      <div className="fs-studio-vault-thumb">
                        <img src={media(card.asset) || card.asset} alt="" />
                        <div style={{ position: 'absolute', top: 6, left: 6 }}>
                          <span className={`fs-rarity-badge rarity-${card.rarity.toLowerCase()}`}>
                            {card.rarity}
                          </span>
                        </div>
                      </div>
                      <div className="fs-studio-vault-details">
                        <strong className="fs-studio-vault-name">{card.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                          {card.creatorName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="fs-empty-state">
                  <div className="fs-empty-icon-circle">
                    <Sparkles size={28} />
                  </div>
                  <h2>{t.emptyCollectionTitle}</h2>
                  <p>{t.emptyCollectionDesc}</p>
                </div>
              )
            )}

            {/* Interactive Gacha Result Modal */}
            {gachaResult && (
              <div className="fs-gacha-modal-overlay" onClick={() => setGachaResult(null)}>
                <div className="fs-gacha-result-card" onClick={(e) => e.stopPropagation()}>
                  {gachaResult.wonCard && gachaResult.card ? (
                    <>
                      <span className={`fs-rarity-badge rarity-${gachaResult.card.rarity.toLowerCase()}`}>
                        {gachaResult.card.rarity}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fafafa', margin: 0 }}>
                        {t.gachaCardWon}
                      </h3>
                      <div className="fs-gacha-result-img-box">
                        <img
                          src={media(gachaResult.card.asset) || gachaResult.card.asset}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <strong style={{ fontSize: '1rem', color: '#f43f5e' }}>{gachaResult.card.name}</strong>
                      <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: 0 }}>{gachaResult.card.caption}</p>
                    </>
                  ) : (
                    <>
                      <div className="fs-gacha-energy-box">
                        <Zap size={40} />
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b', margin: 0 }}>
                        +{gachaResult.energyAwarded} {t.gachaEnergyWon}!
                      </h3>
                      <span className="fs-rarity-badge rarity-sr">
                        {gachaResult.isDuplicate ? t.gachaDuplicate : t.gachaEnergyWon}
                      </span>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4, margin: '4px 0' }}>
                        {t.gachaEnergyDesc}
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    className="fs-gacha-result-btn"
                    onClick={() => setGachaResult(null)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'following' && (
          followingCreators.length > 0 ? (
            <div className="fs-following-list">
              {followingCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="fs-following-item"
                  onClick={() => onViewProfile(creator)}
                >
                  <div className="fs-avatar">
                    {creator.avatarKey ? (
                      <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                    ) : (
                      creator.name.slice(0, 1)
                    )}
                  </div>
                  <div className="fs-following-info">
                    <div className="fs-following-name-row">
                      <strong>{creator.name}</strong>
                      <IgVerified size={13} className="fs-verified" />
                    </div>
                    <span className="fs-muted">{truncate(creator.bio, 36)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fs-empty-state">
              <div className="fs-empty-icon-circle">
                <Users size={28} />
              </div>
              <h2>{t.emptyFollowingTitle}</h2>
              <p>{t.emptyFollowingDesc}</p>
            </div>
          )
        )}
      </div>

      {/* Settings Card */}
      <section className="fs-card fs-account-settings">
        <h3 className="fs-settings-heading">{t.languageSetting}</h3>
        <div className="fs-account-lang">
          <LangSelect lang={lang} onChange={onSetLang} />
        </div>

        <div className="fs-settings-toggle-row">
          <div className="fs-settings-toggle-label">
            <Volume2 size={18} />
            <span>{t.settingsSound}</span>
          </div>
          <button
            type="button"
            className={`fs-toggle-btn ${soundEnabled ? 'is-active' : ''}`}
            onClick={handleToggleSound}
            aria-pressed={soundEnabled}
            aria-label={t.settingsSound}
          >
            <span className="fs-toggle-knob" />
          </button>
        </div>

        <div className="fs-settings-toggle-row">
          <div className="fs-settings-toggle-label">
            <Smartphone size={18} />
            <span>{t.settingsHaptics}</span>
          </div>
          <button
            type="button"
            className={`fs-toggle-btn ${hapticsEnabled ? 'is-active' : ''}`}
            onClick={handleToggleHaptics}
            aria-pressed={hapticsEnabled}
            aria-label={t.settingsHaptics}
          >
            <span className="fs-toggle-knob" />
          </button>
        </div>

        {onReportIssue && (
          <button
            type="button"
            className="fs-settings-report-btn"
            onClick={onReportIssue}
          >
            <LifeBuoy size={18} />
            <span>{t.reportIssue}</span>
          </button>
        )}

        <button
          type="button"
          className="fs-small"
          disabled={busy}
          onClick={onLogout}
        >
          {t.logout}
        </button>

        <hr className="fs-settings-divider" />

        <div className="fs-danger-zone">
          <h4>{t.deleteAccountTitle}</h4>
          <p className="fs-muted">{t.deleteAccountDesc}</p>
          <button
            type="button"
            className="fs-danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t.deleteAccountConfirm)) {
                onDeleteAccount();
              }
            }}
          >
            {t.deleteAccountBtn}
          </button>
        </div>
      </section>
    </div>
  );
}
