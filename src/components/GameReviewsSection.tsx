import React, { useState } from 'react';
import { GameReview, ReviewVerdict } from '@/schema/platformTypes';
import { platformStore } from '@/services/platformStore';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  Clock,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';

interface GameReviewsSectionProps {
  gameId: string;
}

export const GameReviewsSection: React.FC<GameReviewsSectionProps> = ({ gameId }) => {
  const [reviews, setReviews] = useState<GameReview[]>(platformStore.getReviews(gameId));
  const [isWriting, setIsWriting] = useState(false);
  const [verdict, setVerdict] = useState<ReviewVerdict>('recommended');
  const [ratingStars, setRatingStars] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const currentUser = platformStore.getCurrentUser();
  const currentEntitlement = platformStore.getEntitlement(currentUser.id, gameId);

  const totalReviews = reviews.length;
  const positiveCount = reviews.filter((r) => r.verdict === 'recommended').length;
  const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 100;

  let steamVerdictGrade = 'แง่บวกเป็นอย่างยิ่ง (Overwhelmingly Positive)';
  let verdictColorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  if (positivePercentage < 50) {
    steamVerdictGrade = 'แง่ลบ (Mostly Negative)';
    verdictColorClass = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  } else if (positivePercentage < 80) {
    steamVerdictGrade = 'ผสมผสาน (Mixed)';
    verdictColorClass = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  }

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    platformStore.addReview({
      gameId,
      author: currentUser,
      verdict,
      ratingStars,
      title: title.trim(),
      content: content.trim(),
      isSpoiler,
      isFullBundleOwner: currentEntitlement.isFullBundleOwner,
      isFriendPassBorrower: Boolean(currentEntitlement.friendPassFromOwnerId),
      playtimeSeconds: currentEntitlement.totalPlaytimeSeconds || 3600,
      episodesCompleted: currentEntitlement.unlockedEpisodes.length,
    });

    setReviews(platformStore.getReviews(gameId));
    setIsWriting(false);
    setTitle('');
    setContent('');
  };

  const handleVoteHelpful = (reviewId: string) => {
    platformStore.voteReviewHelpful(reviewId);
    setReviews(platformStore.getReviews(gameId));
  };

  const handleAddComment = (reviewId: string) => {
    const text = commentInputs[reviewId]?.trim();
    if (!text) return;

    platformStore.addReviewComment(reviewId, text);
    setCommentInputs({ ...commentInputs, [reviewId]: '' });
    setReviews(platformStore.getReviews(gameId));
  };

  return (
    <div className="space-y-6 pt-6 border-t border-white/10">
      {/* Steam-Style Overall Rating Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              บทวิจารณ์โดยรวม (Steam-Style Verdict)
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${verdictColorClass}`}>
              {steamVerdictGrade}
            </span>
            <span className="text-xs text-zinc-300">
              {positivePercentage}% จาก {totalReviews} บทวิจารณ์
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsWriting(!isWriting)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isWriting ? 'ยกเลิก' : '✍️ เขียนบทวิจารณ์ของคุณ'}</span>
        </button>
      </div>

      {/* Review Composer */}
      {isWriting && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 rounded-2xl bg-zinc-900 border border-indigo-500/30 space-y-4 animate-in fade-in duration-200"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>เขียนบทวิจารณ์ในนาม:</span>
            <span className="text-indigo-400 font-normal">{currentUser.displayName}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Verdict Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                คุณจะแนะนำเกมนี้หรือไม่?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerdict('recommended')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                    verdict === 'recommended'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>แนะนำ (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVerdict('not_recommended')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border ${
                    verdict === 'not_recommended'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>ไม่แนะนำ</span>
                </button>
              </div>
            </div>

            {/* Stars */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                ระดับคะแนนความชอบ (1 - 5 ดาว)
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">หัวข้อบทวิจารณ์</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="สรุปความประทับใจสั้นๆ..."
              required
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">เนื้อหาบทวิจารณ์</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="บอกเล่าความรู้สึก ประสบการณ์ดำเนินเรื่อง หรือจุดเด่นของเกม..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-white">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded border-zinc-700 text-indigo-600 focus:ring-0"
              />
              <span>⚠️ มีเนื้อหาสปอยล์ (ซ่อนข้อความจนกว่าจะคลิกดู)</span>
            </label>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              โพสต์บทวิจารณ์
            </button>
          </div>
        </form>
      )}

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map((r) => {
          const isSpoilerRevealed = revealedSpoilers[r.id];
          const hoursPlayed = (r.playtimeSeconds / 3600).toFixed(1);

          return (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 hover:border-white/20 transition-all"
            >
              {/* Header Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={r.author.avatar}
                    alt={r.author.displayName}
                    className="w-8 h-8 rounded-full object-cover border border-white/15"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{r.author.displayName}</span>
                      {r.isFullBundleOwner && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                          👑 ซื้อครบทุกตอน (Full Bundle)
                        </span>
                      )}
                      {r.isFriendPassBorrower && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                          🎟️ เล่นผ่าน Friend Pass
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>เล่นแล้ว {hoursPlayed} ชม.</span>
                      </span>
                      <span>•</span>
                      <span>ผ่าน {r.episodesCompleted} ตอน</span>
                    </div>
                  </div>
                </div>

                {/* Verdict Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                      r.verdict === 'recommended'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {r.verdict === 'recommended' ? (
                      <ThumbsUp className="w-3.5 h-3.5" />
                    ) : (
                      <ThumbsDown className="w-3.5 h-3.5" />
                    )}
                    <span>{r.verdict === 'recommended' ? 'แนะนำ' : 'ไม่แนะนำ'}</span>
                  </span>
                </div>
              </div>

              {/* Review Body */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-zinc-100">{r.title}</h4>

                {r.isSpoiler && !isSpoilerRevealed ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs text-amber-300">⚠️ บทวิจารณ์นี้ระบุว่ามีเนื้อหาสปอยล์</span>
                    <button
                      onClick={() => setRevealedSpoilers({ ...revealedSpoilers, [r.id]: true })}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:underline font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>แสดงเนื้อหา</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                )}
              </div>

              {/* Footer: Helpful voting & comments */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                <div className="flex items-center gap-3">
                  <span>รีวิวนี้มีประโยชน์หรือไม่?</span>
                  <button
                    onClick={() => handleVoteHelpful(r.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ใช่ ({r.helpfulCount})</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Nested Comments Under Review */}
              {r.comments.length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-white/10 space-y-2 pt-2">
                  {r.comments.map((c) => (
                    <div key={c.id} className="text-xs bg-white/5 p-2.5 rounded-xl">
                      <span className="font-bold text-indigo-300 mr-2">{c.author.displayName}:</span>
                      <span className="text-zinc-200">{c.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Reply Form */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={commentInputs[r.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [r.id]: e.target.value })}
                  placeholder="ตอบกลับหรือแลกเปลี่ยนความคิดเห็น..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleAddComment(r.id)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors"
                  title="ส่งข้อความตอบกลับ"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
