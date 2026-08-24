import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextAreaInput, TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import CheckboxGroup from '../../commen/CheckboxGroup';
import LocationSelector from '../../commen/LocationSelector';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';

/**
 * Vendor signup — service data step.
 *
 * Field content modes (blueprint §5.3): the free description and extra-info
 * areas are arbitrary user content → adaptive; taglineAr/aboutAr are
 * contractually Arabic-only → rtl; taglineEn/aboutEn are contractually
 * English-only → ltr. Category checkboxes and section chrome stay localized.
 */

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
      <LocalizedText center style={styles.stepTitle}>
        {t('signupForm.vendor.serviceData.title')}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t('signupForm.vendor.serviceData.description')}
      </LocalizedText>

      <SectionCard title={t('signupForm.vendor.serviceData.serviceDescription.title')} icon="document-text-outline">
        <TextAreaInput
          name="serviceData.serviceDescription"
          label={t('signupForm.vendor.serviceData.serviceDescription.label')}
          placeholder={t('signupForm.vendor.serviceData.serviceDescription.placeholder')}
          numberOfLines={4}
          contentDirection="adaptive"
        />
      </SectionCard>

      {/* Public-profile copy fields are script-contracted, not adaptive:
          each value must render in the language its name promises. */}
      <SectionCard title={t('signupForm.vendor.serviceData.publicProfileTitle')} icon="language-outline">
        <TextInput name="serviceData.taglineAr" label={t('signupForm.vendor.serviceData.taglineAr')} maxLength={160} contentDirection="rtl" />
        <TextInput name="serviceData.taglineEn" label={t('signupForm.vendor.serviceData.taglineEn')} maxLength={160} contentDirection="ltr" autoCapitalize="sentences" />
        <TextAreaInput name="serviceData.aboutAr" label={t('signupForm.vendor.serviceData.aboutAr')} numberOfLines={5} maxLength={2000} contentDirection="rtl" />
        <TextAreaInput name="serviceData.aboutEn" label={t('signupForm.vendor.serviceData.aboutEn')} numberOfLines={5} maxLength={2000} contentDirection="ltr" />
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
          contentDirection="adaptive"
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

export default VendorStep2ServiceData;
