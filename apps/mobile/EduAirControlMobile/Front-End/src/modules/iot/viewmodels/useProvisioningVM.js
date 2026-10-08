/**
 * ViewModel: useProvisioningVM
 *
 * Puesta en marcha de un nodo ESP32 completa desde el movil, sin recompilar.
 *
 *   idle -> scanning -> connecting -> ready -> resolving -> sending
 *        -> waiting -> provisioning -> success | error
 *
 * Las fases nuevas respecto al flujo original:
 *   resolving     consulta sensores e instalaciones y pide el token al backend
 *   provisioning  el ESP32 ya tiene WiFi y esta canjeando el token por HTTPS
 *
 * Estados que notifica el firmware:
 *   STATUS:CONNECTED    -> WiFi listo, paso a la fase de aprovisionamiento
 *   STATUS:PROVISIONED  -> config guardada en NVS, listo para publicar
 *   STATUS:FAIL         -> fallo la conexion WiFi
 *   STATUS:ERR_JSON     -> el BLE mando algo que el firmware no pudo parsear
 *   STATUS:ERR_PROVISION-> el token fue rechazado o ya se uso
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ensureBlePermissions,
  scanAndConnect,
  subscribeStatus,
  sendCredentials,
  readDeviceMac,
  disconnect,
  destroyBleManager,
  toBleErrorKey,
} from '../ble/bleProvisioning'
import { prepareProvisionToken } from '../services/provisioningService'

/** Margen para el canje HTTPS del token, aparte del handshake BLE. */
const WIFI_TIMEOUT_MS = 45000
const PROVISION_TIMEOUT_MS = 40000

