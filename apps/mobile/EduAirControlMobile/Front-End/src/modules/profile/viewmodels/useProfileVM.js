import { useState, useEffect, useCallback, useRef } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../../shared/components/Toast/Toast.jsx'
import profileService from '../services/profileService'
import { usePolling } from '../../../shared/hooks/usePolling.js'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

/**
 * Port RN de useProfileVM.
 * - useNavigate se reemplaza por la prop `onLogout` inyectada desde la pantalla.
 * - FileReader / input file se reemplazan por expo-image-picker.
 */
export function useProfileVM({ onLogout } = {}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    title: '',
    phone: '',
    location: '',
    avatarUrl: '',
  })
  const [form, setForm] = useState({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' })
  const [avatar, setAvatar] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  const isEditingRef = useRef(false)
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  // El refresh de 10 s no pisa un formulario en edición: solo se aplica si el
  // usuario no está editando (también tras esperar el fetch).
  const loadProfile = useCallback(async () => {
    if (isEditingRef.current) return
    try {
      const data = await profileService.get()
      if (isEditingRef.current) return
      const same = (value) => JSON.stringify(value) === JSON.stringify(data)
      setProfile((prev) => (same(prev) ? prev : data))
      setForm((prev) => (same(prev) ? prev : data))
      setAvatar((prev) => (prev === (data.avatarUrl || null) ? prev : data.avatarUrl || null))
    } catch {
      // best-effort: el perfil mostrado sigue siendo válido
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  usePolling(loadProfile, 10000)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarChange = useCallback(async (asset) => {
    if (!asset) return
    setAvatarError(null)

    if ((asset.fileSize ?? 0) > MAX_IMAGE_SIZE) {
      setAvatarError(t('profile.avatarSizeError'))
      return
    }

    try {
      setAvatarLoading(true)
      const base64 = asset.base64 || null
      // Sin base64 el backend guardaria una ruta temporal inutilizable.
      if (!base64) {
        setAvatarError(t('profile.avatarReadError'))
        return
      }
      setAvatar(`data:${asset.mimeType || 'image/jpeg'};base64,${base64}`)
    } catch {
      setAvatarError(t('profile.avatarReadError'))
    } finally {
      setAvatarLoading(false)
    }
  }, [t])

  const openAvatarPicker = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setAvatarError(t('profile.avatarPermissionError'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })
    if (!result.canceled && result.assets?.[0]) {
      handleAvatarChange(result.assets[0])
    }
  }, [handleAvatarChange])

  const handleRemoveAvatar = () => {
    setAvatar(null)
    setAvatarError(null)
  }

  const handleSave = async () => {
    const updated = { ...form, avatarUrl: avatar || form.avatarUrl || '' }
    try {
      const saved = await profileService.save(updated)
      const next = { ...updated, ...saved }
      setProfile(next)
      setForm(next)
      setAvatar(next.avatarUrl || null)
      setIsEditing(false)
      toast.success(t('profile.saved', 'Perfil actualizado'))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleCancel = () => {
    setForm(profile)
    setAvatar(profile.avatarUrl || null)
    setIsEditing(false)
    setAvatarError(null)
  }

  const handleLogout = () => {
    setLogoutModal(false)
    onLogout?.()
  }

  return {
    profile,
    form,
    avatar,
    isEditing,
    logoutModal,
    avatarLoading,
    avatarError,
    setIsEditing,
    setLogoutModal,
    handleChange,
    handleAvatarChange,
    handleRemoveAvatar,
    handleSave,
    handleCancel,
    handleLogout,
    openAvatarPicker,
  }
}

export default useProfileVM