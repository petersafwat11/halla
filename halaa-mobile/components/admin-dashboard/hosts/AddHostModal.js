import React from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { TextInput, MobileInput, PasswordInput, Button } from "../../../components/commen";
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

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    password: z.string().optional(),
});

/**
 * AddHostModal - Modal for creating a new host
 */
const AddHostModal = ({ visible, onClose, onSuccess }) => {
    const { t } = useTranslation("admin");
    const toast = useToast();
    const createHost = useCreateHost();

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
            await createHost.mutateAsync(data);
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t("hosts.add.title")}</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.natural[900]} />
                        </TouchableOpacity>
                    </View>

                    <FormProvider {...methods}>
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <TextInput
                                    name="name"
                                    label={`${t("hosts.add.name")} *`}
                                    placeholder={t("hosts.add.namePlaceholder")}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <TextInput
                                    name="email"
                                    label={`${t("hosts.add.email")} *`}
                                    placeholder={t("hosts.add.emailPlaceholder")}
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <MobileInput
                                    name="phoneNumber"
                                    label={`${t("hosts.add.phone")} *`}
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
                        </ScrollView>
                    </FormProvider>

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
                </View>
            </View>
        </Modal>
    );
};

AddHostModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: backgrounds.card[1],
        borderTopLeftRadius: borderRadius[20],
        borderTopRightRadius: borderRadius[20],
        maxHeight: "90%",
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
    content: {
        padding: spacing[20],
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
