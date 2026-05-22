import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const SummaryRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{displayValue}</Text>
    </View>
  );
};

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', flex: 1 },
  value: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#2c2c2c', flex: 2, textAlign: 'right' },
});

const WhitelabelStep5Summary = () => {
  const { t } = useTranslation('auth');
  const { watch } = useFormContext();
  const values = watch();

  const identity = values.identity || {};
  const loginData = values.loginData || {};
  const requirements = values.systemRequirements || {};
  const planSelection = values.planSelection || {};

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.summary.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.summary.description')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.identity')} icon="business-outline">
        <SummaryRow label={t('signupForm.whiteLabel.identity.arabicName')} value={identity.arabicName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.englishName')} value={identity.englishName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.companyName')} value={identity.companyName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.licenseNumber')} value={identity.licenseNumber} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.taxNumber')} value={identity.taxNumber} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.city')} value={identity.address?.city} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.neighborhood')} value={identity.address?.neighborhood} />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.loginData')} icon="person-circle-outline">
        <SummaryRow label={t('signupForm.whiteLabel.loginData.email')} value={loginData.email} />
        <SummaryRow label={t('signupForm.whiteLabel.loginData.phone')} value={loginData.phoneNumber} />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.systemRequirements')} icon="stats-chart-outline">
        <SummaryRow label={t('signupForm.whiteLabel.systemRequirements.numberOfEventsMonthly')} value={requirements.numberOfEventsMonthly} />
        <SummaryRow label={t('signupForm.whiteLabel.systemRequirements.numberOfGuestsMonthly')} value={requirements.numberOfGuestsMonthly} />
        <SummaryRow
          label={t('signupForm.whiteLabel.systemRequirements.eventTypesSection')}
          value={requirements.eventTypes?.length > 0 ? requirements.eventTypes : null}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.planSelection')} icon="pricetag-outline">
        <SummaryRow label={t('signupForm.whiteLabel.planSelection.title')} value={planSelection.planCode} />
        <SummaryRow label={t('signupForm.whiteLabel.planSelection.needsCustomBranding')} value={planSelection.needsCustomBranding ? 'Yes' : 'No'} />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});

export default WhitelabelStep5Summary;
