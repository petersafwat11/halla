"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaCheckCircle, FaTicketAlt, FaStar } from "react-icons/fa";
import { useTicketForRating, useTicketMutation } from "@/hooks/reactQueryHooks/useTickets";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import StarRating from "@/ui/commen/inputs/starRating/StarRating";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import { ticketRatingSchema, defaultTicketRatingValues } from "@/utils/schemas/ticketRatingSchema";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { TICKET_STATUS } from "@/utils/constants/ticketConstants";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import styles from "./page.module.css";

const TicketRatingContent = () => {
  const { id: ticketId } = useParams();
  const router = useRouter();
  const { t } = useTranslation("ticketRating");
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Fetch ticket data with React Query
  const { data: ticketData, isLoading, error, refetch } = useTicketForRating(ticketId);

  // Rating submission mutation
  const rateMutation = useTicketMutation("rateTicket");

  // Initialize form with RHF
  const methods = useForm({
    resolver: zodResolver(ticketRatingSchema),
    defaultValues: defaultTicketRatingValues,
    mode: "onChange",
  });

  const { handleSubmit, reset, formState } = methods;
  const { isSubmitting, isDirty } = formState;

  // Extract ticket from response
  const ticket = ticketData?.data;

  // Initialize form with existing rating
  useEffect(() => {
    if (ticket?.currentRating?.rating) {
      reset({
        rating: ticket.currentRating.rating,
        feedback: ticket.currentRating.feedback || "",
      });
      setSubmitted(true);
      setSubmittedData({
        rating: ticket.currentRating.rating,
        feedback: ticket.currentRating.feedback || "",
      });
    }
  }, [ticket, reset]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitted]);

  const onSubmit = useCallback(async (data) => {
    try {
      await rateMutation.mutateAsync({
        ticketId,
        rating: data.rating,
        feedback: data.feedback,
      });
      setSubmitted(true);
      setSubmittedData(data);
      toastUtils.success(t("success.title"));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "errors.submitFailed" });
    }
  }, [rateMutation, ticketId, t]);

  const handleReload = useCallback(() => refetch(), [refetch]);
  const handleGoHome = useCallback(() => router.push("/"), [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <FaTicketAlt className={styles.statusIcon} />
          <h2>{t("errors.loadFailed")}</h2>
          <button
            onClick={handleReload}
            className={styles.secondaryButton}
          >
            {t("buttons.retry")}
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!ticket) {
    return (
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <FaTicketAlt className={styles.statusIcon} />
          <h2>{t("notFound.title")}</h2>
          <p>{t("notFound.description")}</p>
          <button
            onClick={handleGoHome}
            className={styles.secondaryButton}
          >
            {t("buttons.backToHome")}
          </button>
        </div>
      </div>
    );
  }

  // Ticket not resolved state
  if (ticket.status !== TICKET_STATUS.RESOLVED && ticket.status !== TICKET_STATUS.CLOSED) {
    return (
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <FaTicketAlt className={styles.statusIcon} />
          <h2>{t("inProgress.title")}</h2>
          <p>{t("inProgress.description")}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successContent}>
            <FaCheckCircle className={styles.successIcon} />
            <h2>{t("success.title")}</h2>
            <p>{t("success.description")}</p>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={`${styles.starSmall} ${star <= submittedData?.rating ? styles.starFilled : ""
                    }`}
                />
              ))}
            </div>
            {submittedData?.feedback && (
              <div className={styles.feedbackBox}>
                <span className={styles.feedbackBoxLabel}>
                  {t("feedback.yourFeedback")}
                </span>
                <p>{submittedData.feedback}</p>
              </div>
            )}
            <button
              onClick={handleGoHome}
              className={styles.secondaryButton}
            >
              {t("buttons.backToHome")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rating form
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <header className={styles.header}>
              <FaTicketAlt className={styles.headerIcon} />
              <h1>{t("title")}</h1>
              <span className={styles.ticketBadge}>
                {t("ticketNumber")} #{String(ticketId).slice(-6)}
              </span>
            </header>

            <section className={styles.ratingSection}>
              <p className={styles.question}>{t("rating.question")}</p>
              <StarRating
                name="rating"
                required
                size="large"
                showLabels
              />
            </section>

            <section className={styles.feedbackSection}>
              <TextArea
                name="feedback"
                label={t("feedback.label")}
                placeholder={t("feedback.placeholder")}
                rows={4}
                maxLength={1000}
              />
            </section>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting || !formState.isValid}
            >
              {isSubmitting ? t("buttons.submitting") : t("buttons.submit")}
            </button>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

const TicketRatingPage = () => {
  const { t } = useTranslation("ticketRating");
  return (
    <ErrorBoundary
      fallbackTitle={t("errors.loadFailed")}
      fallbackMessage={t("errors.submitFailed")}
    >
      <TicketRatingContent />
    </ErrorBoundary>
  );
};

export default TicketRatingPage;
