import React from 'react';
import styles from './stepHeaderSection.module.css';

function stepHeaderSection({ title, description }) {
  return (
    <div className={styles.top_text}>
      <h2 className={styles.top_text_title}>{title}</h2>
      <p className={styles.top_text_description}>{description}</p>
    </div>
  );
}

export default stepHeaderSection;
