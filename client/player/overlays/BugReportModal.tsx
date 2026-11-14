import { useState, type FormEvent } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { type Lang, TRANSLATIONS } from '../i18n';
import { Modal, json } from '../ui';
import { api } from '../api';

export interface BugReportModalProps {
  t: (typeof TRANSLATIONS)[Lang];
  onClose: () => void;
  initialCategory?: 'chat' | 'payment' | 'audio' | 'visual' | 'other';
  creatorId?: string | null;
  errorCode?: string | null;
  contextInfo?: Record<string, unknown>;
}

export function BugReportModal({
  t,
  onClose,
  initialCategory = 'other',
  creatorId,
  errorCode,
  contextInfo,
}: BugReportModalProps) {
  const [category, setCategory] = useState<'chat' | 'payment' | 'audio' | 'visual' | 'other'>(initialCategory);
  const [userMessage, setUserMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const clientContext = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        language: typeof navigator !== 'undefined' ? navigator.language : '',
        screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        url: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: Date.now(),
        ...(contextInfo || {}),
      };

      await api('/api/reports', json({
        category,
        creatorId: creatorId || null,
        errorCode: errorCode || null,
        userMessage: userMessage.trim() || null,
        clientContext,
      }));

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('rate_limited') ? t.reportRateLimited : t.reportFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal labelledBy="fs-bug-report-title" onClose={onClose}>
      <section className="fs-profile-setup-modal fs-bug-report-modal" data-autofocus tabIndex={-1}>
        <header className="fs-profile-setup-header">
          <h2 id="fs-bug-report-title">{t.reportIssueTitle}</h2>
          <button type="button" className="fs-btn-icon-close" onClick={onClose} aria-label={t.reportClose}>
            <X size={20} />
          </button>
        </header>

        {submitted ? (
          <div className="fs-report-success-state">
            <CheckCircle size={40} className="fs-report-success-icon" />
            <p className="fs-report-success-text">{t.reportSuccess}</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="fs-profile-setup-form">
            {error && (
              <div className="fs-alert-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="fs-form-group">
              <label htmlFor="fs-report-cat" className="fs-form-label">
                {t.reportCategory}
              </label>
              <select
                id="fs-report-cat"
                className="fs-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                disabled={submitting}
              >
                <option value="chat">{t.reportCatChat}</option>
                <option value="payment">{t.reportCatPayment}</option>
                <option value="audio">{t.reportCatAudio}</option>
                <option value="visual">{t.reportCatVisual}</option>
                <option value="other">{t.reportCatOther}</option>
              </select>
            </div>

            {errorCode && (
              <div className="fs-report-context-badge">
                <span className="fs-muted">Error: {errorCode}</span>
              </div>
            )}

            <div className="fs-form-group">
              <textarea
                id="fs-report-msg"
                className="fs-textarea"
                rows={3}
                placeholder={t.reportPlaceholder}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                maxLength={1000}
                disabled={submitting}
              />
            </div>

            <div className="fs-profile-setup-actions">
              <button
                type="button"
                className="fs-btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                {t.reportClose}
              </button>
              <button
                type="submit"
                className="fs-primary"
                disabled={submitting}
              >
                {submitting ? t.reportSending : t.reportSubmit}
              </button>
            </div>
          </form>
        )}
      </section>
    </Modal>
  );
}
