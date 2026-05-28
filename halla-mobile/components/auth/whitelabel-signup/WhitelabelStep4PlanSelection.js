import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFormContext, Controller } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { useBusinessPlans } from '../../../hooks/queries/usePlans';
import { useTranslation } from '../../../localization';
import { getLocalized } from '../../../utils/locale';
import SarIcon from '../../commen/SarIcon';

const PlanGroup = ({ title, subtitle, plans, selectedPlanCode, onSelect, locale, t }) => {
  if (!plans || plans.length === 0) return null;
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupTitle}>{title}</Text>
      {subtitle ? <Text style={styles.groupSubtitle}>{subtitle}</Text> : null}
      {plans.map((plan) => {
        const isSelected = selectedPlanCode === plan.code;
        const price = plan.pricing?.oneTime;
        const name = getLocalized(plan, 'name', locale);
        return (
          <TouchableOpacity
            key={plan.code}
            style={[styles.planCard, isSelected && styles.planCardSelected]}
            onPress={() => onSelect(plan.code)}
            activeOpacity={0.8}
          >
            <Text style={[styles.planName, isSelected && styles.planNameSelected]}>{name}</Text>
            {price !== undefined && (
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                  {price}
                </Text>
                <SarIcon size={20} color={isSelected ? '#c28e5c' : '#888'} style={{ marginHorizontal: 4 }} />
              </View>
            )}
            {isSelected && (
              <Text style={styles.selectedBadge}>{t('signupForm.whiteLabel.planSelection.cards.selected')}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const WhitelabelStep4PlanSelection = () => {
  const { t, i18n } = useTranslation('auth');
  const locale = i18n.language;
  const { control, watch, setValue } = useFormContext();
  const { data: plansData, isLoading } = useBusinessPlans();
  const selectedPlanCode = watch('planSelection.planCode');

  const raw = plansData?.data || {};
  const eventPlans = raw.event || [];
  const quarterlyPlans = raw.quarterly || [];
  const annualPlans = raw.annual || [];
  const hasAny = eventPlans.length + quarterlyPlans.length + annualPlans.length > 0;

  const handleSelect = (code) => setValue('planSelection.planCode', code);

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.planSelection.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.planSelection.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.planSelection.plansSection')} icon="pricetag-outline">
        {isLoading ? (
          <ActivityIndicator color="#c28e5c" size="small" style={{ marginVertical: 16 }} />
        ) : !hasAny ? (
          <Text style={styles.noPlans}>{t('signupForm.whiteLabel.planSelection.noPlans')}</Text>
        ) : (
          <>
            <PlanGroup
              title={t('signupForm.whiteLabel.planSelection.eventPlans.title')}
              subtitle={t('signupForm.whiteLabel.planSelection.eventPlans.subtitle')}
              plans={eventPlans}
              selectedPlanCode={selectedPlanCode}
              onSelect={handleSelect}
              locale={locale}
              t={t}
            />
            <PlanGroup
              title={t('signupForm.whiteLabel.planSelection.quarterlyPlans.title')}
              subtitle={t('signupForm.whiteLabel.planSelection.quarterlyPlans.subtitle')}
              plans={quarterlyPlans}
              selectedPlanCode={selectedPlanCode}
              onSelect={handleSelect}
              locale={locale}
              t={t}
            />
            <PlanGroup
              title={t('signupForm.whiteLabel.planSelection.annualPlans.title')}
              subtitle={t('signupForm.whiteLabel.planSelection.annualPlans.subtitle')}
              plans={annualPlans}
              selectedPlanCode={selectedPlanCode}
              onSelect={handleSelect}
              locale={locale}
              t={t}
            />
          </>
        )}
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.planSelection.brandingSection')} icon="color-palette-outline">
        <Controller
          control={control}
          name="planSelection.needsCustomBranding"
          render={({ field: { onChange, value } }) => (
            <TouchableOpacity
              style={[styles.brandingOption, value && styles.brandingOptionSelected]}
              onPress={() => onChange(!value)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, value && styles.checkboxSelected]}>
                {value && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.brandingText, value && styles.brandingTextSelected]}>
                {t('signupForm.whiteLabel.planSelection.needsCustomBranding')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </SectionCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  stepTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  groupWrap: { marginBottom: 16 },
  groupTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 4 },
  groupSubtitle: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#888', marginBottom: 10, lineHeight: 18 },
  noPlans: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', paddingVertical: 16 },
  planCard: { borderWidth: 1.5, borderColor: '#dfdfdf', borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: '#fff' },
  planCardSelected: { borderColor: '#c28e5c', backgroundColor: '#f5ece4' },
  planName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 4 },
  planNameSelected: { color: '#8a6541' },
  planPriceRow: { flexDirection: 'row', alignItems: 'center' },
  planPrice: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#888' },
  planPriceSelected: { color: '#c28e5c' },
  selectedBadge: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#c28e5c', marginTop: 6 },
  brandingOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#dfdfdf', backgroundColor: '#fff' },
  brandingOptionSelected: { borderColor: '#c28e5c', backgroundColor: '#f5ece4' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxSelected: { backgroundColor: '#c28e5c', borderColor: '#c28e5c' },
  checkmark: { fontSize: 13, color: '#fff', fontFamily: 'Cairo_700Bold' },
  brandingText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#555', flex: 1 },
  brandingTextSelected: { fontFamily: 'Cairo_600SemiBold', color: '#8a6541' },
});

export default WhitelabelStep4PlanSelection;
