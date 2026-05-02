'use client';
import React from 'react';
import styles from './settingsTabs.module.css';
import { useTranslation } from 'react-i18next';

const SettingsTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation('vendorSettings');

  const tabs = [
    { key: 'accountSetup', label: t('tabs.accountSetup') },
    { key: 'notifications', label: t('tabs.notifications') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.tabsHeader}>
        <div className={styles.titles}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`${styles.tabWrapper} ${
                activeTab === tab.key ? styles.active : ''
              }`}
            >
              <button
                type="button"
                className={styles.tab}
                onClick={() => onTabChange(tab.key)}
              >
                {tab.label}
              </button>
              {activeTab === tab.key && <div className={styles.activeIndicator} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsTabs;
