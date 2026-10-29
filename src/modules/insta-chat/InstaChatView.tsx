import React, { useState, useEffect } from 'react';
import { instaStore } from './InstaStore';
import { InstaHeader } from './components/InstaHeader';
import { StoryBar } from './components/StoryBar';
import { PostCard } from './components/PostCard';
import { DirectMessageModal } from './components/DirectMessageModal';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const InstaChatView: React.FC = () => {
  const [, setTick] = useState(0);
  const [isDMListOpen, setIsDMListOpen] = useState(false);

  useEffect(() => {
    const unsub = instaStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const profiles = instaStore.getProfiles();
  const stories = instaStore.getStories();
  const posts = instaStore.getPosts();
  const unreadTotal = instaStore.getTotalUnreadCount();
  const activeCharId = instaStore.getActiveCharacterId();
  const activeCharacter = activeCharId ? instaStore.getProfile(activeCharId) : null;
  const activeThread = activeCharId ? instaStore.getThread(activeCharId) : null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
      {/* Top Header */}
      <InstaHeader
        unreadCount={unreadTotal}
        onOpenDM={() => setIsDMListOpen(true)}
        onGoHome={() => {
          setIsDMListOpen(false);
          instaStore.setActiveCharacterId(null);
        }}
      />

      {/* Main Feed Container */}
      <main className="flex-1 w-full max-w-lg mx-auto bg-black border-x border-zinc-900 pb-20">
        {/* Stories Horizontal Row */}
        <StoryBar
          stories={stories}
          profiles={profiles}
          onViewStory={(id) => instaStore.viewStory(id)}
          onOpenChat={(charId) => instaStore.setActiveCharacterId(charId)}
        />

        {/* Feed Posts List */}
        <div className="divide-y divide-zinc-900 pt-2">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              profile={profiles[post.characterId]}
              onToggleLike={(id) => instaStore.toggleLike(id)}
              onOpenChat={(charId) => instaStore.setActiveCharacterId(charId)}
              onAddComment={(id, text) => instaStore.addComment(id, text)}
            />
          ))}
        </div>
      </main>

      {/* Direct Messages List Drawer/Modal */}
      {isDMListOpen && !activeCharId && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col md:max-w-md md:mx-auto md:border-x md:border-zinc-800 shadow-2xl">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDMListOpen(false)}
                className="p-1 text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-base font-bold">กล่องข้อความ (Direct)</h2>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {Object.keys(profiles).length} ตัวละคร
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {Object.values(profiles).map((profile) => {
              const thread = instaStore.getThread(profile.id);
              const lastMsg = thread.messages[thread.messages.length - 1];

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    setIsDMListOpen(false);
                    instaStore.setActiveCharacterId(profile.id);
                  }}
                  className="p-3.5 flex items-center gap-3 hover:bg-zinc-900/70 transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={profile.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {profile.displayName}
                        </span>
                        {profile.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">{thread.lastMessageAt}</span>
                    </div>

                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : 'เริ่มการสนทนาใหม่...'}
                    </p>
                  </div>

                  {thread.unreadCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Direct Message Active Chat Screen */}
      {activeCharacter && activeThread && (
        <DirectMessageModal
          character={activeCharacter}
          thread={activeThread}
          onClose={() => instaStore.setActiveCharacterId(null)}
          onSendMessage={(charId, text) => instaStore.sendMessage(charId, text)}
        />
      )}
    </div>
  );
};
