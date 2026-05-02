"use client";
/**
 * Pagination Component
 * A responsive, styled pagination component with RTL support
 * Uses the project's color scheme and supports localization
 */

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styles from "./pagination.module.css";
import {
  MdChevronLeft,
  MdChevronRight,
  MdFirstPage,
  MdLastPage,
} from "react-icons/md";

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Items per page
 * @param {Function} props.onPageChange - Callback when page changes
 * @param {Function} props.onItemsPerPageChange - Callback when items per page changes
 * @param {boolean} props.showItemsPerPage - Show items per page selector
 * @param {boolean} props.showTotalItems - Show total items count
 * @param {boolean} props.showFirstLast - Show first/last page buttons
 * @param {Array} props.itemsPerPageOptions - Options for items per page
 * @param {number} props.siblingCount - Number of siblings on each side of current page
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  showFirstLast = true,
  itemsPerPageOptions = [10, 20, 50, 100],
  siblingCount = 1,
}) => {
  const { t } = useTranslation("pagination");

  // Calculate page numbers to display
  const pageNumbers = useMemo(() => {
    const range = (start, end) => {
      const length = end - start + 1;
      return Array.from({ length }, (_, idx) => start + idx);
    };

    const totalPageNumbers = siblingCount * 2 + 5; // siblings + first + last + current + 2 dots

    // If total pages is less than what we want to show, show all
    if (totalPages <= totalPageNumbers) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, "dots", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [1, "dots", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, "dots", ...middleRange, "dots", totalPages];
    }

    return range(1, totalPages);
  }, [currentPage, totalPages, siblingCount]);

  // Calculate items range for display
  const itemsRange = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return { start, end };
  }, [currentPage, itemsPerPage, totalItems]);

  // Handlers
  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1) {
      onPageChange?.(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages) {
      onPageChange?.(totalPages);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    onItemsPerPageChange?.(newValue);
  };

  // Don't render if no pages
  if (totalPages <= 0) return null;

  return (
    <div className={styles.container}>
      {/* Items info section */}
      <div className={styles.info}>
        {showTotalItems && totalItems > 0 && (
          <span className={styles.itemsInfo}>
            {t("showing", "عرض")} {itemsRange.start}-{itemsRange.end}{" "}
            {t("of", "من")} {totalItems} {t("items", "عنصر")}
          </span>
        )}

        {showItemsPerPage && (
          <div className={styles.perPageSelector}>
            <span className={styles.perPageLabel}>
              {t("perPage", "لكل صفحة")}:
            </span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className={styles.perPageSelect}
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className={styles.controls}>
        {/* First page button */}
        {showFirstLast && (
          <button
            className={`${styles.button} ${styles.navButton} ${
              currentPage === 1 ? styles.disabled : ""
            }`}
            onClick={handleFirst}
            disabled={currentPage === 1}
            aria-label={t("firstPage", "الصفحة الأولى")}
          >
            <MdFirstPage size={20} />
          </button>
        )}

        {/* Previous button */}
        <button
          className={`${styles.button} ${styles.navButton} ${
            currentPage === 1 ? styles.disabled : ""
          }`}
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label={t("previousPage", "الصفحة السابقة")}
        >
          <MdChevronLeft size={20} />
          <span className={styles.navText}>{t("previous", "السابق")}</span>
        </button>

        {/* Page numbers */}
        <div className={styles.pages}>
          {pageNumbers.map((page, index) => {
            if (page === "dots") {
              return (
                <span key={`dots-${index}`} className={styles.dots}>
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                className={`${styles.button} ${styles.pageButton} ${
                  currentPage === page ? styles.active : ""
                }`}
                onClick={() => handlePageClick(page)}
                aria-label={`${t("page", "صفحة")} ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          className={`${styles.button} ${styles.navButton} ${
            currentPage === totalPages ? styles.disabled : ""
          }`}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label={t("nextPage", "الصفحة التالية")}
        >
          <span className={styles.navText}>{t("next", "التالي")}</span>
          <MdChevronRight size={20} />
        </button>

        {/* Last page button */}
        {showFirstLast && (
          <button
            className={`${styles.button} ${styles.navButton} ${
              currentPage === totalPages ? styles.disabled : ""
            }`}
            onClick={handleLast}
            disabled={currentPage === totalPages}
            aria-label={t("lastPage", "الصفحة الأخيرة")}
          >
            <MdLastPage size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
