import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AppState } from 'react-native'
import { useToast } from '../shared/components/Toast/Toast.jsx'
import environmentService from '../modules/environment/services/environmentService'
import storage from '../shared/storage/storage'

const EnvironmentContext = createContext()

// Solo hay sesión real si quedan tokens: sin esta guarda el polling global
// petiría la API cada 10 s también en la pantalla de login.
function hasSession() {
  return Boolean(storage.getItem('token') || storage.getItem('refreshToken'))
}

export function EnvironmentProvider({ children }) {
  const toast = useToast()
  const [environments, setEnvironments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `showErrors = false` es el refresh del polling: conserva los datos y no
  // spamea toasts si un tick falla por red.
  const loadEnvironments = useCallback(
    async (showErrors = true) => {
      try {
        const items = await environmentService.getAll()
        let favoriteIds = []
        try {
          favoriteIds = await environmentService.getFavoriteIds()
        } catch {
          // favoritos son best-effort: la lista de ambientes sigue siendo válida
        }
        const favoriteSet = new Set(favoriteIds)
        setEnvironments(items.map((env) => ({ ...env, isFavorite: favoriteSet.has(env.id) })))
        setError(null)
      } catch (e) {
        setError(e.message)
        if (showErrors) toast.error(e.message)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  const refreshEnvironments = useCallback(() => loadEnvironments(true), [loadEnvironments])

  useEffect(() => {
    loadEnvironments(true)
  }, [loadEnvironments])

  // Frescura app-wide: los ambientes se refrescan solos cada 10 s mientras la
  // app está en primer plano (y al volver de background), para que todas las
  // pantallas tengan datos nuevos sin montar su propio timer.
  useEffect(() => {
    const tick = () => {
      if (AppState.currentState !== 'active' || !hasSession()) return
      loadEnvironments(false)
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick()
    })
    const interval = setInterval(tick, 10000)
    return () => {
      subscription.remove()
      clearInterval(interval)
    }
  }, [loadEnvironments])

  const toggleFavorite = useCallback((id) => {
    return environmentService
      .toggleFavorite(id)
      .then((isFavorite) => {
        setEnvironments((prev) => prev.map((env) => (env.id === id ? { ...env, isFavorite } : env)))
        return isFavorite
      })
      .catch((e) => {
        toast.error(e.message)
        return null
      })
  }, [toast])

  // Tras cada mutación se recarga la lista completa para que los ambientes
  // nuevos/editados traigan métricas, campus y statusKey reales (antes el
  // `toUi` del POST/PATCH devolvía el objeto sin métricas y la UI perdía datos).
  const addEnvironment = useCallback(async (data) => {
    try {
      await environmentService.create(data)
      await refreshEnvironments()
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    }
  }, [refreshEnvironments, toast])

  const editEnvironment = useCallback(async (id, data) => {
    try {
      await environmentService.update(id, data)
      await refreshEnvironments()
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    }
  }, [refreshEnvironments, toast])

  const deleteEnvironment = useCallback(async (id) => {
    try {
      await environmentService.delete(id)
      setEnvironments((prev) => prev.filter((env) => env.id !== id))
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    }
  }, [toast])

  return (
    <EnvironmentContext.Provider
      value={{
        environments,
        loading,
        error,
        toggleFavorite,
        addEnvironment,
        editEnvironment,
        deleteEnvironment,
        refreshEnvironments,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  return useContext(EnvironmentContext)
}

export const useEnvironments = useEnvironment
