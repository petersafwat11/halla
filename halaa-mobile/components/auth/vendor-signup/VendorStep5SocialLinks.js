import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import LocalizedText from '../../commen/LocalizedText';
import { useTranslation } from '../../../localization';
import { normalizeDigitsOnly } from '@halaa/shared/utils/locale';

/**
 * Vendor signup — social links step.
 *
 * Content modes (blueprint §5.3): the WhatsApp contact is a phone token
 * (localized placeholder while empty, LTR digits once filled) and every other
 * link is a URL → intrinsically LTR. Labels stay localized.
 */
const VendorStep5SocialLinks = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <LocalizedText center style={styles.stepTitle}>
        {t('signupForm.vendor.socialLinks.sectionTitle')}
      </LocalizedText>
      <LocalizedText role="hint" center style={styles.stepDesc}>
        {t('signupForm.vendor.socialLinks.sectionDesc')}
      </LocalizedText>

      <SectionCard title={t('signupForm.vendor.socialLinks.sectionTitle')} icon="share-social-outline">
        <TextInput
          name="socialLinks.whatsapp"
          label={t('signupForm.vendor.socialLinks.whatsapp')}
          placeholder="05xxxxxxxx"
          keyboardType="phone-pad"
          contentDirection="ltr"
          sanitize={normalizeDigitsOnly}
        />
        <TextInput
          name="socialLinks.instagram"
          label={t('signupForm.vendor.socialLinks.instagram')}
          placeholder={t('signupForm.vendor.socialLinks.instagramPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.facebook"
          label={t('signupForm.vendor.socialLinks.facebook')}
          placeholder={t('signupForm.vendor.socialLinks.facebookPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.tiktok"
          label={t('signupForm.vendor.socialLinks.tiktok')}
          placeholder={t('signupForm.vendor.socialLinks.tiktokPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.twitter"
          label={t('signupForm.vendor.socialLinks.twitter')}
          placeholder={t('signupForm.vendor.socialLinks.twitterPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.linkedin"
          label={t('signupForm.vendor.socialLinks.linkedin')}
          placeholder={t('signupForm.vendor.socialLinks.linkedinPlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.youtube"
          label={t('signupForm.vendor.socialLinks.youtube')}
          placeholder={t('signupForm.vendor.socialLinks.youtubePlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
        />
        <TextInput
          name="socialLinks.website"
          label={t('signupForm.vendor.socialLinks.website')}
          placeholder={t('signupForm.vendor.socialLinks.websitePlaceholder')}
          autoCapitalize="none"
          keyboardType="url"
          contentDirection="ltr"
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

export default VendorStep5SocialLinks;
