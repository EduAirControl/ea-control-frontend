import { useEffect, useRef, useState } from 'react';
import {
  IoSearchOutline,
  IoAddOutline,
  IoSwapVerticalOutline,
  IoChevronDownOutline,
  IoCheckmarkCircleOutline,
  IoNotificationsOutline,
  IoWarningOutline,
  IoSchoolOutline,
} from 'react-icons/io5';
import { MdOutlineGridView } from 'react-icons/md';
import { TbBuildingCommunity } from 'react-icons/tb';
import { useTranslation } from 'react-i18next';
import Navbar from '../../dashboard/components/Navbar/Navbar';
import ManagementCard from '../components/management/ManagementCard/ManagementCard';
import AddEnvironmentModal from '../components/management/AddEnvironmentModal/AddEnvironmentModal';
import EditEnvironmentModal from '../components/management/EditEnvironmentModal/EditEnvironmentModal';
import DeleteEnvironmentModal from '../components/management/DeleteEnvironmentModal/DeleteEnvironmentModal';
import CampusManagementPanel from '../components/management/CampusManagementPanel/CampusManagementPanel';
import { useManagementVM } from '../viewmodels/useManagementVM';
import './EnvironmentManagement.css';

// Tarjeta reutilizable: recibe por props todo lo que antes estaba
// quemado en cada bloque (ícono, etiqueta, valor, modificador de
// color y el filtro que debe activar al hacer click).
function SummaryCard({ modifier, icon, label, value, onClick }) {
  return (
    <div
      className={`env-management-summary-card env-management-summary-card--${modifier}`}
      onClick={onClick}
    >
      <div
        className={`env-management-summary-card__icon env-management-summary-card__icon--${modifier}`}
      >
        {icon}
      </div>
      <div className="env-management-summary-card__info">
        <span className="env-management-summary-card__label">{label}</span>
        <span
          className={`env-management-summary-card__value env-management-summary-card__value--${modifier}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function ViewDropdown({ activeView, setActiveView, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const firstOptionRef = useRef(null);
  const views = [
    {
      value: 'environments',
      label: t('management.environmentsTab', 'Ambientes'),
    },
    {
      value: 'campuses',
      label: t('management.campusesTab', 'Sedes'),
    },
  ];
  const selectedView = views.find((view) => view.value === activeView) ?? views[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    firstOptionRef.current?.focus();

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const handleMenuKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const options = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')];
    const currentIndex = options.indexOf(document.activeElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : options.length - 1)) %
            options.length;
    options[nextIndex]?.focus();
  };

  const selectView = (view) => {
    setActiveView(view.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <span className="env-management-view-select" ref={dropdownRef}>
      <button
        type="button"
        className="env-management-view-select__trigger"
        aria-label={t('management.viewsAria', 'Sección de gestión')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
      >
        {selectedView.label}
        <IoChevronDownOutline aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          className="env-management-view-select__menu"
          role="menu"
          aria-label={t('management.viewsAria', 'Sección de gestión')}
          onKeyDown={handleMenuKeyDown}
        >
          {views.map((view, index) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={view.value === activeView}
              className="env-management-view-select__option"
              key={view.value}
              onClick={() => selectView(view)}
              ref={index === 0 ? firstOptionRef : undefined}
            >
              <span>{view.label}</span>
              {view.value === activeView && (
                <span className="env-management-view-select__indicator" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function EnvironmentManagement() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('environments');
  const {
    filtered,
    stats,
    search,
    minCapacity,
    maxCapacity,
    showAdd,
    editEnv,
    deleteEnv,
    sortBy,
    setSearch,
    setMinCapacity,
    setMaxCapacity,
    setShowAdd,
    setEditEnv,
    openDelete,
    setDeleteEnv,
    handleAdd,
    handleEdit,
    handleDelete,
    setActiveFilter,
    setSortBy,
  } = useManagementVM();

  const summaryDefinitions = [
    {
      modifier: 'total',
      icon: <TbBuildingCommunity size={19} />,
      labelKey: 'management.summaryTotal',
      fallback: 'Total',
      value: stats.total,
      filter: 'all',
    },
    {
      modifier: 'normal',
      icon: <IoCheckmarkCircleOutline size={19} />,
      labelKey: 'management.summaryNormal',
      fallback: 'Normal',
      value: stats.normals,
      filter: 'normal',
    },
    {
      modifier: 'warning',
      icon: <IoNotificationsOutline size={19} />,
      labelKey: 'management.summaryWarnings',
      fallback: 'Advertencias',
      value: stats.warnings,
      filter: 'warning',
    },
    {
      modifier: 'alert',
      icon: <IoWarningOutline size={19} />,
      labelKey: 'management.summaryAlerts',
      fallback: 'En Alerta',
      value: stats.alerts,
      filter: 'alert',
    },
  ];

  // Ciclo forEach: recorre las definiciones y arma cada tarjeta con
  // los datos y props correspondientes.
  const summaryCards = [];
  summaryDefinitions.forEach((item) => {
    summaryCards.push(
      <SummaryCard
        key={item.modifier}
        modifier={item.modifier}
        icon={item.icon}
        label={t(item.labelKey, item.fallback)}
        value={item.value}
        onClick={() => setActiveFilter(item.filter)}
      />
    );
  });

  return (
    <div className="env-management-page">
      <Navbar />
      <main id="main-content">
      <div className="env-management">
        {/* ── Top bar ── */}
        <div className="env-management-topbar">
          <div className="env-management-topbar__left">
            <span className="env-management-topbar__icon">
              <MdOutlineGridView size={19} />
            </span>
            <h1 className="env-management-topbar__title">
              <span>{t('management.titlePrefix', 'Gestión de')}</span>
              <ViewDropdown activeView={activeView} setActiveView={setActiveView} t={t} />
            </h1>
          </div>

          <div className="env-management-topbar__actions">
            <div className="env-management-search">
              <span className="env-management-search__icon">
                <IoSearchOutline size={15} />
              </span>
              <input
                className="env-management-search__input"
                placeholder={t('management.searchPlaceholder', 'Buscar ambientes…')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {activeView === 'environments' && (
              <button className="env-management-add-btn" onClick={() => setShowAdd(true)}>
                <IoAddOutline size={17} />
                {t('management.addBtn', 'Agregar Ambiente')}
              </button>
            )}
          </div>
        </div>

        {activeView === 'campuses' ? (
          <CampusManagementPanel />
        ) : (
          <>
            {/* ── Summary cards ── */}
            <div className="env-management-summary">{summaryCards}</div>

            {/* ── Capacidad + Ordenar ── */}
            <div className="env-management-controls">
              <div className="env-management-controls__capacity">
                <span className="env-management-controls__capacity-label">
                  {t('management.capacityLabel', 'Capacidad:')}
                </span>
                <input
                  className="env-management-controls__capacity-input"
                  type="number"
                  min={0}
                  placeholder={t('management.min', 'Mín')}
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value.replace(/[^\d]/g, ''))}
                />
                <span className="env-management-controls__capacity-sep">–</span>
                <input
                  className="env-management-controls__capacity-input"
                  type="number"
                  min={0}
                  placeholder={t('management.max', 'Máx')}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>

              <div className="env-management-controls__divider" />

              <div className="env-management-sort">
                <IoSwapVerticalOutline size={13} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">{t('management.sortName', 'Nombre')}</option>
                  <option value="capacity">{t('management.sortCapacity', 'Capacidad')}</option>
                  <option value="status">{t('management.sortStatus', 'Estado')}</option>
                </select>
              </div>
            </div>

            {/* ── Contador de resultados ── */}
            <div className="env-management-results-info">
              <span className="env-management-results-count">
                {t('management.resultsCount', 'Mostrando')} <strong>{filtered.length}</strong>{' '}
                {t('management.resultsOf', 'de')} <strong>{stats.total}</strong>{' '}
                {t('management.resultsEnvironments', 'ambientes')}
              </span>
            </div>

            {/* ── Lista ── */}
            <div className="env-management-list">
              {filtered.length === 0 ? (
                <div className="env-management-empty">
                  <div className="env-management-empty__icon">
                    <IoSchoolOutline aria-hidden="true" />
                  </div>
                  <h3 className="env-management-empty__title">
                    {search
                      ? t('management.noResultsSearch', 'Sin resultados para tu búsqueda')
                      : t('management.noResults', 'No hay ambientes aún')}
                  </h3>
                  <p className="env-management-empty__sub">
                    {search
                      ? t(
                          'management.noResultsSearchSub',
                          'Intenta con otro término o limpia los filtros'
                        )
                      : t(
                          'management.noResultsSub',
                          'Agrega el primer ambiente para comenzar a monitorear'
                        )}
                  </p>
                  {search ? (
                    <button
                      className="env-management-empty__btn"
                      onClick={() => {
                        setSearch('');
                        setMinCapacity('');
                        setMaxCapacity('');
                        setActiveFilter('all');
                      }}
                    >
                      {t('management.clearSearch', 'Limpiar búsqueda')}
                    </button>
                  ) : (
                    <button className="env-management-empty__btn" onClick={() => setShowAdd(true)}>
                      {t('management.addBtn', 'Agregar Ambiente')}
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((env) => (
                  <ManagementCard
                    key={env.id}
                    environment={env}
                    onEdit={setEditEnv}
                    onDelete={openDelete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
      </main>

      {showAdd && <AddEnvironmentModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {editEnv && (
        <EditEnvironmentModal
          environment={editEnv}
          onClose={() => setEditEnv(null)}
          onSave={handleEdit}
        />
      )}
      {deleteEnv && (
        <DeleteEnvironmentModal
          environment={deleteEnv}
          onClose={() => setDeleteEnv(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export default EnvironmentManagement;
