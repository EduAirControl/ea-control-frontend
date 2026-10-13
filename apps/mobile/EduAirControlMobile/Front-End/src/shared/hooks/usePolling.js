import { useEffect, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'

/**
 * Ejecuta `callback` inmediatamente y luego cada `intervalMs` mientras la
 * pantalla está enfocada. El timer se pausa al desenfocar (backdrop, otro
 * stack, app en background) para no quemar batería ni spamear la API.
 */
export function usePolling(callback, intervalMs = 30000) {
  const saved = useRef(callback)
  saved.current = callback

  useFocusEffect(
    useEffect(() => {
      saved.current()
      const id = setInterval(() => saved.current(), intervalMs)
      return () => clearInterval(id)
    }, [intervalMs])
  )
}
