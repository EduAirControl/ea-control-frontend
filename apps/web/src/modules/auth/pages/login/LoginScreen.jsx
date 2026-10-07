import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import AuthSlider from '../../components/AuthSlider/AuthSlider';

function LoginScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useTranslation();
  const initialRegister = searchParams.get('panel') === 'register';
  const passwordReset = location.state?.passwordReset;
  const processedRef = useRef(false);

  // Manejar token del callback social (viene en el hash)
  useEffect(() => {
    if (processedRef.current) return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    processedRef.current = true;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      window.history.replaceState(null, '', window.location.pathname);
      window.location.href = '/dashboard';
    }
  }, []);

  // Manejar error del callback social
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return (
    <AuthLayout className="auth-login-background">
      {passwordReset && (
        <p className="error-text" role="status" style={{ textAlign: 'center', marginBottom: 12 }}>
          ✓ {t('changePassword.success', 'Contraseña actualizada. Inicia sesión.')}
        </p>
      )}
      <AuthSlider initialRegister={initialRegister} />
    </AuthLayout>
  );
}

export default LoginScreen;
