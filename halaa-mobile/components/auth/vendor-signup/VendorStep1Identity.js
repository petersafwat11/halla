import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput, EmailInput, PasswordInput, MobileInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const VendorStep1Identity = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.identity.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.identity.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.vendor.identity.businessSection')} icon="business-outline">
        <TextInput name="identity.brandName" label={t('signupForm.vendor.identity.brandName')} placeholder={t('signupForm.vendor.identity.brandNamePlaceholder')} autoCapitalize="words" />
        <TextInput name="identity.ownerFullName" label={t('signupForm.vendor.identity.ownerFullName')} placeholder={t('signupForm.vendor.identity.ownerFullNamePlaceholder')} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.identity.contactSection')} icon="call-outline">
        <MobileInput name="identity.phoneNumber" label={t('signupForm.vendor.identity.phone')} placeholder={t('signupForm.vendor.identity.phonePlaceholder')} />
        <EmailInput name="identity.email" label={t('signupForm.vendor.identity.email')} placeholder={t('signupForm.vendor.identity.emailPlaceholder')} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.identity.passwordSection')} icon="lock-closed-outline">
        <PasswordInput name="identity.password" label={t('signupForm.vendor.identity.password')} placeholder={t('signupForm.vendor.identity.passwordPlaceholder')} />
        <PasswordInput name="identity.passwordConfirm" label={t('signupForm.vendor.identity.passwordConfirm')} placeholder={t('signupForm.vendor.identity.passwordConfirmPlaceholder')} />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});

export default VendorStep1Identity;
