import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import apiClient from './apiClient'

/**
 * Notificaciones push de alertas ambientales (Expo).
 *
 * <p>El backend (ms-environment-monitoring) envia el push a los dispositivos de
 * la institucion del ambiente cuando se genera una alerta. Aqui solo se registra
 * el token del dispositivo y se maneja el toque en la notificacion.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID

/**
 * Pide permiso, obtiene el token Expo y lo registra en el backend.
 * Devuelve el token o null si no aplica (emulador, sin projectId o sin permiso).
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('[push] Se necesita un dispositivo fisico para las notificaciones')
    return null
  }
  if (!EAS_PROJECT_ID) {
    console.warn('[push] Falta el EAS projectId (extra.eas.projectId o EXPO_PUBLIC_EAS_PROJECT_ID)')
    return null
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status
  }
  if (status !== 'granted') {
    console.warn('[push] Permiso de notificaciones denegado')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alertas ambientales',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data
  try {
    await apiClient.post('/api/v1/push-tokens', { token, platform: Platform.OS })
  } catch (e) {
    console.warn('[push] No se pudo registrar el token:', e?.message)
  }
  return token
}

/** Escucha el toque en una notificacion y entrega el `data` del push. */
export function addNotificationTapHandler(onTap) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data
    onTap?.(data)
  })
}
