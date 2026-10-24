import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import profileService from '../services/profileService';
import authService from '../../auth/services/authService';
import { usePolling } from '../../../shared/hooks/usePolling';

export function useProfileVM() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' });
  const [form, setForm] = useState({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // El refresh en segundo plano no pisa un formulario que el usuario está
  // editando: solo se actualiza el perfil cuando no hay cambios en curso.
  const loadProfile = useCallback(async () => {
    if (isEditingRef.current) return;
    try {
      const data = await profileService.get();
      // Re-chequeo tras esperar: si el usuario entró en edición durante el
      // fetch, el resultado no debe pisar lo que está escribiendo.
      if (isEditingRef.current) return;
      const same = (value) => JSON.stringify(value) === JSON.stringify(data);
      setProfile((prev) => (same(prev) ? prev : data));
      setForm((prev) => (same(prev) ? prev : data));
      setAvatarUrl((prev) => (prev === (data.avatarUrl || '') ? prev : data.avatarUrl || ''));
    } catch {
      // best-effort: el perfil mostrado sigue siendo válido
    }
  }, []);

  useEffect(() => {
    // Falso positivo de react-hooks/set-state-in-effect: el fetch es async y
    // los setState solo se ejecutan tras el await, nunca síncronos en el effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  usePolling(loadProfile, 10000);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const url = e.target.value;
    setAvatarUrl(url);
    setAvatarError(null);
    const trimmed = url.trim();
    if (!trimmed) return;
    const img = new Image();
    img.onerror = () => setAvatarError('URL de imagen inválida');
    img.src = trimmed;
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setAvatarError(null);
  };

  const handleSave = async () => {
    const fullName = (form.fullName || '').trim();
    // El backend exige fullName (@NotBlank) al crear el perfil.
    if (!fullName) {
      setSaveError('El nombre es obligatorio');
      return;
    }
    setSaveError(null);
    const trimmedUrl = (avatarUrl || '').trim();
    const updated = { ...form, fullName, avatarUrl: trimmedUrl };
    try {
      const saved = await profileService.save(updated);
      const next = { ...updated, ...(saved || {}) };
      setProfile(next);
      setForm(next);
      setAvatarUrl(next.avatarUrl || '');
      setIsEditing(false);
    } catch (e) {
      setSaveError(e?.message || 'No se pudo guardar el perfil');
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setAvatarUrl(profile.avatarUrl || '');
    setIsEditing(false);
    setAvatarError(null);
  };

  const handleLogout = () => {
    authService.logout();
    setLogoutModal(false);
    navigate('/landing');
  };

  return {
    profile,
    form,
    avatarUrl,
    isEditing,
    logoutModal,
    avatarError,
    saveError,
    setIsEditing,
    setLogoutModal,
    handleChange,
    handleAvatarChange,
    handleRemoveAvatar,
    handleSave,
    handleCancel,
    handleLogout,
  };
}
