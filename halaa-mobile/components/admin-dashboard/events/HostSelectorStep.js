import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAdminEventTargets, useVerifyHostPhone } from '../../../hooks/admin';
import { useTranslation } from '../../../localization';
import { useAuthStore } from '../../../stores/authStore';
import ActionButton from '../common/ActionButton';
import SectionCard from '../../commen/SectionCard';

const HostSelectorStep = ({ value = {}, onChange }) => {
  const { t } = useTranslation('admin');
  const user = useAuthStore((state) => state.user);
  const TABS = ['self', 'host'];
  const [activeTab, setActiveTab] = useState('self');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const { data: hostsData, isLoading: hostsLoading } = useAdminEventTargets(
    activeTab === 'host' ? 'host' : undefined,
  );

  const verifyHostPhone = useVerifyHostPhone();

  const handleVerifyPhone = useCallback(async () => {
    if (!phoneSearch.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError(null);
    try {
      const data = await verifyHostPhone.mutateAsync(phoneSearch.trim());
      if (data) {
        setSearchResult(data);
      } else {
        setSearchError(t('events.hostSelector.noResults'));
      }
    } catch {
      setSearchError(t('events.hostSelector.noResults'));
    } finally {
      setSearching(false);
    }
  }, [phoneSearch, verifyHostPhone, t]);

  const handleSelectSelf = () => {
    onChange({ createForSelf: true, targetUserId: null, targetType: 'self' });
  };

  const handleSelectHost = (host) => {
    onChange({ createForSelf: false, targetUserId: host._id || host.id, targetType: 'host', subscription: host.subscription || null });
  };

  const isSelected = (id, type) => {
    if (type === 'self') return value.createForSelf === true;
    return !value.createForSelf && value.targetUserId === id;
  };

  const renderHostCard = (item, onSelect, type) => {
    const id = item._id || item.id;
    const selected = isSelected(id, type);
    const subscription = item.subscription;
    const eventsRemaining = subscription?.eventsRemaining;
    const isUnlimited = subscription?.isUnlimited || subscription?.eventsRemaining === -1;
    const isEventsExhausted = !isUnlimited && eventsRemaining !== undefined && eventsRemaining <= 0;
    return (
      <SectionCard key={id} style={[styles.hostCard, isEventsExhausted && styles.hostCardExhausted]}>
        <View style={styles.hostCardRow}>
          <View style={styles.hostInfo}>
            <Text style={styles.hostName}>{item.name || item.fullName || '—'}</Text>
            <Text style={styles.hostPhone}>{item.phone || item.phoneNumber || '—'}</Text>
            {subscription?.planName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{subscription.planName}</Text>
              </View>
            )}
            {eventsRemaining !== undefined && (
              <Text style={[styles.eventsRemaining, isEventsExhausted && styles.eventsRemainingExhausted]}>
                {isEventsExhausted
                  ? t('events.hostSelector.noEventsRemaining')
                  : eventsRemaining === -1
                    ? t('events.hostSelector.unlimited')
                    : t('events.hostSelector.eventsRemaining', { count: eventsRemaining })}
              </Text>
            )}
          </View>
          <ActionButton
            label={
              isEventsExhausted
                ? t('events.hostSelector.noEvents')
                : selected
                  ? t('events.hostSelector.selected')
                  : t('events.hostSelector.selectHost')
            }
            onPress={() => !isEventsExhausted && onSelect(item)}
            variant={selected ? 'secondary' : 'primary'}
            disabled={isEventsExhausted}
          />
        </View>
      </SectionCard>
    );
  };

  const hosts = hostsData?.hosts || hostsData?.data || (Array.isArray(hostsData) ? hostsData : []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('events.hostSelector.title')}</Text>
      <Text style={styles.subtitle}>{t('events.hostSelector.subtitle')}</Text>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t('events.hostSelector.tabs.' + tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'self' && (
        <SectionCard style={styles.selfCard}>
          <View style={styles.hostCardRow}>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{user?.name || user?.fullName || 'Admin'}</Text>
              <Text style={styles.hostPhone}>{user?.phone || '—'}</Text>
            </View>
            <ActionButton
              label={value.createForSelf ? t('events.hostSelector.selected') : t('events.hostSelector.selectHost')}
              onPress={handleSelectSelf}
              variant={value.createForSelf ? 'secondary' : 'primary'}
            />
          </View>
        </SectionCard>
      )}
      {activeTab === 'host' && (
        <View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={phoneSearch}
              onChangeText={setPhoneSearch}
              placeholder={t('events.hostSelector.searchPlaceholder')}
              keyboardType="phone-pad"
            />
            <ActionButton
              label={t('events.hostSelector.verify')}
              onPress={handleVerifyPhone}
              variant="secondary"
              loading={searching}
            />
          </View>
          {searchError && <Text style={styles.searchError}>{searchError}</Text>}
          {searchResult && (
            <View style={styles.searchResultSection}>
              <Text style={styles.sectionLabel}>{t('events.hostSelector.searchResult')}</Text>
              {renderHostCard(searchResult, handleSelectHost, 'host')}
            </View>
          )}
          <Text style={styles.sectionLabel}>{t('events.hostSelector.hostList')}</Text>
          {hostsLoading ? (
            <ActivityIndicator color="#C28E5C" style={{ margin: 16 }} />
          ) : (
            <FlatList
              data={hosts}
              keyExtractor={(item) => String(item._id || item.id)}
              renderItem={({ item }) => renderHostCard(item, handleSelectHost, 'host')}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#666', marginBottom: 16 },
  tabs: { flexDirection: 'row', borderRadius: 8, backgroundColor: '#f0f0f0', padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#999' },
  tabTextActive: { color: '#C28E5C' },
  selfCard: { marginBottom: 8 },
  hostCard: { marginBottom: 8 },
  hostCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hostInfo: { flex: 1, marginRight: 8 },
  hostName: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#1a1a1a' },
  hostPhone: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#666', marginTop: 2 },
  badge: { backgroundColor: '#fef3e7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#C28E5C' },
  eventsRemaining: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#999', marginTop: 2 },
  eventsRemainingExhausted: { color: '#e74c3c', fontFamily: 'Cairo_600SemiBold' },
  hostCardExhausted: { opacity: 0.6 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1a1a1a', backgroundColor: '#fff' },
  searchError: { color: '#e74c3c', fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 8 },
  searchResultSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#444', marginBottom: 8 },
});

export default HostSelectorStep;