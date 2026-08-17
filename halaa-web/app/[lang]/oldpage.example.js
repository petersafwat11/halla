import React from 'react';
import styles from './page.module.css';
import Header from '../../ui/landing/Header/Header';
import HeroSection from '../../ui/landing/HeroSection/HeroSection';
import FeaturesSection from '../../ui/landing/FeaturesSection/FeaturesSection';
import InvitationsCarousel from '../../ui/landing/InvitationsCarousel/InvitationsCarousel';
import PricingSection from '../../ui/landing/PricingSection/PricingSection';
import AppDownloadSection from '../../ui/landing/AppDownloadSection/AppDownloadSection';
import VendorSearchSection from '../../ui/landing/VendorSearchSection/VendorSearchSection';
import VendorCTASection from '../../ui/landing/VendorCTASection/VendorCTASection';
import AppShowcaseSection from '../../ui/landing/AppShowcaseSection/AppShowcaseSection';
import Footer from '../../ui/landing/Footer/Footer';

export default function LandingPage({ params }) {
  const { lang } = params;
  return (
    <div className={styles.landingPage}>
      <Header lang={lang} />
      <main className={styles.main}>
        <HeroSection />
        <FeaturesSection />
        <InvitationsCarousel />
        <PricingSection />
        <AppDownloadSection />
        <VendorSearchSection />
        <VendorCTASection />
        <AppShowcaseSection />
      </main>
      <Footer />
    </div>
  );
}
