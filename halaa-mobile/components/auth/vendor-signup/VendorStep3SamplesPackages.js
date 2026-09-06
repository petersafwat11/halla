import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ImageInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import MultiImageInput from '../../commen/MultiImageInput';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';

const VendorStep3SamplesPackages = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <LocalizedText center style={styles.stepTitle}>
        {t('signupForm.vendor.samplesAndPackages.title')}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t('signupForm.vendor.samplesAndPackages.description')}
      </LocalizedText>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.portfolioSection')} icon="images-outline">
        <MultiImageInput
          name="samplesAndPackages.portfolioImages"
          label={t('signupForm.vendor.samplesAndPackages.portfolioLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.portfolioPlaceholder')}
          multiple={true}
          maxFiles={10}
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
          allowDocuments={true}
          maxFiles={5}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.vendor.samplesAndPackages.profileFileLabel')} icon="document-attach-outline">
        <ImageInput
          name="samplesAndPackages.profileFile"
          label={t('signupForm.vendor.samplesAndPackages.profileFileLabel')}
          placeholder={t('signupForm.vendor.samplesAndPackages.profileFilePlaceholder')}
          allowDocuments={true}
          documentOnly={true}
          allowOfficeDocuments={true}
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

export default VendorStep3SamplesPackages;
