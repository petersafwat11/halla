import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ImageInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import MultiImageInput from '../../commen/MultiImageInput';
import { useTranslation } from '../../../localization';

const VendorStep3SamplesPackages = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.samplesAndPackages.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.samplesAndPackages.description')}</Text>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.portfolioSection')} icon="images-outline">
        <MultiImageInput
          name="samplesAndPackages.portfolioImages"
          label={t('signupForm.vendor.samplesAndPackages.portfolioLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.portfolioPlaceholder')}
          multiple={true}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.logoSection')} icon="image-outline">
        <ImageInput
          name="samplesAndPackages.businessLogo"
          label={t('signupForm.vendor.samplesAndPackages.logoLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.logoPlaceholder')}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.packagesSection')} icon="pricetag-outline">
        <MultiImageInput
          name="samplesAndPackages.pricePackages"
          label={t('signupForm.vendor.samplesAndPackages.packagesLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.packagesPlaceholder')}
          multiple={true}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.profileFileLabel')} icon="document-attach-outline">
        <ImageInput
          name="samplesAndPackages.profileFile"
          label={t('signupForm.vendor.samplesAndPackages.profileFileLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.profileFilePlaceholder')}
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

export default VendorStep3SamplesPackages;
