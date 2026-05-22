import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextAreaInput, TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import CheckboxGroup from '../../commen/CheckboxGroup';
import LocationSelector from '../../commen/LocationSelector';
import { useTranslation } from '../../../localization';

const CATEGORY_KEYS = [
  'eventPlanning',
  'mediaProduction',
  'giftsAndGiveaways',
  'foodAndBeverages',
  'beautyAndFashion',
  'logisticsAndDelivery',
  'corporateServices',
  'supportServices',
  'technicalServices',
  'soundLightingEntertainment',
  'hallsAndVenues',
];

const VendorStep2ServiceData = () => {
  const { t } = useTranslation('auth');

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.serviceData.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.serviceData.description')}</Text>

      <SectionCard title={t('signupForm.vendor.serviceData.serviceDescription.title')} icon="document-text-outline">
        <TextAreaInput
          name="serviceData.serviceDescription"
          label={t('signupForm.vendor.serviceData.serviceDescription.label')}
          placeholder={t('signupForm.vendor.serviceData.serviceDescription.placeholder')}
          numberOfLines={4}
        />
      </SectionCard>

      {CATEGORY_KEYS.map((key) => {
        const options = t(`signupForm.vendor.serviceData.${key}.options`, { returnObjects: true });
        if (!Array.isArray(options) || options.length === 0) return null;
        return (
          <SectionCard key={key} title={t(`signupForm.vendor.serviceData.${key}.title`)} icon="grid-outline">
            <CheckboxGroup
              name={`serviceData.${key}`}
              items={options}
              columns={2}
            />
          </SectionCard>
        );
      })}

      <SectionCard title={t('signupForm.vendor.serviceData.location.title')} icon="location-outline">
        <LocationSelector />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.serviceData.otherInfo.title')} icon="information-circle-outline">
        <TextAreaInput
          name="serviceData.otherData"
          label={t('signupForm.vendor.serviceData.otherData.label')}
          placeholder={t('signupForm.vendor.serviceData.otherData.placeholder')}
          numberOfLines={3}
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

export default VendorStep2ServiceData;
