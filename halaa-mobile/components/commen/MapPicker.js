import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Keyboard, Modal, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Controller, useFormContext } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";
import mapsApi from "../../services/mapsApi";
import DirectionalTextInput from "./DirectionalTextInput";

const DEFAULT_COORDINATE = { latitude: 24.7136, longitude: 46.6753 };
const DEFAULT_REGION = { ...DEFAULT_COORDINATE, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const newSessionToken = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const isFiniteCoordinate = (value) => Number.isFinite(Number(value?.latitude)) && Number.isFinite(Number(value?.longitude));
const normalizeLocation = (value, coordinate = DEFAULT_COORDINATE) => ({
  address: value?.address || "",
  latitude: Number(value?.latitude ?? coordinate.latitude),
  longitude: Number(value?.longitude ?? coordinate.longitude),
  city: value?.city || "",
  country: value?.country || "",
  placeId: value?.placeId || "",
  provider: value?.provider || "google",
});

function MapPickerInner({
  onChange,
  value,
  error,
  label,
  placeholder,
  disabled,
  contentDirection = "localized",
}) {
  const { t, currentLanguage } = useTranslation("createEvent");
  // Addresses are arbitrary user/backend text (blueprint §5.3): callers pass
  // "adaptive" so a filled value follows its first strong Arabic or Latin
  // character while the empty placeholder follows the UI locale.
  const direction = useFieldDirection(contentDirection, {
    hasValue: !!value?.address,
    value: value?.address,
  });
  const mapRef = useRef(null);
  const searchTimer = useRef(null);
  const sessionToken = useRef(newSessionToken());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [providerFailed, setProviderFailed] = useState(false);
  const [draft, setDraft] = useState(() => normalizeLocation(value));

  const nativeConfigured = useMemo(() => {
    const maps = Constants.expoConfig?.extra?.maps || {};
    return Platform.OS === "ios" ? maps.iosConfigured : maps.androidConfigured;
  }, []);
  const region = useMemo(() => ({
    latitude: Number(draft.latitude) || DEFAULT_REGION.latitude,
    longitude: Number(draft.longitude) || DEFAULT_REGION.longitude,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  }), [draft.latitude, draft.longitude]);

  useEffect(() => { if (value) setDraft(normalizeLocation(value)); }, [value]);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const reverseCoordinate = useCallback(async (coordinate) => {
    setResolving(true);
    try {
      const resolved = await mapsApi.reverseGeocode({ ...coordinate, language: currentLanguage });
      setDraft(normalizeLocation(resolved, coordinate));
      setProviderFailed(false);
    } catch {
      try {
        const [fallback] = await Location.reverseGeocodeAsync(coordinate);
        const fallbackAddress = fallback
          ? [fallback.name, fallback.street, fallback.city, fallback.region, fallback.country].filter(Boolean).join(", ")
          : "";
        setDraft((previous) => ({
          ...previous, ...coordinate,
          address: fallbackAddress || previous.address,
          city: fallback?.city || previous.city || "",
          country: fallback?.country || previous.country || "",
          placeId: "", provider: fallbackAddress ? "device" : "manual",
        }));
      } catch {
        setDraft((previous) => ({ ...previous, ...coordinate, placeId: "", provider: "manual" }));
      }
      setProviderFailed(true);
    } finally { setResolving(false); }
  }, [currentLanguage]);

  const moveTo = useCallback((coordinate) => {
    setDraft((previous) => ({ ...previous, ...coordinate }));
    mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 300);
  }, []);

  const search = useCallback(async (text) => {
    const normalized = text.trim();
    if (normalized.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await mapsApi.autocompletePlaces({
        query: normalized, language: currentLanguage, sessionToken: sessionToken.current,
        latitude: draft.latitude, longitude: draft.longitude,
      });
      setResults(Array.isArray(data) ? data : data?.suggestions || []);
      setProviderFailed(false);
    } catch { setResults([]); setProviderFailed(true); }
    finally { setSearching(false); }
  }, [currentLanguage, draft.latitude, draft.longitude]);

  const onSearchChange = (text) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(text), 350);
  };

  const selectPrediction = async (item) => {
    const placeId = item.placeId || item.place_id;
    if (!placeId) return;
    setSearching(true);
    try {
      const location = await mapsApi.getPlaceDetails({ placeId, language: currentLanguage, sessionToken: sessionToken.current });
      const normalized = normalizeLocation(location);
      setDraft(normalized); moveTo(normalized); setQuery(""); setResults([]);
      sessionToken.current = newSessionToken(); Keyboard.dismiss();
    } catch { setProviderFailed(true); }
    finally { setSearching(false); }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(t("map_picker_permission_title"), t("map_picker_permission_message"));
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      moveTo(coordinate); await reverseCoordinate(coordinate);
    } catch { setProviderFailed(true); }
    finally { setLocating(false); }
  };

  const useTypedAddress = () => {
    const address = query.trim();
    if (address.length < 3) return;
    setDraft((previous) => ({ ...previous, address, city: "", country: "", placeId: "", provider: "manual" }));
    setResults([]); Keyboard.dismiss();
  };
  const openPicker = () => {
    setDraft(normalizeLocation(value)); setQuery(""); setResults([]); setProviderFailed(false);
    sessionToken.current = newSessionToken(); setOpen(true);
  };
  const closePicker = () => { setDraft(normalizeLocation(value)); setOpen(false); };
  const confirm = () => {
    if (!draft.address.trim() || !isFiniteCoordinate(draft)) return;
    onChange(normalizeLocation(draft)); setOpen(false);
  };
  const displayValue = value?.address || "";
  const predictionText = (item) => item.text || item.description || item.formattedAddress || "";

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, direction.text]}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.inputContainer, error && styles.inputContainerError, disabled && styles.inputContainerDisabled]}
        onPress={openPicker} disabled={disabled} activeOpacity={0.75}
      >
        <View style={styles.inputContent}>
          <Ionicons name="location-outline" size={23} color="#C28E5C" />
          <Text numberOfLines={2} style={[styles.inputText, !displayValue && styles.placeholderText, direction.input]}>
            {isolateAuto(displayValue || placeholder)}
          </Text>
          <Ionicons name="map-outline" size={20} color="#8B8B8B" />
        </View>
      </TouchableOpacity>
      {error ? <Text style={[styles.errorText, direction.text]}>{error.message}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={closePicker} statusBarTranslucent>
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={closePicker} style={styles.iconButton}><Ionicons name="close" size={28} color="#292929" /></TouchableOpacity>
            <Text style={[styles.title, direction.text]}>{t("map_picker_title")}</Text>
            <View style={styles.iconButton} />
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              {searching ? <ActivityIndicator size="small" color="#C28E5C" /> : <Ionicons name="search" size={20} color="#777" />}
              <DirectionalTextInput value={query} onChangeText={onSearchChange} placeholder={t("map_picker_search_placeholder")}
                placeholderTextColor="#999" style={[styles.searchInput, direction.input]} />
              {query ? <TouchableOpacity onPress={() => onSearchChange("")}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity> : null}
            </View>
            {results.length ? (
              <FlatList keyboardShouldPersistTaps="handled" data={results}
                keyExtractor={(item, index) => String(item.placeId || item.place_id || index)} style={styles.results}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => selectPrediction(item)} style={styles.result}>
                    <Ionicons name="location" size={18} color="#C28E5C" />
                    <Text style={[styles.resultText, direction.input]} numberOfLines={2}>{isolateAuto(predictionText(item))}</Text>
                  </TouchableOpacity>
                )} />
            ) : null}
          </View>

          <View style={styles.mapWrap}>
            {nativeConfigured ? (
              <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill}
                initialRegion={region} onPress={(event) => reverseCoordinate(event.nativeEvent.coordinate)}
                showsCompass showsMyLocationButton={false}>
                <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} draggable
                  onDragEnd={(event) => reverseCoordinate(event.nativeEvent.coordinate)} />
              </MapView>
            ) : (
              <View style={styles.mapUnavailable}>
                <Ionicons name="map-outline" size={44} color="#C28E5C" />
                <Text style={[styles.mapUnavailableText, direction.text]}>{t("map_picker_not_configured")}</Text>
              </View>
            )}
            {resolving ? <View style={styles.resolvingBadge}><ActivityIndicator size="small" color="#6B4E33" /></View> : null}
          </View>
          <Text style={[styles.dragHint, direction.text]}>{t("map_picker_drag_hint")}</Text>
          {providerFailed ? <Text style={[styles.providerError, direction.text]}>{t("map_picker_provider_error")}</Text> : null}

          <View style={styles.actionsArea}>
            <TouchableOpacity onPress={useCurrentLocation} disabled={locating} style={styles.locationButton}>
              {locating ? <ActivityIndicator size="small" color="#6B4E33" /> : <Ionicons name="locate" size={20} color="#6B4E33" />}
              <Text style={styles.locationButtonText}>{t("map_picker_use_current")}</Text>
            </TouchableOpacity>
            {query.trim().length >= 3 ? (
              <TouchableOpacity onPress={useTypedAddress} style={styles.manualButton}>
                <Text style={[styles.manualButtonText, direction.text]}>{t("map_picker_use_typed", { address: query.trim() })}</Text>
              </TouchableOpacity>
            ) : null}
            {draft.address ? (
              <View style={styles.selectedCard}>
                <Ionicons name="checkmark-circle" size={22} color="#2A8C5B" />
                <View style={styles.selectedTextWrap}>
                  <Text style={[styles.selectedLabel, direction.text]}>{t("map_picker_selected")}</Text>
                  <Text style={[styles.selectedAddress, direction.input]} numberOfLines={3}>{isolateAuto(draft.address)}</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={closePicker} style={styles.cancelButton}><Text style={styles.cancelText}>{t("cancel", { ns: "common" })}</Text></TouchableOpacity>
            <TouchableOpacity onPress={confirm} disabled={!draft.address.trim() || !isFiniteCoordinate(draft)}
              style={[styles.confirmButton, (!draft.address.trim() || !isFiniteCoordinate(draft)) && styles.confirmDisabled]}>
              <Text style={styles.confirmText}>{t("map_picker_confirm")}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function FormMapPicker(props) {
  const { control } = useFormContext();
  return <Controller control={control} name={props.name} rules={props.rules}
    render={({ field: { onChange, value }, fieldState: { error } }) =>
      <MapPickerInner {...props} onChange={onChange} value={value} error={error} />} />;
}

export default function MapPicker({ name, value, onChange, ...props }) {
  if (name) return <FormMapPicker name={name} {...props} />;
  return <MapPickerInner {...props} value={value} onChange={onChange || (() => {})} />;
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { width: "100%", fontFamily: "Cairo_600SemiBold", fontSize: 14, color: "#2C2C2C", marginBottom: 8 },
  inputContainer: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 12, minHeight: 58, paddingHorizontal: 15, justifyContent: "center", backgroundColor: "#FFF" },
  inputContainerError: { borderColor: "#D84A3F", borderWidth: 1.5 },
  inputContainerDisabled: { opacity: 0.55, backgroundColor: "#F5F5F5" },
  inputContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputText: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 14, color: "#2C2C2C" },
  placeholderText: { color: "#999" },
  errorText: { marginTop: 6, fontFamily: "Cairo_400Regular", fontSize: 12, color: "#D84A3F" },
  modal: { flex: 1, backgroundColor: "#FCF9F5" },
  header: { minHeight: 70, paddingTop: Platform.OS === "ios" ? 18 : 16, paddingBottom: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E6E0DA" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: "Cairo_700Bold", fontSize: 18, color: "#242424", textAlign: "center" },
  searchWrap: { padding: 14, zIndex: 4, backgroundColor: "#FFF" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#DDD6CF", borderRadius: 13, paddingHorizontal: 13, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 14, color: "#242424" },
  results: { position: "absolute", top: 68, left: 14, right: 14, maxHeight: 230, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E3DDD7", elevation: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10 },
  result: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEE9E4" },
  resultText: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 13, color: "#333" },
  mapWrap: { height: 300, marginHorizontal: 14, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E1D7CE", backgroundColor: "#EFEAE4" },
  mapUnavailable: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapUnavailableText: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#6B625B" },
  resolvingBadge: { position: "absolute", top: 12, end: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", elevation: 3 },
  dragHint: { marginHorizontal: 18, marginTop: 8, fontFamily: "Cairo_400Regular", fontSize: 11, color: "#777" },
  providerError: { marginHorizontal: 18, marginTop: 4, fontFamily: "Cairo_400Regular", fontSize: 11, color: "#A0563C" },
  actionsArea: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  locationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: "#C28E5C", backgroundColor: "#FFF" },
  locationButtonText: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#6B4E33" },
  manualButton: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 },
  manualButtonText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: "#8A603C" },
  selectedCard: { marginTop: 8, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "#EDF7F1", borderWidth: 1, borderColor: "#C9E3D3" },
  selectedTextWrap: { flex: 1 },
  selectedLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 11, color: "#397354" },
  selectedAddress: { fontFamily: "Cairo_400Regular", fontSize: 12, lineHeight: 19, color: "#263D30" },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 11, paddingBottom: Platform.OS === "ios" ? 28 : 14, backgroundColor: "#FFF", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E2DCD5" },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#C28E5C" },
  cancelText: { fontFamily: "Cairo_600SemiBold", color: "#7B5636", fontSize: 14 },
  confirmButton: { flex: 2, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#C28E5C" },
  confirmDisabled: { backgroundColor: "#CFCBC6" },
  confirmText: { fontFamily: "Cairo_600SemiBold", color: "#FFF", fontSize: 14 },
});

