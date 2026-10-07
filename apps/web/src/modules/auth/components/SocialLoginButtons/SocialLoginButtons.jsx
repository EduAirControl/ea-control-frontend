import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import apiClient from '../../../../shared/services/apiClient';
import './SocialLoginButtons.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`;
let gisInitialized = false;

function SocialLoginButtons() {
  const { t } = useTranslation();
  const googleDivRef = useRef(null);
  const [gisReady, setGisReady] = useState(false);

  const handleGoogleCredential = useCallback(async (response) => {
    try {
      const data = await apiClient.post('/api/v1/auth/oauth2/google/callback', {
        credential: response.credential,
      });
      if (data?.token || data?.accessToken) {
        localStorage.setItem('token', data.token || data.accessToken);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || gisInitialized) return;

    const initGis = () => {
      if (!window.google?.accounts?.id) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        gisInitialized = true;
        setGisReady(true);
        return true;
      } catch {
        return false;
      }
    };

    if (initGis()) return;

    const interval = setInterval(() => {
      if (initGis()) clearInterval(interval);
    }, 500);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [handleGoogleCredential]);

  // Renderizar el botón oficial de Google cuando GIS esté listo
  useEffect(() => {
    if (!gisReady || !googleDivRef.current) return;
    try {
      window.google.accounts.id.renderButton(googleDivRef.current, {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'continue_with',
        shape: 'rectangular',
        locale: 'es',
      });
    } catch {
      // fallback: el botón custom sigue funcionando
    }
  }, [gisReady]);

  const handleGoogleClick = () => {
    if (gisReady && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
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
        {/* Botón oficial de Google (renderizado por GIS) */}
        <div ref={googleDivRef} className="social-gis-button" />
        {/* Botón custom de Google (fallback) */}
        {!gisReady && (
          <button
            type="button"
            className="social-btn social-btn-google"
            onClick={handleGoogleClick}
          >
            <FcGoogle size={20} />
            <span>{t('login.googleBtn', 'Google')}</span>
          </button>
        )}
        <button
          type="button"
          className="social-btn social-btn-facebook"
          onClick={handleFacebookClick}
        >
          <FaFacebook size={20} />
          <span>{t('login.facebookBtn', 'Facebook')}</span>
        </button>
      </div>
    </>
  );
}

export default SocialLoginButtons;
