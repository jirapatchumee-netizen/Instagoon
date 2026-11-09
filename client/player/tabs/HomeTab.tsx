import { type FormEvent } from 'react';
import { type Post, type Creator, type Story, type User } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media, Media, PRESET_AVATARS, getAvatarSrc } from '../ui';
import { IgHeart, IgComment, IgShare, IgBookmark, IgMore, IgVerified, IgAudio, IgSearch } from '../InstagramIcons';

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
  onLikePost,
  onToggleSave,
  onCommentChange,
  onCommentSubmit,
  onOpenPostMenu,
  onGoToExplore,
}: HomeTabProps) {
  const t = TRANSLATIONS[lang];

  const getCreator = (id: string) => creators.find((c) => c.id === id);

  return (
    <div className="fs-home-tab">
      {/* Instagram Stories Row with Exact Gradient Ring */}
      <section className="fs-stories-bar" aria-label="Stories">
        {stories.map((story) => {
          const creator = getCreator(story.creatorId);
          const name = creator?.name ?? 'Creator';
          const isUnlockable = story.type === 'unlockable';
          const isViewed = !!story.firstViewedAt;
          return (
            <button
              key={story.id}
              className="fs-story-item"
              onClick={() => onOpenStory(story)}
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
          .filter((c) => c.following && !stories.some((s) => s.creatorId === c.id))
          .map((creator) => (
            <button
              key={`creator-ring-${creator.id}`}
              className="fs-story-item"
              onClick={() => void onOpenChat(creator)}
            >
              <span className="fs-story-ring fs-story-unviewed">
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

      {/* Empty Feed State */}
      {posts.length === 0 && (
        <div className="fs-empty-feed">
          <div className="fs-empty-feed-icon">
            <IgSearch size={36} />
          </div>
          <h3>{t.emptyFeedTitle}</h3>
          <p>{t.emptyFeedDesc}</p>
          <button
            type="button"
            className="fs-empty-feed-btn"
            onClick={onGoToExplore}
          >
            {t.exploreCreators}
          </button>
        </div>
      )}

      {/* Instagram Authentic Post Feed */}
      <div className="fs-posts">
        {posts.map((post) => {
          const creator = getCreator(post.creatorId);
          const isLiked = !!likedPostIds[post.id] || post.likes > 0;
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
                        <img src={media(creator.avatarKey)} alt={post.creatorName} />
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
                        <span className="fs-top-fan-pill" title="💎 แฟนตัวยง">
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
                    aria-label="Share"
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

                {/* Comment Input */}
                <form
                  className="fs-comment-input-form"
                  onSubmit={(e) => onCommentSubmit(post, e)}
                >
                  <input
                    id={`comment-input-${post.id}`}
                    type="text"
                    className="fs-comment-input"
                    placeholder={t.commentPlaceholder}
                    value={comments[post.id] || ''}
                    onChange={(e) => onCommentChange(post.id, e.target.value)}
                  />
                  <button
                    type="submit"
                    className="fs-comment-post-btn"
                    disabled={busy || !(comments[post.id] || '').trim()}
                  >
                    {t.postBtn}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
