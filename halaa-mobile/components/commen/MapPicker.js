import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput as RNTextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Keyboard,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import DirectionalIonicon from "../common/DirectionalIonicon";
import { fetchWithTimeout } from "../../services/http";

const DEFAULT_LOCATION = {
  address: "",
  latitude: 24.7136,
  longitude: 46.6753,
  city: "",
  country: "",
};

const MapPickerInner = ({ onChange, value, error, label, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value || DEFAULT_LOCATION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Update forms hydrate after mount. Keep the modal marker/region aligned
  // with the database value instead of retaining the create-flow default.
  useEffect(() => {
    if (!value) return;
    setSelectedLocation(value);
  }, [value]);

  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    },
    []
  );

  const searchLocation = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { "User-Agent": "HalaaMobileApp/1.0", Accept: "application/json" } }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setSearchResults(await response.json());
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchLocation(text), 500);
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الأذونات", "يرجى السماح بالوصول إلى الموقع لاستخدام هذه الميزة");
        return;
      }
      // Coarse accuracy only — the app no longer requests ACCESS_FINE_LOCATION
      // (§7.2). City/area precision is enough to pick an event location, and the
      // user can still choose an exact result or enter the address directly.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const { latitude, longitude } = location.coords;
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses?.length > 0) {
        const addr = addresses[0];
        setSelectedLocation({
          address: `${addr.street || ""} ${addr.city || ""} ${addr.country || ""}`.trim(),
          latitude, longitude,
          city: addr.city || "", country: addr.country || "",
        });
      }
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert("خطأ", "فشل في الحصول على الموقع الحالي");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setSelectedLocation({
      address: result.display_name,
      latitude: lat, longitude: lon,
      city: result.address?.city || result.address?.town || "",
      country: result.address?.country || "",
    });
    setSearchQuery("");
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const useTypedAddress = () => {
    const address = searchQuery.trim();
    if (address.length < 3) return;
    setSelectedLocation({ address, city: "", country: "" });
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleConfirm = () => {
    onChange(selectedLocation);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedLocation(value || DEFAULT_LOCATION);
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  const displayValue = value?.address || "";

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.inputContent}>
          <Ionicons name="location-outline" size={24} color="#C28E5C" />
          <Text
            style={[styles.inputText, !displayValue && styles.placeholderText]}
            numberOfLines={1}
          >
            {displayValue || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error.message}</Text>}

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={handleCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#2C2C2C" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>اختر موقع المناسبة</Text>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#C28E5C" />
                ) : (
                  <Ionicons name="search-outline" size={20} color="#767676" />
                )}
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="ابحث عن موقع (مدينة، شارع، معلم...)"
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.place_id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => handleSelectSearchResult(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location" size={20} color="#C28E5C" />
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                      <DirectionalIonicon name="chevron-forward" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}

            <View style={styles.locationPanel}>
              <View style={styles.locationIntroIcon}>
                <Ionicons name="location-outline" size={34} color="#C28E5C" />
              </View>
              <Text style={styles.locationIntroTitle}>حدّد موقع المناسبة بأمان</Text>
              <Text style={styles.locationIntroText}>
                ابحث عن المدينة أو الشارع أو استخدم موقعك الحالي. يمكنك أيضًا اعتماد العنوان المكتوب مباشرة.
              </Text>

              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
                activeOpacity={0.8}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="locate" size={20} color="#FFF" />
                )}
                <Text style={styles.currentLocationText}>استخدام موقعي الحالي</Text>
              </TouchableOpacity>

              {searchQuery.trim().length >= 3 && !isSearching ? (
                <TouchableOpacity
                  style={styles.typedAddressButton}
                  onPress={useTypedAddress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={18} color="#6B4E33" />
                  <Text style={styles.typedAddressText} numberOfLines={2}>
                    استخدام «{searchQuery.trim()}» كعنوان
                  </Text>
                </TouchableOpacity>
              ) : null}

              {selectedLocation.address ? (
                <View style={styles.selectedAddressCard}>
                  <View style={styles.addressIconContainer}>
                    <Ionicons name="checkmark-circle" size={22} color="#2A8C5B" />
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>الموقع المختار</Text>
                    <Text style={styles.addressText} numberOfLines={3}>
                      {selectedLocation.address}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !selectedLocation.address && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!selectedLocation.address}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const MapPicker = ({
  name,
  label,
  placeholder = "اختر موقع المناسبة",
  disabled = false,
  rules,
  value: controlledValue,
  onChange: controlledOnChange,
}) => {
  // Two usage modes:
  //   - RHF mode: parent provides `name`; we register with the form context.
  //   - Controlled mode: parent passes `value` + `onChange` directly.
  // The vendor settings forms use controlled mode because their schema
  // tracks `serviceLocation` outside react-hook-form (the field is too
  // structured for a flat zod field).
  if (!name) {
    return (
      <MapPickerInner
        onChange={controlledOnChange}
        value={controlledValue}
        label={label}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <MapPickerInner
          onChange={onChange}
          value={value}
          error={error}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#2C2C2C", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 12, backgroundColor: "#FFF",
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 56,
  },
  inputContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  inputContainerError: { borderColor: "#E74C3C", borderWidth: 1.5 },
  inputContainerDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  inputText: { flex: 1, fontSize: 15, fontFamily: "Cairo_400Regular", color: "#2C2C2C" },
  placeholderText: { color: "#999" },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#E74C3C", marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: "85%", overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0", backgroundColor: "#FFF",
  },
  closeButton: { padding: 4 },
  modalTitle: {
    fontSize: 16, fontFamily: "Cairo_700Bold", color: "#2C2C2C",
    flex: 1, textAlign: "center", marginEnd: 36,
  },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: "#FFF" },
  searchInputContainer: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F9F9F9",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", color: "#2C2C2C",
  },
  searchResultsContainer: {
    maxHeight: 250, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  searchResultItem: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14,
  },
  searchResultText: {
    flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", color: "#2C2C2C", textAlign: "right",
  },
  separator: { height: 1, backgroundColor: "#F0F0F0", marginHorizontal: 20 },
  locationPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FCFAF8",
  },
  locationIntroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5ECE4",
    marginBottom: 12,
  },
  locationIntroTitle: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  locationIntroText: {
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 320,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "center",
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    maxWidth: 320,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    paddingHorizontal: 16,
  },
  currentLocationText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  typedAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    maxWidth: 320,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3CBB4",
    backgroundColor: "#FFF",
  },
  typedAddressText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  selectedAddressCard: {
    width: "100%",
    maxWidth: 320,
    marginTop: 14,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BDDCCB",
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  addressIconContainer: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#EAF4EF",
    justifyContent: "center", alignItems: "center",
  },
  addressTextContainer: { flex: 1 },
  addressLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: "#999", marginBottom: 4 },
  addressText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: "#2C2C2C", lineHeight: 20 },
  actionButtons: {
    flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingVertical: 12,
    paddingBottom: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  cancelButton: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: "#E0E0E0", backgroundColor: "#FFF", alignItems: "center", justifyContent: "center",
  },
  cancelButtonText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#666" },
  confirmButton: {
    flex: 2, flexDirection: "row", gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#C28E5C", alignItems: "center", justifyContent: "center",
  },
  confirmButtonDisabled: { backgroundColor: "#CCC" },
  confirmButtonText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});

export default MapPicker;
