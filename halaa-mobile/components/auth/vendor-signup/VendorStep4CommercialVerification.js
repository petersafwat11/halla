import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, ImageInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';
import { normalizeDigitsOnly } from '@halaa/shared/utils/locale';

/**
 * Vendor signup — commercial verification step.
 *
 * The commercial-record and national-ID numbers are canonical identifiers →
 * intrinsically LTR tokens (blueprint §5.3) even though their labels,
 * placeholders and errors follow the UI locale.
 */
const VendorStep4CommercialVerification = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <LocalizedText center style={styles.stepTitle}>
        {t('signupForm.vendor.commercialVerification.title')}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t('signupForm.vendor.commercialVerification.description')}
      </LocalizedText>

      <SectionCard title={t('signupForm.vendor.commercialVerification.commercialRecordSection')} icon="document-outline">
        <TextInput
          name="commercialVerification.commercialRecordNumber"
          label={t('signupForm.vendor.commercialVerification.commercialRecordNumber')}
          placeholder="1xxxxxxxxx"
          keyboardType="numeric"
          maxLength={10}
          contentDirection="ltr"
          sanitize={normalizeDigitsOnly}
        />
        <ImageInput
          name="commercialVerification.commercialRecordImage"
          label={t('signupForm.vendor.commercialVerification.commercialRecordImage')}
          allowDocuments={true}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.commercialVerification.nationalIdSection')} icon="card-outline">
        <TextInput
          name="commercialVerification.nationalId"
          label={t('signupForm.vendor.commercialVerification.nationalId.label')}
          placeholder="1xxxxxxxxx"
          keyboardType="numeric"
          maxLength={10}
          contentDirection="ltr"
          sanitize={normalizeDigitsOnly}
        />
        <ImageInput
          name="commercialVerification.nationalIdImage"
          label={t('signupForm.vendor.commercialVerification.nationalIdImage')}
          allowDocuments={true}
        />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, lineHeight: 28 },
  stepDesc: { fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 20 },
});

export default VendorStep4CommercialVerification;
