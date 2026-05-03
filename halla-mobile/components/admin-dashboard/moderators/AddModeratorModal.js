import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";
import { useCreateModerator, useUpdateModerator } from "../../../hooks";
import { useAdminWhitelabels } from "../../../hooks/queries/useAdmin";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// H-15: roles that REQUIRE a whitelabelId server-side. Mirror of the web
// AddModeratorPopup constant.
const ROLES_THAT_NEED_TENANT = new Set([
  "admin",
  "moderator",
  "whitelabel_admin",
  "whitelabel_moderator",
]);

const AddModeratorModal = ({ visible, onClose, moderator, onSave }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createModerator = useCreateModerator();
  const updateModerator = useUpdateModerator();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  // H-15: whitelabel tenant picker for SUPER_ADMIN. Other roles never see
  // the picker (the backend auto-inherits whitelabelId for WL admins).
  const whitelabelsQuery = useAdminWhitelabels({});
  const whitelabelOptions = (
    whitelabelsQuery.data?.data ||
    whitelabelsQuery.data ||
    []
  )
    .filter((w) => w && (w._id || w.id))
    .map((w) => ({
      id: w._id || w.id,
      label: w.name || w.brandName || w.email || (w._id || w.id),
    }));

  const ROLE_OPTIONS = [
    { id: "moderator", label: t("moderators.roles.moderator"),  description: t("moderators.add.moderatorDesc") },
    { id: "admin",     label: t("moderators.roles.admin"),      description: t("moderators.add.adminDesc") },
  ];

  const isEdit = !!moderator;
  const saving = createModerator.isPending || updateModerator.isPending;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "moderator",
    whitelabelId: "",
  });
  const [errors, setErrors] = useState({});

  const showWhitelabelPicker =
    isSuperAdmin && !isEdit && ROLES_THAT_NEED_TENANT.has(formData.role);

  useEffect(() => {
    if (visible) {
      if (moderator) {
        setFormData({
          name:        moderator.name || moderator.username || "",
          email:       moderator.email || "",
          password:    "",
          phoneNumber: moderator.phoneNumber || moderator.phone || "",
          role:        moderator.role || "moderator",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          password: "",
          phoneNumber: "",
          role: "moderator",
          whitelabelId: "",
        });
      }
      setErrors({});
    }
  }, [visible, moderator]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("common.name") + " " + t("common.required", "is required");
    if (!formData.email.trim()) {
      e.email = t("common.email") + " " + t("common.required", "is required");
    } else if (!EMAIL_RE.test(formData.email)) {
      e.email = t("common.invalidEmail", "Invalid email format");
    }
    if (!isEdit && !formData.password.trim()) {
      e.password = t("moderators.add.password") + " " + t("common.required", "is required");
    }
    if (!isEdit && !formData.phoneNumber.trim()) {
      e.phoneNumber = t("moderators.add.phoneRequired") + " " + t("common.required", "is required");
    }
    // H-15: SUPER_ADMIN must select a tenant for ADMIN/MODERATOR/WL_*
    // creations.
    if (showWhitelabelPicker && !formData.whitelabelId) {
      e.whitelabelId = t(
        "moderators.add.whitelabelRequired",
        "اختر العلامة البيضاء"
      );
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = {
        name:        formData.name.trim(),
        email:       formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        role:        formData.role,
      };
      if (!isEdit) payload.password = formData.password;
      // H-15: only attach whitelabelId when picker was shown (SUPER_ADMIN
      // creating a tenant-scoped role). WHITELABEL_ADMIN inheritance is
      // handled server-side from req.user.whitelabelId.
      if (showWhitelabelPicker && formData.whitelabelId) {
        payload.whitelabelId = formData.whitelabelId;
      }

      if (isEdit) {
        await updateModerator.mutateAsync({
          moderatorId: moderator.id || moderator._id,
          moderatorData: payload,
        });
      } else {
        await createModerator.mutateAsync(payload);
      }
      onSave && onSave();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save moderator");
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEdit ? t("moderators.add.editTitle") : t("moderators.add.title")}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>{t("moderators.add.name")} *</Text>
              <View
                style={[styles.inputRow, errors.name && styles.inputRowError]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.primary[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("moderators.add.name")}
                  placeholderTextColor={colors.natural[350]}
                  value={formData.name}
                  onChangeText={(v) => updateField("name", v)}
                  editable={!saving}
                />
              </View>
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("moderators.add.email")} *</Text>
              <View
                style={[styles.inputRow, errors.email && styles.inputRowError]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.primary[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("moderators.add.email")}
                  placeholderTextColor={colors.natural[350]}
                  value={formData.email}
                  onChangeText={(v) => updateField("email", v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isEdit && !saving}
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {!isEdit ? (
              <View style={styles.field}>
                <Text style={styles.label}>{t("moderators.add.password")} *</Text>
                <View
                  style={[
                    styles.inputRow,
                    errors.password && styles.inputRowError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={colors.primary[500]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("moderators.add.password")}
                    placeholderTextColor={colors.natural[350]}
                    value={formData.password}
                    onChangeText={(v) => updateField("password", v)}
                    secureTextEntry
                    editable={!saving}
                  />
                </View>
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>
                {isEdit ? t("moderators.add.phone") : t("moderators.add.phoneRequired") + " *"}
              </Text>
              <View style={[styles.inputRow, errors.phoneNumber && styles.inputRowError]}>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={colors.primary[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("moderators.add.phoneRequired")}
                  placeholderTextColor={colors.natural[350]}
                  value={formData.phoneNumber}
                  onChangeText={(v) => updateField("phoneNumber", v)}
                  keyboardType="phone-pad"
                  editable={!saving}
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              ) : null}
            </View>

            {showWhitelabelPicker ? (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {t("moderators.add.whitelabel", "العلامة البيضاء")} *
                </Text>
                {whitelabelsQuery.isLoading ? (
                  <Text style={styles.roleDesc}>
                    {t("common.loading", "جارٍ التحميل...")}
                  </Text>
                ) : (
                  <View style={styles.roleList}>
                    {whitelabelOptions.length === 0 ? (
                      <Text style={styles.roleDesc}>
                        {t(
                          "moderators.add.noWhitelabels",
                          "لا توجد علامات بيضاء متاحة"
                        )}
                      </Text>
                    ) : (
                      whitelabelOptions.map((opt) => {
                        const selected = formData.whitelabelId === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.roleOption,
                              selected && styles.roleOptionSelected,
                            ]}
                            onPress={() => updateField("whitelabelId", opt.id)}
                            disabled={saving}
                          >
                            <View style={styles.roleInfo}>
                              <Text
                                style={[
                                  styles.roleName,
                                  selected && styles.roleNameSelected,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </View>
                            {selected ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={colors.primary[500]}
                              />
                            ) : (
                              <Ionicons
                                name="ellipse-outline"
                                size={22}
                                color={colors.natural[300]}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
                {errors.whitelabelId ? (
                  <Text style={styles.errorText}>{errors.whitelabelId}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>{t("moderators.add.role")} *</Text>
              <View style={styles.roleList}>
                {ROLE_OPTIONS.map((opt) => {
                  const selected = formData.role === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.roleOption,
                        selected && styles.roleOptionSelected,
                      ]}
                      onPress={() => updateField("role", opt.id)}
                      disabled={saving}
                    >
                      <View style={styles.roleInfo}>
                        <Text
                          style={[
                            styles.roleName,
                            selected && styles.roleNameSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.roleDesc}>{opt.description}</Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary[500]}
                        />
                      ) : (
                        <Ionicons
                          name="ellipse-outline"
                          size={22}
                          color={colors.natural[300]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>{t("moderators.add.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.saveBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.natural[50]} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? t("moderators.add.saveChanges") : t("moderators.addModerator")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius[4],
    backgroundColor: colors.natural[250],
    alignSelf: "center",
    marginTop: spacing[12],
    marginBottom: spacing[8],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  headerTitle: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  closeBtn: {
    padding: spacing[4],
  },
  body: {
    padding: spacing[20],
  },
  field: {
    marginBottom: spacing[20],
  },
  label: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[250],
    padding: spacing[12],
  },
  inputRowError: {
    borderColor: colors.error[500],
  },
  inputIcon: {
    marginRight: spacing[12],
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    padding: 0,
  },
  errorText: {
    fontSize: typography.fontSize.body.small,
    color: colors.error[500],
    marginTop: spacing[4],
  },
  roleList: {
    gap: spacing[12],
  },
  roleOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[16],
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[12],
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: backgrounds.card[5],
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
    marginBottom: spacing[4],
  },
  roleNameSelected: {
    color: colors.primary[600],
  },
  roleDesc: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  footer: {
    flexDirection: "row",
    padding: spacing[20],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: backgrounds.card[2],
    borderWidth: 1,
    borderColor: colors.natural[250],
  },
  cancelBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[700],
  },
  saveBtn: {
    backgroundColor: colors.primary[500],
  },
  saveBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },
});

export default AddModeratorModal;
