import React, { useState, useEffect } from "react";
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

// --- High-Quality Native Brand Badges ---
const VisaBadge = () => (
  <View style={styles.visaBadge}>
    <Text style={styles.visaText}>VISA</Text>
  </View>
);

const MastercardBadge = () => (
  <View style={styles.mastercardContainer}>
    <View style={styles.mcCircle1} />
    <View style={styles.mcCircle2} />
  </View>
);

const MadaBadge = () => (
  <View style={styles.madaBadge}>
    <Text style={styles.madaText}>mada</Text>
  </View>
);

const StcPayBadge = () => (
  <View style={styles.stcBadge}>
    <Text style={styles.stcText}>stc pay</Text>
  </View>
);

const ApplePayBadge = () => (
  <View style={styles.appleBadge}>
    <Text style={styles.appleText}> Pay</Text>
  </View>
);

const METHODS = [
  {
    key: "creditcard",
    labelKey: "checkout.method.card",
    Logos: () => (
      <View style={styles.tabLogoRow}>
        <VisaBadge />
        <MastercardBadge />
        <MadaBadge />
      </View>
    ),
  },
  {
    key: "applepay",
    labelKey: "checkout.method.applepay",
    Logos: ApplePayBadge,
  },
  {
    key: "stcpay",
    labelKey: "checkout.method.stcpay",
    Logos: StcPayBadge,
  },
];

const detectCardBrand = (number) => {
  const clean = number.replace(/\D/g, "");
  if (!clean) return "unknown";

  const p6 = clean.substring(0, 6);
  const p4 = clean.substring(0, 4);
  const mada6 = [
    "406136", "410621", "417633", "422817", "422818", "422819", "428331", "428671", "428672", "428673", "431361", "432328", "434673", "439953", "440533", "440647", "445564", "446393", "446404", "446672", "455036", "455708", "457865", "457997", "458456", "462220", "468541", "468542", "468543", "483010", "483011", "483012", "484783", "486094", "486095", "486096", "489317", "489318", "489319", "493137", "504300", "506959", "506960", "506961", "506962", "506963", "513213", "520058", "521076", "524130", "524514", "529415", "529741", "530060", "530906", "531095", "531196", "532013", "535822", "535989", "536023", "537767", "539931", "543085", "543357", "549760", "554180", "557606", "558848", "585265", "588845", "588846", "588847", "588848", "588849", "588850", "588851", "588982", "588983", "589005", "589206", "604906", "605141", "636120", "968201", "968202", "968203", "968204", "968205", "968206", "968207", "968208", "968209", "968211"
  ];
  
  if (mada6.includes(p6)) return "mada";
  
  const p4Num = parseInt(p4, 10);
  if (p4Num === 5892 || p4Num === 9682) return "mada";

  if (clean.startsWith("4")) return "visa";
  
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) {
    return "mastercard";
  }
  
  return "unknown";
};

