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
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

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
    const url = e.target.value.trim();
    if (!url) return;
    setAvatarError(null);
    setAvatarLoading(true);
    const img = new Image();
    img.onload = () => {
      setAvatarUrl(url);
      setAvatarLoading(false);
    };
    img.onerror = () => {
      setAvatarLoading(false);
      setAvatarError('URL de imagen inválida');
    };
    img.src = url;
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setAvatarError(null);
  };

  const handleSave = () => {
    const updated = { ...form, avatarUrl };
    setProfile(updated);
    profileService.save(updated);
    setIsEditing(false);
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
  };
}
