"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircleMore,
  ScanLine,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./HowItWorks.module.css";

const STEP_META = [
  { image: "/landing/step1.jpg", Icon: CalendarDays },
  { image: "/landing/step2.jpg", Icon: MessageCircleMore },
  { image: "/landing/step3.jpg", Icon: Clock3 },
  { image: "/landing/step4.jpg", Icon: UsersRound },
  { image: "/landing/step5.png", Icon: ScanLine, contain: true },
];

export default function HowItWorks({ lang = "ar" }) {
  const { t } = useTranslation("landing");
  const steps = t("howItWorks.steps", { returnObjects: true });
  const [activeStep, setActiveStep] = useState(0);
  const touchStartX = useRef(null);
  const isRtl = lang === "ar";
  const lastStep = steps.length - 1;

  const selectStep = (nextStep) => {
    setActiveStep(Math.min(Math.max(nextStep, 0), lastStep));
  };

  const handleKeyDown = (event) => {
    if (event.target.getAttribute('role') !== 'tab') return;
    let next;
    if (event.key === 'ArrowLeft') next = activeStep + (isRtl ? 1 : -1);
    if (event.key === 'ArrowRight') next = activeStep + (isRtl ? -1 : 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = lastStep;
    if (next === undefined) return;
    event.preventDefault();
    next = Math.min(Math.max(next, 0), lastStep);
    selectStep(next);
    event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const distance = touchStartX.current - event.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    const moveForward = isRtl ? distance < 0 : distance > 0;
    selectStep(activeStep + (moveForward ? 1 : -1));
  };

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const activeMeta = STEP_META[activeStep];
  const activeCopy = steps[activeStep];

  return (
    <section id="how-it-works" className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{t("howItWorks.eyebrow")}</span>
          <h2 className={styles.title}>{t("howItWorks.title")}</h2>
          <p className={styles.subtitle}>{t("howItWorks.sub")}</p>
        </header>

        <div
          className={styles.tour}
          onKeyDown={handleKeyDown}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.stepsPanel}>
            <div className={styles.progressMeta} aria-live="polite">
              <span>{t("howItWorks.stepLabel", { current: activeStep + 1, total: steps.length })}</span>
              <span className={styles.progressPercent}>{Math.round(((activeStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} />
            </div>

            <div className={styles.stepList} role="tablist" aria-label={t("howItWorks.stepsLabel")}>
              {steps.map((step, index) => {
                const { Icon } = STEP_META[index];
                const isActive = index === activeStep;

                return (
                  <button
                    key={step.title}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${t('howItWorks.shortStep', { number: index + 1 })}: ${step.title}`}
                    aria-controls={`how-it-works-panel-${index}`}
                    tabIndex={isActive ? 0 : -1}
                    className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ""}`}
                    onClick={() => selectStep(index)}
                  >
                    <span className={styles.stepMarker} aria-hidden="true">
                      <Icon size={20} strokeWidth={1.9} />
                    </span>
                    <span className={styles.stepText}>
                      <span className={styles.stepNumber}>{t("howItWorks.shortStep", { number: index + 1 })}</span>
                      <span className={styles.stepTitle}>{step.title}</span>
                      <span className={styles.stepDescription}>{step.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            id={`how-it-works-panel-${activeStep}`}
            className={styles.previewPanel}
            role="tabpanel"
            aria-label={activeCopy.title}
          >
            <div className={styles.previewCopy}>
              <span className={styles.previewKicker}>{activeCopy.label}</span>
              <h3>{activeCopy.title}</h3>
              <p>{activeCopy.desc}</p>
            </div>

            <div className={styles.phoneStage}>
              <div className={styles.phoneGlow} aria-hidden="true" />
              <div className={styles.phoneFrame}>
                <span className={styles.speaker} aria-hidden="true" />
                <div className={styles.screen}>
                  <Image
                    key={activeMeta.image}
                    src={activeMeta.image}
                    alt={activeCopy.imageAlt}
                    fill
                    sizes="(max-width: 720px) 72vw, (max-width: 1100px) 36vw, 300px"
                    className={`${styles.screenshot} ${activeMeta.contain ? styles.screenshotContain : ""}`}
                  />
                </div>
              </div>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.arrowButton}
                onClick={() => selectStep(activeStep - 1)}
                disabled={activeStep === 0}
                aria-label={t("howItWorks.prevBtn")}
              >
                <PrevIcon size={20} />
              </button>

              <div className={styles.dots} role="presentation">
                {steps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    className={`${styles.dot} ${index === activeStep ? styles.dotActive : ""}`}
                    onClick={() => selectStep(index)}
                    aria-label={t("howItWorks.goToStep", { number: index + 1 })}
                    aria-current={index === activeStep ? "step" : undefined}
                  />
                ))}
              </div>

              <button
                type="button"
                className={styles.arrowButton}
                onClick={() => selectStep(activeStep + 1)}
                disabled={activeStep === lastStep}
                aria-label={t("howItWorks.nextBtn")}
              >
                <NextIcon size={20} />
              </button>
            </div>
          </div>
        </div>

        <p className={styles.swipeHint}>{t("howItWorks.swipeHint")}</p>
      </div>
    </section>
  );
}
