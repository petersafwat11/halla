import React from 'react';
import styles from './card.module.css';

const Card = ({ children, className, onClick, iconPath, iconAlt, ...props }) => {
  const cardClasses = `${styles.card} ${className || ''}`;
  
  return (
    <div 
      className={cardClasses} 
      onClick={onClick}
      {...props}
    >
      {iconPath && (
        <div className={styles.cardIconContainer}>
          <img src={iconPath} alt={iconAlt || 'Card Icon'} className={styles.cardIcon} />
        </div>
      )}
      {children}
    </div>
  );
};

export default Card; 