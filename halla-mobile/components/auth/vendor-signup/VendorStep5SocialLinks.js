import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const VendorStep5SocialLinks = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.vendor.socialLinks.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.vendor.socialLinks.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.vendor.socialLinks.sectionTitle')} icon="share-social-outline">
        <TextInput
          name="socialLinks.instagram"
          label={t('signupForm.vendor.socialLinks.instagram')}
          placeholder={t('signupForm.vendor.socialLinks.instagramPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          name="socialLinks.facebook"
          label={t('signupForm.vendor.socialLinks.facebook')}
          placeholder={t('signupForm.vendor.socialLinks.facebookPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          name="socialLinks.tiktok"
          label={t('signupForm.vendor.socialLinks.tiktok')}
          placeholder={t('signupForm.vendor.socialLinks.tiktokPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          name="socialLinks.website"
          label={t('signupForm.vendor.socialLinks.website')}
          placeholder={t('signupForm.vendor.socialLinks.websitePlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
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

export default VendorStep5SocialLinks;
