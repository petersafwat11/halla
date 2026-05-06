import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../localization';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/commen';
import SignupStepper from '../../components/commen/SignupStepper';
import { vendorSignupSchema } from '../../utils/schemas/authSchemas';
import { useVendorSignup } from '../../hooks/mutations/useAuthMutations';
import VendorStep1Identity from '../../components/auth/vendor-signup/VendorStep1Identity';
import VendorStep2ServiceData from '../../components/auth/vendor-signup/VendorStep2ServiceData';
import VendorStep3SamplesPackages from '../../components/auth/vendor-signup/VendorStep3SamplesPackages';
import VendorStep4CommercialVerification from '../../components/auth/vendor-signup/VendorStep4CommercialVerification';
import VendorStep5SocialLinks from '../../components/auth/vendor-signup/VendorStep5SocialLinks';
import VendorStep6Summary from '../../components/auth/vendor-signup/VendorStep6Summary';
import TopBar from '../../components/plans/TopBar';

const TOTAL_STEPS = 6;

const STEP_FIELDS = {
  1: ['identity.brandName', 'identity.ownerFullName', 'identity.phoneNumber', 'identity.email', 'identity.password', 'identity.passwordConfirm'],
  2: ['serviceData.serviceDescription', 'serviceData.serviceCategories'],
  3: [],
  4: [],
  5: [],
  6: [],
};

export default function VendorSignupScreen({ navigation }) {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const methods = useForm({
    resolver: zodResolver(vendorSignupSchema),
    mode: 'onTouched',
    defaultValues: {
      identity: { brandName: '', ownerFullName: '', phoneNumber: '', email: '', password: '', passwordConfirm: '' },
      serviceData: { serviceDescription: '', serviceCategories: { eventPlanning: [], mediaProduction: [], giftsAndGiveaways: [] } },
      samplesAndPackages: { portfolioImages: [], pricePackages: [] },
      commercialVerification: { nationalId: '', nationalIdImage: null, commercialRecordImage: null },
      socialLinks: { website: '', instagram: '', facebook: '', twitter: '', tiktok: '' },
    },
  });

  const { trigger, handleSubmit, formState: { isSubmitting } } = methods;
  const { mutateAsync: signupVendor, isPending } = useVendorSignup();

  const STEPS = Array.from({ length: TOTAL_STEPS }, (_, i) => ({ id: i + 1, desc: t('signupForm.vendor.steps.' + i + '.label') }));

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0) { const valid = await trigger(fields); if (!valid) return; }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data) => {
    try {
      await signupVendor(data);
      toast.success(t('common.success'));
      navigation.navigate('Login');
    } catch (error) {
      toast.error(t('errors.signupFailed'));
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <VendorStep1Identity />;
      case 2: return <VendorStep2ServiceData />;
      case 3: return <VendorStep3SamplesPackages />;
      case 4: return <VendorStep4CommercialVerification />;
      case 5: return <VendorStep5SocialLinks />;
      case 6: return <VendorStep6Summary />;
      default: return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TopBar title={t('signupForm.vendor.title')} showBack={true} />
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
