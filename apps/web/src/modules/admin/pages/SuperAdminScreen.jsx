import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoBusinessOutline,
  IoAddOutline,
  IoRefreshOutline,
  IoPeopleOutline,
  IoSearchOutline,
} from 'react-icons/io5';
import Navbar from '../../dashboard/components/Navbar/Navbar';
import institutionService from '../services/institutionService';
import adminService from '../services/adminService';
import catalogService from '../../environment/services/catalogService';
import './SuperAdminScreen.css';

const EMPTY_FORM = { code: '', name: '', type: '' };

function SuperAdminScreen() {
  const { t } = useTranslation();
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [campuses, setCampuses] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      // El catalogo de sedes vive en ms-classroom-management, no en ms-security:
      // si ese servicio cae no debe tumbar la tabla de usuarios, asi que se
      // degrada a lista vacia y la columna Sede sale sin resolver.
      const [institutionData, userData, roleData, campusData] = await Promise.all([
        institutionService.getAll(),
        adminService.listUsers(),
        adminService.listRoles(),
        catalogService.getCampuses().catch(() => []),
      ]);
      setInstitutions(institutionData);
      setUsers(userData);
      setRoleCatalog(roleData);
      setCampuses(campusData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * El super-admin no tiene paginacion aqui: `listUsers` devuelve la lista entera y
   * se filtra en memoria. Con el termino vacio se muestra todo.
   */
  const visibleUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => (user.email || '').toLowerCase().includes(query));
  }, [users, userQuery]);

  /** `admin/users` devuelve campusId (UUID), no el nombre: se resuelve con el catalogo. */
  const campusNameById = useMemo(
    () => new Map(campuses.map((campus) => [campus.id, campus])),
    [campuses]
  );

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await institutionService.create(form);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (institution) => {
    try {
      await institutionService.update(institution.id, {
        status: institution.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * El backend sustituye todos los roles de una vez, asi que se manda la lista entera.
   * SUPER_ADMIN no se ofrece como opcion: la gestion de ese rol queda reservada.
   */
  const handleToggleRole = async (user, roleName) => {
    setSavingRoles(user.id);
    setError('');
    try {
      const current = user.roles || [];
      const next = current.includes(roleName)
        ? current.filter((r) => r !== roleName)
        : [...current, roleName];
      await adminService.assignRoles(user.id, next);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRoles(null);
    }
  };

  return (
    <div className="superadmin-page">
      <Navbar />
      <main className="superadmin-main">
        <header className="superadmin-header">
          <div className="superadmin-header__title">
            <IoBusinessOutline size={28} />
            <div>
              <h1>{t('superadmin.title', 'Instituciones')}</h1>
              <p>{t('superadmin.subtitle', 'Alta y gestión de instituciones (multi-tenant)')}</p>
            </div>
          </div>
          <button type="button" className="superadmin-btn ghost" onClick={load}>
            <IoRefreshOutline size={18} /> {t('superadmin.refresh', 'Recargar')}
          </button>
        </header>

        {error && <div className="superadmin-alert">{error}</div>}

        <section className="superadmin-card">
          <h2>{t('superadmin.createTitle', 'Nueva institución')}</h2>
          <form className="superadmin-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder={t('superadmin.code', 'Código (ej. SEN-4444)')}
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              maxLength={20}
              required
            />
            <input
              type="text"
              placeholder={t('superadmin.name', 'Nombre')}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              maxLength={150}
              required
            />
            <input
              type="text"
              placeholder={t('superadmin.type', 'Tipo (opcional)')}
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              maxLength={50}
            />
            <button type="submit" className="superadmin-btn primary" disabled={saving}>
              <IoAddOutline size={18} /> {saving ? '...' : t('superadmin.create', 'Crear')}
            </button>
          </form>
        </section>

        <section className="superadmin-card">
          <h2>{t('superadmin.listTitle', 'Registradas')}</h2>
          {loading ? (
            <p className="superadmin-muted">{t('common.loading', 'Cargando...')}</p>
          ) : institutions.length === 0 ? (
            <p className="superadmin-muted">
              {t('superadmin.empty', 'Aún no hay instituciones.')}
            </p>
          ) : (
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>{t('superadmin.code', 'Código')}</th>
                  <th>{t('superadmin.name', 'Nombre')}</th>
                  <th>{t('superadmin.type', 'Tipo')}</th>
                  <th>{t('superadmin.status', 'Estado')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id}>
                    <td className="mono">{inst.code}</td>
                    <td>{inst.name}</td>
                    <td>{inst.type || '—'}</td>
                    <td>
                      <span className={`superadmin-badge ${inst.status === 'ACTIVE' ? 'on' : 'off'}`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="right">
                      <button
                        type="button"
                        className="superadmin-btn small"
                        onClick={() => handleToggleStatus(inst)}
                      >
                        {inst.status === 'ACTIVE'
                          ? t('superadmin.deactivate', 'Desactivar')
                          : t('superadmin.activate', 'Activar')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="superadmin-card">
          <h2 className="superadmin-card__heading">
            <IoPeopleOutline size={20} /> {t('superadmin.usersTitle', 'Usuarios y roles')}
          </h2>
          <p className="superadmin-muted">{t('superadmin.usersHint', 'Asigna el rol de Administrador a los usuarios que administrarán sus compañías')}</p>

          <div className="superadmin-search">
            <IoSearchOutline size={18} aria-hidden="true" />
            <input
              type="search"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={t('superadmin.searchUser', 'Buscar por correo electrónico')}
              aria-label={t('superadmin.searchUser', 'Buscar por correo electrónico')}
            />
            {userQuery && (
              <span className="superadmin-search__count">
                {visibleUsers.length}/{users.length}
              </span>
            )}
          </div>

          {loading ? (
            <p className="superadmin-muted">{t('common.loading', 'Cargando...')}</p>
          ) : users.length === 0 ? (
            <p className="superadmin-muted">{t('superadmin.noUsers', 'Aún no hay usuarios.')}</p>
          ) : visibleUsers.length === 0 ? (
            <p className="superadmin-muted">
              {t('superadmin.noUsersMatch', 'Ningún usuario coincide con la búsqueda.')}
            </p>
          ) : (
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>{t('superadmin.colEmail', 'Correo')}</th>
                  <th>{t('superadmin.colUsername', 'Usuario')}</th>
                  <th>{t('superadmin.colCampus', 'Sede')}</th>
                  <th>{t('superadmin.colRoles', 'Roles')}</th>
                  <th>{t('superadmin.colActions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>
                      {(() => {
                        const campus = user.campusId ? campusNameById.get(user.campusId) : null;
                        if (!campus) return <span className="superadmin-muted">—</span>;
                        return (
                          <span title={campus.city ? `${campus.name} · ${campus.city}` : campus.name}>
                            {campus.name}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="superadmin-badges">
                        {(user.roles || []).map((role) => (
                          <span key={role} className="superadmin-badge on">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="superadmin-actions">
                        {roleCatalog
                          .filter((role) => role.name !== 'SUPER_ADMIN')
                          .map((role) => {
                            const granted = (user.roles || []).includes(role.name);
                            return (
                              <button
                                key={role.name}
                                type="button"
                                className={`superadmin-btn small${granted ? ' active' : ''}`}
                                title={role.description}
                                disabled={savingRoles === user.id}
                                onClick={() => handleToggleRole(user, role.name)}
                              >
                                {role.name}
                              </button>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

export default SuperAdminScreen;
