import { type FormEvent } from 'react';
import { type Post, type Creator, type Story, type User } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media, AvatarImg, Media, PRESET_AVATARS, getAvatarSrc } from '../ui';
import { IgHeart, IgComment, IgShare, IgBookmark, IgMore, IgVerified, IgAudio } from '../InstagramIcons';

interface HomeTabProps {
  posts: Post[];
  stories: Story[];
  creators: Creator[];
  user: User;
  likedPostIds: Record<string, boolean>;
  savedPostIds: Record<string, boolean>;
  heartBurstPostId: string | null;
  comments: Record<string, string>;
  busy: boolean;
  lang: Lang;
  onOpenStory: (story: Story) => void;
  onOpenProfile: (creator: Creator) => void;
  onOpenChat: (creator: Creator) => void;
  onToggleFollow: (creator: Creator) => void;
  onLikePost: (postId: string, fromDoubleTap?: boolean) => void;
  onToggleSave: (postId: string) => void;
  onCommentChange: (postId: string, value: string) => void;
  onCommentSubmit: (post: Post, e: FormEvent<HTMLFormElement>) => void;
  onOpenPostMenu: (post: Post, creator: Creator) => void;
  onGoToExplore: () => void;
}

export function HomeTab({
  posts,
  stories,
  creators,
  user,
  likedPostIds,
  savedPostIds,
  heartBurstPostId,
  comments,
  busy,
  lang,
  onOpenStory,
  onOpenProfile,
  onOpenChat,
  onToggleFollow,
  onLikePost,
  onToggleSave,
  onCommentChange,
  onCommentSubmit,
  onOpenPostMenu,
  onGoToExplore,
}: HomeTabProps) {
  const t = TRANSLATIONS[lang];

  const getCreator = (id: string) => creators.find((c) => c.id === id);

  const hasFollowing = creators.some((c) => c.following);
  const storyCreatorIds = new Set(stories.map((s) => s.creatorId));
  const storyGroups: { creatorId: string; items: Story[] }[] = [];
  for (const story of stories) {
    const group = storyGroups.find((g) => g.creatorId === story.creatorId);
    if (group) group.items.push(story);
    else storyGroups.push({ creatorId: story.creatorId, items: [story] });
  }
  const barCreators = hasFollowing
    ? creators.filter((c) => c.following && !storyCreatorIds.has(c.id))
    : creators.filter((c) => !storyCreatorIds.has(c.id));

  return (
    <div className="fs-home-tab">
      {/* Instagram Stories Row with Exact Gradient Ring */}
      <section className="fs-stories-bar" aria-label="Stories">
        {storyGroups.map(({ creatorId, items }) => {
          const creator = getCreator(creatorId);
          const name = creator?.name ?? 'Creator';
          // One ring per creator, like Instagram. A tap opens the first story not yet seen, else the newest.
          const next = items.find((s) => !s.firstViewedAt);
          const target = next ?? items[items.length - 1];
          return (
            <button
              key={`story-${creatorId}`}
              className="fs-story-item"
              aria-label={t.storyOf(name)}
              onClick={() => onOpenStory(target)}
            >
              <span
                className={`fs-story-ring ${
                  !next ? 'fs-story-viewed' : next.type === 'unlockable' ? 'fs-story-unlock' : 'fs-story-unviewed'
                }`}
              >
                <span className="fs-story-ring-inner">
                  {creator?.avatarKey ? (
                    <AvatarImg src={media(creator.avatarKey)} name={creator.name} alt="" />
                  ) : (
                    name.slice(0, 1)
                  )}
                </span>
              </span>
              <span className="fs-story-name">{name}</span>
            </button>
          );
        })}

        {barCreators.map((creator) => (
          <button
            key={`creator-ring-${creator.id}`}
            className="fs-story-item"
            onClick={() => void onOpenProfile(creator)}
            title={creator.name}
          >
            <span className="fs-story-ring fs-story-unviewed">
              <span className="fs-story-ring-inner">
                {creator.avatarKey ? (
                  <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                ) : (
                  creator.name.slice(0, 1)
                )}
              </span>
            </span>
            <span className="fs-story-name">{creator.name}</span>
          </button>
        ))}
      </section>

      {/* Empty Feed State / Suggested for You (Instagram Style) */}
      {posts.length === 0 && (
        <section className="fs-suggested-section" aria-label={t.suggestedForYou}>
          <div className="fs-suggested-header">
            <h2 className="fs-suggested-title">{t.suggestedForYou}</h2>
          </div>
          <div className="fs-suggested-list">
            {creators.map((creator) => (
              <article key={creator.id} className="fs-suggested-item">
                <div
                  className="fs-suggested-user-click"
                  onClick={() => onOpenProfile(creator)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenProfile(creator);
                    }
                  }}
                >
                  <div className="fs-suggested-avatar">
                    {creator.avatarKey ? (
                      <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                    ) : (
                      creator.name.slice(0, 1)
                    )}
                  </div>
                  <div className="fs-suggested-meta">
                    <div className="fs-suggested-name-row">
                      <span className="fs-suggested-handle">{creator.id.replace('-', '.')}</span>
                      <IgVerified size={13} className="fs-verified" />
                    </div>
                    <span className="fs-suggested-fullname">{creator.name}</span>
                    <span className="fs-suggested-reason">{t.suggestedSubtitle}</span>
                  </div>
                </div>
                <div className="fs-suggested-action">
                  <button
                    type="button"
                    className={`fs-follow-btn ${creator.following ? 'is-following' : 'is-follow'}`}
                    disabled={busy}
                    onClick={() => void onToggleFollow(creator)}
                  >
                    {creator.following ? t.following : t.follow}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="fs-suggested-footer">
            <button
              type="button"
              className="fs-suggested-explore-btn"
              onClick={onGoToExplore}
            >
              {t.exploreCreators}
            </button>
          </div>
        </section>
      )}

      {/* Instagram Authentic Post Feed */}
      <div className="fs-posts">
        {posts.map((post) => {
          const creator = getCreator(post.creatorId);
          const isLiked = !!likedPostIds[post.id];
          const isSaved = !!savedPostIds[post.id];
          const totalLikes = post.likes + post.simulatedLikes;

          // Fan Crowd avatars (Decision 19: 2-3 overlapping circles)
          const fanAvatars = isLiked
            ? [
                getAvatarSrc(user.avatarId) || PRESET_AVATARS[0].src,
                PRESET_AVATARS[1].src,
                PRESET_AVATARS[3].src,
              ]
            : [PRESET_AVATARS[1].src, PRESET_AVATARS[3].src, PRESET_AVATARS[4].src];

          return (
            <article className="fs-insta-post" key={post.id}>
              {/* Post Header */}
              <div className="fs-post-header">
                <div
                  className="fs-post-author"
                  onClick={() => {
                    if (creator) void onOpenProfile(creator);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && creator) void onOpenProfile(creator);
                  }}
                >
                  <div className="fs-avatar-ring">
                    <div className="fs-avatar">
                      {creator?.avatarKey ? (
                        <AvatarImg src={media(creator.avatarKey)} name={creator.name} alt={post.creatorName} />
                      ) : (
                        post.creatorName.slice(0, 1)
                      )}
                    </div>
                  </div>
                  <div className="fs-post-author-info">
                    <div className="fs-author-title">
                      <span className="fs-author-name">{post.creatorName}</span>
                      <IgVerified size={13} className="fs-verified" />
                      {creator && creator.relationship >= 100 && (
                        <span className="fs-top-fan-pill" title={t.topFanTitle}>
                          {t.topFanBadge}
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
                      if (creator) onOpenPostMenu(post, creator);
                    }}
                  >
                    <IgMore size={20} />
                  </button>
                </div>
              </div>

              {/* Media Frame with Double-Tap Heart */}
              <div
                className={`fs-post-media-frame ${
                  post.mediaKey ? '' : 'fs-post-media-quote'
                }`}
                onDoubleClick={() => void onLikePost(post.id, true)}
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

                {heartBurstPostId === post.id && (
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
                    onClick={() => void onLikePost(post.id)}
                  >
                    <IgHeart size={24} filled={isLiked} />
                  </button>

                  <button
                    type="button"
                    className="fs-action-icon-btn"
                    aria-label="Comment"
                    onClick={() => {
                      const input = document.getElementById(`comment-input-${post.id}`);
                      input?.focus();
                    }}
                  >
                    <IgComment size={24} />
                  </button>

                  <button
                    type="button"
                    className="fs-action-icon-btn"
                    aria-label={t.postMenuMessage(creator?.name ?? post.creatorName)}
                    title={t.postMenuMessage(creator?.name ?? post.creatorName)}
                    onClick={() => {
                      if (creator) void onOpenChat(creator);
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
                    aria-pressed={isSaved}
                    onClick={() => onToggleSave(post.id)}
                  >
                    <IgBookmark size={24} filled={isSaved} />
                  </button>
                </div>
              </div>

              {/* Post Body: Liked-By Fan Crowd Row + Caption + Comments */}
              <div className="fs-post-body">
                {totalLikes > 0 && (
                  <div className="fs-liked-by-row">
                    <div className="fs-liked-by-stack">
                      {fanAvatars.slice(0, 3).map((src, i) => (
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
                        ? t.likedByOthers(t.likedByYou, Math.max(0, totalLikes - 1))
                        : t.likedByOthers(creator?.name || 'fan', Math.max(0, totalLikes - 1))}
                    </span>
                  </div>
                )}

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
                      if (creator) void onOpenChat(creator);
                    }}
                  >
                    {t.viewAllComments(post.comments.length)}
                  </button>
                )}

                {/* Comments Preview */}
                {post.comments.length > 0 && (
                  <div className="fs-comments-preview-list">
                    {post.comments.slice(-2).map((comment) => (
                      <div className="fs-comment-preview-item" key={comment.id}>
                        <strong className="fs-comment-author">
                          {comment.own ? t.you : post.creatorName}
                        </strong>
                        <span className="fs-comment-content">{comment.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Authentic Instagram Comment Input */}
                <form
                  className="fs-comment-input-row"
                  onSubmit={(e) => onCommentSubmit(post, e)}
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
                      id={`comment-input-${post.id}`}
                      type="text"
                      className="fs-comment-input-field"
                      placeholder={t.commentPlaceholder}
                      value={comments[post.id] || ''}
                      onChange={(e) => onCommentChange(post.id, e.target.value)}
                    />
                    {(comments[post.id] || '').trim() ? (
                      <button
                        type="submit"
                        className="fs-comment-submit-btn"
                        disabled={busy}
                      >
                        {t.postBtn}
                      </button>
                    ) : (
                      <div className="fs-comment-quick-emojis">
                        {['❤️', '🙌', '🔥'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="fs-quick-emoji-btn"
                            onClick={() => onCommentChange(post.id, (comments[post.id] || '') + emoji)}
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
          );
        })}
      </div>
    </div>
  );
}
