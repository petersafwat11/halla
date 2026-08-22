import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import TextInput from "../../commen/DirectionalTextInput";
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
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddModeratorModal = ({ visible, onClose, moderator, onSave }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createModerator = useCreateModerator();
  const updateModerator = useUpdateModerator();

  const ROLE_OPTIONS = [
    { id: "moderator", label: t("moderators.roles.moderator"),  description: t("moderators.add.moderatorDesc") },
    { id: "admin",     label: t("moderators.roles.admin"),      description: t("moderators.add.adminDesc") },
  ];

  const defaultRole = "moderator";

  const isEdit = !!moderator;
  const saving = createModerator.isPending || updateModerator.isPending;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: defaultRole,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      if (moderator) {
        setFormData({
          name:        moderator.name || moderator.username || "",
          email:       moderator.email || "",
          password:    "",
          phoneNumber: moderator.phoneNumber || moderator.phone || "",
          role:        moderator.role || defaultRole,
        });
      } else {
        setFormData({
          name: "",
          email: "",
          password: "",
          phoneNumber: "",
          role: defaultRole,
        });
      }
      setErrors({});
    }
  }, [visible, moderator, defaultRole]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("moderators.add.nameRequired");
    if (!formData.email.trim()) {
      e.email = t("moderators.add.emailRequired");
    } else if (!EMAIL_RE.test(formData.email)) {
      e.email = t("moderators.add.invalidEmail");
    }
    if (!isEdit && formData.password.trim() && formData.password.trim().length < 8) {
      e.password = t("moderators.add.passwordMin", "Password must be at least 8 characters");
    }
    if (!isEdit && !formData.phoneNumber.trim()) {
      e.phoneNumber = t("moderators.add.phoneRequired");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = {
        name:        formData.name.trim(),
        email:       formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        role:        formData.role,
      };
      if (!isEdit && formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
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
      toast.error(err?.message || t("moderators.add.saveFailed"));
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
                <Text style={styles.label}>{t("moderators.add.password")}</Text>
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
                    placeholder={t("moderators.add.passwordPlaceholder", "Leave blank to auto-generate")}
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
    marginEnd: spacing[12],
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
