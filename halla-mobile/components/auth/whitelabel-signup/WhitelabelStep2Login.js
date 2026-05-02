import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EmailInput, MobileInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const WhitelabelStep2Login = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.loginData.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.loginData.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.loginData.contactSection')} icon="person-circle-outline">
        <EmailInput
          name="loginData.email"
          label={t('signupForm.whiteLabel.loginData.email')}
          placeholder={t('signupForm.whiteLabel.loginData.emailPlaceholder')}
        />
        <MobileInput
          name="loginData.phoneNumber"
          label={t('signupForm.whiteLabel.loginData.phone')}
          placeholder={t('signupForm.whiteLabel.loginData.phonePlaceholder')}
        />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});

export default WhitelabelStep2Login;
