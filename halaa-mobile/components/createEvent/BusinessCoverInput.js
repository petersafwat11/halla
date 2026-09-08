import { WEB_BASE_URL } from '../../config/api';
import { API_PATHS } from '@halaa/shared/api/paths';
import { apiFetch } from '../../services/http';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import coverUtils from '@halaa/shared/constants/businessCover.cjs';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFormContext } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from '../../localization';

const { BUSINESS_COVER, validCoverDimensions, coverCrop } = coverUtils;

export default function BusinessCoverInput({ owner }) {
  const user = useAuthStore((s) => s.user);
  const account = owner || user;
  const accountId = account?._id || account?.id;
  const otherOwner = Boolean(owner && accountId !== (user?._id || user?.id));
  const { t, currentLanguage } = useTranslation('createEvent');
  const ar = currentLanguage === 'ar';
  const { setValue, watch } = useFormContext();
  const [asset, setAsset] = useState(null);
  const [crop, setCrop] = useState({ x: 0.5, y: 0.5 });
  const [width, setWidth] = useState(300);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo =
    refreshedLogo?.id === (account?._id || account?.id)
      ? refreshedLogo.avatar
      : account?.avatar;
  const cover = watch('coverImage');
  const business = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', business);
    setValue('businessLogoMissing', business && !logo);
  }, [business, logo, setValue]);
  async function refreshLogo() {
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch(
        otherOwner
          ? API_PATHS.admin.businesses.getById(accountId)
          : API_PATHS.users.getMyProfile,
      );
      if (!result.ok) throw new Error();
      const payload = await result.json();
      const fresh = payload.data?.business || payload.data?.user;
      if (fresh)
        setRefreshedLogo({
          id: account._id || account.id,
          avatar: fresh.avatar || fresh.avatarUrl,
        });
    } catch (_) {
      setError(t('businessCover.refreshError'));
    } finally {
      setBusy(false);
    }
  }
  async function choose() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('businessCover.permissionError'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (
        !BUSINESS_COVER.mimeTypes.includes(file.mimeType) ||
        file.fileSize > BUSINESS_COVER.bytes ||
        !validCoverDimensions(file.width, file.height)
      ) {
        setError(t('businessCover.invalidImage'));
        return;
      }
      setAsset(file);
      setCrop({ x: 0.5, y: 0.5 });
    } catch {
      setError(t('businessCover.chooseError'));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    try {
      const { outputWidth, outputHeight, ...rectangle } = coverCrop(
        asset.width,
        asset.height,
        crop.x,
        crop.y,
      );
      const result = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          { crop: rectangle },
          { resize: { width: outputWidth, height: outputHeight } },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      setValue(
        'coverImage',
        { uri: result.uri, name: 'event-cover.jpg', type: 'image/jpeg' },
        { shouldDirty: true, shouldValidate: true },
      );
      setAsset(null);
    } catch (_) {
      setError(t('businessCover.cropError'));
    } finally {
      setBusy(false);
    }
  }
  const button = (label, onPress) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, busy && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
  if (!business) return null;
  const scale = asset
    ? Math.max(width / asset.width, (width * 9) / 16 / asset.height)
    : 1;
  return (
    <View
      style={styles.section}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Text style={[styles.title, ar && styles.rtl]}>
        {t('businessCover.requiredTitle')}
      </Text>
      <Text style={[styles.text, ar && styles.rtl]}>
        {t('businessCover.hint')}
      </Text>
      {!logo && (
        <>
          <Text style={[styles.text, ar && styles.rtl]}>
            {t('businessCover.logoRequired')}
          </Text>
          {button(t('businessCover.settings'), () =>
            Linking.openURL(
              `${WEB_BASE_URL}/${ar ? 'ar' : 'en'}/${otherOwner ? `admin-dash/businesses/${accountId}` : 'host/settings'}`,
            ).catch(() => setError(t('businessCover.refreshError'))),
          )}
          {button(t('businessCover.refreshLogo'), refreshLogo)}
        </>
      )}
      {button(t('businessCover.choose'), choose)}
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={[styles.error, ar && styles.rtl]}
        >
          {error}
        </Text>
      )}
      {asset ? (
        <>
          <View style={styles.preview}>
            <Image
              source={{ uri: asset.uri }}
              accessibilityLabel={t('businessCover.cropPreview')}
              style={{
                width: asset.width * scale,
                height: asset.height * scale,
                position: 'absolute',
                left: -(asset.width * scale - width) * crop.x,
                top: -(asset.height * scale - (width * 9) / 16) * crop.y,
              }}
            />
          </View>
          <View style={styles.controls}>
            {button(t('businessCover.left'), () =>
              setCrop((c) => ({ ...c, x: Math.max(0, c.x - 0.1) })),
            )}
            {button(t('businessCover.right'), () =>
              setCrop((c) => ({ ...c, x: Math.min(1, c.x + 0.1) })),
            )}
            {button(t('businessCover.up'), () =>
              setCrop((c) => ({ ...c, y: Math.max(0, c.y - 0.1) })),
            )}
            {button(t('businessCover.down'), () =>
              setCrop((c) => ({ ...c, y: Math.min(1, c.y + 0.1) })),
            )}
          </View>
          {button(t('businessCover.apply'), apply)}
          {button(t('businessCover.cancel'), () => setAsset(null))}
        </>
      ) : (
        cover?.uri && (
          <Image
            source={{ uri: cover.uri }}
            accessibilityLabel={t('businessCover.preview')}
            style={styles.preview}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
    marginVertical: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d3dbe1',
  },
  title: { fontSize: 19, fontWeight: '600', color: '#203345' },
  text: { fontSize: 14, lineHeight: 23, color: '#566575' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  button: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8293a3',
    minHeight: 44,
  },
  buttonText: { color: '#254967', textAlign: 'center', fontSize: 14 },
  disabled: { opacity: 0.6 },
  error: { color: '#a32222' },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: 12,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
