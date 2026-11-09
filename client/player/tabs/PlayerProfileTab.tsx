import { useState } from 'react';
import { type User, type Creator, type Post } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { getAvatarSrc, media, AvatarImg } from '../ui';
import { LangSelect } from '../LangSelect';
import { Bookmark, Sparkles, User as UserIcon, Users, Volume2, Smartphone } from 'lucide-react';
import { IgVerified } from '../InstagramIcons';

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
          <div className="fs-empty-state">
            <div className="fs-empty-icon-circle">
              <Sparkles size={28} />
            </div>
            <h2>{t.emptyCollectionTitle}</h2>
            <p>{t.emptyCollectionDesc}</p>
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
                  <div className="fs-avatar fs-avatar-md">
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
                    <span className="fs-muted">{creator.bio?.slice(0, 36)}</span>
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
