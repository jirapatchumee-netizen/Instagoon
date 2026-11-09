import { type Creator } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media, AvatarImg } from '../ui';
import { IgVerified } from '../InstagramIcons';

interface ExploreTabProps {
  creators: Creator[];
  lang: Lang;
  busy: boolean;
  onOpenProfile: (creator: Creator) => void;
  onOpenChat: (creator: Creator) => void;
  onToggleFollow: (creator: Creator) => void;
}

export function ExploreTab({
  creators,
  lang,
  busy,
  onOpenProfile,
  onOpenChat,
  onToggleFollow,
}: ExploreTabProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="fs-section-pad">
      <div className="fs-section-heading">
        <div>
          <h1>{t.suggestedForYou}</h1>
        </div>
        <span className="fs-muted">{t.charactersCount(creators.length)}</span>
      </div>

      <div className="fs-creator-list">
        {creators.map((creator) => (
          <article
            className="fs-creator-dm-row"
            key={creator.id}
            onClick={() => void onOpenProfile(creator)}
          >
            <div className="fs-creator-avatar-wrap">
              <div className="fs-avatar fs-avatar-large">
                {creator.avatarKey ? (
                  <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
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
                  <span className="fs-top-fan-pill" title={t.topFanTitle}>
                    {t.topFanBadge}
                  </span>
                ) : (
                  <span className="fs-rel-pill">
                    {creator.relationship}/100
                  </span>
                )}
              </div>
              <p>{creator.bio || t.suggestedSubtitle}</p>
            </div>

            <div className="fs-creator-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`fs-follow-btn ${creator.following ? 'is-following' : 'is-follow'}`}
                disabled={busy}
                onClick={() => void onToggleFollow(creator)}
              >
                {creator.following ? t.following : t.follow}
              </button>
              {creator.following && (
                <button
                  type="button"
                  className="fs-dm-pill-btn"
                  disabled={busy}
                  onClick={() => void onOpenChat(creator)}
                  title={t.openDM}
                >
                  {t.openDM}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
