import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useToast } from '../shared/components/Toast/Toast.jsx'
import environmentService from '../modules/environment/services/environmentService'

const EnvironmentContext = createContext()

export function EnvironmentProvider({ children }) {
  const toast = useToast()
  const [environments, setEnvironments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshEnvironments = useCallback(async () => {
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
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refreshEnvironments()
  }, [refreshEnvironments])

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
