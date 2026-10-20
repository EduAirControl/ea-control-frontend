import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import ForgotPasswordForm from '../../components/ForgotPasswordForm/ForgotPasswordForm';
import BackButton from '../../../../shared/components/BackButton/BackButton';
import './ForgotPassword.css';

function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AuthLayout className="auth-login-background">
      <div className="forgot-password-content">
        <BackButton onClick={() => navigate('/login')} />
        <h1>{t('forgotPassword.title')}</h1>
        <p className="forgot-description">{t('forgotPassword.description')}</p>
        <ForgotPasswordForm />
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordScreen;
