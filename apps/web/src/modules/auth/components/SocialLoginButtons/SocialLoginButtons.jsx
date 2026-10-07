import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import apiClient from '../../../../shared/services/apiClient';
import './SocialLoginButtons.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function SocialLoginButtons() {
  const { t } = useTranslation();
  const googleBtnRef = useRef(null);

  const handleGoogleCredential = useCallback(async (response) => {
    try {
      const data = await apiClient.post('/api/v1/auth/oauth2/google/callback', {
        credential: response.credential,
      });
      if (data?.token || data?.accessToken) {
        localStorage.setItem('token', data.token || data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user || {}));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
  }, [handleGoogleCredential]);

  const handleGoogleClick = () => {
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id && googleBtnRef.current) {
      window.google.accounts.id.prompt();
    } else {
      window.location.assign('/api/v1/auth/oauth2/google');
    }
  };

  const handleFacebookClick = () => {
    window.location.assign('/api/v1/auth/oauth2/facebook');
  };

  return (
    <>
      <div className="social-divider">
        <span>{t('login.socialDivider', 'o continúa con')}</span>
      </div>
      <div className="social-btn-group">
        <button
          type="button"
          ref={googleBtnRef}
          className="social-btn social-btn-google"
          onClick={handleGoogleClick}
        >
          <FcGoogle size={20} />
          <span>{t('login.googleBtn', 'Google')}</span>
        </button>
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
