import { useOverlayHistory } from '../overlay-history';
import { type Post, type Creator } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { Bookmark, MessageCircle, User as UserIcon, X } from 'lucide-react';

interface PostMenuSheetProps {
  post: Post | null;
  creator: Creator | null;
  isSaved: boolean;
  lang: Lang;
  onClose: () => void;
  onViewProfile: (creator: Creator) => void;
  onToggleSave: (postId: string) => void;
  onMessage: (creator: Creator) => void;
}

export function PostMenuSheet({
  post,
  creator,
  isSaved,
  lang,
  onClose,
  onViewProfile,
  onToggleSave,
  onMessage,
}: PostMenuSheetProps) {
  const isOpen = Boolean(post && creator);
  useOverlayHistory(isOpen, onClose);

  if (!isOpen || !post || !creator) return null;
  const t = TRANSLATIONS[lang];

  return (
    <div className="fs-sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="fs-sheet-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fs-sheet-handle" />

        <div className="fs-sheet-menu-list">
          <button
            type="button"
            className="fs-sheet-menu-item"
            onClick={() => {
              onClose();
              onViewProfile(creator);
            }}
          >
            <UserIcon size={20} />
            <span>{t.postMenuViewProfile(creator.name)}</span>
          </button>

          <button
            type="button"
            className="fs-sheet-menu-item"
            onClick={() => {
              onToggleSave(post.id);
              onClose();
            }}
          >
            <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? t.postMenuUnsave : t.postMenuSave}</span>
          </button>

          <button
            type="button"
            className="fs-sheet-menu-item"
            onClick={() => {
              onClose();
              onMessage(creator);
            }}
          >
            <MessageCircle size={20} />
            <span>{t.postMenuMessage(creator.name)}</span>
          </button>

          <button
            type="button"
            className="fs-sheet-menu-item fs-sheet-menu-cancel"
            onClick={onClose}
          >
            <X size={20} />
            <span>{t.postMenuCancel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
