import { useEffect, useState } from 'react';
import { api } from '../api';
import { TRANSLATIONS, type Lang } from '../i18n';
import type { Creator, HomePayload, MissionSummary } from '../types';
import { AvatarImg, media } from '../ui';

type Props = {
  creators: Creator[];
  lang: Lang;
  busy: boolean;
  onOpenProfile: (creator: Creator) => void;
  onOpenChat: (creator: Creator) => void;
};

export function CollectionTab({ creators, lang, busy, onOpenProfile, onOpenChat }: Props) {
  const t = TRANSLATIONS[lang];
  const copy = t.collectionTab;
  const homeCopy = t.home;
  const [missions, setMissions] = useState<MissionSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<HomePayload>('/api/home?period=7d')
      .then((data) => {
        if (!cancelled) setMissions(data.missions ?? []);
      })
      .catch(() => {
        if (!cancelled) setMissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const following = creators.filter((c) => c.following);

  return (
    <div className="flex flex-col gap-5 px-3 pb-8 pt-3">
      <header className="px-0.5">
        <h1 className="text-[18px] font-bold text-foreground">{copy.title}</h1>
      </header>

      <section className="flex flex-col gap-2.5">
        <h2 className="px-0.5 text-[14px] font-semibold text-foreground">{copy.followingTitle}</h2>
        {following.length === 0 ? (
          <p className="rounded-2xl border border-border bg-panel p-4 text-[12.5px] text-muted-foreground">
            {copy.followingEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {following.map((creator) => (
              <div
                key={creator.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(creator)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="fs-avatar fs-avatar-large shrink-0">
                    {creator.avatarKey ? (
                      <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                    ) : (
                      creator.name.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-foreground">{creator.name}</span>
                      {creator.relationship > 0 ? (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10.5px] text-amber-200">
                          {copy.levelLabel(creator.relationship)}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">{creator.tagline || creator.bio}</p>
                  </div>
                </button>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onOpenProfile(creator)}
                    className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-white/5"
                  >
                    {copy.openProfile}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onOpenChat(creator)}
                    className="rounded-full bg-pink-500 px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-pink-400"
                  >
                    {copy.openChat}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="px-0.5 text-[14px] font-semibold text-foreground">{copy.missionsTitle}</h2>
        {missions.length === 0 ? (
          <p className="rounded-2xl border border-border bg-panel p-4 text-[12.5px] text-muted-foreground">
            {copy.missionsEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {missions.map((mission) => {
              const pct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0;
              return (
                <div key={mission.id} className="rounded-2xl border border-border bg-panel p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-medium text-foreground">{mission.title}</span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {mission.completed ? homeCopy.missionDone : homeCopy.missionProgress(mission.progress, mission.target)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
