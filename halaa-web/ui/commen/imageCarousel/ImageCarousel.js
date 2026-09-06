'use client';
import React, { useState, useEffect } from 'react';
import styles from './imageCarousel.module.css';
import Image from 'next/image';
import { tajawal } from './fonts';

const SLIDES = [
  '/landing/4.png',
  '/landing/7.png',
  '/landing/6.png',
  '/landing/5.png',
];

const ImageCarousel = () => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className={`${styles.container} ${tajawal.className}`}>
      <div className={styles.image_container}>
        {SLIDES.map((src, index) => (
          <Image
            key={src}
            className={`${styles.image} ${
              index === current ? styles.image_active : ''
            }`}
            src={src}
            alt=""
            fill
            priority={index === 0}
            sizes="50vw"
          />
        ))}
        <div className={styles.scrim} />
      </div>
      <div className={styles.text_container}>
        <h1 className={styles.title}>
          Halaa <span className={styles.arabic_title}> هلا </span>
        </h1>
        <p className={styles.description}>
          {`region's most distinguished gatherings.`}
        </p>
        <div className={styles.dots}>
          {SLIDES.map((src, index) => (
            <div
              key={src}
              className={index === current ? styles.active_dot : styles.dot}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;
