import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import './SocialLoginButtons.css';

function SocialLoginButtons() {
  const { t } = useTranslation();

  const handleSocialLogin = (provider) => {
    window.location.assign(`/api/v1/auth/oauth2/${provider}`);
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
          onClick={() => handleSocialLogin('google')}
        >
          <FcGoogle size={20} />
          <span>{t('login.googleBtn', 'Google')}</span>
        </button>
        <button
          type="button"
          className="social-btn social-btn-facebook"
          onClick={() => handleSocialLogin('facebook')}
        >
          <FaFacebook size={20} />
          <span>{t('login.facebookBtn', 'Facebook')}</span>
        </button>
      </div>
    </>
  );
}

export default SocialLoginButtons;
