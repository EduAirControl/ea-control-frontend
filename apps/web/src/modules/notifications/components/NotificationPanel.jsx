import './NotificationPanel.css';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../../../shared/hooks/useToast';
import {
  FaBell,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { IoCheckmarkDoneOutline, IoCheckmarkOutline } from 'react-icons/io5';

const FILTERS = [
  { key: 'all', labelKey: 'notifications.filterAll' },
  { key: 'critical', labelKey: 'notifications.filterCritical' },
  { key: 'warning', labelKey: 'notifications.filterWarning' },
  { key: 'acknowledged', labelKey: 'notifications.filterAcknowledged' },
];

function relativeTime(date, language) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(language || 'es', { numeric: 'auto' });
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return formatter.format(diffSeconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  return formatter.format(Math.round(diffSeconds / 86400), 'day');
}

function formatValue(value, unit) {
  if (value === undefined || value === null || value === '') return '—';
  const number = Number(value);
  const text = Number.isInteger(number) ? String(number) : number.toFixed(1);
  return unit ? `${text} ${unit}` : text;
}

function SeverityIcon({ severityCode }) {
  if (severityCode === 'CRITICAL') return <FaExclamationCircle aria-hidden="true" />;
  if (severityCode === 'WARNING') return <FaExclamationTriangle aria-hidden="true" />;
  return <FaInfoCircle aria-hidden="true" />;
}

function NotificationPanel({ isOpen, onClose }) {
  const {
    notifications,
    stats,
    loading,
    error,
    refresh,
    markAsRead,
    markAllRead,
    deleteAlert,
    deleteAllRead,
  } = useNotifications();

  const { t, i18n } = useTranslation();
  const toast = useToast();
  const panelRef = useRef(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (filter === 'critical') {
      return notifications.filter((n) => !n.read && n.severityCode === 'CRITICAL');
    }
    if (filter === 'warning') {
      return notifications.filter((n) => !n.read && n.severityCode === 'WARNING');
    }
    if (filter === 'acknowledged') {
      return notifications.filter((n) => n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const handleDelete = async (notification) => {
    const ok = await deleteAlert(notification.id);
    if (ok) toast.success(t('notifications.deleted'));
    else toast.error(t('notifications.deleteError'));
  };

  const handleDeleteAllRead = async () => {
    const deleted = await deleteAllRead();
    if (deleted > 0) toast.success(t('notifications.deletedCount', { count: deleted }));
  };

  const handleAcknowledge = async (notification) => {
    const ok = await markAsRead(notification.id);
    if (ok) toast.success(t('notifications.acknowledgedToast'));
    else toast.error(t('notifications.acknowledgeError'));
  };

  if (!isOpen) return null;

  const activeCount = stats.active;

  return (
    <div className="notif-overlay">
      <aside
        className="notification-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
      >
        <header className="notification-header">
          <div className="notification-header-info">
            <div className="notification-header-top">
              <span className="notification-header-icon">
                <FaBell aria-hidden="true" />
              </span>
              <h3 id="notification-title">{t('notifications.title')}</h3>
              {activeCount > 0 && <span className="notification-badge">{activeCount}</span>}
            </div>
            <p className="notification-subtitle">
              {t('notifications.subtitle', {
                active: stats.active,
                acknowledged: stats.acknowledged,
              })}
            </p>
            <div className="notification-header-actions">
              {activeCount > 0 && (
                <button className="mark-read-link" onClick={markAllRead}>
                  <IoCheckmarkDoneOutline aria-hidden="true" />
                  {t('notifications.markAllRead')}
                </button>
              )}
              {stats.acknowledged > 0 && (
                <button className="delete-read-link" onClick={handleDeleteAllRead}>
                  <FaTrashAlt aria-hidden="true" />
                  {t('notifications.deleteAllReadCount', { count: stats.acknowledged })}
                </button>
              )}
            </div>
          </div>

          <button className="close-btn" onClick={onClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div className="notification-filters" role="tablist" aria-label={t('notifications.filters')}>
          {FILTERS.map((item) => {
            const count =
              item.key === 'all'
                ? stats.total
                : item.key === 'critical'
                  ? stats.critical
                  : item.key === 'warning'
                    ? stats.warning
                    : stats.acknowledged;
            return (
              <button
                key={item.key}
                role="tab"
                aria-selected={filter === item.key}
                className={`notification-filter ${filter === item.key ? 'active' : ''}`}
                onClick={() => setFilter(item.key)}
              >
                {t(item.labelKey)}
                <span className="notification-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="notification-skeleton" aria-label={t('notifications.loading')}>
              <span />
              <span />
              <span />
            </div>
          ) : error ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <FaExclamationTriangle aria-hidden="true" />
              </div>
              <p>{t('notifications.loadError')}</p>
              <button className="notification-retry" onClick={refresh}>
                {t('notifications.retry')}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <FaBell aria-hidden="true" />
              </div>
              <p>
                {notifications.length === 0
                  ? t('notifications.empty')
                  : t('notifications.noFiltered')}
              </p>
            </div>
          ) : (
            filtered.map((notification) => (
              <article
                key={notification.id}
                className={`notification-card ${notification.type} ${
                  notification.read ? 'read' : 'unread'
                }`}
              >
                <div className="notification-icon">
                  <SeverityIcon severityCode={notification.severityCode} />
                </div>

                <div className="notification-content">
                  <div className="notification-title-row">
                    <strong>
                      {notification.environmentName
                        || t('notifications.environmentId', { id: notification.environmentId })}
                    </strong>
                    <span className={`notification-severity ${notification.type}`}>
                      {t(notification.severityLabel)}
                    </span>
                  </div>

                  <div className="notification-reading">
                    <span className="notification-variable">
                      {t(notification.variableLabel)}
                    </span>
                    <span className="notification-value">
                      {formatValue(notification.value, notification.unit)}
                    </span>
                  </div>

                  {(notification.thresholdMin !== undefined
                    || notification.thresholdMax !== undefined) && (
                    <span className="notification-threshold">
                      {t('notifications.thresholdInfoTemplate', {
                        min: formatValue(notification.thresholdMin, notification.unit),
                        max: formatValue(notification.thresholdMax, notification.unit),
                      })}
                    </span>
                  )}

                  <div className="notification-meta">
                    <time dateTime={notification.raisedAt?.toISOString()}>
                      {relativeTime(notification.raisedAt, i18n.language)}
                    </time>
                    <span className={`notification-state ${notification.read ? 'ack' : 'active'}`}>
                      {notification.read
                        ? t('notifications.acknowledged')
                        : t('notifications.active')}
                    </span>
                  </div>

                  {!notification.read && (
                    <button
                      className="notification-ack"
                      onClick={() => handleAcknowledge(notification)}
                    >
                      <IoCheckmarkOutline aria-hidden="true" />
                      {t('notifications.acknowledge')}
                    </button>
                  )}
                </div>

                <button
                  className="notification-delete"
                  onClick={() => handleDelete(notification)}
                  aria-label={t('notifications.delete')}
                  title={t('notifications.delete')}
                >
                  <FaTrashAlt size={13} />
                </button>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

export default NotificationPanel;
