import React, { useState, useEffect } from 'react';
import { GameCatalogItem, UserGameEntitlement, UserProfile } from '@/schema/platformTypes';
import { platformStore } from '@/services/platformStore';
import { GameReviewsSection } from './GameReviewsSection';
import {
  Play,
  Gift,
  CheckCircle2,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface StorefrontViewProps {
  onPlayGame: (gameId: string, episodeId?: string) => void;
  onOpenStudio: () => void;
  onOpenSocial: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  onPlayGame,
  onOpenSocial,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(platformStore.getCurrentUser());
  const [catalog] = useState<GameCatalogItem[]>(platformStore.getCatalog());
  const [selectedGame] = useState<GameCatalogItem>(catalog[0]);
  const [entitlement, setEntitlement] = useState<UserGameEntitlement>(
    platformStore.getEntitlement(currentUser.id, selectedGame.id)
  );

  useEffect(() => {
    const unsub = platformStore.subscribe(() => {
      const cur = platformStore.getCurrentUser();
      setCurrentUser(cur);
      setEntitlement(platformStore.getEntitlement(cur.id, selectedGame.id));
    });
    return () => {
      unsub();
    };
  }, [selectedGame.id]);

  const friends = platformStore.getFriendsForCurrent();

  const handlePurchaseFullBundle = () => {
    platformStore.purchaseFullBundle(currentUser.id, selectedGame.id);
    alert('🎉 ยินดีด้วย! คุณได้สั่งซื้อ Full Bundle เรียบร้อยแล้ว ได้รับสิทธิ์ Friend Pass 3 สล็อตทันที!');
  };

  const handleAssignFriendSlot = (slotIndex: number, friendUserId: string) => {
    platformStore.assignFriendPassSlot(currentUser.id, selectedGame.id, slotIndex, friendUserId);
  };

  const handleRevokeSlot = (slotIndex: number) => {
    if (confirm('ยืนยันที่จะดึงสิทธิ์ Friend Pass คืนจากเพื่อนคนนี้หรือไม่?')) {
      platformStore.revokeFriendPassSlot(currentUser.id, selectedGame.id, slotIndex);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-vn-bg text-zinc-100">
      <section className="relative min-h-[620px] sm:min-h-[560px] lg:min-h-[620px] overflow-hidden bg-[#0a0c14] flex items-end">
        <img
          src={selectedGame.id === 'overtime_secrets' ? '/art/stage1/Cutscene_S1_02_Noey_Welcome_EyeLevel_00001_.webp' : selectedGame.bannerImage}
          alt=""
          className="storefront-hero-art absolute inset-x-0 top-0 h-[76%] w-full object-contain object-top sm:inset-auto sm:h-full sm:w-auto sm:max-w-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-[#0a0c14]/80 to-transparent sm:bg-gradient-to-r sm:from-[#0a0c14] sm:via-[#0a0c14]/90 sm:to-transparent" />
        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10 pt-64 sm:py-20">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400">Frost Novel · เกมเรื่องเด่น</div>
          <h1 className="mt-3 max-w-2xl text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">{selectedGame.title}</h1>
          <p className="mt-4 text-xs sm:text-sm text-zinc-400">{selectedGame.tags.join(' · ')}</p>
          <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-200">{selectedGame.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => onPlayGame(selectedGame.id)} className="min-h-12 inline-flex items-center gap-2 rounded-xl bg-white px-6 font-bold text-sm text-zinc-950 hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent">
              <Play aria-hidden="true" className="h-4 w-4 fill-current" /> เริ่มเล่น
            </button>
            <a href="#episodes" className="min-h-12 inline-flex items-center rounded-xl border border-white/25 bg-vn-card/70 px-5 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-accent">ดูรายการตอน ↓</a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
        <section id="episodes" className="space-y-4 scroll-mt-4">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-xl sm:text-2xl font-bold text-white">เรื่องราวทั้งหมด</h2><p className="mt-1 text-sm text-zinc-400">สำรวจแต่ละตอนของ {selectedGame.title}</p></div>
            <span className="shrink-0 text-xs text-zinc-400">{selectedGame.episodes.length} ตอน</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedGame.episodes.map((ep) => {
              const isUnlocked = entitlement.isFullBundleOwner || Boolean(entitlement.friendPassFromOwnerId) || entitlement.unlockedEpisodes.includes(ep.id) || ep.price === 0;
              return (
                <article key={ep.id} className="flex items-center gap-3 sm:gap-4 rounded-xl border border-white/10 bg-vn-card/50 p-3 sm:p-4">
                  {ep.coverImage ? <img src={ep.coverImage} alt="" className="h-16 w-14 sm:h-20 sm:w-16 shrink-0 rounded-lg object-cover" /> : <div aria-hidden="true" className="grid h-16 w-14 sm:h-20 sm:w-16 shrink-0 place-items-center rounded-lg border border-white/10 bg-gradient-to-br from-purple-950/70 to-vn-card text-lg font-bold text-purple-300">{String(ep.stageNumber).padStart(2, '0')}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold tracking-wide text-purple-300">EPISODE {String(ep.stageNumber).padStart(2, '0')}</div>
                    <h3 className="mt-1 text-sm font-bold leading-snug text-white">{ep.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{ep.description}</p>
                  </div>
                  <span className={`self-start shrink-0 text-xs font-semibold ${isUnlocked ? 'text-emerald-300' : 'text-zinc-400'}`}>{ep.price === 0 ? 'ฟรี' : isUnlocked ? 'มีสิทธิ์' : `ล็อก · ฿${ep.price}`}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-vn-card/50 border border-white/10 p-5">
          <h2 className="text-lg font-bold text-white">พูดคุยกับชุมชน</h2>
          <p className="mt-1 text-sm text-zinc-400">แลกเปลี่ยนความคิดเห็นเกี่ยวกับเกม</p>
          <button onClick={onOpenSocial} className="mt-4 min-h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vn-accent">เปิดแชทชุมชน</button>
        </section>

        <details id="ownership" className="rounded-2xl bg-white/[0.03] border border-white/10">
          <summary className="cursor-pointer px-5 py-4 font-bold text-sm text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vn-accent">สิทธิ์ของคุณและ Friend Pass</summary>
          <div className="p-5 pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  สถานะการถือครองของคุณ (Entitlement)
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {entitlement.isFullBundleOwner ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>คุณเป็นเจ้าของ Full Bundle ทุกตอน (มีโควตา Friend Pass 3 สล็อต)</span>
                  </div>
                ) : entitlement.friendPassFromOwnerId ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-pink-400">
                    <Gift className="w-5 h-5 text-pink-400" />
                    <span>คุณกำลังเล่นฟรีครบทุกตอนผ่านสิทธิ์ Friend Pass ของเพื่อน!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>โหมดทดลองเล่นฟรี (Free Trial Episode 1)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buy Full Bundle Action if not owned */}
            {!entitlement.isFullBundleOwner && !entitlement.friendPassFromOwnerId && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePurchaseFullBundle}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>ซื้อ Full Bundle ฿{selectedGame.fullBundlePrice} (แถม Friend Pass 3 คน)</span>
                </button>
              </div>
            )}
          </div>

          {/* ADR-0002: 3-Slot Friend Pass Manager if Full Bundle Owner */}
          {entitlement.isFullBundleOwner && (
            <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    จัดการโควตาแบ่งปันเกมให้เพื่อน (Friend Pass — สูงสุด 3 คนพร้อมกัน)
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">
                  กำลังใช้งาน{' '}
                  {entitlement.friendPassSlots.filter((s) => s.assignedUserId).length}/3 สล็อต
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {entitlement.friendPassSlots.map((slot) => {
                  const isAssigned = Boolean(slot.assignedUserId);
                  return (
                    <div
                      key={slot.slotIndex}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isAssigned
                          ? 'bg-pink-950/20 border-pink-500/30'
                          : 'bg-white/5 border-dashed border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-zinc-300">สล็อตที่ {slot.slotIndex + 1}</span>
                        {isAssigned ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                            กำลังเล่น
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-zinc-400 font-semibold">
                            ว่าง
                          </span>
                        )}
                      </div>

                      {isAssigned ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                            {slot.assignedUsername || slot.assignedUserId}
                          </span>
                          <button
                            onClick={() => handleRevokeSlot(slot.slotIndex)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="ดึงสิทธิ์คืนเพื่อเปลี่ยนให้เพื่อนคนอื่น"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleAssignFriendSlot(slot.slotIndex, e.target.value);
                            }}
                            defaultValue=""
                            className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          >
                            <option value="" disabled>
                              + เลือกเพื่อนเพื่อมอบสิทธิ์
                            </option>
                            {friends.map((f) => (
                              <option key={f.friendId} value={f.friendId}>
                                {f.user.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </details>

        {/* Steam-Style Reviews & Ratings */}
        <GameReviewsSection gameId={selectedGame.id} />
      </div>
    </div>
  );
};
