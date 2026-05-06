import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFormContext, Controller } from 'react-hook-form';
import SectionCard from '../../commen/SectionCard';
import { ToggleInput } from '../../commen';
import { useEnterprisePlans } from '../../../hooks/useLocations';
import { useTranslation } from '../../../localization';

const WhitelabelStep4PlanSelection = () => {
  const { t } = useTranslation('auth');
  const { control, watch, setValue } = useFormContext();
  const { data: plansData, isLoading } = useEnterprisePlans();
  const billingCycle = watch('planSelection.billingCycle') || 'monthly';
  const selectedPlanCode = watch('planSelection.planCode');

  const raw = plansData?.data || plansData || {};
  const plans = [
    ...(raw.event || []),
    ...(raw.quarterly || []),
    ...(raw.annual || []),
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{t('signupForm.whiteLabel.planSelection.sectionTitle')}</Text>
      <Text style={styles.stepDesc}>{t('signupForm.whiteLabel.planSelection.sectionDesc')}</Text>

      <SectionCard title={t('signupForm.whiteLabel.planSelection.billingCycleSection')} icon="card-outline">
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setValue('planSelection.billingCycle', 'monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              {t('signupForm.whiteLabel.planSelection.monthly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'yearly' && styles.toggleBtnActive]}
            onPress={() => setValue('planSelection.billingCycle', 'yearly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
              {t('signupForm.whiteLabel.planSelection.yearly')}
            </Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      <SectionCard title={t('signupForm.whiteLabel.planSelection.plansSection')} icon="pricetag-outline">
        {isLoading ? (
          <ActivityIndicator color="#c28e5c" size="small" style={{ marginVertical: 16 }} />
        ) : plans.length === 0 ? (
          <Text style={styles.noPlans}>{t('signupForm.whiteLabel.planSelection.noPlans')}</Text>
        ) : (
          plans.map((plan) => {
            const isSelected = selectedPlanCode === plan.code;
            const price = plan.pricing?.oneTime ?? plan.price;
            const priceSuffix = t('signupForm.whiteLabel.planSelection.planCards.perEvent');
            return (
              <TouchableOpacity
                key={plan.code}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setValue('planSelection.planCode', plan.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.planName, isSelected && styles.planNameSelected]}>{plan.nameEn || plan.nameAr || plan.name}</Text>
                {price !== undefined && (
                  <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                    {price} {priceSuffix}
                  </Text>
                )}
                {isSelected && (
                  <Text style={styles.selectedBadge}>{t('signupForm.whiteLabel.planSelection.planCards.selected')}</Text>
                )}
              </TouchableOpacity>
            );
          })
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
  toggleRow: { flexDirection: 'row', backgroundColor: '#f7f7f7', borderRadius: 10, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#c28e5c' },
  toggleText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#888' },
  toggleTextActive: { color: '#fff' },
  noPlans: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#888', textAlign: 'center', paddingVertical: 16 },
  planCard: { borderWidth: 1.5, borderColor: '#dfdfdf', borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: '#fff' },
  planCardSelected: { borderColor: '#c28e5c', backgroundColor: '#f5ece4' },
  planName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#2c2c2c', marginBottom: 4 },
  planNameSelected: { color: '#8a6541' },
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
