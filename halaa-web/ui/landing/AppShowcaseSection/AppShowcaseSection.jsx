import React from 'react';
import styles from './appShowcaseSection.module.css';

const AppShowcaseSection = () => {
  return (
    <section className={styles.appShowcaseSection}>
      <div className={styles.container}>
        <div className={styles.imageWrapper}>
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/3a627c3ad2ecdd71b077f8c0128f5a737af13e6c?width=2788" 
            alt="MacBook - 3" 
            className={styles.macbookImage}
          />
        </div>
      </div>
    </section>
  );
};

export default AppShowcaseSection;
