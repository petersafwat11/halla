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
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { useLanguage } from "../../localization";
import { fetchWithTimeout } from "../../services/http";

const DEFAULT_LOCATION = {
  address: "",
  latitude: 24.7136,
  longitude: 46.6753,
  city: "",
  country: "",
};

const MapPickerInner = ({ onChange, value, error, label, placeholder, disabled }) => {
  const { isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value || DEFAULT_LOCATION);
  const [region, setRegion] = useState({
    latitude: value?.latitude || 24.7136,
    longitude: value?.longitude || 46.6753,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Update forms hydrate after mount. Keep the modal marker/region aligned
  // with the database value instead of retaining the create-flow default.
  useEffect(() => {
    if (!value) return;
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    setSelectedLocation(value);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const nextRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(nextRegion);
      if (isOpen) mapRef.current?.animateToRegion(nextRegion);
    }
  }, [isOpen, value]);

  const searchLocation = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { "User-Agent": "HallaMobileApp/1.0", Accept: "application/json" } }
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

  const animateTo = (latitude, longitude) => {
    const r = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setRegion(r);
    mapRef.current?.animateToRegion(r);
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الأذونات", "يرجى السماح بالوصول إلى الموقع لاستخدام هذه الميزة");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses?.length > 0) {
        const addr = addresses[0];
        setSelectedLocation({
          address: `${addr.street || ""} ${addr.city || ""} ${addr.country || ""}`.trim(),
          latitude, longitude,
          city: addr.city || "", country: addr.country || "",
        });
        animateTo(latitude, longitude);
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
    animateTo(lat, lon);
    setSearchQuery("");
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses?.length > 0) {
        const addr = addresses[0];
        setSelectedLocation({
          address: `${addr.street || ""} ${addr.city || ""} ${addr.country || ""}`.trim(),
          latitude, longitude,
          city: addr.city || "", country: addr.country || "",
        });
      } else {
        setSelectedLocation({
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude, longitude, city: "", country: "",
        });
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
      setSelectedLocation({
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude, longitude, city: "", country: "",
      });
    }
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
                      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}

            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
              >
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title="الموقع المختار"
                  description={selectedLocation.address}
                  pinColor="#C28E5C"
                />
              </MapView>

              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
                activeOpacity={0.8}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="locate" size={24} color="#FFF" />
                )}
              </TouchableOpacity>

              {selectedLocation.address ? (
                <View style={styles.selectedAddressCard}>
                  <View style={styles.addressIconContainer}>
                    <Ionicons name="location" size={20} color="#C28E5C" />
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>الموقع المختار</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
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
    flex: 1, textAlign: "center", marginRight: 36,
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
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },
  currentLocationButton: {
    position: "absolute", bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#C28E5C", justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  selectedAddressCard: {
    position: "absolute", top: 16, left: 16, right: 16, backgroundColor: "#FFF",
    borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  addressIconContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#F9F4EF",
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
