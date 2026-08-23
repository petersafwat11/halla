import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const SummaryRow = ({ label, value }) => {
  const { isRTL } = useTranslation();
  const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
  if (displayValue === undefined || displayValue === null || displayValue === '') return null;
  if (Array.isArray(value) && value.length === 0) return null;
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, { textAlign: isRTL ? 'left' : 'right' }]}>{displayValue}</Text>
    </View>
  );
};

const CATEGORY_KEYS = [
  'eventPlanning', 'mediaProduction', 'giftsAndGiveaways', 'foodAndBeverages',
  'beautyAndFashion', 'logisticsAndDelivery', 'corporateServices',
  'supportServices', 'technicalServices', 'soundLightingEntertainment', 'hallsAndVenues',
];

const summaryStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', flex: 1 },
  value: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#2c2c2c', flex: 2 },
});

const VendorStep6Summary = () => {
  const { t } = useTranslation('auth');
  const { watch } = useFormContext();
  const values = watch();

  const identity = values.identity || {};
  const serviceData = values.serviceData || {};
  const commercial = values.commercialVerification || {};
  const social = values.socialLinks || {};

  // Collect selected category names
  const selectedCategories = [];
  CATEGORY_KEYS.forEach((key) => {
    const selected = serviceData[key];
    if (selected && selected.length > 0) {
      const catTitle = t(`signupForm.vendor.serviceData.${key}.title`);
      const options = t(`signupForm.vendor.serviceData.${key}.options`, { returnObjects: true });
      const selectedLabels = (selected || []).map((value) => {
        if (Array.isArray(options)) {
          const option = options.find((o) => o.value === value);
          return option ? option.label : value;
        }
        return value;
      });
      selectedCategories.push({ title: catTitle, items: selectedLabels.join(', ') });
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.summary.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.summary.description')}</Text>

      <SectionCard title={t('signupForm.vendor.summary.sections.identity')} icon="person-outline">
        <SummaryRow label={t('signupForm.vendor.identity.brandName')} value={identity.brandName} />
        <SummaryRow label={t('signupForm.vendor.identity.ownerFullName')} value={identity.ownerFullName} />
        <SummaryRow label={t('signupForm.vendor.identity.email')} value={identity.email} />
        <SummaryRow label={t('signupForm.vendor.identity.phone')} value={identity.phoneNumber} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.summary.sections.serviceData')} icon="briefcase-outline">
        <SummaryRow label={t('signupForm.vendor.serviceData.serviceDescription.label')} value={serviceData.serviceDescription} />
        {selectedCategories.map((cat, idx) => (
          <SummaryRow key={idx} label={cat.title} value={cat.items} />
        ))}
        <SummaryRow
          label={t('signupForm.vendor.serviceData.location.region')}
          value={serviceData.serviceLocation?.regionNameEn || serviceData.serviceLocation?.regionNameAr}
        />
        <SummaryRow
          label={t('signupForm.vendor.serviceData.location.city')}
          value={serviceData.serviceLocation?.cityNameEn || serviceData.serviceLocation?.cityNameAr}
        />
        <SummaryRow label={t('signupForm.vendor.serviceData.otherData.label')} value={serviceData.otherData} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.summary.sections.commercialVerification')} icon="shield-checkmark-outline">
        <SummaryRow label={t('signupForm.vendor.commercialVerification.commercialRecordNumber')} value={commercial.commercialRecordNumber} />
        <SummaryRow label={t('signupForm.vendor.commercialVerification.nationalId')} value={commercial.nationalId} />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.summary.sections.socialLinks')} icon="share-social-outline">
        <SummaryRow label={t('signupForm.vendor.socialLinks.instagram')} value={social.instagram} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.facebook')} value={social.facebook} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.tiktok')} value={social.tiktok} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.twitter')} value={social.twitter} />
        <SummaryRow label={t('signupForm.vendor.socialLinks.website')} value={social.website} />
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
