import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "../../localization";
import marketplaceService from "../../services/marketplaceService";

const Sections = ({ selectedSection, onSectionChange }) => {
  const { t, i18n } = useTranslation("marketplace");
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceTypes();
  }, [i18n.language]);

  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getServiceTypes(i18n.language);
      if (response.status === "success") {
        const isAr = i18n.language === "ar";
        const categories = response.data?.categories || response.data || [];
        const mapped = (Array.isArray(categories) ? categories : []).map((c) => ({
          id: c.key,
          key: c.key,
          name: isAr ? c.nameAr : c.nameEn,
        }));
        const allOption = {
          id: "all",
          key: "all",
          name: t("sections.all"),
        };
        setServiceTypes([allOption, ...mapped]);
      }
    } catch (error) {
      console.error("Error fetching service types:", error);
      // Fallback to default sections
      setServiceTypes([
        { id: "all", key: "all", name: t("sections.all") },
        {
          id: "eventPlanning",
          key: "eventPlanning",
          name: t("sections.eventPlanning"),
        },
        {
          id: "mediaProduction",
          key: "mediaProduction",
          name: t("sections.mediaProduction"),
        },
        {
          id: "giftsAndGiveaways",
          key: "giftsAndGiveaways",
          name: t("sections.giftsAndGiveaways"),
        },
        {
          id: "foodAndBeverages",
          key: "foodAndBeverages",
          name: t("sections.foodAndBeverages"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("sections.title")}</Text>
        <ActivityIndicator size="small" color="#C28E5C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("sections.title")}</Text>
      <View style={styles.sectionsContainer}>
        {serviceTypes.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionItem,
              selectedSection === section.key && styles.sectionItemActive,
            ]}
            onPress={() => onSectionChange && onSectionChange(section.key)}
          >
            <Text
              style={[
                styles.sectionLabel,
                selectedSection === section.key && styles.sectionLabelActive,
              ]}
            >
              {section.name}
            </Text>
            <View
              style={[
                styles.radio,
                selectedSection === section.key && styles.radioActive,
              ]}
            >
              {selectedSection === section.key && (
                <View style={styles.radioInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C2C2C",
    marginBottom: 16,
  },
  sectionsContainer: {
    gap: 12,
  },
  sectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  sectionItemActive: {
    backgroundColor: "#FFF5EB",
    borderColor: "#C28E5C",
  },
  sectionLabel: {
    fontSize: 15,
    color: "#2C2C2C",
    flex: 1,
  },
  sectionLabelActive: {
    color: "#C28E5C",
    fontWeight: "600",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: "#C28E5C",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C28E5C",
  },
});

export default Sections;
