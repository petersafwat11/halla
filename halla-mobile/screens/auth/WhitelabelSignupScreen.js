import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../localization';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/commen';
import SignupStepper from '../../components/commen/SignupStepper';
import { whitelabelSignupSchema } from '../../utils/schemas/authSchemas';
import { useWhitelabelSignup } from '../../hooks/mutations/useAuthMutations';
import WhitelabelStep1Identity from '../../components/auth/whitelabel-signup/WhitelabelStep1Identity';
import WhitelabelStep2Login from '../../components/auth/whitelabel-signup/WhitelabelStep2Login';
import WhitelabelStep3Requirements from '../../components/auth/whitelabel-signup/WhitelabelStep3Requirements';
import WhitelabelStep4PlanSelection from '../../components/auth/whitelabel-signup/WhitelabelStep4PlanSelection';
import WhitelabelStep5Summary from '../../components/auth/whitelabel-signup/WhitelabelStep5Summary';
import TopBar from '../../components/plans/TopBar';

const TOTAL_STEPS = 5;

const STEP_FIELDS = {
  1: ['identity.arabicName', 'identity.englishName', 'identity.companyName', 'identity.licenseNumber', 'identity.address.city', 'identity.address.neighborhood', 'identity.address.street', 'identity.address.buildingNumber', 'identity.address.additionalNumber'],
  2: ['loginData.email', 'loginData.phoneNumber'],
  3: ['systemRequirements.numberOfEventsMonthly', 'systemRequirements.numberOfGuestsMonthly', 'systemRequirements.eventTypes'],
  4: [],
  5: [],
};

export default function WhitelabelSignupScreen({ navigation }) {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const methods = useForm({
    resolver: zodResolver(whitelabelSignupSchema),
    mode: 'onTouched',
    defaultValues: {
      identity: { arabicName: '', englishName: '', companyName: '', licenseNumber: '', taxNumber: '', address: { city: '', neighborhood: '', street: '', buildingNumber: '', additionalNumber: '', placeType: '', placeNumber: '' } },
      loginData: { email: '', phoneNumber: '' },
      systemRequirements: { numberOfEventsMonthly: '', numberOfGuestsMonthly: '', eventTypes: [], eventsTypesOther: '' },
      planSelection: { billingCycle: 'monthly', needsCustomBranding: false },
    },
  });

  const { trigger, handleSubmit, formState: { isSubmitting } } = methods;
  const { mutateAsync: signupWhitelabel, isPending } = useWhitelabelSignup();

  const STEPS = Array.from({ length: TOTAL_STEPS }, (_, i) => ({ id: i + 1, desc: t('signupForm.whiteLabel.steps.' + i + '.label') }));

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) { const valid = await trigger(fields); if (!valid) return; }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [currentStep, trigger]);

  const handleBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 1)), []);

  const onSubmit = useCallback(async (data) => {
    try {
      await signupWhitelabel(data);
      toast.success(t('common.success'));
      navigation.navigate('Login');
    } catch (error) {
      toast.error(t('errors.signupFailed'));
    }
  }, [signupWhitelabel, toast, t, navigation]);

  const renderStep = useCallback(() => {
    switch (currentStep) {
      case 1: return <WhitelabelStep1Identity />;
      case 2: return <WhitelabelStep2Login />;
      case 3: return <WhitelabelStep3Requirements />;
      case 4: return <WhitelabelStep4PlanSelection />;
      case 5: return <WhitelabelStep5Summary />;
      default: return null;
    }
  }, [currentStep]);

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TopBar title={t('signupForm.whiteLabel.title')} showBack={true} />
        <FormProvider {...methods}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
              <View style={styles.content}>
                <SignupStepper steps={STEPS} currentStep={currentStep} />
                {renderStep()}
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <View style={styles.footerButtons}>
                {currentStep > 1 && (
                  <Button text={t('signupForm.buttons.back')} onPress={handleBack} variant='outline' fullWidth={false} style={styles.backBtn} />
                )}
                <View style={styles.nextBtnWrap}>
                  <Button
                    text={isLastStep ? (isPending ? t('signupForm.buttons.submitting') : t('signupForm.buttons.submit')) : t('signupForm.buttons.next')}
                    onPress={isLastStep ? handleSubmit(onSubmit) : handleNext}
                    loading={isPending}
                    disabled={isPending}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </FormProvider>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#c28e5c' },
  container: { flex: 1, backgroundColor: '#f9f4ef' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 16 },
  content: { paddingHorizontal: 20, paddingTop: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 4 },
  footerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { paddingHorizontal: 24 },
  nextBtnWrap: { flex: 1 },
});