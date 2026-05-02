import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { useTranslation } from '../../../localization';

const SummaryRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
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
  const eventTypeCount = (values.systemRequirements?.eventTypes || []).length;

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.summary.title')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.summary.description')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.identity')} icon="business-outline">
        <SummaryRow label={t('signupForm.whiteLabel.identity.arabicName')} value={values.identity?.arabicName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.englishName')} value={values.identity?.englishName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.companyName')} value={values.identity?.companyName} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.licenseNumber')} value={values.identity?.licenseNumber} />
        <SummaryRow label={t('signupForm.whiteLabel.identity.city')} value={values.identity?.address?.city} />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.loginData')} icon="person-circle-outline">
        <SummaryRow label={t('signupForm.whiteLabel.loginData.email')} value={values.loginData?.email} />
        <SummaryRow label={t('signupForm.whiteLabel.loginData.phone')} value={values.loginData?.phoneNumber} />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.systemRequirements')} icon="stats-chart-outline">
        <SummaryRow label={t('signupForm.whiteLabel.systemRequirements.numberOfEventsMonthly')} value={values.systemRequirements?.numberOfEventsMonthly} />
        <SummaryRow label={t('signupForm.whiteLabel.systemRequirements.numberOfGuestsMonthly')} value={values.systemRequirements?.numberOfGuestsMonthly} />
        <SummaryRow
          label={t('signupForm.whiteLabel.systemRequirements.eventTypesSection')}
          value={eventTypeCount > 0 ? (eventTypeCount + ' types selected') : null}
        />
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.summary.sections.planSelection')} icon="pricetag-outline">
        <SummaryRow label={t('signupForm.whiteLabel.planSelection.billingCycleSection')} value={values.planSelection?.billingCycle} />
        <SummaryRow label="Plan" value={values.planSelection?.planCode} />
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
