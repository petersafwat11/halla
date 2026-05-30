"use client";
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FaSearch,
  FaUser,
  FaCheck,
  FaExclamationTriangle,
  FaUserShield,
  FaBuilding,
} from "react-icons/fa";
import { toastUtils } from "@/utils/toastUtils";
import { useAdminEventTargets, useVerifyHostPhoneMutation } from "@/hooks/admin";
import styles from "./hostSelector.module.css";

const PLATFORM_ADMIN_ROLES = ["super_admin", "admin", "moderator"];
const WHITELABEL_ADMIN_ROLES = ["whitelabel_admin", "whitelabel_moderator"];

const HostSelector = ({
  onHostSelect,
  selectedHost = null,
  currentUser = null,
}) => {
  const { t, i18n } = useTranslation("adminEvents");
  const currentLang = i18n.language || "ar";
  const [targetType, setTargetType] = useState("self");
  const [searchMode, setSearchMode] = useState("list");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Check if user is a platform admin (super_admin, admin, moderator without whitelabelId)
  const isPlatformAdmin =
    currentUser &&
    PLATFORM_ADMIN_ROLES.includes(currentUser.role) &&
    !currentUser.whitelabelId;

  // Check if user is a whitelabel admin (whitelabel_admin or whitelabel_moderator)
  const isWhitelabelAdmin =
    currentUser && WHITELABEL_ADMIN_ROLES.includes(currentUser.role);

  const targetsType = targetType === "whitelabel" ? "whitelabel" : "host";
  const { data: targetsData, isLoading: isLoadingTargets } = useAdminEventTargets(
    targetsType,
    { enabled: targetType !== "self" }
  );
  const targets = targetsData?.data?.targets || targetsData?.targets || [];

  const verifyHostPhone = useVerifyHostPhoneMutation();

  const handleSearch = useCallback(async () => {
    if (!phoneNumber.trim()) {
      toastUtils.error(
        t("createEvent.selectHost.enterPhone") || "Please enter a phone number"
      );
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const response = await verifyHostPhone.mutateAsync(phoneNumber.trim());
      if (response?.data?.isValid && response?.data?.host) {
        setSearchResult(response.data.host);
        setSearchError(null);
      } else {
        setSearchResult(null);
        setSearchError(
          t("createEvent.selectHost.hostNotFound") || "Host not found"
        );
      }
    } catch (error) {
      setSearchResult(null);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("createEvent.selectHost.searchError") ||
        "Search failed";
      setSearchError(errorMessage);
      toastUtils.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  }, [phoneNumber, t, verifyHostPhone]);

  const handleSelectTarget = useCallback(
    (target, type = "host") => {
      if (onHostSelect) {
        onHostSelect({
          ...target,
          targetType: type,
          createForSelf: type === "self",
        });
      }
    },
    [onHostSelect]
  );

  const handleSelectSelf = useCallback(() => {
    if (onHostSelect && currentUser) {
      // Platform admins (super_admin, admin, moderator without whitelabelId): unlimited
      // Whitelabel admins: use their actual subscription
      // Whitelabel moderators: use the whitelabel's subscription (fetched from auth store)
      let subscription;
      if (isPlatformAdmin) {
        subscription = { isUnlimited: true };
      } else if (isWhitelabelAdmin) {
        subscription = currentUser.subscription || null;
      } else if (currentUser.role === 'whitelabel_moderator' && currentUser.whitelabelId) {
        // Whitelabel moderator shares the whitelabel admin's plan
        // The whitelabel subscription should be available via currentUser.whitelabelSubscription
        // or we use the currentUser.subscription if the backend already resolved it
        subscription = currentUser.whitelabelSubscription || currentUser.subscription || null;
      } else {
        subscription = currentUser.subscription || null;
      }

      onHostSelect({
        ...currentUser,
        targetType: "self",
        createForSelf: true,
        subscription,
      });
    }
  }, [onHostSelect, currentUser, isPlatformAdmin, isWhitelabelAdmin]);

  const hasActiveSubscription = (target) => {
    if (target?.subscription?.isUnlimited) return true;
    return (
      target?.subscription?.status === "active" ||
      target?.subscription?.status === "trial"
    );
  };

  const getSubscriptionInfo = (target) => {
    if (target?.subscription?.isUnlimited) {
      return {
        text: t("createEvent.selectHost.unlimited") || "Unlimited",
        type: "success",
      };
    }
    if (!target?.subscription) {
      return {
        text: t("createEvent.selectHost.noSubscription") || "No subscription",
        type: "error",
      };
    }
    const status = target?.subscription?.status;
    if (status === "active" || status === "trial") {
      const planName =
        currentLang === "ar"
          ? target?.subscription?.planName?.ar
          : target?.subscription?.planName?.en;
      const eventsRemaining = target?.subscription?.eventsRemaining;
      const displayName =
        planName || target?.subscription?.planType || "Active";
      const remainingText =
        eventsRemaining === -1
          ? ""
          : ` (${eventsRemaining} ${
              t("createEvent.selectHost.eventsRemaining") || "remaining"
            })`;
      return { text: displayName + remainingText, type: "success" };
    }
    return {
      text: t("createEvent.selectHost.inactiveSubscription") || "Inactive",
      type: "warning",
    };
  };

  const isTargetSelected = (target) => {
    if (!selectedHost) return false;
    const targetId = target._id || target.id;
    const selectedId = selectedHost._id || selectedHost.id;
    if (!targetId || !selectedId) return false;
    return targetId === selectedId;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {t("createEvent.selectHost.description")}
        </h3>
      </div>

      {/* Show tabs for both platform admins AND whitelabel admins */}
      {(isPlatformAdmin || isWhitelabelAdmin) && (
        <div className={styles.targetTypeToggle}>
          <button
            type="button"
            className={`${styles.targetTypeButton} ${
              targetType === "self" ? styles.active : ""
            }`}
            onClick={() => setTargetType("self")}
          >
            <FaUserShield />
            <span>{t("createEvent.selectHost.createForSelf")}</span>
          </button>
          <button
            type="button"
            className={`${styles.targetTypeButton} ${
              targetType === "host" ? styles.active : ""
            }`}
            onClick={() => setTargetType("host")}
          >
            <FaUser />
            <span>{t("createEvent.selectHost.createForHost")}</span>
          </button>
          {/* Only show whitelabel tab for platform admins (not whitelabel admins) */}
          {isPlatformAdmin && (
            <button
              type="button"
              className={`${styles.targetTypeButton} ${
                targetType === "whitelabel" ? styles.active : ""
              }`}
              onClick={() => setTargetType("whitelabel")}
            >
              <FaBuilding />
              <span>{t("createEvent.selectHost.createForWhitelabel")}</span>
            </button>
          )}
        </div>
      )}

      {/* Self option - show for both platform admins and whitelabel admins */}
      {targetType === "self" && (isPlatformAdmin || isWhitelabelAdmin) && (
        <div className={styles.contentArea}>
          <div className={styles.selfOption}>
            <div className={styles.selfCard} onClick={handleSelectSelf}>
              <div className={styles.selfCardIcon}>
                <FaUserShield />
              </div>
              <div className={styles.selfCardContent}>
                <h4 className={styles.selfCardTitle}>
                  {t("createEvent.selectHost.createForYourself")}
                </h4>
                <p className={styles.selfCardDescription}>
                  {isPlatformAdmin
                    ? t("createEvent.selectHost.unlimitedDescription")
                    : t("createEvent.selectHost.whitelabelDescription") ||
                      t("createEvent.selectHost.createEventAsWhitelabel") ||
                      "Create an event using your whitelabel subscription"}
                </p>
              </div>
              {isPlatformAdmin ? (
                <div className={styles.unlimitedBadge}>
                  <FaCheck className={styles.badgeIcon} />
                  {t("createEvent.selectHost.unlimited")}
                </div>
              ) : (
                <div
                  className={`${styles.subscriptionBadge} ${
                    styles[getSubscriptionInfo(currentUser).type]
                  }`}
                >
                  {getSubscriptionInfo(currentUser).text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {targetType !== "self" && (
        <div className={styles.contentArea}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeButton} ${
                searchMode === "search" ? styles.active : ""
              }`}
              onClick={() => setSearchMode("search")}
            >
              <FaSearch />
              <span>{t("createEvent.selectHost.searchByPhone")}</span>
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${
                searchMode === "list" ? styles.active : ""
              }`}
              onClick={() => setSearchMode("list")}
            >
              <FaUser />
              <span>{t("createEvent.selectHost.selectFromList")}</span>
            </button>
          </div>

          {searchMode === "search" && (
            <div className={styles.searchSection}>
              <div className={styles.searchInputWrapper}>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={
                    t("createEvent.selectHost.phonePlaceholder") ||
                    "+966 XX XXX XXXX"
                  }
                  className={styles.searchInput}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={styles.searchButton}
                >
                  {isSearching ? (
                    <span className={styles.spinner} />
                  ) : (
                    <FaSearch />
                  )}
                </button>
              </div>

              {searchResult && (
                <div className={styles.searchResult}>
                  <TargetCard
                    target={searchResult}
                    isSelected={isTargetSelected(searchResult)}
                    onSelect={() =>
                      handleSelectTarget(searchResult, targetType)
                    }
                    getSubscriptionInfo={getSubscriptionInfo}
                    hasActiveSubscription={hasActiveSubscription}
                    t={t}
                    targetType={targetType}
                  />
                </div>
              )}

              {searchError && (
                <div className={styles.searchError}>
                  <FaExclamationTriangle />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          )}

          {searchMode === "list" && (
            <div className={styles.listSection}>
              {isLoadingTargets ? (
                <div className={styles.loading}>
                  <span className={styles.spinner} />
                  <span>{t("common.loading")}</span>
                </div>
              ) : targets.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    {targetType === "whitelabel" ? <FaBuilding /> : <FaUser />}
                  </div>
                  <p className={styles.emptyText}>
                    {targetType === "whitelabel"
                      ? t("createEvent.selectHost.noWhitelabelsFound")
                      : t("createEvent.selectHost.noHostsFound")}
                  </p>
                </div>
              ) : (
                <div className={styles.hostsList}>
                  {targets.map((target) => (
                    <TargetCard
                      key={target._id || target.id}
                      target={target}
                      isSelected={isTargetSelected(target)}
                      onSelect={() => handleSelectTarget(target, targetType)}
                      getSubscriptionInfo={getSubscriptionInfo}
                      hasActiveSubscription={hasActiveSubscription}
                      t={t}
                      targetType={targetType}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TargetCard = ({
  target,
  isSelected,
  onSelect,
  getSubscriptionInfo,
  hasActiveSubscription,
  t,
  targetType = "host",
}) => {
  const subscriptionInfo = getSubscriptionInfo(target);
  const canSelect = hasActiveSubscription(target);

  return (
    <div
      className={`${styles.hostCard} ${isSelected ? styles.selected : ""} ${
        !canSelect ? styles.disabled : ""
      }`}
      onClick={() => canSelect && onSelect()}
    >
      <div className={styles.hostAvatar}>
        {targetType === "whitelabel" ? <FaBuilding /> : <FaUser />}
      </div>
      <div className={styles.hostInfo}>
        <div className={styles.hostName}>
          {target.username || target.name || "Unknown"}
        </div>
        <div className={styles.hostPhone}>
          {target.phoneNumber || target.phone || "-"}
        </div>
        <div className={styles.hostEmail}>{target.email || "-"}</div>
      </div>
      <div className={styles.hostSubscription}>
        {targetType === "whitelabel" && (
          <div className={styles.hostRole}>
            {t("createEvent.selectHost.whitelabelAdmin") || "Whitelabel Admin"}
          </div>
        )}
        <span
          className={`${styles.subscriptionBadge} ${
            styles[subscriptionInfo.type]
          }`}
        >
          {subscriptionInfo.text}
        </span>
        {!canSelect && (
          <span className={styles.warningText}>
            {t("createEvent.selectHost.subscriptionRequired") ||
              "Subscription required"}
          </span>
        )}
      </div>
      {isSelected && (
        <div className={styles.selectedIndicator}>
          <FaCheck />
        </div>
      )}
    </div>
  );
};

export default HostSelector;
