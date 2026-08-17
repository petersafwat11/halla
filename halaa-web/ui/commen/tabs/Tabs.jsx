'use client';
import React from 'react';
import styles from './tabs.module.css';

function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div className={`${styles.tabsRow} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`${styles.tab} ${
            activeTab === tab.key ? styles.tabActive : ''
          }`}
          onClick={() => onTabChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