const PaymentMethodSelector = ({
  value,
  onChange,
  onCardChange,
  onMobileChange,
  cardData,
  stcMobile,
  errors = {},
}) => {
  const { t } = useTranslation("plans");
  const [card, setCard] = useState({
    name: "",
    number: "",
    month: "",
    year: "",
    cvc: "",
  });
  const [expiryText, setExpiryText] = useState("");
  const [mobileText, setMobileText] = useState("");

  useEffect(() => {
    if (cardData) {
      setCard(cardData);
      if (cardData.month && cardData.year) {
        const yy = cardData.year.toString().slice(-2);
        setExpiryText(`${cardData.month}/${yy}`);
      }
    }
  }, [cardData]);

  useEffect(() => {
    if (stcMobile !== undefined) {
      setMobileText(stcMobile);
    }
  }, [stcMobile]);

  const updateCardField = (field, val) => {
    const next = { ...card, [field]: val };
    setCard(next);
    onCardChange?.(next);
  };

  const handleCardNumberChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    updateCardField("number", digits);
  };

  const handleExpiryChange = (text) => {
    const clean = text.replace(/\D/g, "").slice(0, 4);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    setExpiryText(formatted);

    const month = clean.slice(0, 2);
    const yy = clean.slice(2, 4);
    const year = yy ? `20${yy}` : "";

    const next = { ...card, month, year };
    setCard(next);
    onCardChange?.(next);
  };

  const handleMobileChange = (text) => {
    const val = text.replace(/\D/g, "").slice(0, 10);
    setMobileText(val);
    onMobileChange?.(val);
  };

  const activeCardBrand = detectCardBrand(card.number || "");

  const renderCardInputBrandIcon = () => {
    switch (activeCardBrand) {
      case "visa":
        return <VisaBadge />;
      case "mastercard":
        return <MastercardBadge />;
      case "mada":
        return <MadaBadge />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="radiogroup">
        {METHODS.map(({ key, labelKey, Logos }) => {
          const active = value === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onChange(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(labelKey)}
              activeOpacity={0.85}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t(labelKey)}
                </Text>
                <View style={styles.tabLogosContainer}>
                  <Logos />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {value === "creditcard" && (
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{t("checkout.card.name")}</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder={t("checkout.card.name")}
              placeholderTextColor={colors.natural[350]}
              value={card.name || ""}
              onChangeText={(v) => updateCardField("name", v)}
              autoComplete="cc-name"
              textContentType="name"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("checkout.card.number")}</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.brandIconWrapper}>
                {renderCardInputBrandIcon()}
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithIconField,
                  errors.number && styles.inputError,
                ]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.natural[350]}
                keyboardType="number-pad"
                maxLength={19}
                value={card.number ? card.number.replace(/(\d{4})(?=\d)/g, "$1 ") : ""}
                onChangeText={handleCardNumberChange}
                autoComplete="cc-number"
                textContentType="creditCardNumber"
              />
            </View>
            {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.fieldExpiry]}>
              <Text style={styles.label}>{t("checkout.card.expiry", "Expiry date")}</Text>
              <TextInput
                style={[styles.input, errors.expiry && styles.inputError]}
                placeholder="MM/YY"
                placeholderTextColor={colors.natural[350]}
                keyboardType="number-pad"
                maxLength={5}
                value={expiryText}
                onChangeText={handleExpiryChange}
              />
              {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
            </View>
            <View style={[styles.field, styles.fieldCvc]}>
              <Text style={styles.label}>{t("checkout.card.cvc")}</Text>
              <TextInput
                style={[styles.input, errors.cvc && styles.inputError]}
                placeholder="CVC"
                placeholderTextColor={colors.natural[350]}
                keyboardType="number-pad"
                maxLength={4}
                value={card.cvc || ""}
                onChangeText={(v) => updateCardField("cvc", v.replace(/\D/g, ""))}
              />
              {errors.cvc && <Text style={styles.errorText}>{errors.cvc}</Text>}
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
              style={[styles.input, errors.stcMobile && styles.inputError]}
              placeholder="05XXXXXXXX"
              placeholderTextColor={colors.natural[350]}
              keyboardType="phone-pad"
              value={mobileText}
              onChangeText={handleMobileChange}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
            {errors.stcMobile && <Text style={styles.errorText}>{errors.stcMobile}</Text>}
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
    gap: spacing[10],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 2,
    borderColor: colors.natural[200],
    backgroundColor: colors.natural[50],
    minHeight: 72,
    justifyContent: "center",
  },
  tabActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[100],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContent: {
    alignItems: "center",
    gap: spacing[6],
  },
  tabLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.label.small || 12,
    color: colors.natural[450],
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.secondary[900],
  },
  tabLogosContainer: {
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },

  // --- Badge Styles ---
  visaBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: "#151b54",
    borderRadius: 3,
  },
  visaText: {
    color: "#F7B600",
    fontWeight: "bold",
    fontStyle: "italic",
    fontSize: 9,
  },
  mastercardContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 26,
    height: 18,
  },
  mcCircle1: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EB001B",
  },
  mcCircle2: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF5F00",
    opacity: 0.85,
    marginLeft: -8,
  },
  madaBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#0075A0",
    borderRadius: 3,
  },
  madaText: {
    color: "#0075A0",
    fontWeight: "bold",
    fontStyle: "italic",
    fontSize: 8,
  },
  stcBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#4f005d",
    borderRadius: 4,
  },
  stcText: {
    color: "#00E5FF",
    fontWeight: "bold",
    fontSize: 8,
  },
  appleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#000000",
    borderRadius: 4,
  },
  appleText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 9,
  },

  // --- Fields ---
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
    fontFamily: "Cairo_700Bold",
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
  inputError: {
    borderColor: colors.error ? colors.error[500] : "#F43F5E",
    backgroundColor: colors.error ? colors.error[50] : "#FFF1F2",
  },
  errorText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    color: colors.error ? colors.error[600] : "#E11D48",
    marginTop: 2,
  },
  inputWithIcon: {
    position: "relative",
    justifyContent: "center",
  },
  brandIconWrapper: {
    position: "absolute",
    left: spacing[12],
    zIndex: 2,
    justifyContent: "center",
    height: "100%",
  },
  inputWithIconField: {
    paddingLeft: spacing[56],
  },
  row: {
    flexDirection: "row",
    gap: spacing[12],
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
