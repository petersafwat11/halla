import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const METHODS = [
  { key: "creditcard", labelKey: "checkout.method.card", icon: "card-outline" },
  { key: "applepay", labelKey: "checkout.method.applepay", icon: "logo-apple" },
  { key: "stcpay", labelKey: "checkout.method.stcpay", icon: "phone-portrait-outline" },
];

const onlyDigits = (v) => (v || "").replace(/\D/g, "");

const PaymentMethodSelector = ({
  value,
  onChange,
  onCardChange,
  onMobileChange,
}) => {
  const { t } = useTranslation("plans");
  const [card, setCard] = useState({
    name: "",
    number: "",
    month: "",
    year: "",
    cvc: "",
  });
  const [mobile, setMobile] = useState("");

  const updateCard = (field, val) => {
    const next = { ...card, [field]: val };
    setCard(next);
    onCardChange?.(next);
  };

  const updateMobile = (val) => {
    setMobile(val);
    onMobileChange?.(val);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="radiogroup">
        {METHODS.map(({ key, labelKey, icon }) => {
          const active = value === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onChange(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={icon}
                size={20}
                color={active ? colors.primary[700] : colors.natural[450]}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value === "creditcard" && (
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("checkout.card.name")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("checkout.card.name")}
              placeholderTextColor={colors.natural[350]}
              value={card.name}
              onChangeText={(v) => updateCard("name", v)}
              autoComplete="cc-name"
              textContentType="name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("checkout.card.number")}</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons
                name="card-outline"
                size={18}
                color={colors.natural[450]}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputWithIconField]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.natural[350]}
                keyboardType="number-pad"
                maxLength={19}
                value={card.number}
                onChangeText={(v) => updateCard("number", onlyDigits(v))}
                autoComplete="cc-number"
                textContentType="creditCardNumber"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.expiryGroup}>
              <View style={[styles.field, styles.fieldExpiry]}>
                <Text style={styles.label}>{t("checkout.card.month")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM"
                  placeholderTextColor={colors.natural[350]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={card.month}
                  onChangeText={(v) => updateCard("month", onlyDigits(v))}
                />
              </View>
              <View style={[styles.field, styles.fieldExpiry]}>
                <Text style={styles.label}>{t("checkout.card.year")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY"
                  placeholderTextColor={colors.natural[350]}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={card.year}
                  onChangeText={(v) => updateCard("year", onlyDigits(v))}
                />
              </View>
            </View>
            <View style={[styles.field, styles.fieldCvc]}>
              <Text style={styles.label}>{t("checkout.card.cvc")}</Text>
              <TextInput
                style={styles.input}
                placeholder="CVC"
                placeholderTextColor={colors.natural[350]}
                keyboardType="number-pad"
                maxLength={4}
                value={card.cvc}
                onChangeText={(v) => updateCard("cvc", onlyDigits(v))}
              />
            </View>
          </View>

          <View style={styles.note}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.primary[500]}
            />
            <Text style={styles.noteText}>{t("checkout.card.secureNote")}</Text>
          </View>
        </View>
      )}

      {value === "stcpay" && (
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("checkout.stcpay.mobile")}</Text>
            <TextInput
              style={styles.input}
              placeholder="05XXXXXXXX"
              placeholderTextColor={colors.natural[350]}
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(v) => updateMobile(onlyDigits(v))}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>
          <View style={styles.note}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.primary[500]}
            />
            <Text style={styles.noteText}>{t("checkout.stcpay.note")}</Text>
          </View>
        </View>
      )}

      {value === "applepay" && (
        <View style={[styles.note, styles.noteStandalone]}>
          <Ionicons name="logo-apple" size={16} color={colors.primary[500]} />
          <Text style={styles.noteText}>{t("checkout.applepay.note")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[16],
  },
  tabs: {
    flexDirection: "row",
    gap: spacing[8],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    backgroundColor: colors.natural[50],
  },
  tabActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  tabLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[600],
  },
  tabLabelActive: {
    color: colors.primary[700],
  },
  fields: {
    gap: spacing[12],
  },
  field: {
    gap: spacing[6],
  },
  fieldExpiry: {
    flex: 1,
  },
  fieldCvc: {
    flex: 1,
  },
  label: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[700],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.natural[250],
    borderRadius: borderRadius[12],
    paddingHorizontal: spacing[16],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    backgroundColor: colors.natural[50],
  },
  inputWithIcon: {
    position: "relative",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: spacing[12],
    zIndex: 2,
  },
  inputWithIconField: {
    paddingLeft: spacing[40],
  },
  row: {
    flexDirection: "row",
    gap: spacing[8],
  },
  expiryGroup: {
    flex: 2,
    flexDirection: "row",
    gap: spacing[8],
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[6],
    paddingHorizontal: spacing[4],
  },
  noteStandalone: {
    paddingVertical: spacing[8],
  },
  noteText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[600],
    lineHeight: 18,
  },
});

export default PaymentMethodSelector;
