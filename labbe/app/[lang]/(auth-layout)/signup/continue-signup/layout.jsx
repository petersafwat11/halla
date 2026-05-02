'use client';
import React from 'react';
import styles from '../../page.module.css';
import FormHeader from '@/ui/commen/formHeader/FormHeader';

const ContinueSignupLayout = ({ children }) => {
  return (
    <div className={'page'}>
      <div className={styles.container}>
        <div className={styles.right} style={{ width: '100%' }}>
          <FormHeader />
          {children}
        </div>
        {/* Removed the left side with ImageCarousel for continue signup */}
      </div>
    </div>
  );
};

export default ContinueSignupLayout; 