import React, { useState } from 'react';
import { StoryCircle, CharacterProfile } from '../types';
import { X, Sparkles } from 'lucide-react';

interface StoryBarProps {
  stories: StoryCircle[];
  profiles: Record<string, CharacterProfile>;
  onViewStory: (storyId: string) => void;
  onOpenChat: (characterId: string) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ stories, profiles, onViewStory, onOpenChat }) => {
  const [activeStory, setActiveStory] = useState<StoryCircle | null>(null);

  const handleOpenStory = (story: StoryCircle) => {
    onViewStory(story.id);
    setActiveStory(story);
  };

  return (
    <>
      {/* Story Carousel Bar */}
      <div className="bg-black border-b border-zinc-800/80 px-3 py-3 overflow-x-auto no-scrollbar flex items-center gap-3.5 select-none">
        {/* Your Story placeholder */}
        <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
          <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-zinc-600 flex items-center justify-center group-hover:border-zinc-400 transition-colors">
            <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-300 font-bold">
              คุณ
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold border-2 border-black">
              +
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 max-w-[64px] truncate">เรื่องราวของคุณ</span>
        </div>

        {/* Character Stories */}
        {stories.map((story) => {
          const profile = profiles[story.characterId];
          if (!profile) return null;

          return (
            <div
              key={story.id}
              onClick={() => handleOpenStory(story)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
            >
              {/* Gradient Story Ring */}
              <div
                className={`w-16 h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                  story.isViewed
                    ? 'border-2 border-zinc-700'
                    : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black p-0.5">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <span className="text-[11px] text-zinc-200 max-w-[68px] truncate font-medium">
                {profile.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Story Viewer Modal */}
      {activeStory && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 md:p-6"
          onClick={() => setActiveStory(null)}
        >
          <div 
            className="relative w-full max-w-sm aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Progress Bar & Header */}
            <div className="absolute top-0 inset-x-0 p-3 z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white animate-[pulse_2s_infinite]" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <img
                    src={profiles[activeStory.characterId]?.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/50"
                  />
                  <div>
                    <span className="text-xs font-bold block">{profiles[activeStory.characterId]?.displayName}</span>
                    <span className="text-[10px] text-zinc-300">{activeStory.postedAt}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveStory(null)} 
                  className="p-1 rounded-full bg-black/40 text-white hover:bg-black/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Story Media (Webtoon/Portrait 9:16) */}
            <img
              src={activeStory.mediaUrl}
              alt=""
              className="w-full h-full object-cover"
            />

            {/* Bottom Caption & Reply Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2">
              {activeStory.caption && (
                <p className="text-sm text-white font-medium drop-shadow-md">
                  {activeStory.caption}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => {
                    setActiveStory(null);
                    onOpenChat(activeStory.characterId);
                  }}
                  className="flex-1 py-2 px-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold text-left transition-colors flex items-center justify-between"
                >
                  <span>ส่งข้อความตอบกลับสตอรี่นี้...</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
