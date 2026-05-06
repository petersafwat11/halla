import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Text,
} from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';
import EventsService from '../../../services/EventsService';
import { useTranslation } from '../../../localization';
import { useAuthStore } from '../../../stores/authStore';
import { useSubscriptionInfo } from '../../../hooks';
import StepOne from '../../createEvent/StepOne';
import StepTwo from '../../createEvent/StepTwo';
import StepThree from '../../createEvent/StepThree';
import StepFour from '../../createEvent/StepFour';
import EventSummary from '../../createEvent/EventSummary';
import StepHeader from '../../createEvent/StepHeader';
import PrevAndNextBtns from '../../createEvent/PrevAndNextBtns';
import HostSelectorStep from './HostSelectorStep';
import LimitReachedView from '../../createEvent/LimitReachedView';
import { spacing } from '../../../styles/tokens';

const TOTAL_STEPS = 6;

const STEP_INFO = (t) => [
  { title: t('events.steps.hostSelector'), description: t('events.hostSelector.subtitle') },
  { title: t('events.steps.eventDetails'), description: '' },
  { title: t('events.steps.guestList'), description: '' },
  { title: t('events.steps.template'), description: '' },
  { title: t('events.steps.messages'), description: '' },
  { title: t('events.steps.review'), description: '' },
];

// Both subscription sources we accept already deliver the canonical normalized shape:
//   - useSubscriptionInfo() -> backend events.service.getSubscriptionInfo
//   - HostSelectorStep target.subscription -> backend admin.service._formatTargetSubscription
// Shape: { canCreateEvent, isUnlimited?, guestLimit, isGuestUnlimited, invitePool,
//          invitesRemaining, eventsRemaining, eventsUsed, isSingleEvent, isPoolPlan }

const CreateEventForm = ({ onSubmit, loading }) => {
  const { t } = useTranslation('admin');
  const token = useAuthStore((state) => state.token);
  const [currentStep, setCurrentStep] = useState(1);
  const [hostSelection, setHostSelection] = useState({});

  const { data: subInfoData } = useSubscriptionInfo();
  const selfSubscription = subInfoData ?? null;

  const methods = useForm({
    mode: 'onChange',
    defaultValues: EventsService.getDefaultFormValues(),
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  // Pick the subscription that gates event creation: self when admin creates for themselves,
  // otherwise the target host's normalized subscription from HostSelectorStep.
  const hostSubscription = useMemo(() => {
    if (hostSelection.createForSelf) return selfSubscription;
    return hostSelection.subscription ?? null;
  }, [hostSelection, selfSubscription]);

  const canCreateEvent = useMemo(() => {
    if (!hostSelection.createForSelf && !hostSelection.targetUserId) return true;
    if (!hostSubscription) return false;
    if (hostSubscription.isUnlimited) return true;
    if (hostSubscription.eventsRemaining === -1) return true;
    return hostSubscription.eventsRemaining > 0;
  }, [hostSelection, hostSubscription]);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) {
      return !!(hostSelection.createForSelf || hostSelection.targetUserId);
    }
    // Map admin step (2-6) to EventsService step (1-5)
    return EventsService.validateStepData(currentStep - 1, formData);
  }, [currentStep, formData, hostSelection]);

  const onNext = useCallback(() => {
    if (!isStepValid) {
      Alert.alert(t('common.error'), t('events.steps.incompleteFields'));
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit(handleFinalSubmit)();
    }
  }, [currentStep, isStepValid, handleSubmit]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleFinalSubmit = useCallback(
    async (data) => {
      const payload = EventsService.transformFormDataToPayload(data);
      const formDataObj = new FormData();

      if (payload.guestList) {
        formDataObj.append('guestList', JSON.stringify(payload.guestList));
      }
      if (payload.eventDetails) {
        formDataObj.append('eventDetails', JSON.stringify(payload.eventDetails));
      }
      if (payload.staffList) {
        formDataObj.append('staffList', JSON.stringify(payload.staffList));
      }
      if (payload.invitationSettings) {
        const { templateImage, ...restInvitation } = payload.invitationSettings;
        formDataObj.append('invitationSettings', JSON.stringify(restInvitation));
      }
      if (payload.launchSettings) {
        formDataObj.append('launchSettings', JSON.stringify(payload.launchSettings));
      }

      // Append host selection fields
      if (hostSelection.createForSelf) {
        formDataObj.append('createForSelf', 'true');
      } else if (hostSelection.targetUserId) {
        formDataObj.append('targetUserId', hostSelection.targetUserId);
        formDataObj.append('targetType', hostSelection.targetType || 'host');
      }

      await onSubmit(formDataObj);
    },
    [onSubmit, hostSelection],
  );

  const stepInfoList = STEP_INFO(t);
  const stepInfo = stepInfoList[currentStep - 1] || { title: '', description: '' };

  // Block event creation if selected target has no active subscription or no remaining events
  if (currentStep > 1 && !canCreateEvent) {
    return (
      <LimitReachedView
        tEvents={t}
        title={t('events.create')}
        navigation={null}
      />
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <HostSelectorStep
            value={hostSelection}
            onChange={setHostSelection}
          />
        );
      case 2:
        return <StepOne />;
      case 3:
        return (
          <StepTwo
            guestList={formData.guestList}
            staffList={formData.staffList}
            subscription={hostSubscription}
          />
        );
      case 4:
        return (
          <StepThree
            selectedTemplate={formData.selectedTemplate}
            onSelectTemplate={(template) =>
              setValue('selectedTemplate', template, { shouldValidate: true })
            }
          />
        );
      case 5:
        return <StepFour />;
      case 6:
        return <EventSummary />;
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StepHeader
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          title={stepInfo.title}
          description={stepInfo.description}
        />

        <View style={styles.contentContainer}>{renderStepContent()}</View>

        <PrevAndNextBtns
          onNext={onNext}
          onPrevious={onPrevious}
          showPrevious={currentStep > 1}
          isNextDisabled={!isStepValid || loading}
          nextButtonText={currentStep === TOTAL_STEPS ? t('common.save') : t('common.next')}
          isLoading={loading}
        />
      </ScrollView>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    paddingBottom: 100,
  },
  contentContainer: { marginVertical: spacing[24] },
});

export default CreateEventForm;