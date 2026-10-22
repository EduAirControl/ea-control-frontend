import { useEffect, useState } from 'react'
import catalogService from '../../../services/catalogService'
import './AddEnvironmentModal.css'

/**
 * Alta de ambiente educativo (ms-classroom-management).
 *
 * <p>El backend exige {@code code}, {@code name}, {@code campusId} y
 * {@code environmentTypeId} (UUID). Antes el formulario enviaba etiquetas de texto
 * ("Aula", "Área Técnica") y omitía campus y código: la creación devolvía 400.
 *
 * <p>Los umbrales de temperatura se quitaron de aquí a propósito: viven en
 * ms-environment-monitoring (ADR-014) y este formulario los guardaba en ninguna
 * parte.
 */
function AddEnvironmentModal({ onClose, onAdd }) {
  const [name,     setName]     = useState('')
  const [code,     setCode]     = useState('')
  const [capacity, setCapacity] = useState('')
  const [campusId, setCampusId] = useState('')
  const [floor,    setFloor]    = useState('')
  const [envType,  setEnvType]  = useState('')
  const [campuses, setCampuses] = useState([])
  const [types,    setTypes]    = useState([])
  const [loading,  setLoading]  = useState(true)
  // Los catalogos se piden por separado para no perder el que sí respondió: con
  // un unico catch, un fallo de cualquiera de los dos vaciaba ambos desplegables
  // y el admin veía "no hay campus" cuando el problema era otro.
  const [campusError, setCampusError] = useState('')
  const [typeError,   setTypeError]   = useState('')

  useEffect(() => {
    let cancelled = false
    catalogService
      .getCampuses()
      .then((list) => { if (!cancelled) setCampuses(list) })
      .catch((err) => { if (!cancelled) setCampusError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    catalogService
      .getEnvironmentTypes()
      .then((list) => { if (!cancelled) setTypes(list) })
      .catch((err) => { if (!cancelled) setTypeError(err.message) })

    return () => {
      cancelled = true
    }
  }, [])

  // Preselecciona solo cuando no hay elección posible. Con varias sedes (o varios
  // tipos) las elige el usuario: adivinar una sede creaba el ambiente en el
  // tenant equivocado. Se deriva en el render en vez de(setState en un efecto).
  const campusIdEffective = campusId || (campuses.length === 1 ? campuses[0].id : '')
  const envTypeEffective  = envType  || (types.length === 1    ? types[0].id    : '')

  // occupancyCapacity tiene @Min(1) en el backend: mandar 0 devolvía 400 sin
  // explicar por qué, así que Capacidad es obligatoria y se valida aquí.
  const capacityValue = Number(capacity)
  const capacityValid = capacity.trim() !== '' &&
    Number.isInteger(capacityValue) && capacityValue >= 1

  const canSubmit = Boolean(name.trim()) && Boolean(code.trim()) &&
    Boolean(campusIdEffective) && Boolean(envTypeEffective) && capacityValid

  const handleSubmit = () => {
    if (!canSubmit) return
    onAdd({
      name: name.trim(),
      code: code.trim(),
      campusId: campusIdEffective,
      environmentTypeId: envTypeEffective,
      floor: floor.trim() === '' ? undefined : Number(floor),
      capacity: capacityValue,
    })
  }

  return (
    <div className="add-env-overlay" onClick={onClose}>
      <div className="add-env-modal add-env-modal--wide" onClick={(e) => e.stopPropagation()}>

        <h2 className="add-env-modal__title">Agregar Ambiente</h2>

        {/* Fila 1: Código + Nombre */}
        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Código <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              placeholder="Ej. 209-1 (máx. 30)"
              maxLength={30}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Nombre <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              placeholder="Ej. Aula 209-1"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Fila 2: Campus + Capacidad */}
        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Campus <span className="add-env-modal__required">*</span>
            </label>
            <select
              className="add-env-modal__input add-env-modal__select"
              value={campusIdEffective}
              onChange={(e) => setCampusId(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                {loading ? 'Cargando campus…' : 'Seleccionar campus…'}
              </option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!loading && campusError && (
              <span className="add-env-modal__hint">
                No se pudieron cargar las sedes: {campusError}
              </span>
            )}
            {!loading && !campusError && campuses.length === 0 && (
              <span className="add-env-modal__hint">
                Tu institución aún no tiene sedes. Créalas en la pestaña{' '}
                <strong>Campuses</strong> de esta misma pantalla y vuelve aquí.
              </span>
            )}
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Capacidad <span className="add-env-modal__required">*</span>
            </label>
            <input
              className="add-env-modal__input"
              type="number"
              min={1}
              placeholder="Ej. 30"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            {capacity.trim() !== '' && !capacityValid && (
              <span className="add-env-modal__hint">
                La capacidad debe ser un número mayor o igual a 1.
              </span>
            )}
          </div>
        </div>

        {/* Fila 3: Tipo + Piso */}
        <div className="add-env-modal__row">
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">
              Tipo de ambiente <span className="add-env-modal__required">*</span>
            </label>
            <select
              className="add-env-modal__input add-env-modal__select"
              value={envTypeEffective}
              onChange={(e) => setEnvType(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                {loading ? 'Cargando tipos…' : 'Seleccionar tipo…'}
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {!loading && typeError && (
              <span className="add-env-modal__hint">
                No se pudieron cargar los tipos de ambiente: {typeError}
              </span>
            )}
            {!loading && !typeError && types.length === 0 && (
              <span className="add-env-modal__hint">
                No hay tipos de ambiente disponibles. Avisa al administrador del
                sistema.
              </span>
            )}
          </div>
          <div className="add-env-modal__field">
            <label className="add-env-modal__label">Piso / Bloque</label>
            <input
              className="add-env-modal__input"
              type="number"
              placeholder="Ej. 2"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </div>
        </div>

        <div className="add-env-modal__actions">
          <button className="add-env-modal__btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="add-env-modal__btn-save"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Agregar Ambiente
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddEnvironmentModal
