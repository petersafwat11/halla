'use client';
import React from 'react';
import styles from '../../page.module.css';

const ContinueSignupLayout = ({ children }) => {
  return (
    <div className={'page'}>
      <div className={styles.container}>
        <div className={styles.right} style={{ width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ContinueSignupLayout;
