import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const SummaryRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={summaryStyles.value}>{value}</Text>
    </View>
  );
};

const summaryStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', flex: 1 },
  value: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#2c2c2c', flex: 2, textAlign: 'right' },
});

const VendorStep6Summary = () => {
  const { t } = useTranslation('auth');
  const { watch } = useFormContext();
  const values = watch();

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.summary.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.summary.description')}</Text>

      <SectionCard title={t('signupForm.vendor.summary.sections.identity')} icon="person-outline">
        <SummaryRow label={t('signupForm.vendor.identity.brandName')} value={values.identity?.brandName} />
        <SummaryRow label={t('signupForm.vendor.identity.ownerFullName')} value={values.identity?.ownerFullName} />
        <SummaryRow label={t('signupForm.vendor.identity.email')} value={values.identity?.email} />
        <SummaryRow label={t('signupForm.vendor.identity.phone')} value={values.identity?.phoneNumber} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.summary.sections.serviceData')} icon="briefcase-outline">
        <SummaryRow label={t('signupForm.vendor.serviceData.description')} value={values.serviceData?.serviceDescription} />
        <SummaryRow
          label={t('signupForm.vendor.serviceData.locationRegion')}
          value={values.serviceData?.serviceLocation?.regionNameEn || values.serviceData?.serviceLocation?.regionNameAr}
        />
        <SummaryRow
          label={t('signupForm.vendor.serviceData.locationCity')}
          value={values.serviceData?.serviceLocation?.cityNameEn || values.serviceData?.serviceLocation?.cityNameAr}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.summary.sections.socialLinks')} icon="share-social-outline">
        <SummaryRow label={t('signupForm.vendor.socialLinks.instagram')} value={values.socialLinks?.instagram} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.facebook')} value={values.socialLinks?.facebook} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.tiktok')} value={values.socialLinks?.tiktok} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.website')} value={values.socialLinks?.website} />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});

export default VendorStep6Summary;
