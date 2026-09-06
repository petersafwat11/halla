import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { DropdownInput } from './index';
import CheckboxGroup from './CheckboxGroup';
import { useRegions, useCitiesByRegion, useDistrictsByCity } from '../../hooks/locations';
import { useTranslation } from '../../localization';

const LocationSelector = ({ basePath = 'serviceData.serviceLocation' } = {}) => {
  const { t, i18n } = useTranslation('auth');
  const { watch, setValue } = useFormContext();
  const pickLabel = (ar, en) => (i18n.language === 'ar' ? ar || en : en || ar);

  const regionId = watch(`${basePath}.regionId`);
  const cityId = watch(`${basePath}.cityId`);

  const { data: regionsData, isLoading: regionsLoading, isError: regionsError, refetch: refetchRegions } = useRegions();
  const { data: citiesData, isLoading: citiesLoading, isError: citiesError, refetch: refetchCities } = useCitiesByRegion(regionId);
  const { data: districtsData, isLoading: districtsLoading, isError: districtsError, refetch: refetchDistricts } = useDistrictsByCity(cityId);

  const regions = (regionsData?.data?.regions || []).map((r) => ({
    value: r.region_id,
    label: pickLabel(r.name_ar, r.name_en),
    nameAr: r.name_ar,
    nameEn: r.name_en,
  }));

  const cities = (citiesData?.data?.cities || []).map((c) => ({
    value: c.city_id,
    label: pickLabel(c.name_ar, c.name_en),
    nameAr: c.name_ar,
    nameEn: c.name_en,
  }));

  const districts = (districtsData?.data?.districts || []).map((d) => ({
    value: d.district_id,
    label: pickLabel(d.name_ar, d.name_en),
    nameAr: d.name_ar,
    nameEn: d.name_en,
  }));

  // Drafts may reference location IDs removed from the server catalog.
  // Clear only after each catalog has loaded successfully so transient
  // network/loading states never erase a valid selection.
  useEffect(() => {
    if (!regionsLoading && !regionsError && regionId && !regions.some((r) => String(r.value) === String(regionId))) {
      setValue(`${basePath}.regionId`, 0, { shouldValidate: true });
      setValue(`${basePath}.cityId`, null);
      setValue(`${basePath}.districtIds`, []);
      setValue(`${basePath}.coverageType`, 'city');
    }
  }, [basePath, regionId, regions, regionsError, regionsLoading, setValue]);

  useEffect(() => {
    if (!citiesLoading && !citiesError && cityId && !cities.some((c) => String(c.value) === String(cityId))) {
      setValue(`${basePath}.cityId`, null, { shouldValidate: true });
      setValue(`${basePath}.districtIds`, []);
      setValue(`${basePath}.coverageType`, 'region');
    }
  }, [basePath, cities, citiesError, citiesLoading, cityId, setValue]);

  useEffect(() => {
    if (districtsLoading || districtsError || !cityId) return;
    const currentIds = watch(`${basePath}.districtIds`) || [];
    const validIds = currentIds.filter((id) => districts.some((d) => String(d.value) === String(id)));
    if (validIds.length !== currentIds.length) {
      setValue(`${basePath}.districtIds`, validIds, { shouldValidate: true });
      setValue(`${basePath}.coverageType`, validIds.length > 0 ? 'districts' : 'city');
    }
  }, [basePath, cityId, districts, districtsError, districtsLoading, setValue, watch]);

  const handleRegionChange = (regionValue) => {
    const region = regions.find((r) => r.value === regionValue);
    setValue(`${basePath}.regionId`, regionValue);
    setValue(`${basePath}.regionNameAr`, region?.nameAr || '');
    setValue(`${basePath}.regionNameEn`, region?.nameEn || '');
    // Reset downstream
    setValue(`${basePath}.cityId`, undefined);
    setValue(`${basePath}.cityNameAr`, '');
    setValue(`${basePath}.cityNameEn`, '');
    setValue(`${basePath}.districtIds`, []);
    setValue(`${basePath}.districtNames`, []);
    setValue(`${basePath}.coverageType`, 'region');
  };

  const handleCityChange = (cityValue) => {
    const city = cities.find((c) => c.value === cityValue);
    setValue(`${basePath}.cityId`, cityValue);
    setValue(`${basePath}.cityNameAr`, city?.nameAr || '');
    setValue(`${basePath}.cityNameEn`, city?.nameEn || '');
    setValue(`${basePath}.districtIds`, []);
    setValue(`${basePath}.districtNames`, []);
    setValue(`${basePath}.coverageType`, 'city');
  };

  // Watch district changes to update coverageType
  const handleDistrictsChange = (newIds) => {
    setValue(`${basePath}.districtIds`, newIds);
    if (newIds.length > 0) {
      setValue(`${basePath}.coverageType`, 'districts');
      const names = newIds
        .map((id) => {
          const d = districts.find((d) => d.value === id);
          return d ? { nameAr: d.nameAr, nameEn: d.nameEn } : null;
        })
        .filter(Boolean);
      setValue(`${basePath}.districtNames`, names);
    } else if (cityId) {
      setValue(`${basePath}.coverageType`, 'city');
      setValue(`${basePath}.districtNames`, []);
    }
  };

  return (
    <View style={styles.container}>
      {regionsError && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>
            {t('signupForm.vendor.serviceData.location.regionsLoadError', {
              defaultValue: 'تعذر تحميل المناطق',
            })}
          </Text>
          <TouchableOpacity onPress={() => refetchRegions()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t('signupForm.vendor.serviceData.location.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.pickerWrap}>
        <DropdownInput
          name={`${basePath}.regionId`}
          label={t('signupForm.vendor.serviceData.locationRegion')}
          placeholder={
            regionsLoading
              ? t('signupForm.vendor.serviceData.location.loading', { defaultValue: 'جاري التحميل...' })
              : t('signupForm.vendor.serviceData.locationRegionPlaceholder')
          }
          options={regionsLoading ? [] : regions}
          modalTitle={t('signupForm.vendor.serviceData.locationRegion')}
          rules={{ onChange: (e) => handleRegionChange(e.target?.value ?? e) }}
        />
      </View>

      {regionId ? (
        <>
          {citiesError && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>
                {t('signupForm.vendor.serviceData.location.citiesLoadError', {
                  defaultValue: 'تعذر تحميل المدن',
                })}
              </Text>
              <TouchableOpacity onPress={() => refetchCities()} style={styles.retryBtn}>
                <Text style={styles.retryText}>{t('signupForm.vendor.serviceData.location.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.pickerWrap}>
            <DropdownInput
              name={`${basePath}.cityId`}
              label={t('signupForm.vendor.serviceData.locationCity')}
              placeholder={
                citiesLoading
                  ? t('signupForm.vendor.serviceData.location.loading', { defaultValue: 'جاري التحميل...' })
                  : t('signupForm.vendor.serviceData.locationCityPlaceholder')
              }
              options={citiesLoading ? [] : cities}
              modalTitle={t('signupForm.vendor.serviceData.locationCity')}
              rules={{ onChange: (e) => handleCityChange(e.target?.value ?? e) }}
            />
          </View>
        </>
      ) : null}

      {cityId && (
        <>
          {districtsError && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>
                {t('signupForm.vendor.serviceData.location.districtsLoadError', {
                  defaultValue: 'تعذر تحميل الأحياء',
                })}
              </Text>
              <TouchableOpacity onPress={() => refetchDistricts()} style={styles.retryBtn}>
                <Text style={styles.retryText}>{t('signupForm.vendor.serviceData.location.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {districts.length > 0 ? (
            <View>
              <Text style={styles.districtLabel}>{t('signupForm.vendor.serviceData.locationDistricts')}</Text>
              <Text style={styles.districtHint}>{t('signupForm.vendor.serviceData.locationDistrictsHint')}</Text>
              <CheckboxGroup
                name={`${basePath}.districtIds`}
                items={districts}
                columns={2}
                rules={{
                  onChange: (e) => {
                    const newIds = e.target?.value ?? e;
                    handleDistrictsChange(Array.isArray(newIds) ? newIds : []);
                  },
                }}
              />
            </View>
          ) : !districtsLoading && !districtsError ? (
            <Text style={styles.emptyDistrictsText}>
              {t('signupForm.vendor.serviceData.location.allCitiesCovered', {
                defaultValue: 'تغطية المدينة بالكامل',
              })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  pickerWrap: { marginBottom: 4 },
  districtLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#2c2c2c', marginBottom: 4 },
  districtHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#888', marginBottom: 10 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFD4D4',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#D32F2F',
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#D32F2F',
    borderRadius: 6,
    marginStart: 8,
  },
  retryText: {
    fontSize: 11,
    fontFamily: 'Cairo_600SemiBold',
    color: '#fff',
  },
  emptyDistrictsText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#888',
    paddingVertical: 6,
  },
});

export default LocationSelector;
