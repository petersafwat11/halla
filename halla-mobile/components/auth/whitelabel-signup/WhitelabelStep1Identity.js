import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const WhitelabelStep1Identity = () => {
  const { t } = useTranslation('auth');
  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.identity.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.identity.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.identity.facilitySection')} icon="business-outline">
        <TextInput name="identity.arabicName" label={t('signupForm.whiteLabel.identity.arabicName')} placeholder={t('signupForm.whiteLabel.identity.arabicNamePlaceholder')} autoCapitalize="words" />
        <TextInput name="identity.englishName" label={t('signupForm.whiteLabel.identity.englishName')} placeholder={t('signupForm.whiteLabel.identity.englishNamePlaceholder')} autoCapitalize="words" />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.identity.companySection')} icon="document-text-outline">
        <TextInput name="identity.companyName" label={t('signupForm.whiteLabel.identity.companyName')} placeholder={t('signupForm.whiteLabel.identity.companyNamePlaceholder')} />
        <TextInput name="identity.licenseNumber" label={t('signupForm.whiteLabel.identity.licenseNumber')} placeholder={t('signupForm.whiteLabel.identity.licenseNumberPlaceholder')} keyboardType="numeric" maxLength={10} />
        <Text style={styles.hintText}>{t('signupForm.whiteLabel.identity.licenseNumberHint')}</Text>
        <TextInput name="identity.taxNumber" label={t('signupForm.whiteLabel.identity.taxNumber')} placeholder={t('signupForm.whiteLabel.identity.taxNumberPlaceholder')} keyboardType="numeric" maxLength={15} />
        <Text style={styles.hintText}>{t('signupForm.whiteLabel.identity.taxNumberHint')}</Text>
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.identity.addressSection')} icon="location-outline">
        <TextInput name="identity.address.city" label={t('signupForm.whiteLabel.identity.city')} placeholder={t('signupForm.whiteLabel.identity.cityPlaceholder')} />
        <TextInput name="identity.address.neighborhood" label={t('signupForm.whiteLabel.identity.neighborhood')} placeholder={t('signupForm.whiteLabel.identity.neighborhoodPlaceholder')} />
        <TextInput name="identity.address.street" label={t('signupForm.whiteLabel.identity.street')} placeholder={t('signupForm.whiteLabel.identity.streetPlaceholder')} />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <TextInput name="identity.address.buildingNumber" label={t('signupForm.whiteLabel.identity.buildingNumber')} placeholder={t('signupForm.whiteLabel.identity.buildingNumberPlaceholder')} keyboardType="numeric" maxLength={4} />
          </View>
          <View style={styles.halfInput}>
            <TextInput name="identity.address.additionalNumber" label={t('signupForm.whiteLabel.identity.additionalNumber')} placeholder={t('signupForm.whiteLabel.identity.additionalNumberPlaceholder')} keyboardType="numeric" maxLength={4} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <TextInput name="identity.address.placeType" label={t('signupForm.whiteLabel.identity.placeType')} placeholder={t('signupForm.whiteLabel.identity.placeTypePlaceholder')} />
          </View>
          <View style={styles.halfInput}>
            <TextInput name="identity.address.placeNumber" label={t('signupForm.whiteLabel.identity.placeNumber')} placeholder={t('signupForm.whiteLabel.identity.placeNumberPlaceholder')} keyboardType="numeric" maxLength={4} />
          </View>
        </View>
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  hintText: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#aaa', marginTop: -8, marginBottom: 10 },
});

export default WhitelabelStep1Identity;
