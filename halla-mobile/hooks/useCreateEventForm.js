import { useState, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useForm } from "react-hook-form";
import { useNavigation } from "@react-navigation/native";
import EventsService from "../services/EventsService";

export function useCreateEventForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const navigation = useNavigation();

  const methods = useForm({
    mode: "onChange",
    defaultValues: EventsService.getDefaultFormValues(),
  });

  const { watch, handleSubmit, setValue } = methods;
  const formData = watch();

  return {
    methods,
    formData,
    currentStep,
    setCurrentStep,
    showPreview,
    setShowPreview,
    showInfoPopup,
    setShowInfoPopup,
    navigation,
    watch,
    handleSubmit,
    setValue,
  };
}

export function useStepValidation(currentStep, formData) {
  return useMemo(() => {
    return EventsService.validateStepData(currentStep, formData);
  }, [currentStep, formData]);
}

export function useCreateEventHandlers({
  t,
  currentStep,
  isStepValid,
  setCurrentStep,
  handleSubmit,
  token,
  createEventMutation,
  navigation,
  setShowInfoPopup,
}) {
  const onNext = useCallback(() => {
    if (!isStepValid) {
      Alert.alert(t("validation.incompleteFields"), t("validation.completeRequiredFields"));
      return;
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit(onSubmit)();
    }
  }, [currentStep, isStepValid, handleSubmit, t, setCurrentStep]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);

  const onSubmit = useCallback(
    async (data) => {
      try {
        if (!token) {
          Alert.alert(t("auth.loginRequired"), t("auth.mustLoginFirst"));
          return;
        }

        const payload = EventsService.transformFormDataToPayload(data);

        const formDataObj = new FormData();

        if (payload.guestList) {
          formDataObj.append("guestList", JSON.stringify(payload.guestList));
        }

        if (payload.eventDetails) {
          formDataObj.append("eventDetails", JSON.stringify(payload.eventDetails));
        }

        if (payload.staffList) {
          formDataObj.append("staffList", JSON.stringify(payload.staffList));
        }

        if (payload.visualTemplate) {
          formDataObj.append("visualTemplate", JSON.stringify(payload.visualTemplate));
        }
        if (payload.taqnyatTemplate) {
          formDataObj.append("taqnyatTemplate", JSON.stringify(payload.taqnyatTemplate));
        }
        if (payload.guestReplies) {
          formDataObj.append("guestReplies", JSON.stringify(payload.guestReplies));
        }

        if (payload.templateImage && typeof payload.templateImage === "object" && payload.templateImage.uri) {
          formDataObj.append("templateImage", {
            uri: payload.templateImage.uri,
            type: payload.templateImage.type || "image/jpeg",
            name: payload.templateImage.fileName || "template.jpg",
          });
        }

        if (payload.launchSettings) {
          formDataObj.append("launchSettings", JSON.stringify(payload.launchSettings));
        }

        const result = await createEventMutation.mutateAsync(formDataObj);

        Alert.alert(t("success.eventCreated"), t("success.eventCreatedMessage"), [
          {
            text: t("buttons.next"),
            onPress: () => {
              navigation.navigate("MainTabs", { screen: "Events" });
            },
          },
        ]);
      } catch (error) {
        Alert.alert(t("errors.createFailed"), error.message || t("errors.createFailedMessage"));
      }
    },
    [t, token, createEventMutation, navigation],
  );

  const handleClose = useCallback(() => {
    Alert.alert(
      t("cancel.title"),
      t("cancel.message"),
      [
        { text: t("cancel.continue"), style: "cancel" },
        {
          text: t("cancel.cancel"),
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [t, navigation]);

  const handleContactUs = useCallback(() => {
    setShowInfoPopup(false);
    Alert.alert(t("contact.title"), t("contact.message"));
  }, [t, setShowInfoPopup]);

  return {
    onNext,
    onPrevious,
    onSubmit,
    handleClose,
    handleContactUs,
  };
}
