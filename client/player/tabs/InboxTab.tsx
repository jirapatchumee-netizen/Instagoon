import { type Creator } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media } from '../ui';
import { IgVerified } from '../InstagramIcons';
import { MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';

interface InboxTabProps {
  creators: Creator[];
  lang: Lang;
  onOpenChat: (creator: Creator) => void;
}

export function InboxTab({ creators, lang, onOpenChat }: InboxTabProps) {
  const t = TRANSLATIONS[lang];
  const [query, setQuery] = useState('');

  const filtered = creators.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.bio?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fs-inbox-tab">
      <div className="fs-inbox-header">
        <h1 className="fs-inbox-title">{t.inbox}</h1>
      </div>

      <div className="fs-inbox-search">
        <Search size={16} className="fs-search-icon" />
        <input
          type="text"
          placeholder={t.creators}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="fs-inbox-search-input"
        />
      </div>

      <div className="fs-inbox-list">
        {filtered.length > 0 ? (
          filtered.map((creator) => {
            const hasCloseFriends = (creator.relationship ?? 0) >= 1;
            const snippet = creator.bio ? creator.bio.slice(0, 48) : t.openDM;

            return (
              <div
                key={creator.id}
                className="fs-inbox-item"
                role="button"
                tabIndex={0}
                onClick={() => onOpenChat(creator)}
                onKeyDown={(e) => e.key === 'Enter' && onOpenChat(creator)}
              >
                <div className={`fs-avatar-ring ${hasCloseFriends ? 'is-close-friends' : ''}`}>
                  <div className="fs-avatar fs-avatar-md">
                    {creator.avatarKey ? (
                      <img src={media(creator.avatarKey)} alt={creator.name} />
                    ) : (
                      creator.name.slice(0, 1)
                    )}
                  </div>
                </div>

                <div className="fs-inbox-item-info">
                  <div className="fs-inbox-item-name-row">
                    <span className="fs-inbox-item-name">{creator.name}</span>
                    <IgVerified size={13} className="fs-verified" />
                  </div>
                  <p className="fs-inbox-item-snippet">{snippet}</p>
                </div>

                <div className="fs-inbox-item-meta">
                  <div className="fs-inbox-unread-dot" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="fs-empty-state">
            <div className="fs-empty-icon-circle">
              <MessageSquare size={32} />
            </div>
            <h2>{t.emptyInboxTitle}</h2>
            <p>{t.emptyInboxDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
