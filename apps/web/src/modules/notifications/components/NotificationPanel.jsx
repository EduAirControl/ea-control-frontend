import './NotificationPanel.css';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import {
  FaBell,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa';
import { IoCheckmarkOutline } from 'react-icons/io5';

function NotificationPanel({ isOpen, onClose }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteAlert,
    deleteAllRead,
  } = useNotifications();

  const { t } = useTranslation();
  const panelRef = useRef(null);

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

  if (!isOpen) return null;

  const readCount = notifications.filter((n) => n.read).length;

  return (
    <div className="notif-overlay">
      <div className="notification-panel" ref={panelRef}>
        {/* HEADER */}

        <div className="notification-header">
          <div className="notification-header-info">
            <div className="notification-header-top">
              <h3>{t('notifications.title')}</h3>

              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {unreadCount > 0 && (
              <button className="mark-read-link" onClick={markAllRead} aria-label="Marcar todas como leídas">
                <IoCheckmarkOutline aria-hidden="true" /> {t('notifications.markAllRead')}
              </button>
            )}

            {readCount > 0 && (
              <button className="delete-read-link" onClick={deleteAllRead} aria-label="Eliminar todas las leídas">
                <FaTrashAlt aria-hidden="true" /> {t('notifications.deleteAllRead')}
              </button>
            )}
          </div>

          <button className="close-btn" onClick={onClose} aria-label="Cerrar notificaciones">
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {/* LISTA */}

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <FaBell aria-hidden="true" />
              </div>

              <p>{t('notifications.empty')}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${notification.type} ${
                  !notification.read ? 'unread' : ''
                }`}
                onClick={(e) => {
                  if (!e.target.closest('.notification-delete')) {
                    markAsRead(notification.id);
                  }
                }}
              >
                {/* ICONO */}

                <div className="notification-icon">
                  {notification.type === 'danger' && <FaExclamationTriangle aria-hidden="true" />}
                  {notification.type === 'warning' && <FaExclamationTriangle aria-hidden="true" />}
                  {notification.type === 'info' && <FaInfoCircle aria-hidden="true" />}
                </div>

                {/* CONTENIDO */}

                <div className="notification-content">
                  <div className="notification-title-row">
                    <strong>{t(notification.title)}</strong>

                    {!notification.read && <span className="notification-dot"></span>}
                  </div>

                  <p>{t(notification.message, notification.data)}</p>

                  {notification.data.thresholdMin !== undefined &&
                    notification.data.thresholdMax !== undefined && (
                      <span className="notification-threshold">
                        {t('notifications.thresholdInfo', {
                          min: notification.data.thresholdMin,
                          max: notification.data.thresholdMax,
                        })}
                      </span>
                    )}

                  <span className="time">
                    {notification.time
                      ? new Date(notification.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>

                {/* BOTÓN ELIMINAR (solo para alertas leídas) */}
                {notification.read && (
                  <button
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAlert(notification.id);
                    }}
                    aria-label="Eliminar notificación"
                    title={t('notifications.delete')}
                  >
                    <FaTrashAlt size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="notification-footer">
          {readCount > 0 && (
            <button className="delete-all-read-btn" onClick={deleteAllRead}>
              <FaTrashAlt size={14} /> {t('notifications.deleteAllRead', { count: readCount })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPanel;