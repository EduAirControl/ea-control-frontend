import { useEffect, useMemo, useState } from 'react';
import { MdCo2 } from 'react-icons/md';
import { WiThermometer, WiHumidity } from 'react-icons/wi';
import { HiSpeakerWave } from 'react-icons/hi2';
import catalogService from '../../../services/catalogService';
import environmentService from '../../../services/environmentService';

const VARIABLES = [
  {
    code: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    step: '0.1',
    icon: <WiThermometer aria-hidden="true" />,
  },
  {
    code: 'humidity',
    label: 'Humedad relativa',
    unit: '%',
    step: '1',
    icon: <WiHumidity aria-hidden="true" />,
  },
  {
    code: 'co2',
    label: 'CO₂',
    unit: 'ppm',
    step: '1',
    icon: <MdCo2 aria-hidden="true" />,
  },
  {
    code: 'noise',
    label: 'Ruido',
    unit: 'dB',
    step: '1',
    icon: <HiSpeakerWave aria-hidden="true" />,
  },
];

const SEVERITY_FIELDS = {
  INFO: ['infoMin', 'infoMax'],
  WARNING: ['warningMin', 'warningMax'],
};

function emptyRanges() {
  return Object.fromEntries(
    VARIABLES.map((variable) => [
      variable.code,
      { infoMin: '', infoMax: '', warningMin: '', warningMax: '' },
    ])
  );
}

