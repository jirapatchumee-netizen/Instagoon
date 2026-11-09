import { useOverlayHistory } from '../overlay-history';
import { ArrowLeft, Bell, Heart, Sparkles, MessageCircle } from 'lucide-react';
import { TRANSLATIONS, type Lang } from '../i18n';
import { formatDateTime } from '../ui';

interface ActivityItem {
  id: string;
  type?: 'post' | 'comment' | 'vault';
  text: string;
  createdAt: number;
}

interface ActivityOverlayProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  notifications: ActivityItem[];
}

export function ActivityOverlay({ open, onClose, lang, notifications }: ActivityOverlayProps) {
  useOverlayHistory(open, onClose);

  if (!open) return null;
  const t = TRANSLATIONS[lang];

  return (
    <div className="fs-activity-overlay" role="dialog" aria-modal="true" aria-label={t.notifications}>
      <header className="fs-overlay-header">
        <button
          type="button"
          className="fs-icon-btn"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="fs-overlay-title">{t.notifications}</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="fs-activity-content">
        {notifications.length > 0 ? (
          <div className="fs-notifs-list">
            {notifications.map((n) => (
              <div key={n.id} className="fs-notif-item">
                <div className="fs-notif-icon-circle">
                  {n.type === 'vault' ? (
                    <Sparkles size={16} />
                  ) : n.type === 'comment' ? (
                    <MessageCircle size={16} />
                  ) : (
                    <Heart size={16} />
                  )}
                </div>
                <div className="fs-notif-text-col">
                  <span className="fs-notif-text">{n.text}</span>
                  <time className="fs-notif-time">{formatDateTime(n.createdAt, lang)}</time>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="fs-empty-state">
            <div className="fs-empty-icon-circle">
              <Bell size={32} />
            </div>
            <h2>{t.emptyActivity}</h2>
            <p>{t.noNotifs}</p>
          </div>
        )}
      </div>
    </div>
  );
}
