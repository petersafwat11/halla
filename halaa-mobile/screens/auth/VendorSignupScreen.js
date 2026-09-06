import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareFormScrollView from '../../components/commen/keyboard/KeyboardAwareFormScrollView';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../localization';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/commen';
import SignupStepper from '../../components/commen/SignupStepper';
import { vendorSignupSchema } from '../../utils/schemas/authSchemas';
import { useVendorSignup } from '../../hooks/auth';
import { authErrorMessage } from '../../services/authErrors';
import { saveVendorDraft, loadVendorDraft, clearVendorDraft } from '../../utils/vendorDraftStorage';
import VendorStep1Identity from '../../components/auth/vendor-signup/VendorStep1Identity';
import VendorStep2ServiceData from '../../components/auth/vendor-signup/VendorStep2ServiceData';
import VendorStep3SamplesPackages from '../../components/auth/vendor-signup/VendorStep3SamplesPackages';
import VendorStep4CommercialVerification from '../../components/auth/vendor-signup/VendorStep4CommercialVerification';
import VendorStep5SocialLinks from '../../components/auth/vendor-signup/VendorStep5SocialLinks';
import VendorStep6Summary from '../../components/auth/vendor-signup/VendorStep6Summary';
import TopBar from '../../components/plans/TopBar';

const TOTAL_STEPS = 6;

const CATEGORY_KEYS = [
  'eventPlanning',
  'mediaProduction',
  'giftsAndGiveaways',
  'foodAndBeverages',
  'beautyAndFashion',
  'logisticsAndDelivery',
  'corporateServices',
  'supportServices',
  'technicalServices',
  'soundLightingEntertainment',
  'hallsAndVenues',
];

const STEP_FIELDS = {
  1: ['identity.brandName', 'identity.ownerFullName', 'identity.phoneNumber', 'identity.email', 'identity.password', 'identity.passwordConfirm'],
  2: [
    'serviceData.serviceDescription',
    'serviceData.taglineAr',
    'serviceData.taglineEn',
    'serviceData.aboutAr',
    'serviceData.aboutEn',
    ...CATEGORY_KEYS.map((k) => `serviceData.${k}`),
    'serviceData.serviceLocation',
    'serviceData.otherData',
  ],
  3: ['samplesAndPackages.portfolioImages', 'samplesAndPackages.pricePackages', 'samplesAndPackages.businessLogo', 'samplesAndPackages.profileFile'],
  4: [
    'commercialVerification.commercialRecordNumber',
    'commercialVerification.commercialRecordImage',
    'commercialVerification.nationalId',
    'commercialVerification.nationalIdImage',
  ],
  5: [
    'socialLinks.whatsapp',
    'socialLinks.instagram',
    'socialLinks.facebook',
    'socialLinks.tiktok',
    'socialLinks.twitter',
    'socialLinks.linkedin',
    'socialLinks.youtube',
    'socialLinks.website',
  ],
  6: [],
};

const VENDOR_FIELD_MAP = {
  email: 'identity.email',
  phoneNumber: 'identity.phoneNumber',
  password: 'identity.password',
  passwordConfirm: 'identity.passwordConfirm',
  brandName: 'identity.brandName',
  ownerFullName: 'identity.ownerFullName',
  serviceDescription: 'serviceData.serviceDescription',
  taglineAr: 'serviceData.taglineAr',
  taglineEn: 'serviceData.taglineEn',
  aboutAr: 'serviceData.aboutAr',
  aboutEn: 'serviceData.aboutEn',
  serviceCategories: 'serviceData.eventPlanning',
  serviceLocation: 'serviceData.serviceLocation',
  location: 'serviceData.serviceLocation',
  otherData: 'serviceData.otherData',
  socialLinks: 'socialLinks.instagram',
  nationalId: 'commercialVerification.nationalId',
  nationalIdImage: 'commercialVerification.nationalIdImage',
  commercialRegistrationNumber: 'commercialVerification.commercialRecordNumber',
  commercialRecordNumber: 'commercialVerification.commercialRecordNumber',
  commercialRecordImage: 'commercialVerification.commercialRecordImage',
  portfolioImages: 'samplesAndPackages.portfolioImages',
  pricePackages: 'samplesAndPackages.pricePackages',
  profileFile: 'samplesAndPackages.profileFile',
  businessLogo: 'samplesAndPackages.businessLogo',
};

const mapVendorBackendField = (backendField) => {
  if (typeof backendField !== 'string' || !backendField) return null;
  backendField = backendField.replace(/\[(\d+)\]/g, '.$1');
  if (VENDOR_FIELD_MAP[backendField]) return VENDOR_FIELD_MAP[backendField];
  if (backendField.startsWith('serviceCategories.')) return `serviceData.${backendField.slice('serviceCategories.'.length)}`;
  if (backendField.startsWith('serviceLocation.')) return `serviceData.${backendField}`;
  if (backendField.startsWith('socialLinks.')) return backendField;
  const [root, ...parts] = backendField.split('.');
  if (VENDOR_FIELD_MAP[root]) return [VENDOR_FIELD_MAP[root], ...parts].join('.');
  return backendField;
};

