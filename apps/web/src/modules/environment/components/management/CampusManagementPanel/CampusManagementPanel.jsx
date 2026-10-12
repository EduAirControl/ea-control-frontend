import { useCallback, useEffect, useRef, useState } from 'react';
import { IoAddOutline, IoBusinessOutline, IoLocationOutline } from 'react-icons/io5';
import { useAuth } from '../../../../../context/useAuth';
import { useToast } from '../../../../../shared/hooks/useToast';
import catalogService from '../../../services/catalogService';
import './CampusManagementPanel.css';

function CampusManagementPanel() {
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
      toastRef.current.error(error.message || 'No fue posible cargar los campuses.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.success('Campus creado y asignado a tu institución.');
      await loadCampuses();
    } catch (error) {
      toast.error(error.message || 'No fue posible crear el campus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="campus-panel" aria-labelledby="campus-panel-title">
      <header className="campus-panel__header">
        <div>
          <span className="campus-panel__eyebrow">Gestión de sedes</span>
          <h2 id="campus-panel-title">Campuses de mi institución</h2>
          <p>Crea y consulta las sedes asociadas a la institución de tu cuenta.</p>
        </div>
        <span className="campus-panel__count"><IoBusinessOutline /> {campuses.length} campuses</span>
      </header>

      {!hasInstitution && (
        <div className="campus-panel__notice" role="alert">
          Tu cuenta no tiene una institución asignada. Solicita que la asocien antes de crear un campus.
        </div>
      )}

      <form className="campus-panel__form" onSubmit={submit}>
        <label>
          Código <span aria-hidden="true">*</span>
          <input
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            maxLength={30}
            placeholder="Ej. SEDE-NORTE"
            required
            disabled={!hasInstitution || saving}
          />
        </label>
        <label>
          Nombre <span aria-hidden="true">*</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={150}
            placeholder="Ej. Campus Norte"
            required
            disabled={!hasInstitution || saving}
          />
        </label>
        <label>
          Ciudad
          <input
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            maxLength={100}
            placeholder="Ej. Bogotá"
            disabled={!hasInstitution || saving}
          />
        </label>
        <button type="submit" disabled={!hasInstitution || saving || !form.code.trim() || !form.name.trim()}>
          <IoAddOutline /> {saving ? 'Guardando…' : 'Crear campus'}
        </button>
      </form>

      <div className="campus-panel__list-heading">
        <h3>Sedes registradas</h3>
        <button type="button" onClick={loadCampuses} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {loading ? (
        <p className="campus-panel__empty">Cargando campuses…</p>
      ) : campuses.length === 0 ? (
        <p className="campus-panel__empty">Aún no hay campuses para tu institución.</p>
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
                {campus.status === 'ACTIVE' ? 'Activo' : campus.status || '—'}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CampusManagementPanel;
