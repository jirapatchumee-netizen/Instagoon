import React, { useState, useEffect, useRef } from 'react';
import { platformStore } from '@/services/platformStore';
import { ChatMessage, UserProfile } from '@/schema/platformTypes';
import {
  Globe,
  Users,
  MessageCircle,
  Send,
  X,
  Share2,
  Gift,
  Sparkles,
} from 'lucide-react';

interface SocialDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame?: (gameId: string) => void;
}

export const SocialDrawer: React.FC<SocialDrawerProps> = ({
  isOpen,
  onClose,
  onLaunchGame,
}) => {
  const [activeTab, setActiveTab] = useState<'world' | 'friends' | 'groups'>('world');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile>(platformStore.getCurrentUser());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = platformStore.subscribe(() => {
      setCurrentUser(platformStore.getCurrentUser());
    });
    return () => {
      unsub();
    };
  }, []);

  const friends = platformStore.getFriendsForCurrent();
  const groups = platformStore.getGroups();

  const currentChannelId =
    activeTab === 'world'
      ? 'world'
      : activeTab === 'friends'
      ? selectedFriendId || friends[0]?.friendId || ''
      : groups[0]?.id || '';

  const messages: ChatMessage[] = platformStore.getMessages(
    activeTab === 'world' ? 'world' : activeTab === 'friends' ? 'friend_dm' : 'group',
    currentChannelId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeTab, selectedFriendId]);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    platformStore.sendMessage(
      activeTab === 'world' ? 'world' : activeTab === 'friends' ? 'friend_dm' : 'group',
      currentChannelId,
      inputText.trim()
    );
    setInputText('');
  };

  const handleSendFriendPassCard = () => {
    const ent = platformStore.getEntitlement(currentUser.id, 'overtime_secrets');
    if (!ent.isFullBundleOwner) {
      alert('คุณต้องซื้อแพ็กเกจ Full Bundle ก่อน จึงจะสามารถแชร์ Friend Pass ได้ครับ');
      return;
    }

    const freeSlots = ent.friendPassSlots.filter((s) => !s.assignedUserId).length;
    if (freeSlots <= 0) {
      alert('โควตา Friend Pass 3 สล็อตของคุณถูกใช้งานเต็มแล้วครับ');
      return;
    }

    platformStore.sendMessage(
      activeTab === 'world' ? 'world' : activeTab === 'friends' ? 'friend_dm' : 'group',
      currentChannelId,
      '🎟️ มอบสิทธิ์ Friend Pass เล่นเกม Overtime Secrets ฟรี!',
      {
        gameId: 'overtime_secrets',
        gameTitle: 'Overtime Secrets (แฟ้มลับกะดึก)',
        ownerId: currentUser.id,
        ownerName: currentUser.displayName,
        availableSlots: freeSlots,
        totalSlots: 3,
        coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
        message: 'เพื่อนกดรับสิทธิ์เพื่อปลดล็อกทุกตอนและเล่นฟรีได้ทันที!',
      }
    );
  };

  const handleClaimCard = (card: NonNullable<ChatMessage['cardPayload']>) => {
    const cur = platformStore.getCurrentUser();
    if (cur.id === card.ownerId) {
      alert('นี่เป็นการ์ดของคุณเองครับ มอบให้เพื่อนกดรับสิทธิ์นะ');
      return;
    }

    // Assign to first available slot
    const ownerEnt = platformStore.getEntitlement(card.ownerId, card.gameId);
    const freeSlotIdx = ownerEnt.friendPassSlots.findIndex((s) => !s.assignedUserId);

    if (freeSlotIdx === -1) {
      alert('เสียใจด้วยครับ สล็อต Friend Pass ของการ์ดใบนี้ถูกรับไปครบ 3 สล็อตแล้ว');
      return;
    }

    platformStore.assignFriendPassSlot(card.ownerId, card.gameId, freeSlotIdx, cur.id);
    alert(`🎉 ยินดีด้วย! คุณได้รับสิทธิ์ Friend Pass จากคุณ ${card.ownerName} เรียบร้อยแล้ว`);
    if (onLaunchGame) onLaunchGame(card.gameId);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 border-l border-white/10 z-50 flex flex-col shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Community & Social</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="flex border-b border-white/10 bg-white/5 p-1 gap-1">
        <button
          onClick={() => setActiveTab('world')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'world'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>แชทโลก</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('friends');
            if (!selectedFriendId && friends.length) setSelectedFriendId(friends[0].friendId);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'friends'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>เพื่อน ({friends.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'groups'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>กลุ่ม ({groups.length})</span>
        </button>
      </div>

      {/* Sub-header for Friends list selection if Friends tab */}
      {activeTab === 'friends' && (
        <div className="flex items-center gap-2 p-2 overflow-x-auto border-b border-white/5 bg-black/20">
          {friends.map((f) => {
            const isSel = (selectedFriendId || friends[0]?.friendId) === f.friendId;
            return (
              <button
                key={f.friendId}
                onClick={() => setSelectedFriendId(f.friendId)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs transition-all whitespace-nowrap border ${
                  isSel
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <img src={f.user.avatar} alt={f.user.displayName} className="w-4 h-4 rounded-full object-cover" />
                <span>{f.user.displayName.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isMe = m.sender.id === currentUser.id;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-semibold text-zinc-300">{m.sender.displayName}</span>
                <span className="text-[9px] text-zinc-500">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  isMe
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                    : 'bg-zinc-800/90 text-zinc-100 border border-white/10 rounded-tl-none'
                }`}
              >
                {m.content}

                {/* Interactive Friend Pass Game Share Card */}
                {m.cardPayload && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-black/60 border border-indigo-500/30 text-zinc-100 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                      <Gift className="w-4 h-4 text-pink-400" />
                      <span>{m.cardPayload.gameTitle}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">{m.cardPayload.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                      <span className="text-emerald-400 font-semibold">
                        ว่าง {m.cardPayload.availableSlots}/{m.cardPayload.totalSlots} สล็อต
                      </span>
                      <button
                        onClick={() => m.cardPayload && handleClaimCard(m.cardPayload)}
                        className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>กดรับสิทธิ์เล่นฟรี</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Quick Card Actions */}
      <div className="p-3 border-t border-white/10 bg-black/40 space-y-2">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-zinc-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ในนาม: {currentUser.displayName}</span>
          </span>
          <button
            onClick={handleSendFriendPassCard}
            className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition-colors"
            title="ส่งการ์ด Friend Pass ให้เพื่อนในห้องนี้"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>แชร์ Friend Pass</span>
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`พิมพ์ข้อความใน ${
              activeTab === 'world' ? 'แชทโลก' : activeTab === 'friends' ? 'แชทเพื่อน' : 'แชทกลุ่ม'
            }...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
