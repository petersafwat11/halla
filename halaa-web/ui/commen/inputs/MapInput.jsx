"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useFormContext, useController } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./MapInput.module.css";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Pure utility — defined outside component so it's never a stale closure
const extractComponent = (result, ...types) => {
  for (const type of types) {
    const comp = result.address_components?.find((c) => c.types.includes(type));
    if (comp?.long_name) return comp.long_name;
  }
  return "";
};

/**
 * Renders nothing. Lives inside <Map> so it can use useMap().
 * Watches panTarget and smoothly pans the map when it changes.
 */
const MapController = ({ panTarget }) => {
  const map = useMap();
  const prevRef = useRef(null);

  useEffect(() => {
    if (!map || !panTarget) return;
    if (
      prevRef.current?.lat === panTarget.lat &&
      prevRef.current?.lng === panTarget.lng
    )
      return;
    prevRef.current = panTarget;
    map.panTo(panTarget);
    map.setZoom(15);
  }, [map, panTarget]);

  return null;
};

const MapInputInner = ({
  name,
  value,
  onChange,
  clearErrors,
  error,
  label,
  required,
  hintMessage,
}) => {
  const { t } = useTranslation("createEvent");
  const [markerPos, setMarkerPos] = useState(
    value?.latitude && value?.longitude
      ? { lat: value.latitude, lng: value.longitude }
      : null
  );
  const [panTarget, setPanTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);

  const geocoderRef = useRef(null);
  const autocompleteRef = useRef(null);
  const debounceRef = useRef(null);
  const searchContainerRef = useRef(null);

  // React Hook Form resets update-mode values after the event request
  // resolves. Mirror that late value into this component's local map state;
  // useState's initializer only saw the empty create-event defaults.
  useEffect(() => {
    const lat = Number(value?.latitude);
    const lng = Number(value?.longitude);
    if (value?.latitude != null && value?.longitude != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      const next = { lat, lng };
      setMarkerPos(next);
      setPanTarget(next);
    } else { setMarkerPos(null); }
    setSearchQuery(value?.address || "");
  }, [value?.address, value?.latitude, value?.longitude]);

  const getGeocoder = () => {
    if (!geocoderRef.current && window.google?.maps) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const getAutocomplete = () => {
    if (!autocompleteRef.current && window.google?.maps?.places) {
      autocompleteRef.current =
        new window.google.maps.places.AutocompleteService();
    }
    return autocompleteRef.current;
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyLocation = useCallback(
    (result, lat, lng, explicitPlaceId = null) => {
      const data = {
        address: result.formatted_address,
        latitude: lat,
        longitude: lng,
        city:
          extractComponent(
            result,
            "locality",
            "administrative_area_level_2",
            "administrative_area_level_1"
          ) || "",
        country: extractComponent(result, "country"),
        placeId: explicitPlaceId || result.place_id || null,
        provider: "google",
      };
      setSearchQuery(result.formatted_address);
      setMarkerPos({ lat, lng });
      setPanTarget({ lat, lng });
      setIsGeocoding(false);
      setSuggestions([]);
      setShowSuggestions(false);
      setFocusedSuggestion(-1);
      onChange(data);
      clearErrors(name);
    },
    [onChange, clearErrors, name]
  );

  const geocodeLatLng = useCallback(
    (lat, lng) => {
      const geocoder = getGeocoder();
      if (!geocoder) return;
      setIsGeocoding(true);
      setMarkerPos({ lat, lng });
      setPanTarget({ lat, lng });
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results[0]) {
          applyLocation(results[0], lat, lng);
        } else {
          setIsGeocoding(false);
        }
      });
    },
    [applyLocation]
  );

  const geocodePlaceId = useCallback(
    (placeId, description) => {
      const geocoder = getGeocoder();
      if (!geocoder) return;
      setSearchQuery(description);
      setShowSuggestions(false);
      setIsGeocoding(true);
      geocoder.geocode({ placeId }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          applyLocation(results[0], loc.lat(), loc.lng(), placeId);
        } else {
          setIsGeocoding(false);
        }
      });
    },
    [applyLocation]
  );

  const geocodeAddress = useCallback(
    (address) => {
      const geocoder = getGeocoder();
      if (!geocoder || !address.trim()) return;
      setIsGeocoding(true);
      setShowSuggestions(false);
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          applyLocation(results[0], loc.lat(), loc.lng());
        } else {
          setIsGeocoding(false);
        }
      });
    },
    [applyLocation]
  );

  const fetchSuggestions = useCallback((query) => {
    const svc = getAutocomplete();
    if (!svc || !query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    svc.getPlacePredictions({ input: query }, (predictions, status) => {
      const OK = window.google?.maps.places.PlacesServiceStatus.OK;
      if (status === OK && predictions?.length) {
        setSuggestions(predictions);
        setShowSuggestions(true);
        setFocusedSuggestion(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setFocusedSuggestion(-1);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 280);
  };

  const handleSearchSubmit = useCallback(() => {
    if (!searchQuery.trim()) return;
    if (suggestions.length > 0 && focusedSuggestion >= 0) {
      geocodePlaceId(
        suggestions[focusedSuggestion].place_id,
        suggestions[focusedSuggestion].description
      );
    } else if (suggestions.length > 0) {
      geocodePlaceId(suggestions[0].place_id, suggestions[0].description);
    } else {
      geocodeAddress(searchQuery);
    }
  }, [searchQuery, suggestions, focusedSuggestion, geocodePlaceId, geocodeAddress]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedSuggestion((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedSuggestion >= 0) {
          geocodePlaceId(
            suggestions[focusedSuggestion].place_id,
            suggestions[focusedSuggestion].description
          );
        } else {
          handleSearchSubmit();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setFocusedSuggestion(-1);
        break;
    }
  };

  const handleMapClick = useCallback(
    (event) => {
      if (!event.detail?.latLng) return;
      const { lat, lng } = event.detail.latLng;
      geocodeLatLng(lat, lng);
    },
    [geocodeLatLng]
  );

  const handleMarkerDragEnd = useCallback(
    (event) => {
      if (!event.latLng) return;
      geocodeLatLng(event.latLng.lat(), event.latLng.lng());
    },
    [geocodeLatLng]
  );

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLoadingLocation(false);
        geocodeLatLng(coords.latitude, coords.longitude);
      },
      () => setIsLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setFocusedSuggestion(-1);
  };

  return (
    <div className={styles.input_group}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      {/* ── Search + Locate ── */}
      <div className={styles.controls}>
        <div className={styles.search_wrapper} ref={searchContainerRef}>
          <div
            className={`${styles.search_form} ${
              showSuggestions && suggestions.length > 0
                ? styles.search_form_open
                : ""
            }`}
          >
            <span className={styles.search_icon_wrap}>
              {isGeocoding ? (
                <span className={styles.spin} />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9a9a9a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() =>
                suggestions.length > 0 && setShowSuggestions(true)
              }
              placeholder={t("map_picker_search_placeholder")}
              className={styles.search_input}
              autoComplete="off"
              spellCheck={false}
            />

            {searchQuery && (
              <button
                type="button"
                className={styles.clear_btn}
                onClick={clearSearch}
                tabIndex={-1}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={handleSearchSubmit}
              className={styles.search_btn}
              disabled={!searchQuery.trim() || isGeocoding}
            >
              {t("map_picker_search", "Search")}
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className={styles.suggestions} role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={s.place_id}
                  role="option"
                  aria-selected={i === focusedSuggestion}
                  className={`${styles.suggestion_item} ${
                    i === focusedSuggestion ? styles.suggestion_focused : ""
                  }`}
                  onMouseDown={() =>
                    geocodePlaceId(s.place_id, s.description)
                  }
                  onMouseEnter={() => setFocusedSuggestion(i)}
                >
                  <span className={styles.suggestion_pin}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </span>
                  <div className={styles.suggestion_text}>
                    <span className={styles.suggestion_main}>
                      {s.structured_formatting?.main_text}
                    </span>
                    {s.structured_formatting?.secondary_text && (
                      <span className={styles.suggestion_secondary}>
                        {s.structured_formatting.secondary_text}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Locate me */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLoadingLocation}
          className={styles.locate_btn}
          title={t("map_picker_use_current")}
        >
          {isLoadingLocation ? (
            <span className={styles.spin} />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
              <circle cx="12" cy="12" r="8" opacity="0.3" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Map ── */}
      <div className={styles.map_wrapper}>
        {isGeocoding && (
          <div className={styles.map_overlay}>
            <span className={styles.spin_lg} />
          </div>
        )}
        <div className={styles.map_hint}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          {t("map_picker_drag_hint")}
        </div>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={13}
          onClick={handleMapClick}
          className={styles.map}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
        >
          <MapController panTarget={panTarget} />
          {markerPos && (
            <Marker
              position={markerPos}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </Map>
      </div>

      {/* ── Selected address display ── */}
      {value?.address && (
        <div className={styles.address_display}>
          <span className={styles.address_icon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </span>
          <span className={styles.address_text}>{value.address}</span>
        </div>
      )}

      {error && <p className={styles.error}>{error.message}</p>}
      {hintMessage && <p className={styles.hint}>{hintMessage}</p>}
    </div>
  );
};

const MapInput = ({ name, label, required, hintMessage }) => {
  const { i18n, t } = useTranslation("createEvent");
  const { control, clearErrors } = useFormContext();
  const [manual, setManual] = useState(!API_KEY);
  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
    defaultValue: {
      address: "",
      latitude: null,
      longitude: null,
      city: "",
      country: "",
      placeId: null,
      provider: "google",
    },
  });

  if (manual) {
    return (
      <div className={styles.input_group}>
        {label && <label htmlFor={name + "-manual"} className={styles.label}>{label}</label>}
        <input id={name + "-manual"} value={value?.address || ""} required={required}
          onChange={(e) => { onChange({ address: e.target.value, latitude: null, longitude: null, provider: "manual", placeId: null }); clearErrors(name); }} />
        {API_KEY && <button type="button" onClick={() => setManual(false)}>{t("map_retry")}</button>}
        {error && <p role="alert">{error.message}</p>}
        <p className={styles.hint}>
          {t("map_picker_not_configured", "The map is temporarily unavailable.")}
        </p>
      </div>
    );
  }

  return (
    <>
    <button type="button" onClick={() => setManual(true)}>{t("map_manual")}</button>
    <APIProvider
      apiKey={API_KEY}
      libraries={["places"]}
      language={i18n.language === "en" ? "en" : "ar"}
      region="SA"
    >
      <MapInputInner
        name={name}
        value={value}
        onChange={onChange}
        clearErrors={clearErrors}
        error={error}
        label={label}
        required={required}
        hintMessage={hintMessage}
      />
    </APIProvider>
    </>
  );
};

export default MapInput;
