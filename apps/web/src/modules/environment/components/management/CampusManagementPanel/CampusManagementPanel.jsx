import { useCallback, useEffect, useRef, useState } from 'react';
import { IoAddOutline, IoBusinessOutline, IoLocationOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../context/useAuth';
import { useToast } from '../../../../../shared/hooks/useToast';
import catalogService from '../../../services/catalogService';
import './CampusManagementPanel.css';

function CampusManagementPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const hasInstitution = Boolean(user?.institutionId);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', city: '' });

  const loadCampuses = useCallback(async () => {
    setLoading(true);
    try {
      setCampuses(await catalogService.getCampuses());
    } catch (error) {
      toastRef.current.error(error.message || t('campusManagement.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCampuses();
  }, [loadCampuses]);

  const submit = async (event) => {
    event.preventDefault();
    if (!hasInstitution || !form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      await catalogService.createCampus(form);
      setForm({ code: '', name: '', city: '' });
      toast.success(t('campusManagement.created'));
      await loadCampuses();
    } catch (error) {
      toast.error(error.message || t('campusManagement.createError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="campus-panel" aria-labelledby="campus-panel-title">
      <header className="campus-panel__header">
        <div>
          <span className="campus-panel__eyebrow">{t('campusManagement.eyebrow')}</span>
          <h2 id="campus-panel-title">{t('campusManagement.title')}</h2>
          <p>{t('campusManagement.description')}</p>
        </div>
        <span className="campus-panel__count">
          <IoBusinessOutline /> {t('campusManagement.campusCount', { count: campuses.length })}
        </span>
      </header>

      {!hasInstitution && (
        <div className="campus-panel__notice" role="alert">
          {t('campusManagement.noInstitution')}
        </div>
      )}

      <form className="campus-panel__form" onSubmit={submit}>
        <label>
          <span className="campus-panel__label-text">
            {t('campusManagement.code')}
            <span className="campus-panel__label-required" aria-hidden="true">*</span>
          </span>
          <input
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            maxLength={30}
            placeholder={t('campusManagement.codePlaceholder')}
            required
            disabled={!hasInstitution || saving}
          />
        </label>
        <label>
          <span className="campus-panel__label-text">
            {t('campusManagement.name')}
            <span className="campus-panel__label-required" aria-hidden="true">*</span>
          </span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={150}
            placeholder={t('campusManagement.namePlaceholder')}
            required
            disabled={!hasInstitution || saving}
          />
        </label>
        <label>
          {t('campusManagement.city')}
          <input
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            maxLength={100}
            placeholder={t('campusManagement.cityPlaceholder')}
            disabled={!hasInstitution || saving}
          />
        </label>
        <button type="submit" disabled={!hasInstitution || saving || !form.code.trim() || !form.name.trim()}>
          <IoAddOutline /> {saving ? t('campusManagement.saving') : t('campusManagement.create')}
        </button>
      </form>

      <div className="campus-panel__list-heading">
        <h3>{t('campusManagement.registeredCampuses')}</h3>
        <button type="button" onClick={loadCampuses} disabled={loading}>
          {loading ? t('campusManagement.refreshing') : t('campusManagement.refresh')}
        </button>
      </div>

      {loading ? (
        <p className="campus-panel__empty">{t('campusManagement.loading')}</p>
      ) : campuses.length === 0 ? (
        <p className="campus-panel__empty">{t('campusManagement.empty')}</p>
      ) : (
        <div className="campus-panel__grid">
          {campuses.map((campus) => (
            <article className="campus-panel__card" key={campus.id}>
              <span className="campus-panel__card-icon"><IoBusinessOutline /></span>
              <div className="campus-panel__card-main">
                <strong>{campus.name}</strong>
                <span>{campus.code}</span>
              </div>
              {campus.city && <span className="campus-panel__city"><IoLocationOutline /> {campus.city}</span>}
              <span className={`campus-panel__status campus-panel__status--${campus.status?.toLowerCase()}`}>
                {campus.status
                  ? t(`campusManagement.status.${campus.status.toLowerCase()}`, campus.status)
                  : '—'}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CampusManagementPanel;
