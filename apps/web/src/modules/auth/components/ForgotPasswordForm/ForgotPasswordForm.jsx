import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../../shared/components';
import { IoAlertCircleOutline } from 'react-icons/io5';
import authService from '../../services/authService';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email.trim());
      authService.setResetEmail(email.trim());
      navigate('/verify-code');
    } catch (err) {
      setApiError(err.message || t('forgotPassword.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form-modern" onSubmit={handleSubmit}>
      <div className="input-group-modern">
        <Input
          label={t('forgotPassword.emailLabel')}
          type="email"
          placeholder="ejemplo@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {apiError && (
        <p className="error-text">
          <IoAlertCircleOutline aria-hidden="true" /> {apiError}
        </p>
      )}
      <button type="submit" className="btn-login-premium" disabled={isSubmitting}>
        {isSubmitting ? '...' : t('forgotPassword.sendBtn')}
      </button>
    </form>
  );
}

export default ForgotPasswordForm;
