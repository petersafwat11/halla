import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput } from '../../commen';
import SectionCard from '../../commen/SectionCard';
import CheckboxGroup from '../../commen/CheckboxGroup';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from '../../../localization';

const WhitelabelStep3Requirements = () => {
  const { t } = useTranslation('auth');
  const { watch } = useFormContext();
  const eventTypes = watch('systemRequirements.eventTypes') || [];
  const showOther = eventTypes.includes('other');

  const EVENT_TYPE_ITEMS = t('signupForm.whiteLabel.requirements.eventTypes.options', { returnObjects: true });
  const items = Array.isArray(EVENT_TYPE_ITEMS) ? EVENT_TYPE_ITEMS : [];

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.systemRequirements.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.systemRequirements.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.systemRequirements.usageSection')} icon="stats-chart-outline">
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <TextInput
              name="systemRequirements.numberOfEventsMonthly"
              label={t('signupForm.whiteLabel.systemRequirements.numberOfEventsMonthly')}
              placeholder={t('signupForm.whiteLabel.systemRequirements.numberOfEventsMonthlyPlaceholder')}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <TextInput
              name="systemRequirements.numberOfGuestsMonthly"
              label={t('signupForm.whiteLabel.systemRequirements.numberOfGuestsMonthly')}
              placeholder={t('signupForm.whiteLabel.systemRequirements.numberOfGuestsMonthlyPlaceholder')}
              keyboardType="numeric"
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.systemRequirements.eventTypesSection')} icon="calendar-outline">
        <Text style={styles.selectHint}>{t('signupForm.whiteLabel.systemRequirements.eventTypesHint')}</Text>
        <CheckboxGroup
          name="systemRequirements.eventTypes"
          items={items}
          columns={2}
          rules={{ required: t('signupForm.whiteLabel.systemRequirements.eventTypesRequired') }}
        />
        {showOther && (
          <View style={styles.otherInput}>
            <TextInput
              name="systemRequirements.eventsTypesOther"
              label={t('signupForm.whiteLabel.systemRequirements.eventTypesOther')}
              placeholder={t('signupForm.whiteLabel.systemRequirements.eventTypesOtherPlaceholder')}
            />
          </View>
        )}
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
  selectHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#888', marginBottom: 12 },
  otherInput: { marginTop: 12 },
});

export default WhitelabelStep3Requirements;
