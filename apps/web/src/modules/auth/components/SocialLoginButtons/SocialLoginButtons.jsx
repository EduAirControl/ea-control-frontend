import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import apiClient from '../../../../shared/services/apiClient';
import './SocialLoginButtons.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`;

function SocialLoginButtons() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleGoogleCredential = useCallback(async (response) => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/oauth2/google/callback', {
        credential: response.credential,
      });
      // El backend establece la cookie de sesión BFF
      // Refrescar para que AuthContext detecte la sesión
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Google login error:', err);
      setLoading(false);
    }
  }, []);

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }

    // Cargar GIS si no está disponible
    if (!window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.prompt();
      };
      document.head.appendChild(script);
      return;
    }

    // GIS ya cargado
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.prompt();
  };

  const handleFacebookClick = () => {
    window.location.assign(`${API_BASE}/api/v1/auth/oauth2/facebook`);
  };

  return (
    <>
      <div className="social-divider">
        <span>{t('login.socialDivider', 'o continúa con')}</span>
      </div>
      <div className="social-btn-group">
        <button
          type="button"
          className="social-btn social-btn-google"
          onClick={handleGoogleClick}
          disabled={loading}
        >
          <FcGoogle size={20} />
          <span>{t('login.googleBtn', 'Google')}</span>
        </button>
        <button
          type="button"
          className="social-btn social-btn-facebook"
          onClick={handleFacebookClick}
          disabled={loading}
        >
          <FaFacebook size={20} />
          <span>{t('login.facebookBtn', 'Facebook')}</span>
        </button>
      </div>
    </>
  );
}

export default SocialLoginButtons;
