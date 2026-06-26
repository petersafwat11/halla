import React, { useState, useCallback } from "react";
import { View, Alert, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import ReuseGuestsModal from "../../guests/ReuseGuestsModal";
import VCardImportModal from "../../guests/VCardImportModal";
import ContactsImportModal from "./ContactsImportModal";
import { useMyContacts } from "../../../hooks/guests";
import { mergeIncomingGuests } from "../../../utils/guests/mergeIncomingGuests";
import { isContactsAvailable } from "../../../utils/contacts/phoneContacts";

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
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showVcardModal, setShowVcardModal] = useState(false);

  // Native contacts only where the module is installed + linked (graceful
  // when the dev client hasn't been rebuilt after `expo install`).
  const contactsSupported = isContactsAvailable();

  // The host's saved category labels — feeds the manual-add chips. Read-only;
  // the reuse modal does its own paged fetch.
  const { data: contactsMeta } = useMyContacts({ page: 1, limit: 1 });
  const savedCategories = contactsMeta?.data?.categories || [];

  const existingPhones = (guestList || []).map((g) => g.phone || g.mobile);
  const remainingCapacity = isUnlimited
    ? Infinity
    : Math.max(0, (guestLimit || 0) - (guestList || []).length);

  // Shared merge for the reuse picker AND native contacts: dedupe by phone,
  // respect remaining capacity (free at list time), persist via the normal save.
  const handleMergeIncoming = useCallback(
    (incoming) => {
      const { list, added, skipped } = mergeIncomingGuests(
        incoming,
        formData.guestList || [],
        { isUnlimited, guestLimit }
      );
      if (added > 0) setValue("guestList", list, { shouldValidate: true });
      if (skipped > 0) {
        Alert.alert(
          t("guest_limit_reached"),
          t("import_limit_partial", { inserted: added, skipped })
        );
      } else if (added > 0) {
        Alert.alert(t("bulk_import"), t("reuse_guests_added_toast", { count: added }));
      }
    },
    [formData.guestList, isUnlimited, guestLimit, setValue, t]
  );

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

  // Bulk "link to category" — stamp the chosen label onto the selected guests.
  const handleAssignGuestCategory = useCallback(
    (ids, category) => {
      const idSet = new Set(ids);
      const updated = (formData.guestList || []).map((g) =>
        idSet.has(g.id) ? { ...g, category } : g
      );
      setValue("guestList", updated, { shouldValidate: true });
    },
    [formData.guestList, setValue],
  );

  const guestCategoryOptions = Array.from(
    new Set([
      ...savedCategories,
      ...(guestList || []).map((g) => g.category).filter(Boolean),
    ])
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
          <GuestForm isLimitReached={isLimitReached} categories={savedCategories} />
          <ImportExportSection
            isLimitReached={isLimitReached}
            isUnlimited={isUnlimited}
            guestLimit={guestLimit}
          />
          <View style={styles.sourceRow}>
            <TouchableOpacity
              style={[styles.sourceBtn, isLimitReached && styles.sourceBtnDisabled]}
              onPress={() => setShowReuseModal(true)}
              disabled={isLimitReached}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={isLimitReached ? "#AAAAAA" : "#C28E5C"}
              />
              <Text
                style={[styles.sourceBtnText, isLimitReached && styles.sourceBtnTextDisabled]}
                numberOfLines={1}
              >
                {t("add_from_my_guests")}
              </Text>
            </TouchableOpacity>
            {contactsSupported && (
              <TouchableOpacity
                style={[styles.sourceBtn, isLimitReached && styles.sourceBtnDisabled]}
                onPress={() => setShowContactsModal(true)}
                disabled={isLimitReached}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={isLimitReached ? "#AAAAAA" : "#C28E5C"}
                />
                <Text
                  style={[styles.sourceBtnText, isLimitReached && styles.sourceBtnTextDisabled]}
                  numberOfLines={1}
                >
                  {t("import_from_phone")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sourceBtn, isLimitReached && styles.sourceBtnDisabled]}
              onPress={() => setShowVcardModal(true)}
              disabled={isLimitReached}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={isLimitReached ? "#AAAAAA" : "#C28E5C"}
              />
              <Text
                style={[styles.sourceBtnText, isLimitReached && styles.sourceBtnTextDisabled]}
                numberOfLines={1}
              >
                {t("vcard_button")}
              </Text>
            </TouchableOpacity>
          </View>
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
        onAssignCategory={handleAssignGuestCategory}
        categories={guestCategoryOptions}
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

      <ReuseGuestsModal
        visible={showReuseModal}
        onClose={() => setShowReuseModal(false)}
        onAdd={handleMergeIncoming}
        existingPhones={existingPhones}
        remainingCapacity={remainingCapacity}
        isUnlimited={isUnlimited}
      />

      {contactsSupported && (
        <ContactsImportModal
          visible={showContactsModal}
          onClose={() => setShowContactsModal(false)}
          onAdd={handleMergeIncoming}
        />
      )}

      <VCardImportModal
        visible={showVcardModal}
        onClose={() => setShowVcardModal(false)}
        onAdd={handleMergeIncoming}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sourceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  sourceBtn: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    backgroundColor: "#FFF",
  },
  sourceBtnDisabled: { borderColor: "#E0E0E0", backgroundColor: "#F9F9F9" },
  sourceBtnText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
  sourceBtnTextDisabled: { color: "#AAAAAA" },
});

export default GuestFormSection;
