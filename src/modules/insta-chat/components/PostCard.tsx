import React, { useState } from 'react';
import { FeedPost, CharacterProfile } from '../types';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle2 } from 'lucide-react';

interface PostCardProps {
  post: FeedPost;
  profile?: CharacterProfile;
  onToggleLike: (postId: string) => void;
  onOpenChat: (characterId: string) => void;
  onAddComment: (postId: string, text: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  profile,
  onToggleLike,
  onOpenChat,
  onAddComment
}) => {
  const [commentInput, setCommentInput] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleDoubleTap = () => {
    if (!post.isLiked) {
      onToggleLike(post.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentInput.trim()) {
      onAddComment(post.id, commentInput);
      setCommentInput('');
    }
  };

  return (
    <article className="border-b border-zinc-800/80 bg-black max-w-lg mx-auto pb-4 select-none">
      {/* Post Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div 
          onClick={() => onOpenChat(post.characterId)}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            <img
              src={profile?.avatarUrl}
              alt=""
              className="w-full h-full object-cover rounded-full border border-black"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors">
                {profile?.username}
              </span>
              {profile?.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
              )}
            </div>
            {post.location && (
              <span className="text-[10px] text-zinc-400 block -mt-0.5">{post.location}</span>
            )}
          </div>
        </div>

        <button className="text-zinc-400 hover:text-white p-1">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Main Post Media (Webtoon 9:16 or Square) */}
      <div 
        className="relative aspect-[9/12] w-full bg-zinc-900 overflow-hidden cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={post.mediaUrl}
          alt={post.caption}
          className="w-full h-full object-cover"
        />

        {/* Floating Heart Animation on Double Tap */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-[ping_0.6s_ease-out]">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
          </div>
        )}
      </div>

      {/* Action Bar (Heart, Comment, Share DM, Bookmark) */}
      <div className="px-3 pt-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onToggleLike(post.id)}
            className="hover:opacity-75 transition-transform active:scale-125"
          >
            <Heart 
              className={`w-6 h-6 transition-colors ${
                post.isLiked ? 'text-red-500 fill-red-500' : 'text-zinc-200'
              }`} 
            />
          </button>

          <button 
            onClick={() => setShowComments(!showComments)}
            className="hover:opacity-75 text-zinc-200"
          >
            <MessageCircle className="w-6 h-6" />
          </button>

          <button 
            onClick={() => onOpenChat(post.characterId)}
            title="ส่งข้อความ DM หาตัวละครนี้"
            className="hover:opacity-75 text-zinc-200 hover:text-pink-400 transition-colors"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>

        <button className="text-zinc-200 hover:opacity-75">
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-3 pt-2">
        <span className="text-xs font-bold text-white">
          ถูกใจ {post.likesCount.toLocaleString()} คน
        </span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-1 text-xs text-zinc-200 leading-relaxed">
        <span className="font-bold mr-1.5 text-white">{profile?.username}</span>
        <span>{post.caption}</span>
      </div>

      {/* View Comments Toggle */}
      {post.commentsCount > 0 && (
        <div className="px-3 pt-1">
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-[11px] text-zinc-500 hover:text-zinc-400"
          >
            ดูความคิดเห็นทั้งหมด {post.commentsCount} รายการ
          </button>
        </div>
      )}

      {/* Comment List Expanded */}
      {showComments && (
        <div className="px-3 pt-2 space-y-1.5 border-t border-zinc-900 mt-2">
          {post.comments.map((c) => (
            <div key={c.id} className="text-xs flex items-start gap-1.5">
              <span className="font-bold text-zinc-300">{c.username}</span>
              <span className="text-zinc-300 flex-1">{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 pt-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{post.createdAt}</span>
      </div>

      {/* Quick Add Comment Box */}
      <form onSubmit={handleCommentSubmit} className="px-3 pt-2 flex items-center gap-2">
        <input
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="เพิ่มความคิดเห็น..."
          className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 border-none outline-none"
        />
        {commentInput.trim() && (
          <button type="submit" className="text-xs font-bold text-blue-500 hover:text-blue-400">
            โพสต์
          </button>
        )}
      </form>
    </article>
  );
};
