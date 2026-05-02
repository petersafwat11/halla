import React from 'react';
import styles from './cardLayout.module.css';
function CardLayout({ children, className, variant = 'default', ...props }) {
  const { iconPath, iconAlt, iconBox, ...rest } = props;
  const cardClass = variant === 'swiper' ? styles.swiperCard : styles.card;
  const cardClasses = `${cardClass} ${className || ''}`;
  return (
    <div className={cardClasses} {...rest}>
      {children}
    </div>
  );
}

export default CardLayout;
