'use client';
import MobileInputGroup from '@/ui/commen/inputs/mobileInputGroup/MobileInputGroup';
import styles from '@/ui/auth/login/form/form.module.css';
import { useTranslation } from 'react-i18next';

const PhoneSection = () => {
  const { t } = useTranslation('login');

  return (
    <div className={styles.otp}>
      <MobileInputGroup
        label={t('loginForm.otpLogin.phoneNumber')}
        type="text"
        name="number"
      />
    </div>
  );
};
export default PhoneSection;
