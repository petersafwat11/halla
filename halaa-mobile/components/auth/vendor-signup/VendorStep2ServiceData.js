import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextAreaInput, TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import CheckboxGroup from '../../commen/CheckboxGroup';
import LocationSelector from '../../commen/LocationSelector';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';
import { useFormContext } from 'react-hook-form';
import {
  sanitizeArabicText,
  sanitizeEnglishText,
} from '@halaa/shared/utils/languageInput';

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
  const { watch } = useFormContext();
  const [openCategories, setOpenCategories] = useState({ eventPlanning: true });

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
          maxLength={500}
          contentDirection="adaptive"
        />
      </SectionCard>

      {/* Public-profile copy fields are script-contracted, not adaptive:
          each value must render in the language its name promises. */}
      <SectionCard title={t('signupForm.vendor.serviceData.publicProfileTitle')} icon="language-outline">
        <TextInput name="serviceData.taglineAr" label={t('signupForm.vendor.serviceData.taglineAr')} placeholder={t('signupForm.vendor.serviceData.taglineArPlaceholder')} maxLength={160} contentDirection="rtl" labelDirection="rtl" sanitize={sanitizeArabicText} helper={t('signupForm.vendor.serviceData.errors.arabicOnly')} />
        <TextInput name="serviceData.taglineEn" label={t('signupForm.vendor.serviceData.taglineEn')} placeholder={t('signupForm.vendor.serviceData.taglineEnPlaceholder')} maxLength={160} contentDirection="ltr" labelDirection="ltr" sanitize={sanitizeEnglishText} helper={t('signupForm.vendor.serviceData.errors.englishOnly')} autoCapitalize="sentences" />
        <TextAreaInput name="serviceData.aboutAr" label={t('signupForm.vendor.serviceData.aboutAr')} placeholder={t('signupForm.vendor.serviceData.aboutArPlaceholder')} numberOfLines={5} maxLength={2000} contentDirection="rtl" labelDirection="rtl" sanitize={sanitizeArabicText} />
        <TextAreaInput name="serviceData.aboutEn" label={t('signupForm.vendor.serviceData.aboutEn')} placeholder={t('signupForm.vendor.serviceData.aboutEnPlaceholder')} numberOfLines={5} maxLength={2000} contentDirection="ltr" labelDirection="ltr" sanitize={sanitizeEnglishText} />
      </SectionCard>

      {CATEGORY_KEYS.map((key) => {
        const options = t(`signupForm.vendor.serviceData.${key}.options`, { returnObjects: true });
        if (!Array.isArray(options) || options.length === 0) return null;
        const selected = watch(`serviceData.${key}`) || [];
        const selectedCount = Array.isArray(selected) ? selected.length : 0;
        const title = t(`signupForm.vendor.serviceData.${key}.title`);
        const isOpen = Boolean(openCategories[key]);
        return (
          <SectionCard
            key={key}
            title={`${title}${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            icon="grid-outline"
            collapsed={!isOpen}
            onToggle={() => setOpenCategories((current) => ({ ...current, [key]: !current[key] }))}
            accessibilityLabel={`${title}${selectedCount > 0 ? `, ${selectedCount}` : ''}`}
          >
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
