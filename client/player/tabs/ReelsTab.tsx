import { useState, useMemo } from 'react';
import { type Story, type Creator } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media, AvatarImg, StoryContent } from '../ui';
import { IgHeart, IgComment, IgShare, IgVerified } from '../InstagramIcons';
import { Film, Sparkles } from 'lucide-react';

interface ReelsTabProps {
  stories: Story[];
  creators: Creator[];
  lang: Lang;
  onOpenStory: (story: Story) => void;
  onOpenChat: (creator: Creator) => void;
  onViewProfile: (creator: Creator) => void;
}

export function ReelsTab({
  stories,
  creators,
  lang,
  onOpenStory,
  onOpenChat,
  onViewProfile,
}: ReelsTabProps) {
  const t = TRANSLATIONS[lang];
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedReelIds, setLikedReelIds] = useState<Record<string, boolean>>({});

  // Decision 12: Order Reels — unviewed first -> Close Friends ring first -> viewed last
  const sortedStories = useMemo(() => {
    return [...stories].sort((a, b) => {
      const aViewed = Boolean(a.firstViewedAt);
      const bViewed = Boolean(b.firstViewedAt);
      if (aViewed !== bViewed) return aViewed ? 1 : -1;

      const aCreator = creators.find((c) => c.id === a.creatorId);
      const bCreator = creators.find((c) => c.id === b.creatorId);
      const aRel = aCreator?.relationship ?? 0;
      const bRel = bCreator?.relationship ?? 0;
      if (aRel !== bRel) return bRel - aRel;

      return b.publishedAt - a.publishedAt;
    });
  }, [stories, creators]);

  if (sortedStories.length === 0) {
    return (
      <div className="fs-reels-tab">
        <div className="fs-empty-state">
          <div className="fs-empty-icon-circle">
            <Film size={32} />
          </div>
          <h2>{t.emptyReelsTitle}</h2>
          <p>{t.emptyReelsDesc}</p>
        </div>
      </div>
    );
  }

  const currentStory = sortedStories[activeIndex] || sortedStories[0];
  const creator = creators.find((c) => c.id === currentStory.creatorId);
  const isLiked = Boolean(likedReelIds[currentStory.id]);
  const isCloseFriends = (creator?.relationship ?? 0) >= 1;

  const handleNext = () => {
    if (activeIndex < sortedStories.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const toggleLike = () => {
    setLikedReelIds((prev) => ({
      ...prev,
      [currentStory.id]: !prev[currentStory.id],
    }));
  };

  return (
    <div className="fs-reels-tab">
      <div className="fs-reels-container">
        {/* Story / Reel Content */}
        <div className="fs-reels-viewport">
          {currentStory.type === 'unlockable' && !currentStory.firstViewedAt ? (
            // An Exclusive Story starts its 24h clock only when the player chooses to open it, and the
            // server does not release its picture before that, so show the same gate as the story viewer.
            <div className="fs-story-unlock-gate fs-reels-unlock-gate">
              <Sparkles size={36} className="fs-unlock-icon" />
              <p>{t.unlockableGateDesc}</p>
              <button type="button" className="fs-primary" onClick={() => onOpenStory(currentStory)}>
                {t.openStoryBtn}
              </button>
            </div>
          ) : (
            <StoryContent
              story={currentStory}
              name={creator?.name ?? 'Creator'}
              lang={lang}
            />
          )}

          {/* Tap Zones for Next / Prev */}
          <div
            className="fs-reels-tap-left"
            onClick={handlePrev}
            aria-label="Previous Reel"
          />
          <div
            className="fs-reels-tap-right"
            onClick={handleNext}
            aria-label="Next Reel"
          />

          {/* Top Progress Indicators */}
          <div className="fs-reels-progress-bar-row">
            {sortedStories.map((s, idx) => (
              <div
                key={s.id}
                className={`fs-reels-progress-segment ${
                  idx === activeIndex
                    ? 'is-active'
                    : idx < activeIndex
                    ? 'is-completed'
                    : ''
                }`}
              />
            ))}
          </div>

          {/* Overlay Info (Bottom Left) */}
          <div className="fs-reels-info-overlay">
            <div
              className="fs-reels-creator-row"
              onClick={() => creator && onViewProfile(creator)}
            >
              <div className={`fs-avatar-ring ${isCloseFriends ? 'is-close-friends' : ''}`}>
                <div className="fs-avatar fs-avatar-sm">
                  {creator?.avatarKey ? (
                    <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                  ) : (
                    creator?.name.slice(0, 1) ?? 'C'
                  )}
                </div>
              </div>
              <span className="fs-reels-creator-name">{creator?.name}</span>
              <IgVerified size={14} className="fs-verified" />
            </div>

            <p className="fs-reels-caption">
              {currentStory.type === 'unlockable' ? t.exclusiveStory : t.broadcastStory}
            </p>
          </div>

          {/* Right Action Rail */}
          <div className="fs-reels-action-rail">
            <button
              type="button"
              className="fs-reels-action-btn"
              onClick={toggleLike}
              aria-label="Like"
            >
              <IgHeart size={28} filled={isLiked} />
              <span className="fs-reels-action-count">{isLiked ? '1' : '0'}</span>
            </button>

            <button
              type="button"
              className="fs-reels-action-btn"
              onClick={() => onOpenStory(currentStory)}
              aria-label="Comment / Reply"
            >
              <IgComment size={26} />
              <span className="fs-reels-action-count">💬</span>
            </button>

            <button
              type="button"
              className="fs-reels-action-btn"
              onClick={() => creator && onOpenChat(creator)}
              aria-label="Share / DM"
            >
              <IgShare size={26} />
              <span className="fs-reels-action-count">✈️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
