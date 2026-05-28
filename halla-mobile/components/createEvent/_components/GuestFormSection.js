import React, { useState, useCallback } from "react";
import { View, Alert } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../hooks/events/useEventForm";
import Button from "../../commen/Button";
import ListOfGuestsORModerators from "../ListOfGuestsORModerators";
import GuestQuotaCounter from "../GuestQuotaCounter";
import GuestModeratorTabs from "./GuestModeratorTabs";
import LimitReachedBanner from "./LimitReachedBanner";
import GuestForm from "./GuestForm";
import ModeratorForm from "./ModeratorForm";
import ImportExportSection from "./ImportExportSection";
import ViewListButton from "./ViewListButton";

const GuestFormSection = ({
  guestList,
  staffList,
  subscription,
  isLimitReached,
  isUnlimited,
  guestLimit,
}) => {
  const { t } = useTranslation("createEvent");
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [activeTab, setActiveTab] = useState("guests");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showModeratorModal, setShowModeratorModal] = useState(false);

  const handleEditGuest = useCallback(
    (id, updatedGuest) => {
      const result = EventsService.editListItem(id, updatedGuest, formData.guestList, "guest");
      if (result.success) {
        setValue("guestList", result.list, { shouldValidate: true });
        return { success: true };
      }
      return { success: false, errors: result.errors };
    },
    [formData.guestList, setValue],
  );

  const handleRemoveGuest = useCallback(
    (id) => {
      Alert.alert(t("remove"), "", [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            const updatedList = EventsService.removeListItem(id, formData.guestList);
            setValue("guestList", updatedList, { shouldValidate: true });
          },
        },
      ]);
    },
    [formData.guestList, setValue, t],
  );

  const handleEditModerator = useCallback(
    (id, updatedModerator) => {
      const result = EventsService.editListItem(id, updatedModerator, formData.staffList || [], "moderator");
      if (result.success) {
        setValue("staffList", result.list, { shouldValidate: true });
        return { success: true };
      }
      return { success: false, errors: result.errors };
    },
    [formData.staffList, setValue],
  );

  const handleRemoveModerator = useCallback(
    (id) => {
      Alert.alert(t("remove"), "", [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            const updatedList = EventsService.removeListItem(id, formData.staffList || []);
            setValue("staffList", updatedList, { shouldValidate: true });
          },
        },
      ]);
    },
    [formData.staffList, setValue, t],
  );

  const currentList = activeTab === "guests" ? guestList : staffList;
  const currentCount = currentList?.length || 0;

  return (
    <View style={styles.container}>
      {subscription && activeTab === "guests" && (
        <GuestQuotaCounter currentGuests={guestList.length} subscription={subscription} />
      )}

      {isLimitReached && activeTab === "guests" && <LimitReachedBanner t={t} />}

      <GuestModeratorTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        guestCount={guestList.length}
        moderatorCount={staffList.length}
        t={t}
      />

      {activeTab === "guests" ? (
        <View>
          <GuestForm isLimitReached={isLimitReached} />
          <ImportExportSection
            isLimitReached={isLimitReached}
            isUnlimited={isUnlimited}
            guestLimit={guestLimit}
          />
        </View>
      ) : (
        <ModeratorForm />
      )}

      {currentCount > 0 && (
        <ViewListButton
          count={currentCount}
          onPress={() => {
            if (activeTab === "guests") setShowGuestModal(true);
            else setShowModeratorModal(true);
          }}
          t={t}
        />
      )}

      <ListOfGuestsORModerators
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        title={t("guest_list")}
        list={guestList}
        type="guest"
        onEdit={handleEditGuest}
        onRemove={handleRemoveGuest}
      />

      <ListOfGuestsORModerators
        visible={showModeratorModal}
        onClose={() => setShowModeratorModal(false)}
        title={t("staff_list")}
        list={staffList}
        type="moderator"
        onEdit={handleEditModerator}
        onRemove={handleRemoveModerator}
      />
    </View>
  );
};

const styles = {
  container: { flex: 1 },
};

export default GuestFormSection;
