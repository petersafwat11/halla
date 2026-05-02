'use client';
import React, { useState, useEffect } from 'react';
import styles from './imageCarousel.module.css';
import Image from 'next/image';
import { tajawal } from '@/app/[lang]/fonts';
const ImageCarousel = () => {
  const [currentImage, setCurrentImage] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev === 4 ? 1 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className={`${styles.container} ${tajawal.className}`}>
      <div className={styles.image_container}>
        <Image
          className={styles.image}
          src={`/login/${currentImage}.png`}
          alt={`image${currentImage}`}
          width={'100'}
          height={'100'}
        />
      </div>
      <div className={styles.text_container}>
        <h1 className={styles.title}>
          Labbe <span className={styles.arabic_title}> لبّى </span>
        </h1>
        <p className={styles.description}>
          {`region's most distinguished gatherings.`}
        </p>
        <div className={styles.dots}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className={currentImage === item ? styles.active_dot : styles.dot}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;
