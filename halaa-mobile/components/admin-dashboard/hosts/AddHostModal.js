import React, { useMemo } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import {
    TextInput,
    MobileInput,
    PasswordInput,
    EmailInput,
    Button,
    LocalizedText,
} from "../../../components/commen";
import {
    colors,
    spacing,
    borderRadius,
    typography,
    textStyles,
    backgrounds,
} from "../../../styles/tokens";
import { useCreateHost } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";

/**
 * AddHostModal - Modal for creating a new host
 *
 * Field-direction contract (blueprint §5):
 *   - name  → adaptive (placeholder follows the UI locale, a filled value
 *     follows its first strong Arabic/Latin character);
 *   - email → ltr via the shared EmailInput;
 *   - phone → phone mode inside the shared MobileInput (localized placeholder,
 *     LTR digits);
 *   - password → ltr secret value inside the shared PasswordInput.
 * Labels, helper and error text always follow the UI locale.
 */
const AddHostModal = ({ visible, onClose, onSuccess }) => {
    const { t } = useTranslation("admin");
    const toast = useToast();
    const createHost = useCreateHost();

    // Validation copy is app-authored and must follow the UI locale — the
    // schema is rebuilt per language instead of hardcoding English strings.
    const schema = useMemo(
        () =>
            z.object({
                name: z.string().min(1, t("hosts.add.nameRequired")),
                email: z
                    .string()
                    .min(1, t("hosts.add.emailRequired"))
                    .email(t("validation.invalidEmail")),
                phoneNumber: z.string().min(1, t("hosts.add.phoneRequired")),
                password: z.string().optional(),
            }),
        [t]
    );

    const methods = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            email: "",
            phoneNumber: "",
            password: "",
        },
    });

    const { handleSubmit, reset } = methods;

    const handleSave = async (data) => {
        try {
            const payload = {
                name: data.name.trim(),
                email: data.email.trim().toLowerCase(),
                phoneNumber: data.phoneNumber.trim(),
            };
            if (data.password && data.password.trim()) {
                payload.password = data.password.trim();
            }
            await createHost.mutateAsync(payload);
            toast.success(t("hosts.add.success"));
            reset();
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.message || t("hosts.add.failed"));
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const header = (
        <View style={styles.header}>
            <LocalizedText style={styles.title}>{t("hosts.add.title")}</LocalizedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
        </View>
    );

    const footer = (
        <View style={styles.footer}>
            <View style={styles.buttonWrapper}>
                <Button
                    text={t("common.cancel")}
                    onPress={handleClose}
                    variant="outline"
                    size="small"
                    disabled={createHost.isPending}
                />
            </View>
            <View style={styles.buttonWrapper}>
                <Button
                    text={createHost.isPending ? t("hosts.add.creating") : t("hosts.add.create")}
                    onPress={handleSubmit(handleSave)}
                    variant="primary"
                    size="small"
                    loading={createHost.isPending}
                />
            </View>
        </View>
    );

    return (
        // Shared sheet (§8.2 admin row): aware scroll body owns focus
        // scrolling; actions stay attached above the keyboard.
        <KeyboardSafeModalSheet
            visible={visible}
            onClose={handleClose}
            onRequestClose={handleClose}
            header={header}
            footer={footer}
            contentContainerStyle={styles.contentPadding}
            sheetStyle={styles.modalSheetBg}
        >
            <FormProvider {...methods}>
                <View style={styles.formGroup}>
                    <TextInput
                        name="name"
                        label={t("hosts.add.name")}
                        placeholder={t("hosts.add.namePlaceholder")}
                        contentDirection="adaptive"
                    />
                </View>

                <View style={styles.formGroup}>
                    <EmailInput
                        name="email"
                        label={t("hosts.add.email")}
                        placeholder={t("hosts.add.emailPlaceholder")}
                    />
                </View>

                <View style={styles.formGroup}>
                    <MobileInput
                        name="phoneNumber"
                        label={t("hosts.add.phone")}
                        placeholder={t("hosts.add.phonePlaceholder")}
                    />
                </View>

                <View style={styles.formGroup}>
                    <PasswordInput
                        name="password"
                        label={t("hosts.add.password")}
                        placeholder={t("hosts.add.passwordPlaceholder")}
                    />
                </View>
                <View style={styles.spacingHelper} />
            </FormProvider>
        </KeyboardSafeModalSheet>
    );
};

AddHostModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

const styles = StyleSheet.create({
    modalSheetBg: {
        backgroundColor: backgrounds.card[1],
    },
    contentPadding: {
        padding: spacing[20],
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: spacing[20],
        borderBottomWidth: 1,
        borderBottomColor: colors.natural[200],
    },
    title: {
        ...textStyles.titleLarge,
        color: colors.natural[900],
    },
    closeButton: {
        padding: spacing[4],
    },
    formGroup: {
        marginBottom: 8,
    },
    spacingHelper: {
        height: spacing[40],
    },
    footer: {
        flexDirection: "row",
        padding: spacing[20],
        gap: spacing[12],
        borderTopWidth: 1,
        borderTopColor: colors.natural[200],
        backgroundColor: backgrounds.card[1],
    },
    buttonWrapper: {
        flex: 1,
    },
});

export default AddHostModal;
