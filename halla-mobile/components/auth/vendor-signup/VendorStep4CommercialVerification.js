import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput, ImageInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const VendorStep4CommercialVerification = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.commercialVerification.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.commercialVerification.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.vendor.commercialVerification.commercialRecordSection')} icon="document-outline">
        <TextInput
          name="commercialVerification.commercialRecordNumber"
          label={t('signupForm.vendor.commercialVerification.commercialRecordNumber')}
          placeholder={t('signupForm.vendor.commercialVerification.commercialRecordNumberPlaceholder')}
          keyboardType="numeric"
        />
        <ImageInput
          name="commercialVerification.commercialRecordImage"
          label={t('signupForm.vendor.commercialVerification.commercialRecordImage')}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.commercialVerification.nationalIdSection')} icon="card-outline">
        <TextInput
          name="commercialVerification.nationalId"
          label={t('signupForm.vendor.commercialVerification.nationalId')}
          placeholder={t('signupForm.vendor.commercialVerification.nationalIdPlaceholder')}
          keyboardType="numeric"
          maxLength={10}
        />
        <ImageInput
          name="commercialVerification.nationalIdImage"
          label={t('signupForm.vendor.commercialVerification.nationalIdImage')}
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

export default VendorStep4CommercialVerification;