export default function VendorSignupScreen({ navigation }) {
  const { t, currentLanguage } = useTranslation('auth');
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftReady, setDraftReady] = useState(false);
  const draftLocale = useRef(currentLanguage);
  const submitted = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  const categoryDefaults = {};
  CATEGORY_KEYS.forEach((k) => { categoryDefaults[k] = []; });

  const methods = useForm({
    resolver: zodResolver(vendorSignupSchema(t)),
    mode: 'onBlur',
    defaultValues: {
      identity: { brandName: '', ownerFullName: '', phoneNumber: '', email: '', password: '', passwordConfirm: '', preferredLanguage: currentLanguage || 'ar' },
      serviceData: {
        serviceDescription: '',
        taglineAr: '',
        taglineEn: '',
        aboutAr: '',
        aboutEn: '',
        eventPlanning: [],
        mediaProduction: [],
        giftsAndGiveaways: [],
        foodAndBeverages: [],
        beautyAndFashion: [],
        logisticsAndDelivery: [],
        corporateServices: [],
        supportServices: [],
        technicalServices: [],
        soundLightingEntertainment: [],
        hallsAndVenues: [],
        serviceLocation: { regionId: 0, regionNameAr: '', regionNameEn: '', cityId: null, cityNameAr: '', cityNameEn: '', districtIds: [], districtNames: [], coverageType: 'city' },
        otherData: '',
      },
      samplesAndPackages: { portfolioImages: [], businessLogo: null, pricePackages: [], profileFile: null },
      commercialVerification: { commercialRecordNumber: '', commercialRecordImage: null, nationalId: '', nationalIdImage: null },
      socialLinks: { instagram: '', facebook: '', tiktok: '', twitter: '', website: '', whatsapp: '', linkedin: '', youtube: '' },
    },
  });

  const { trigger, handleSubmit, setError, setFocus, setValue, reset, watch, formState: { isDirty } } = methods;
  const { mutateAsync: signupVendor, isPending } = useVendorSignup();

  const STEP_KEYS = ['identity', 'serviceData', 'samplesAndPackages', 'commercialVerification', 'socialLinks', 'summary'];
  const STEPS = STEP_KEYS.map((key, i) => ({ id: i + 1, desc: t(`signupForm.vendor.steps.${key}`) }));

  useEffect(() => {
    setValue('identity.preferredLanguage', currentLanguage || 'ar');
  }, [currentLanguage, setValue, draftReady]);

  // Load non-sensitive draft on mount
  useEffect(() => {
    let isMounted = true;
    loadVendorDraft(draftLocale.current).then((draft) => {
      if (isMounted && draft) {
        reset((current) => ({
          ...current,
          identity: {
            ...current.identity,
            ...draft.identity,
          },
          serviceData: {
            ...current.serviceData,
            ...draft.serviceData,
          },
          socialLinks: {
            ...current.socialLinks,
            ...draft.socialLinks,
          },
        }));
      }
      if (isMounted) setDraftReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, [reset]);

  // Auto-save non-sensitive draft on form changes
  useEffect(() => {
    if (!draftReady) return;
    const subscription = watch((values) => {
      if (!submitted.current) saveVendorDraft(values, currentLanguage);
    });
    return () => subscription.unsubscribe();
  }, [watch, currentLanguage, draftReady]);

  const handleNext = async () => {
    if (isPending) return;
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await trigger(STEP_KEYS[currentStep - 1], { shouldFocus: true });
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleStepPress = async (targetStep) => {
    if (isPending) return;
    if (targetStep === currentStep) return;
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let s = currentStep; s < targetStep; s++) {
      const fields = STEP_FIELDS[s];
      if (fields && fields.length > 0) {
        const valid = await trigger(STEP_KEYS[s - 1], { shouldFocus: true });
        if (!valid) {
          setCurrentStep(s);
          return;
        }
      }
    }
    setCurrentStep(targetStep);
  };

  const handleTopBarBack = () => {
    if (isPending) return;
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      return;
    }
    if (isDirty) {
      Alert.alert(
        t('signupForm.vendor.discardPrompt.title'),
        t('signupForm.vendor.discardPrompt.message'),
        [
          {
            text: t('signupForm.vendor.discardPrompt.cancel'),
            style: 'cancel',
          },
          {
            text: t('signupForm.vendor.discardPrompt.discard'),
            style: 'destructive',
            onPress: async () => {
              await clearVendorDraft(currentLanguage);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const findEarliestStepWithErrors = (errors) => {
    if (!errors || Object.keys(errors).length === 0) return { step: 1, field: null };
    const flatKeys = [];
    const collectKeys = (obj, prefix = '') => {
      for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (obj[key]?.message || obj[key]?.type) {
          flatKeys.push(fullPath);
        }
        if (typeof obj[key] === 'object' && obj[key] !== null && !obj[key]?.message && !obj[key]?.type) {
          collectKeys(obj[key], fullPath);
        }
      }
    };
    collectKeys(errors);

    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const fields = STEP_FIELDS[s] || [];
      if (fields.some((f) => flatKeys.some((k) => k.startsWith(f) || f.startsWith(k)))) {
        return { step: s, field: flatKeys.find((k) => fields.some((f) => k.startsWith(f) || f.startsWith(k))) || null };
      }
      const prefix = STEP_KEYS[s - 1];
      if (prefix && flatKeys.some((k) => k.startsWith(prefix))) {
        return { step: s, field: flatKeys.find((k) => k.startsWith(prefix)) || null };
      }
    }
    return { step: 1, field: flatKeys[0] || null };
  };

  const onInvalid = (errors) => {
    const { step: earliestStep, field: earliestField } = findEarliestStepWithErrors(errors);
    setCurrentStep(earliestStep);
    if (earliestField) {
      setTimeout(() => setFocus(earliestField), 100);
    }
    toast.error(t('errors.checkFormErrors'));
  };

  const onSubmit = async (data) => {
    try {
      const result = await signupVendor(data);
      submitted.current = true;
      await clearVendorDraft(currentLanguage);
      toast.success(t('common.success'));
      navigation.replace('VendorApplicationPending', {
        applicationId: result?.applicationId || '',
      });
    } catch (error) {
      const fieldErrors = Array.isArray(error?.errors) ? error.errors : [];
      const resolved = authErrorMessage(error, t);
      const generic = resolved?.message || error?.message || t('errors.signupFailed');

      if (fieldErrors.length > 0) {
        fieldErrors.forEach((e) => {
          const formPath = mapVendorBackendField(e?.field);
          const requiredKeys = {
            portfolioImages: 'signupForm.vendor.samplesAndPackages.errors.portfolioImagesRequired',
            pricePackages: 'signupForm.vendor.samplesAndPackages.errors.pricePackagesRequired',
          };
          const message = e.code === 'required_file' && requiredKeys[e.field] ? t(requiredKeys[e.field]) : e.message;
          if (formPath) setError(formPath, { type: 'server', message });
        });
        const errorPaths = fieldErrors.map((item) => mapVendorBackendField(item.field)).filter(Boolean);
        for (const [stepNum, fields] of Object.entries(STEP_FIELDS)) {
          if (fields?.some((f) => errorPaths.some((errorPath) => errorPath === f || errorPath.startsWith(`${f}.`)))) {
            setCurrentStep(parseInt(stepNum, 10));
            break;
          }
        }
        toast.error(generic);
        return;
      }

      if (error?.code === 'CONFLICT' && error?.field) {
        if (error.field === 'email_and_phone') {
          setError('identity.email', { type: 'server', message: generic });
          setError('identity.phoneNumber', { type: 'server', message: generic });
        } else {
          const formField = error.field === 'phone' ? 'phoneNumber' : error.field;
          setError(`identity.${formField}`, { type: 'server', message: generic });
        }
        setCurrentStep(1);
        toast.error(generic);
        return;
      }

      toast.error(generic);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <VendorStep1Identity />;
      case 2: return <VendorStep2ServiceData />;
      case 3: return <VendorStep3SamplesPackages />;
      case 4: return <VendorStep4CommercialVerification />;
      case 5: return <VendorStep5SocialLinks />;
      case 6: return <VendorStep6Summary onEditStep={(step) => setCurrentStep(step)} />;
      default: return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS;

  if (!draftReady) return <View style={styles.container}><ActivityIndicator /></View>;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <TopBar
          logoSource={require('../../assets/logo.png')}
          showBack={true}
          onBack={handleTopBarBack}
        />
      </SafeAreaView>
      <View style={styles.container}>
        <FormProvider {...methods}>
          <KeyboardAwareFormScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <SignupStepper steps={STEPS} currentStep={currentStep} onStepPress={handleStepPress} />
              {renderStep()}
            </View>
          </KeyboardAwareFormScrollView>
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {currentStep > 1 && (
                <Button text={t('signupForm.buttons.back')} onPress={handleBack} disabled={isPending} variant='outline' fullWidth={false} style={styles.backBtn} />
              )}
              <View style={styles.nextBtnWrap}>
                <Button
                  text={isLastStep ? (isPending ? t('signupForm.buttons.submitting') : t('signupForm.buttons.submit')) : t('signupForm.buttons.next')}
                  onPress={isLastStep ? handleSubmit(onSubmit, onInvalid) : handleNext}
                  loading={isPending}
                  disabled={isPending}
                />
              </View>
            </View>
          </View>
        </FormProvider>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bottomSafeArea} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#c28e5c' },
  topSafeArea: { backgroundColor: '#c28e5c' },
  bottomSafeArea: { backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f9f4ef' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 16 },
  content: { paddingHorizontal: 20, paddingTop: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 4 },
  footerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { paddingHorizontal: 24 },
  nextBtnWrap: { flex: 1 },
});
