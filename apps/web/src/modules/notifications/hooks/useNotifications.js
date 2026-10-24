import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useEnvironments } from "../../../context/useEnvironment";
import { usePolling } from "../../../shared/hooks/usePolling";
import alertService from "../services/alertService";

const SEVERITY_TO_TYPE = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "info",
};

const SEVERITY_TO_LABEL = {
  CRITICAL: "notifications.thresholdAlert",
  WARNING: "notifications.thresholdWarning",
  INFO: "notifications.thresholdInfo",
};

const VARIABLE_TO_LABEL = {
  temperature: "allEnvironments.temperature",
  humidity: "allEnvironments.humidity",
  co2: "allEnvironments.co2",
  noise: "allEnvironments.noise",
};

const VARIABLE_TO_UNIT = {
  temperature: "°C",
  humidity: "%",
  co2: "ppm",
  noise: "dB",
};

/**
 * Alertas reales del backend (ms-environment-monitoring).
 *
 * <p>Se cargan TODAS (activas y reconocidas) para que el panel pueda filtrar y
 * mostrar historial. `read` refleja si la alerta fue reconocida en el backend;
 * reconocer no cambia el estado del ambiente, que depende de los umbrales.
 */
export const useNotifications = () => {
  const { environments } = useEnvironments();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // El nombre del ambiente se resuelve al cargar; el ref permite que `load`
  // sea estable aunque cambie la lista de ambientes (si dependiera de ella,
  // cada tick de 10 s re-petiría las alertas y parpadearía el spinner).
  const environmentsRef = useRef(environments);
  useEffect(() => {
    environmentsRef.current = environments;
  }, [environments]);

  const nameOf = useCallback(
    (environmentId) => {
      const env = environmentsRef.current.find((e) => e.id === environmentId);
      return env?.name || env?.code || null;
    },
    []
  );

  /**
   * `background` = refresh del polling: conserva los datos y el spinner tal
   * como están para que la lista no parpadee cada 10 s.
   */
  const load = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setError(false);
    }
    try {
      const alerts = await alertService.list({ limit: 100 });
      const mapped = alerts.map((a) => ({
        id: a.id,
        type: SEVERITY_TO_TYPE[a.severityCode] || "info",
        severityCode: a.severityCode || "INFO",
        severityLabel: SEVERITY_TO_LABEL[a.severityCode] || "notifications.thresholdInfo",
        environmentId: a.environmentId,
        environmentName: nameOf(a.environmentId),
        variableCode: a.variableCode || "",
        variableLabel: VARIABLE_TO_LABEL[a.variableCode] || a.variableCode || "",
        unit: VARIABLE_TO_UNIT[a.variableCode] || "",
        value: a.triggeringValue,
        thresholdMin: a.thresholdMinValue,
        thresholdMax: a.thresholdMaxValue,
        raisedAt: a.raisedAt ? new Date(a.raisedAt) : null,
        acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : null,
        read: Boolean(a.acknowledgedAt),
        alertId: a.id,
      }));
      mapped.sort((a, b) => (b.raisedAt?.getTime() || 0) - (a.raisedAt?.getTime() || 0));
      setNotifications(mapped);
      setError(false);
    } catch {
      if (!background) {
        setNotifications([]);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [nameOf]);

  useEffect(() => {
    load();
  }, [load]);

  // Las alertas se piden cada 10 s; los nombres de ambientes se re-mapean
  // aquí sin volver a llamar al backend.
  useEffect(() => {
    setNotifications((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        const name = nameOf(n.environmentId);
        if (n.environmentName === name) return n;
        changed = true;
        return { ...n, environmentName: name };
      });
      return changed ? next : prev;
    });
  }, [environments, nameOf]);

  // El panel está montado en el Navbar de todas las pantallas: con este
  // polling el badge y la lista de alertas están frescos en toda la app.
  usePolling(() => load({ background: true }), 10000);

  const active = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const acknowledged = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications]
  );

  const stats = useMemo(
    () => ({
      total: notifications.length,
      active: active.length,
      critical: active.filter((n) => n.severityCode === "CRITICAL").length,
      warning: active.filter((n) => n.severityCode === "WARNING").length,
      acknowledged: acknowledged.length,
    }),
    [notifications, active, acknowledged]
  );

  const unreadCount = stats.active;

  const markAsRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return true;

    const now = new Date();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, acknowledgedAt: now } : n))
    );
    try {
      await alertService.acknowledge(id);
      return true;
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: false, acknowledgedAt: null } : n
        )
      );
      return false;
    }
  };

  const deleteAlert = async (id) => {
    const snapshot = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await alertService.delete(id);
      return true;
    } catch {
      setNotifications(snapshot);
      return false;
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return 0;

    const now = new Date();
    setNotifications((prev) =>
      prev.map((n) => (n.read ? n : { ...n, read: true, acknowledgedAt: now }))
    );
    const results = await Promise.allSettled(
      unread.map((n) => alertService.acknowledge(n.id))
    );
    const failedIds = new Set(
      results
        .map((r, index) => (r.status === "rejected" ? unread[index].id : null))
        .filter(Boolean)
    );
    if (failedIds.size > 0) {
      setNotifications((prev) =>
        prev.map((n) =>
          failedIds.has(n.id) ? { ...n, read: false, acknowledgedAt: null } : n
        )
      );
    }
    return unread.length - failedIds.size;
  };

  const deleteAllRead = async () => {
    const toDelete = notifications.filter((n) => n.read);
    if (toDelete.length === 0) return 0;

    const snapshot = notifications;
    setNotifications((prev) => prev.filter((n) => !n.read));
    const results = await Promise.allSettled(
      toDelete.map((n) => alertService.delete(n.id))
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) setNotifications(snapshot);
    return toDelete.length - failed.length;
  };

  return {
    notifications,
    active,
    acknowledged,
    stats,
    unreadCount,
    loading,
    error,
    refresh: load,
    markAsRead,
    markAllRead,
    deleteAlert,
    deleteAllRead,
  };
};
