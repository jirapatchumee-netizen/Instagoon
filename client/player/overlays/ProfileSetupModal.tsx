import { useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { type Lang, TRANSLATIONS } from '../i18n';
import { type User } from '../types';
import { Modal, PRESET_AVATARS } from '../ui';

export function ProfileSetupModal({
  user,
  t,
  onSave,
  onClose,
  canClose,
  saving,
}: {
  user: User;
  t: (typeof TRANSLATIONS)[Lang];
  onSave: (nickname: string, avatarId: string) => Promise<void>;
  onClose: () => void;
  canClose: boolean;
  saving: boolean;
}) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => user.avatarId || 'user_m1');
  const [nickname, setNickname] = useState<string>(() => user.nickname || '');
  const [err, setErr] = useState('');

  const isEdit = Boolean(user.nickname);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setErr(t.nicknameRequired);
      return;
    }
    if (!selectedAvatar) {
      setErr(t.avatarRequired);
      return;
    }
    setErr('');
    await onSave(trimmed, selectedAvatar);
  }

  return (
    <Modal labelledBy="fs-profile-setup-title" onClose={canClose ? onClose : () => {}}>
      <section className="fs-profile-setup-modal">
        <header className="fs-profile-setup-header">
          <h2 id="fs-profile-setup-title">{isEdit ? t.profileEditTitle : t.profileSetupTitle}</h2>
          {canClose && (
            <button type="button" className="fs-btn-icon-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          )}
        </header>

        <p className="fs-profile-setup-desc">{t.profileSetupDesc}</p>

        {err && <div className="fs-alert-error" role="alert">{err}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} className="fs-profile-setup-form">
          <div className="fs-avatar-picker-section">
            <span className="fs-form-label">{t.avatarSelectLabel}</span>
            <div className="fs-avatar-grid">
              {PRESET_AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    className={`fs-avatar-card ${isSelected ? 'fs-selected' : ''}`}
                    onClick={() => setSelectedAvatar(av.id)}
                  >
                    <div className="fs-avatar-card-thumb">
                      <img src={av.src} alt={t.presetAvatarLabels[av.id] ?? av.label} />
                      {isSelected && (
                        <div className="fs-avatar-checkmark">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="fs-avatar-card-label">{t.presetAvatarLabels[av.id] ?? av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fs-nickname-section">
            <label htmlFor="fs-nickname-input" className="fs-form-label">{t.nicknameLabel}</label>
            <div className="fs-input-wrap">
              <input
                id="fs-nickname-input"
                type="text"
                className="fs-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 30))}
                placeholder={t.nicknamePlaceholder}
                data-autofocus
                disabled={saving}
                maxLength={30}
              />
              <span className="fs-char-counter">{nickname.length}/30</span>
            </div>
          </div>

          <div className="fs-profile-setup-actions">
            {canClose && (
              <button
                type="button"
                className="fs-btn-ghost"
                disabled={saving}
                onClick={onClose}
              >
                {t.postMenuCancel}
              </button>
            )}
            <button
              type="submit"
              className="fs-primary"
              disabled={saving || !nickname.trim() || !selectedAvatar}
            >
              {saving ? t.savingProfile : isEdit ? t.saveProfileEditBtn : t.saveProfileBtn}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
