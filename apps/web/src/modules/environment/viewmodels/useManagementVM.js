/**
 * ViewModel: useManagementVM
 * Lógica de la pantalla de gestión de ambientes.
 * Incluye filtrado por estado, búsqueda y ordenamiento.
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useEnvironments } from '../../../context/useEnvironment';
import { useToast } from '../../../shared/hooks/useToast';

export function useManagementVM() {
  const { t } = useTranslation();
  const toast = useToast();
  const { environments, addEnvironment, editEnvironment, deleteEnvironment, refreshEnvironments } =
    useEnvironments();

  // Auto-refresh (igual que el dashboard): las metricas de los ambientes
  // (temperatura, estado, ...) llegan del ESP32 cada pocos segundos; sin
  // polling la lista quedaba congelada en la carga inicial. 10 s mantiene
  // el consumo del rate limit del gateway muy por debajo del limite.
  // Si la pestaña está oculta no se peta: al volver se refresca una vez.
  useEffect(() => {
    const REFRESH_MS = 10000;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      refreshEnvironments();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const interval = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshEnvironments]);

  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editEnv, setEditEnv] = useState(null);
  const [deleteEnv, setDeleteEnv] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const filtered = useMemo(() => {
    // 1. Text filter (name only, using proper locale-aware display name)
    let result = environments.filter((env) => {
      if (!search.trim()) return true;
      const name = env.nameKey ? t(env.nameKey) : env.name || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });

    // 2. Capacity filter (exact numeric range, not string contains)
    const min = minCapacity.trim() === '' ? null : Number(minCapacity);
    const max = maxCapacity.trim() === '' ? null : Number(maxCapacity);
    if (min !== null) result = result.filter((env) => (env.capacity || 0) >= min);
    if (max !== null) result = result.filter((env) => (env.capacity || 0) <= max);

    // 3. Status filter
    if (activeFilter !== 'all') {
      const keyMap = {
        normal: 'dashboard.statusNormal',
        warning: 'dashboard.statusWarning',
        alert: 'dashboard.statusAlert',
      };
      const target = keyMap[activeFilter];
      result = result.filter((env) => (env.statusKey || 'dashboard.statusNormal') === target);
    }

    // 4. Sort
    const statusOrder = {
      'dashboard.statusAlert': 0,
      'dashboard.statusWarning': 1,
      'dashboard.statusNormal': 2,
      undefined: 3,
    };

    result = [...result].sort((a, b) => {
      if (sortBy === 'capacity') {
        return (b.capacity || 0) - (a.capacity || 0);
      }
      if (sortBy === 'status') {
        const aOrder = statusOrder[a.statusKey] ?? 3;
        const bOrder = statusOrder[b.statusKey] ?? 3;
        return aOrder - bOrder;
      }
      const nameA = a.nameKey ? t(a.nameKey) : a.name || '';
      const nameB = b.nameKey ? t(b.nameKey) : b.name || '';
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [environments, search, minCapacity, maxCapacity, activeFilter, sortBy, t]);

  const stats = useMemo(
    () => ({
      total: environments.length,
      alerts: environments.filter((e) => e.statusKey === 'dashboard.statusAlert').length,
      warnings: environments.filter((e) => e.statusKey === 'dashboard.statusWarning').length,
      normals: environments.filter((e) => e.statusKey === 'dashboard.statusNormal' || !e.statusKey)
        .length,
    }),
    [environments]
  );

  const handleAdd = async (data) => {
    try {
      await addEnvironment(data);
      setShowAdd(false);
      toast.success(t('management.toast.created', 'Ambiente agregado'));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await editEnvironment(id, data);
      setEditEnv(null);
      toast.success(t('management.toast.updated', 'Cambios guardados'));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEnvironment(id);
      setDeleteEnv(null);
      toast.success(t('management.toast.deleted', 'Ambiente eliminado'));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDelete = (id) => {
    setDeleteEnv(environments.find((e) => e.id === id) || null);
  };

  return {
    // state
    environments,
    filtered,
    stats,
    search,
    minCapacity,
    maxCapacity,
    showAdd,
    editEnv,
    deleteEnv,
    activeFilter,
    sortBy,
    // actions
    setSearch,
    setShowAdd,
    setEditEnv,
    openDelete,
    setDeleteEnv,
    handleAdd,
    handleEdit,
    handleDelete,
    setActiveFilter,
    setSortBy,
    setMinCapacity,
    setMaxCapacity,
  };
}
