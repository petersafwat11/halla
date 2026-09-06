import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, EmailInput, PasswordInput, MobileInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';

/**
 * Vendor signup — identity step.
 *
 * Field content modes (blueprint §5.3): brand/owner names are arbitrary user
 * content → adaptive; email/phone/password keep their intrinsic modes through
 * the shared Email/Mobile/Password primitives. Labels and section chrome are
 * app copy rendered through the localized text-role contract.
 */
const VendorStep1Identity = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <LocalizedText center style={styles.stepTitle}>
        {t('signupForm.vendor.identity.sectionTitle')}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t('signupForm.vendor.identity.sectionDesc')}
      </LocalizedText>

      <SectionCard title={t('signupForm.vendor.identity.businessSection')} icon="business-outline">
        <TextInput
          name="identity.brandName"
          label={t('signupForm.vendor.identity.brandName.label')}
          placeholder={t('signupForm.vendor.identity.brandNamePlaceholder')}
          contentDirection="adaptive"
          autoCapitalize="words"
        />
        <TextInput
          name="identity.ownerFullName"
          label={t('signupForm.vendor.identity.ownerFullName.label')}
          placeholder={t('signupForm.vendor.identity.ownerFullNamePlaceholder')}
          contentDirection="adaptive"
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.identity.contactSection')} icon="call-outline">
        <MobileInput name="identity.phoneNumber" label={t('signupForm.vendor.identity.phone')} placeholder={t('signupForm.vendor.identity.phonePlaceholder')} />
        <EmailInput name="identity.email" label={t('signupForm.vendor.identity.email.label')} placeholder={t('signupForm.vendor.identity.emailPlaceholder')} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.identity.passwordSection')} icon="lock-closed-outline">
        <PasswordInput
          name="identity.password"
          label={t('signupForm.vendor.identity.password.label')}
          placeholder={t('signupForm.vendor.identity.passwordPlaceholder')}
          helper={t('signupForm.vendor.identity.passwordHint')}
        />
        <PasswordInput name="identity.passwordConfirm" label={t('signupForm.vendor.identity.passwordConfirm.label')} placeholder={t('signupForm.vendor.identity.passwordConfirmPlaceholder')} />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, lineHeight: 28 },
  stepDesc: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },
});

export default VendorStep1Identity;
