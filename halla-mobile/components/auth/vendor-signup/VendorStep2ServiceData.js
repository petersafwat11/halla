import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextAreaInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import CheckboxGroup from '../../commen/CheckboxGroup';
import LocationSelector from '../../commen/LocationSelector';
import { useTranslation } from '../../../localization';

const VendorStep2ServiceData = () => {
  const { t } = useTranslation('auth');

  const CATEGORY_ITEMS = [
    { value: 'eventPlanning', label: t('signupForm.vendor.serviceData.categories.eventPlanning') },
    { value: 'mediaProduction', label: t('signupForm.vendor.serviceData.categories.mediaProduction') },
    { value: 'giftsAndGiveaways', label: t('signupForm.vendor.serviceData.categories.giftsAndGiveaways') },
    { value: 'foodAndBeverages', label: t('signupForm.vendor.serviceData.categories.foodAndBeverages') },
    { value: 'beautyAndFashion', label: t('signupForm.vendor.serviceData.categories.beautyAndFashion') },
    { value: 'logisticsAndDelivery', label: t('signupForm.vendor.serviceData.categories.logisticsAndDelivery') },
    { value: 'corporateServices', label: t('signupForm.vendor.serviceData.categories.corporateServices') },
    { value: 'supportServices', label: t('signupForm.vendor.serviceData.categories.supportServices') },
    { value: 'technicalServices', label: t('signupForm.vendor.serviceData.categories.technicalServices') },
    { value: 'soundLightingEntertainment', label: t('signupForm.vendor.serviceData.categories.soundLightingEntertainment') },
    { value: 'hallsAndVenues', label: t('signupForm.vendor.serviceData.categories.hallsAndVenues') },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.serviceData.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.serviceData.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.vendor.serviceData.descriptionSection')} icon="document-text-outline">
        <TextAreaInput
          name="serviceData.serviceDescription"
          label={t('signupForm.vendor.serviceData.description')}
          placeholder={t('signupForm.vendor.serviceData.descriptionPlaceholder')}
          numberOfLines={4}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.serviceData.categoriesSection')} icon="grid-outline">
        <Text style={styles.hint}>{t('signupForm.vendor.serviceData.categoriesHint')}</Text>
        <CheckboxGroup
          name="serviceData.selectedCategories"
          items={CATEGORY_ITEMS}
          columns={2}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.serviceData.locationSection')} icon="location-outline">
        <LocationSelector />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  hint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#888', marginBottom: 12 },
});

export default VendorStep2ServiceData;
