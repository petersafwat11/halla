import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  const { data: regionsData, isLoading: regionsLoading } = useRegions();
  const { data: citiesData, isLoading: citiesLoading } = useCitiesByRegion(regionId);
  const { data: districtsData } = useDistrictsByCity(cityId);

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
      <View style={styles.pickerWrap}>
        <DropdownInput
          name={`${basePath}.regionId`}
          label={t('signupForm.vendor.serviceData.locationRegion')}
          placeholder={t('signupForm.vendor.serviceData.locationRegionPlaceholder')}
          options={regionsLoading ? [] : regions}
          modalTitle={t('signupForm.vendor.serviceData.locationRegion')}
          rules={{ onChange: (e) => handleRegionChange(e.target?.value ?? e) }}
        />
      </View>

      {regionId ? (
        <View style={styles.pickerWrap}>
          <DropdownInput
            name={`${basePath}.cityId`}
            label={t('signupForm.vendor.serviceData.locationCity')}
            placeholder={t('signupForm.vendor.serviceData.locationCityPlaceholder')}
            options={citiesLoading ? [] : cities}
            modalTitle={t('signupForm.vendor.serviceData.locationCity')}
            rules={{ onChange: (e) => handleCityChange(e.target?.value ?? e) }}
          />
        </View>
      ) : null}

      {cityId && districts.length > 0 ? (
        <View>
          <Text style={styles.districtLabel}>{t('signupForm.vendor.serviceData.locationDistricts')}</Text>
          <Text style={styles.districtHint}>{t('signupForm.vendor.serviceData.locationDistrictsHint')}</Text>
          <CheckboxGroup
            name={`${basePath}.districtIds`}
            items={districts}
            columns={2}
            rules={{ onChange: (e) => {
              const newIds = e.target?.value ?? e;
              handleDistrictsChange(Array.isArray(newIds) ? newIds : []);
            }}}
          />
        </View>
      ) : null}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { width: '100%' },
  pickerWrap: { marginBottom: 4 },
  districtLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#2c2c2c', marginBottom: 4 },
  districtHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#888', marginBottom: 10 },
});

export default LocationSelector;
