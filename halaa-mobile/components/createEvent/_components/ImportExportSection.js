import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import Svg, { Path } from "react-native-svg";
import { exportTemplateXLSX, importFromXLSX } from "../../../utils/xlsxUtils";

const UploadIcon = ({ disabled }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={disabled ? "#AAAAAA" : "#C28E5C"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#C28E5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ImportExportSection({ isLimitReached, isUnlimited, guestLimit }) {
  const { t } = useTranslation("createEvent");
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [showImportErrors, setShowImportErrors] = useState(false);

  const GUEST_HEADERS = [
    { key: "name", label: t("excel_guest_name") },
    { key: "phone", label: t("excel_phone_number") },
    { key: "category", label: t("excel_category"), optional: true },
  ];

  const validateImportRow = useCallback((rowData) => {
    const errors = [];
    if (!rowData.name || !rowData.name.trim()) errors.push(t("validation.name_required"));
    if (!rowData.phone || !rowData.phone.trim()) {
      errors.push(t("validation.mobile_required"));
    } else if (!/^5[0-9]{8}$/.test(rowData.phone.trim())) {
      errors.push(t("validation.mobile_format_import"));
    }
    return { isValid: errors.length === 0, errors };
  }, [t]);

  const handleExportTemplate = useCallback(async () => {
    const sampleData = [{ name: t("excel_sample_name"), phone: "512345678", category: t("excel_sample_category") }];
    const result = await exportTemplateXLSX(GUEST_HEADERS, sampleData, t("excel_template_filename"));
    if (!result.success) Alert.alert(t("errors.boundary"), result.message);
  }, [t]);

  const handleImportGuests = useCallback(async () => {
    if (isLimitReached) {
      Alert.alert(t("guest_limit_reached"), t("upgrade_hint"), [{ text: t("close") }]);
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    setShowImportErrors(false);

    try {
      const result = await importFromXLSX(GUEST_HEADERS, validateImportRow);
      if (result.canceled) return;
      if (!result.success) {
        Alert.alert(t("import_errors"), result.message);
        return;
      }

      const existingPhones = (formData.guestList || []).map((g) => g.phone || g.mobile);
      const uniqueGuests = result.data
        .filter((g) => {
          const phone = (g.phone || "").trim();
          if (existingPhones.includes(phone)) return false;
          existingPhones.push(phone);
          return true;
        })
        // Normalize to the form-guest shape (with an id + category) so imported
        // rows are editable/removable and render in the list (keyExtractor
        // needs an id).
        .map((g, i) => ({
          id: Date.now() + i,
          name: (g.name || "").trim(),
          phone: (g.phone || "").trim(),
          category: (g.category || "").trim(),
        }));

      const remaining = !isUnlimited && guestLimit > 0
        ? Math.max(0, guestLimit - (formData.guestList || []).length)
        : uniqueGuests.length;
      const toInsert = uniqueGuests.slice(0, remaining);
      const skipped = uniqueGuests.length - toInsert.length;

      if (toInsert.length > 0) {
        setValue("guestList", [...(formData.guestList || []), ...toInsert], { shouldValidate: true });
      }

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setShowImportErrors(true);
      }

      const message =
        skipped > 0 || toInsert.length === 0
          ? toInsert.length === 0
            ? t("import_limit_full")
            : t("import_limit_partial", { inserted: toInsert.length, skipped })
          : t("success.guest_list_updated");

      Alert.alert(t("bulk_import"), message);
    } catch (error) {
      Alert.alert(t("errors.boundary"), t("errors.create_failed"));
    } finally {
      setIsImporting(false);
    }
  }, [isLimitReached, isUnlimited, guestLimit, formData.guestList, setValue, validateImportRow, t]);

  return (
    <View>
      <View style={styles.importExportRow}>
        <TouchableOpacity
          style={[styles.importExportBtn, isLimitReached && styles.importExportBtnDisabled]}
          onPress={handleImportGuests}
          disabled={isLimitReached || isImporting}
          activeOpacity={0.7}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color="#C28E5C" />
          ) : (
            <UploadIcon disabled={isLimitReached} />
          )}
          <Text style={[styles.importExportBtnText, isLimitReached && styles.importExportBtnTextDisabled]}>
            {t("bulk_import")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.importExportBtn} onPress={handleExportTemplate} activeOpacity={0.7}>
          <DownloadIcon />
          <Text style={styles.importExportBtnText}>{t("download_template")}</Text>
        </TouchableOpacity>
      </View>

      {showImportErrors && importErrors.length > 0 && (
        <View style={styles.importErrorsBox}>
          <View style={styles.importErrorsHeader}>
            <Text style={styles.importErrorsTitle}>{t("import_errors")}</Text>
            <TouchableOpacity onPress={() => setShowImportErrors(false)}>
              <Text style={styles.importErrorsClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {importErrors.map((err, idx) => (
            <Text key={idx} style={styles.importErrorItem}>
              {/* Row number + joined reasons interpolate inside one authored
                  string so the colon/punctuation order follows the locale. */}
              {t("import_error_row", {
                row: err.row,
                message: err.errors.join("، "),
              })}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  importExportRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  importExportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    backgroundColor: "#FFF",
  },
  importExportBtnDisabled: { borderColor: "#E0E0E0", backgroundColor: "#F9F9F9" },
  importExportBtnText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
  importExportBtnTextDisabled: { color: "#AAAAAA" },
  importErrorsBox: {
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
  },
  importErrorsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  importErrorsTitle: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#DC2626" },
  importErrorsClose: { fontSize: 14, color: "#DC2626", fontFamily: "Cairo_600SemiBold" },
  importErrorItem: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#991B1B", marginBottom: 4, lineHeight: 18 },
});