export function useProvisioningVM() {
  const [phase, setPhase] = useState('idle')
  const [log, setLog] = useState([])
  const [errorKey, setErrorKey] = useState(null)
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [bleDevice, setBleDevice] = useState(null)
  const [deviceMac, setDeviceMac] = useState(null)

  const subscriptionRef = useRef(null)
  const statusResolverRef = useRef(null)
  const deviceRef = useRef(null)

  const pushLog = useCallback((key, raw) => {
    setLog((current) => [...current, { key, raw, at: Date.now() }])
  }, [])

  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove?.()
      subscriptionRef.current = null
    }
    if (deviceRef.current) {
      await disconnect(deviceRef.current)
      deviceRef.current = null
    }
    setBleDevice(null)
  }, [])

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.remove?.()
      if (deviceRef.current) disconnect(deviceRef.current)
      destroyBleManager()
    }
  }, [])

  const startScan = useCallback(async () => {
    setErrorKey(null)
    setPhase('scanning')
    setDeviceMac(null)
    pushLog('provisioning.log.permissions')

    try {
      await ensureBlePermissions()
    } catch (e) {
      setPhase('error')
      setErrorKey(toBleErrorKey(e))
      pushLog('provisioning.log.error')
      return null
    }

    pushLog('provisioning.log.scanning')
    try {
      const device = await scanAndConnect({
        onStatus: (status) => {
          if (status === 'mtu-fallback') {
            pushLog('provisioning.log.mtuFallback')
          } else if (status === 'connecting') {
            setPhase('connecting')
            pushLog('provisioning.log.connecting')
          }
        },
      })

      deviceRef.current = device
      setBleDevice(device)

      subscriptionRef.current = subscribeStatus(
        device,
        (message) => {
          pushLog('provisioning.log.status', message)
          const resolver = statusResolverRef.current
          if (resolver) {
            statusResolverRef.current = null
            resolver(message)
          }
        },
        () => {}
      )

      // La MAC la declara el firmware, no la plataforma BLE: en iOS device.id es
      // un UUID y el backend rechaza el alta con 400.
      const mac = await readDeviceMac(device)
      setDeviceMac(mac)
      if (mac) {
        pushLog('provisioning.log.mac', mac)
      } else {
        pushLog('provisioning.log.macUnavailable')
      }

      setPhase('ready')
      pushLog('provisioning.log.ready')
      return device
    } catch (e) {
      setPhase('error')
      setErrorKey(toBleErrorKey(e))
      pushLog('provisioning.log.error')
      return null
    }
  }, [pushLog])

  const submit = useCallback(async ({ educationalEnvironmentId, name } = {}) => {
    const device = deviceRef.current
    if (!device) {
      setPhase('error')
      setErrorKey('devices.errors.notConnected')
      return null
    }
    if (!ssid.trim()) {
      setErrorKey('provisioning.errors.ssid')
      return null
    }
    if (!educationalEnvironmentId) {
      setErrorKey('provisioning.errors.environment')
      return null
    }
    // Sin MAC declarada por el firmware no se puede dar de alta el dispositivo:
    // se inventa una? No. Se pide al usuario que la introduzca a mano.
    if (!deviceMac) {
      setErrorKey('devices.errors.macRequired')
      return null
    }

    setErrorKey(null)

    // --- Fase 1: el backend resuelve el paquete de aprovisionamiento ---
    setPhase('resolving')
    pushLog('provisioning.log.resolving')
    let prepared
    try {
      prepared = await prepareProvisionToken({
        macAddress: deviceMac,
        name,
        educationalEnvironmentId,
      })
    } catch (error) {
      setPhase('error')
      setErrorKey(toProvisioningErrorKey(error))
      pushLog('provisioning.log.error', error.message)
      return null
    }

    pushLog('provisioning.log.resolved', `${prepared.bindings.length} variable(s)`)
    for (const skipped of prepared.skipped || []) {
      pushLog('provisioning.log.skipped', skipped.serialNumber)
    }

    // --- Fase 2: BLE, wifi ---
    setPhase('sending')
    pushLog('provisioning.log.sending')

    const statusPromise = new Promise((resolve) => {
      statusResolverRef.current = resolve
    })

    try {
      await sendCredentials(device, {
        ssid: ssid.trim(),
        password,
        token: prepared.token,
      })
    } catch (e) {
      statusResolverRef.current = null
      setPhase('error')
      setErrorKey('devices.errors.generic')
      pushLog('provisioning.log.error')
      return null
    }

    setPhase('waiting')
    pushLog('provisioning.log.waiting')

    const wifiStatus = await Promise.race([
      statusPromise,
      new Promise((resolve) => setTimeout(() => resolve('STATUS:TIMEOUT'), WIFI_TIMEOUT_MS)),
    ])

    if (wifiStatus === 'STATUS:FAIL') {
      setPhase('error')
      setErrorKey('devices.errors.wifiFail')
      pushLog('provisioning.log.fail')
      return 'fail'
    }
    if (wifiStatus === 'STATUS:ERR_JSON') {
      setPhase('error')
      setErrorKey('devices.errors.badPayload')
      pushLog('provisioning.log.errJson')
      return 'error'
    }
    if (wifiStatus !== 'STATUS:CONNECTED') {
      setPhase('error')
      setErrorKey('devices.errors.timeout')
      pushLog('provisioning.log.error')
      return 'timeout'
    }

    pushLog('provisioning.log.connected')

    // --- Fase 3: el ESP32 canjea el token por HTTPS ---
    setPhase('provisioning')
    pushLog('provisioning.log.provisioning')

    const provisionPromise = new Promise((resolve) => {
      statusResolverRef.current = resolve
    })

    const provisionStatus = await Promise.race([
      provisionPromise,
      new Promise((resolve) => setTimeout(() => resolve('STATUS:TIMEOUT'), PROVISION_TIMEOUT_MS)),
    ])

    if (provisionStatus === 'STATUS:PROVISIONED') {
      setPhase('success')
      pushLog('provisioning.log.provisioned')
      await cleanup()
      return 'connected'
    }

    if (provisionStatus === 'STATUS:ERR_PROVISION') {
      setPhase('error')
      setErrorKey('provisioning.errors.tokenRejected')
      pushLog('provisioning.log.errProvision')
      await cleanup()
      return 'error'
    }

    setPhase('error')
    setErrorKey('provisioning.errors.provisionTimeout')
    pushLog('provisioning.log.error')
    return 'timeout'
  }, [ssid, password, deviceMac, pushLog, cleanup])

  const reset = useCallback(async () => {
    await cleanup()
    setPhase('idle')
    setErrorKey(null)
    setLog([])
    setPassword('')
    setDeviceMac(null)
  }, [cleanup])

  return {
    phase,
    log,
    errorKey,
    ssid,
    password,
    bleDevice,
    deviceMac,
    isBusy:
      phase === 'scanning' ||
      phase === 'connecting' ||
      phase === 'resolving' ||
      phase === 'sending' ||
      phase === 'waiting' ||
      phase === 'provisioning',
    setSsid,
    setPassword,
    startScan,
    submit,
    reset,
    cleanup,
  }
}

/** Errores del backend de aprovisionamiento -> claves i18n. */
function toProvisioningErrorKey(error) {
  const status = error?.status
  if (status === 401) return 'errors.sessionExpired'
  if (status === 403) return 'errors.forbidden'
  if (status === 404) return 'errors.notFound'
  if (status === 409) return 'provisioning.errors.tokenRejected'

  const message = String(error?.message || '')
  if (message.includes('noInstallations')) return 'provisioning.errors.noInstallations'
  if (message.includes('noEnvironment')) return 'provisioning.errors.environment'
  if (message.includes('macFormat')) return 'devices.errors.macFormat'
  return 'provisioning.errors.backend'
}

export default useProvisioningVM