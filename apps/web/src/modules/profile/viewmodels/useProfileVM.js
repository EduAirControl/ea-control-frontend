import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import profileService from '../services/profileService';
import authService from '../../auth/services/authService';

export function useProfileVM() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' });
  const [form, setForm] = useState({ fullName: '', email: '', title: '', phone: '', location: '', avatarUrl: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    profileService.get().then((data) => {
      setProfile(data);
      setForm(data);
      setAvatarUrl(data.avatarUrl || '');
    });
  }, []);

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