function isFilled(value) {
  return value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function isValidRange(min, max) {
  return isFilled(min) && isFilled(max) && Number(min) <= Number(max);
}

function EditEnvironmentModal({ environment, onClose, onSave }) {
  const [name, setName] = useState(environment.name || '');
  const [code, setCode] = useState(environment.code || '');
  const [capacity, setCapacity] = useState(environment.capacity || '');
  const [floor, setFloor] = useState(environment.floor ?? '');
  const [campusId, setCampusId] = useState(environment.campusId || '');
  const [environmentTypeId, setEnvironmentTypeId] = useState(environment.environmentTypeId || '');
  const [campuses, setCampuses] = useState([]);
  const [types, setTypes] = useState([]);
  const [ranges, setRanges] = useState(emptyRanges);
  const [thresholdsLoaded, setThresholdsLoaded] = useState(false);
  const [thresholdsError, setThresholdsError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Catálogos reales del backend: la sede y el tipo son UUID, no etiquetas.
  useEffect(() => {
    let cancelled = false;
    catalogService.getCampuses()
      .then((list) => { if (!cancelled) setCampuses(list); })
      .catch(() => { if (!cancelled) setCampuses([]); });
    catalogService.getEnvironmentTypes()
      .then((list) => { if (!cancelled) setTypes(list); })
      .catch(() => { if (!cancelled) setTypes([]); });
    return () => { cancelled = true; };
  }, []);

  // Carga los umbrales INFO (normal) y WARNING (advertencia) efectivos del
  // ambiente. Si el backend aún devuelve solo WARNING, se asume esa severidad.
  useEffect(() => {
    let cancelled = false;
    environmentService
      .getThresholds(environment.id)
      .then((thresholds) => {
        if (cancelled) return;
        setThresholdsLoaded(true);
        setThresholdsError(false);
        setRanges((current) => {
          const next = { ...current };
          for (const threshold of thresholds || []) {
            const variable = next[threshold.variableCode];
            if (!variable) continue;
            const fields = SEVERITY_FIELDS[threshold.severityCode || 'WARNING'];
            if (!fields) continue;
            if (threshold.minValue != null) next[threshold.variableCode] = {
              ...next[threshold.variableCode],
              [fields[0]]: threshold.minValue,
            };
            if (threshold.maxValue != null) next[threshold.variableCode] = {
              ...next[threshold.variableCode],
              [fields[1]]: threshold.maxValue,
            };
          }
          return next;
        });
      })
      .catch(() => {
        // Sin umbrales no se permite guardar: sobrescribir con valores
        // inventados sería peor que dejar el ambiente con su configuración.
        if (cancelled) return;
        setThresholdsLoaded(false);
        setThresholdsError(true);
      });
    return () => { cancelled = true; };
  }, [environment.id]);

  const capacityValue = Number(capacity);
  const capacityValid =
    String(capacity).trim() !== '' && Number.isInteger(capacityValue) && capacityValue >= 1;
  const floorValue = String(floor).trim() === '' ? undefined : Number(floor);
  const floorValid =
    floorValue === undefined || (Number.isInteger(floorValue) && floorValue >= 0);

  const rangesValid = useMemo(
    () =>
      VARIABLES.every((variable) => {
        const range = ranges[variable.code];
        if (!range) return false;
        return (
          isValidRange(range.infoMin, range.infoMax) &&
          isValidRange(range.warningMin, range.warningMax) &&
          Number(range.infoMin) >= Number(range.warningMin) &&
          Number(range.infoMax) <= Number(range.warningMax)
        );
      }),
    [ranges]
  );

  const canSubmit =
    Boolean(name.trim()) && Boolean(code.trim()) && capacityValid && floorValid &&
    Boolean(campusId) && Boolean(environmentTypeId) && thresholdsLoaded &&
    rangesValid && !saving;

  const setRangeValue = (variableCode, field, value) => {
    setRanges((current) => ({
      ...current,
      [variableCode]: { ...current[variableCode], [field]: value },
    }));
  };

  const thresholdsPayload = () =>
    VARIABLES.flatMap((variable) => {
      const range = ranges[variable.code];
      return [
        {
          variableCode: variable.code,
          severityCode: 'INFO',
          minValue: Number(range.infoMin),
          maxValue: Number(range.infoMax),
        },
        {
          variableCode: variable.code,
          severityCode: 'WARNING',
          minValue: Number(range.warningMin),
          maxValue: Number(range.warningMax),
        },
      ];
    });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave(environment.id, {
        name: name.trim(),
        code: code.trim(),
        capacity: capacityValue,
        floor: floorValue,
        campusId,
        environmentTypeId,
      }, thresholdsPayload());
    } catch {
      // el viewmodel ya muestra el toast de error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-env-overlay" onClick={onClose}>
      <div
        className="add-env-modal add-env-modal--wide add-env-modal--scroll"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-environment-title"
      >
        <h2 className="add-env-modal__title" id="edit-environment-title">
          Editar Ambiente
        </h2>

        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Código <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              value={code}
              maxLength={30}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Nombre <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Campus <span className="add-env-modal__required">*</span>
            </label>
            <select
              className="add-env-modal__input add-env-modal__select"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
            >
              <option value="">Seleccionar campus…</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>{campus.name}</option>
              ))}
            </select>
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Tipo de ambiente <span className="add-env-modal__required">*</span>
            </label>
            <select
              className="add-env-modal__input add-env-modal__select"
              value={environmentTypeId}
              onChange={(e) => setEnvironmentTypeId(e.target.value)}
            >
              <option value="">Seleccionar tipo…</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Capacidad <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            {String(capacity).trim() !== '' && !capacityValid && (
              <span className="add-env-modal__hint">
                La capacidad debe ser un número mayor o igual a 1.
              </span>
            )}
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">Piso / Bloque</label>
            <input
              className="add-env-modal__input"
              type="number"
              min={0}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            {!floorValid && (
              <span className="add-env-modal__hint">
                El piso debe ser un número mayor o igual a 0.
              </span>
            )}
          </div>
        </div>

        <div className="add-env-modal__section">
          <div className="add-env-modal__threshold-heading">
            <span className="add-env-modal__label add-env-modal__label--section">
              Umbrales por variable
            </span>
            <span className="add-env-modal__hint">
              Normal = OK. Fuera de normal pero dentro de advertencia = advertencia.
              Fuera de advertencia = alerta.
            </span>
            {thresholdsError && (
              <span className="add-env-modal__threshold-error">
                No se pudieron cargar los umbrales actuales. Reabre el formulario.
              </span>
            )}
            {!thresholdsLoaded && !thresholdsError && (
              <span className="add-env-modal__hint">Cargando umbrales…</span>
            )}
          </div>

          <div className="add-env-modal__thresholds">
            {VARIABLES.map((variable) => {
              const range = ranges[variable.code];
              const variableValid =
                isValidRange(range.infoMin, range.infoMax) &&
                isValidRange(range.warningMin, range.warningMax) &&
                Number(range.infoMin) >= Number(range.warningMin) &&
                Number(range.infoMax) <= Number(range.warningMax);

              return (
                <div className="add-env-modal__threshold" key={variable.code}>
                  <div className="add-env-modal__threshold-title">
                    <span className="add-env-modal__threshold-icon">{variable.icon}</span>
                    <strong>{variable.label}</strong>
                    <span className="add-env-modal__threshold-unit">{variable.unit}</span>
                    {!variableValid && (
                      <span className="add-env-modal__threshold-error">
                        Revisa el orden y la contención de los rangos
                      </span>
                    )}
                  </div>

                  <div className="add-env-modal__threshold-grid">
                    <span className="add-env-modal__threshold-tag add-env-modal__threshold-tag--ok">
                      Normal
                    </span>
                    <input
                      className="add-env-modal__input"
                      type="number"
                      step={variable.step}
                      aria-label={`${variable.label}: mínimo normal`}
                      value={range.infoMin}
                      onChange={(e) => setRangeValue(variable.code, 'infoMin', e.target.value)}
                    />
                    <input
                      className="add-env-modal__input"
                      type="number"
                      step={variable.step}
                      aria-label={`${variable.label}: máximo normal`}
                      value={range.infoMax}
                      onChange={(e) => setRangeValue(variable.code, 'infoMax', e.target.value)}
                    />

                    <span className="add-env-modal__threshold-tag add-env-modal__threshold-tag--warning">
                      Advertencia
                    </span>
                    <input
                      className="add-env-modal__input"
                      type="number"
                      step={variable.step}
                      aria-label={`${variable.label}: mínimo de advertencia`}
                      value={range.warningMin}
                      onChange={(e) => setRangeValue(variable.code, 'warningMin', e.target.value)}
                    />
                    <input
                      className="add-env-modal__input"
                      type="number"
                      step={variable.step}
                      aria-label={`${variable.label}: máximo de advertencia`}
                      value={range.warningMax}
                      onChange={(e) => setRangeValue(variable.code, 'warningMax', e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="add-env-modal__hint">
            El rango normal debe quedar dentro del rango de advertencia. Así el estado
            OK, advertencia y alerta no se solapa.
          </p>
        </div>

        <div className="add-env-modal__actions">
          <button className="add-env-modal__btn-cancel" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="add-env-modal__btn-save"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditEnvironmentModal;
