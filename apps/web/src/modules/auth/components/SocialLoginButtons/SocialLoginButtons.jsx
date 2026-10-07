import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import apiClient from '../../../../shared/services/apiClient';
import './SocialLoginButtons.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_CLIENT_ID = import.meta.env.VITE_FACEBOOK_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/login`;
const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`;

function SocialLoginButtons() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const processedRef = useRef(false);

  // Manejar el callback de Google/Facebook cuando redirigen de vuelta
  useEffect(() => {
    if (processedRef.current) return;

    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    processedRef.current = true;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    if (idToken) {
      // Google: enviar el id_token al backend
      handleGoogleCallback(idToken);
    } else if (accessToken) {
      // Facebook: enviar el access_token al backend
      handleFacebookCallback(accessToken);
    }

    // Limpiar el hash de la URL
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleGoogleCallback = async (credential) => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/oauth2/google/callback', { credential });
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Google login error:', err);
      setLoading(false);
    }
  };

  const handleFacebookCallback = async (accessToken) => {
    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/oauth2/facebook/callback', { accessToken });
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Facebook login error:', err);
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'id_token token',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce: Math.random().toString(36).substring(2),
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  };

  const handleFacebookClick = () => {
    if (!FACEBOOK_CLIENT_ID) {
      console.error('VITE_FACEBOOK_CLIENT_ID not configured');
      return;
    }
    const params = new URLSearchParams({
      client_id: FACEBOOK_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: 'public_profile,email',
    });
    window.location.assign(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
  };

  return (
    <>
      <div className="social-divider">
        <span>{t('login.socialDivider', 'o continúa con')}</span>
      </div>
      <div className="social-btn-group">
        <button type="button" className="social-btn social-btn-google" onClick={handleGoogleClick} disabled={loading}>
          <FcGoogle size={20} />
          <span>{t('login.googleBtn', 'Google')}</span>
        </button>
        <button type="button" className="social-btn social-btn-facebook" onClick={handleFacebookClick} disabled={loading}>
          <FaFacebook size={20} />
          <span>{t('login.facebookBtn', 'Facebook')}</span>
        </button>
      </div>
    </>
  );
}

export default SocialLoginButtons;
