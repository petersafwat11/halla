"use client";
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import styles from "./table.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import Pagination from "@/ui/commen/pagination/Pagination";

const Table = ({
  headers = [],
  headerKeys = null,
  data = [],
  onRowClick = null,
  actions = [],
  getRowActions = null,
  filterOptions = [],
  activeFilter = null,
  title = "",
  showSearch = true,
  showFilter = true,
  showExport = false,
  onExportClick = null,
  renderCell = null,
  searchPlaceholder = null,
  actionsLabel = null,
  filterLabel = null,
  exportLabel = null,
  bulkActions = [],
  showCheckboxes = true,
  pagination = null,
}) => {
  const { t } = useTranslation("table");

  // Use translations with fallback to props or defaults
  const labels = {
    search: searchPlaceholder || t("search", "بحث..."),
    actions: actionsLabel || t("actions", "الإجراءات"),
    filter: filterLabel || t("filter", "التصفية"),
    export: exportLabel || t("export", "تصدير البيانات"),
  };
  const [selectedRows, setSelectedRows] = useState([]);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [bulkActionsDropdownOpen, setBulkActionsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({});
  const actionsRef = useRef(null);
  const filterRef = useRef(null);
  const bulkActionsRef = useRef(null);
  const dropdownRefs = useRef({});
  // Trigger element refs — captured synchronously on click so positioning
  // doesn't depend on the (possibly stale) synthetic event later.
  const actionsTriggerRef = useRef(null);
  const filterTriggerRef = useRef(null);
  const bulkTriggerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For row actions dropdown - check if click is inside any action dropdown
      // This is needed because fixed-positioned dropdowns might not be contained in actionsRef
      const isInsideActionDropdown = Object.keys(dropdownRefs.current).some(
        (key) => {
          if (key.startsWith("actions-")) {
            const dropdown = dropdownRefs.current[key];
            return dropdown && dropdown.contains(event.target);
          }
          return false;
        }
      );

      // Also check if click is on the more button itself
      const isOnMoreButton = event.target.closest(`.${styles.moreButton}`);

      if (!isInsideActionDropdown && !isOnMoreButton) {
        setActionsDropdownOpen(null);
      }

      // Filter dropdown
      const filterDropdown = dropdownRefs.current["filter"];
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target) &&
        (!filterDropdown || !filterDropdown.contains(event.target))
      ) {
        setFilterDropdownOpen(false);
      }

      // Bulk actions dropdown
      const bulkDropdown = dropdownRefs.current["bulkActions"];
      if (
        bulkActionsRef.current &&
        !bulkActionsRef.current.contains(event.target) &&
        (!bulkDropdown || !bulkDropdown.contains(event.target))
      ) {
        setBulkActionsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Position the row-actions dropdown synchronously after open, before paint.
  // Using useLayoutEffect (instead of setTimeout) guarantees the dropdown is
  // never painted at the wrong position on first open.
  useLayoutEffect(() => {
    if (actionsDropdownOpen === null) return;
    const key = `actions-${actionsDropdownOpen}`;
    const triggerEl = actionsTriggerRef.current;
    const dropdownEl = dropdownRefs.current[key];
    if (!triggerEl || !dropdownEl) return;
    const position = calculateDropdownPosition(triggerEl, dropdownEl);
    setDropdownPosition((prev) => ({ ...prev, [key]: position }));
  }, [actionsDropdownOpen]);

  useLayoutEffect(() => {
    if (!filterDropdownOpen) return;
    const triggerEl = filterTriggerRef.current;
    const dropdownEl = dropdownRefs.current["filter"];
    if (!triggerEl || !dropdownEl) return;
    const position = calculateDropdownPosition(triggerEl, dropdownEl);
    setDropdownPosition((prev) => ({ ...prev, filter: position }));
  }, [filterDropdownOpen]);

  useLayoutEffect(() => {
    if (!bulkActionsDropdownOpen) return;
    const triggerEl = bulkTriggerRef.current;
    const dropdownEl = dropdownRefs.current["bulkActions"];
    if (!triggerEl || !dropdownEl) return;
    const position = calculateDropdownPosition(triggerEl, dropdownEl);
    setDropdownPosition((prev) => ({ ...prev, bulkActions: position }));
  }, [bulkActionsDropdownOpen]);

  // Recalculate dropdown positions on scroll or resize
  useEffect(() => {
    const recalculatePositions = () => {
      // Recalculate all open dropdown positions
      Object.keys(dropdownRefs.current).forEach((key) => {
        const dropdownElement = dropdownRefs.current[key];
        if (dropdownElement) {
          const buttonElement =
            dropdownElement.parentElement?.querySelector("button");
          if (buttonElement) {
            const position = calculateDropdownPosition(
              buttonElement,
              dropdownElement
            );
            setDropdownPosition((prev) => ({ ...prev, [key]: position }));
          }
        }
      });
    };

    window.addEventListener("scroll", recalculatePositions, true);
    window.addEventListener("resize", recalculatePositions);

    return () => {
      window.removeEventListener("scroll", recalculatePositions, true);
      window.removeEventListener("resize", recalculatePositions);
    };
  }, [actionsDropdownOpen, filterDropdownOpen, bulkActionsDropdownOpen]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(data.map((item) => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleRowClick = (row, e) => {
    // Don't trigger row click if clicking on checkbox or actions
    if (
      e.target.type === "checkbox" ||
      e.target.closest(`.${styles.actionsCell}`)
    ) {
      return;
    }
    if (onRowClick) {
      onRowClick(row);
    }
  };

  const calculateDropdownPosition = (buttonElement, dropdownElement) => {
    if (!buttonElement || !dropdownElement) return {};

    const buttonRect = buttonElement.getBoundingClientRect();
    const dropdownRect = dropdownElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceRight = viewportWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;
    const spaceBottom = viewportHeight - buttonRect.bottom;
    const spaceTop = buttonRect.top;

    const dropdownWidth = dropdownRect.width || 160;
    const dropdownHeight = dropdownRect.height || 200;

    const position = {};

    // Horizontal positioning (fixed positioning uses viewport coordinates)
    if (spaceRight >= dropdownWidth) {
      // Show to the right of button
      position.left = `${buttonRect.left}px`;
      position.right = "auto";
    } else if (spaceLeft >= dropdownWidth) {
      // Show to the left of button
      position.right = `${viewportWidth - buttonRect.right}px`;
      position.left = "auto";
    } else {
      // Not enough space on either side, align to right edge of button (RTL)
      position.right = `${viewportWidth - buttonRect.right}px`;
      position.left = "auto";
    }

    // Vertical positioning (fixed positioning uses viewport coordinates)
    const gap = 8; // 0.8rem gap
    if (spaceBottom >= dropdownHeight + gap) {
      // Show below button
      position.top = `${buttonRect.bottom + gap}px`;
      position.bottom = "auto";
    } else if (spaceTop >= dropdownHeight + gap) {
      // Show above button
      position.bottom = `${viewportHeight - buttonRect.top + gap}px`;
      position.top = "auto";
    } else {
      // Not enough space, show below by default
      position.top = `${buttonRect.bottom + gap}px`;
      position.bottom = "auto";
    }

    return position;
  };

  const toggleActionsDropdown = (rowId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionsDropdownOpen === rowId) {
      setActionsDropdownOpen(null);
      actionsTriggerRef.current = null;
      return;
    }
    // Capture the trigger DOM node synchronously — the useLayoutEffect will
    // read this to position the dropdown before the next paint.
    actionsTriggerRef.current = e.currentTarget;
    setActionsDropdownOpen(rowId);
  };

  const handleActionClick = (action, row, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (action.onClick) {
      action.onClick(row);
    }
    setActionsDropdownOpen(null);
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (filterDropdownOpen) {
      setFilterDropdownOpen(false);
      filterTriggerRef.current = null;
      return;
    }
    filterTriggerRef.current = e.currentTarget;
    setFilterDropdownOpen(true);
  };

  const handleFilterOptionClick = (option) => {
    if (option.onClick) {
      option.onClick();
    }
    setFilterDropdownOpen(false);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter data based on search query
  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return Object.keys(row).some((key) => {
      if (key === "id") return false;
      const value = row[key];
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  const handleBulkActionsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (bulkActionsDropdownOpen) {
      setBulkActionsDropdownOpen(false);
      bulkTriggerRef.current = null;
      return;
    }
    bulkTriggerRef.current = e.currentTarget;
    setBulkActionsDropdownOpen(true);
  };

  const handleBulkActionClick = (action, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (action.onClick) {
      action.onClick(selectedRows);
    }
    setBulkActionsDropdownOpen(false);
    setSelectedRows([]);
  };

  const renderActions = (row) => {
    // Support dynamic row-based actions via getRowActions prop
    const rowActions = getRowActions ? getRowActions(row) : actions;

    if (!rowActions || rowActions.length === 0) return null;

    // Check if actions should be displayed as dropdown (3 dots)
    const hasDropdown = rowActions.some((action) => action.type === "dropdown");

    if (hasDropdown) {
      const dropdownActions = rowActions.filter(
        (action) => action.type === "dropdown"
      );
      return (
        <div className={styles.actionsWrapper} ref={actionsRef}>
          <button
            type="button"
            className={styles.moreButton}
            onClick={(e) => toggleActionsDropdown(row.id, e)}
          >
            <Image
              src="/svg/events/more.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
          {actionsDropdownOpen === row.id && (
            <div
              ref={(el) => (dropdownRefs.current[`actions-${row.id}`] = el)}
              className={styles.dropdown}
              style={dropdownPosition[`actions-${row.id}`] || {}}
            >
              {dropdownActions.map((action, index) => {
                // Support dynamic props based on row
                const dynamicProps = action.getDynamicProps
                  ? action.getDynamicProps(row)
                  : {};

                // Skip hidden actions
                if (dynamicProps.hidden) return null;

                const actionIcon = dynamicProps.icon || action.icon;
                const actionText =
                  dynamicProps.text ||
                  (typeof action.text === "function"
                    ? action.text(row)
                    : action.text);

                return (
                  <button
                    type="button"
                    key={`${row.id}-action-${index}-${action.type || 'icon'}`}
                    className={styles.dropdownItem}
                    onClick={(e) => handleActionClick(action, row, e)}
                  >
                    {actionIcon &&
                      (typeof actionIcon === "string" ? (
                        <Image
                          src={actionIcon}
                          alt=""
                          width={16}
                          height={16}
                        />
                      ) : (
                        <span className={styles.iconWrapper}>{actionIcon}</span>
                      ))}
                    <span>{actionText}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Display as icon buttons
    return (
      <div className={styles.actionsWrapper}>
        {rowActions.map((action, index) => (
          <button
            type="button"
            key={`${row.id}-action-${index}-${action.type || 'icon'}`}
            className={styles.actionButton}
            onClick={(e) => handleActionClick(action, row, e)}
            title={action.text}
          >
            {action.icon &&
              (typeof action.icon === "string" ? (
                <Image
                  src={action.icon}
                  alt={action.text || "action"}
                  width={16}
                  height={16}
                />
              ) : (
                <span className={styles.iconWrapper}>{action.icon}</span>
              ))}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableCard}>
        {/* Table Header with Actions */}
        <div className={styles.tableHeader}>
          <div className={styles.headerContent}>
            {title && <h2 className={styles.tableTitle}>{title}</h2>}

            <div className={styles.headerActions}>
              {showSearch && (
                <div className={styles.searchContainer}>
                  <Image
                    src="/svg/events/search.svg"
                    alt=""
                    width={12}
                    height={12}
                    className={styles.searchIcon}
                  />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={labels.search}
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              )}

              {showFilter && filterOptions && filterOptions.length > 0 && (
                <div className={styles.filterWrapper} ref={filterRef}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleFilterClick}
                  >
                    <Image
                      src="/svg/events/filter.svg"
                      alt=""
                      width={12}
                      height={12}
                    />
                    <span>{labels.filter}</span>
                  </button>
                  {filterDropdownOpen && (
                    <div
                      ref={(el) => (dropdownRefs.current["filter"] = el)}
                      className={styles.dropdown}
                      style={dropdownPosition["filter"] || {}}
                    >
                      {filterOptions.map((option, index) => {
                        const optionLabel = option.label ?? option.text;
                        const isActive = activeFilter === option.value;
                        return (
                          <button
                            type="button"
                            key={`filter-${optionLabel || index}`}
                            className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ""}`}
                            onClick={() => handleFilterOptionClick(option)}
                          >
                            {option.icon &&
                              (typeof option.icon === "string" ? (
                                <Image
                                  src={option.icon}
                                  alt={optionLabel || "filter"}
                                  width={16}
                                  height={16}
                                />
                              ) : (
                                <span className={styles.iconWrapper}>
                                  {option.icon}
                                </span>
                              ))}
                            <span>{optionLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {showExport && (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.exportButton}`}
                  onClick={onExportClick}
                  aria-label={labels.export}
                  title={labels.export}
                >
                  <Image
                    src="/svg/events/export.svg"
                    alt=""
                    width={12}
                    height={12}
                  />
                  <span>{labels.export}</span>
                </button>
              )}
              {bulkActions &&
                bulkActions.length > 0 &&
                selectedRows.length > 0 && (
                  <div
                    className={styles.bulkActionsWrapper}
                    ref={bulkActionsRef}
                  >
                    <span className={styles.selectedCount}>
                      {selectedRows.length} محدد
                    </span>
                    <button
                      type="button"
                      className={styles.moreButton}
                      onClick={handleBulkActionsClick}
                      title="إجراءات جماعية"
                    >
                      <Image
                        src="/svg/events/more.svg"
                        alt=""
                        width={24}
                        height={24}
                      />
                    </button>
                    {bulkActionsDropdownOpen && (
                      <div
                        ref={(el) => (dropdownRefs.current["bulkActions"] = el)}
                        className={styles.dropdown}
                        style={dropdownPosition["bulkActions"] || {}}
                      >
                        {bulkActions.map((action, index) => (
                          <button
                            type="button"
                            key={`bulk-${action.text || index}`}
                            className={styles.dropdownItem}
                            onClick={(e) => handleBulkActionClick(action, e)}
                          >
                            {action.icon &&
                              (typeof action.icon === "string" ? (
                                <Image
                                  src={action.icon}
                                  alt={action.text || "action"}
                                  width={16}
                                  height={16}
                                />
                              ) : (
                                <span className={styles.iconWrapper}>
                                  {action.icon}
                                </span>
                              ))}
                            <span>{action.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper} style={{ width: "100%" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                {showCheckboxes && (
                  <th>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      onChange={handleSelectAll}
                      checked={
                        selectedRows.length === data.length && data.length > 0
                      }
                    />
                  </th>
                )}
                {headers.map((header, index) => (
                  <th key={`header-${header || index}`}>{header}</th>
                ))}
                {(getRowActions || (actions && actions.length > 0)) && (
                  <th>{labels.actions}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr
                  key={row.id || row._id}
                  onClick={(e) => handleRowClick(row, e)}
                  className={onRowClick ? styles.clickableRow : ""}
                >
                  {showCheckboxes && (
                    <td>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                  )}
                  {(headerKeys || Object.keys(row).filter((key) => key !== "id")).map((key, index) => (
                    <td key={`${row.id}-cell-${key}`}>
                      {renderCell ? renderCell(key, row[key], row) : (row[key] ?? "-")}
                    </td>
                  ))}
                  {(getRowActions || (actions && actions.length > 0)) && (
                    <td className={styles.actionsCell}>{renderActions(row)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className={styles.paginationWrapper}>
            <Pagination
              currentPage={pagination.currentPage || 1}
              totalPages={pagination.totalPages || 1}
              totalItems={pagination.totalItems || 0}
              itemsPerPage={pagination.itemsPerPage || 10}
              onPageChange={pagination.onPageChange}
              onItemsPerPageChange={pagination.onItemsPerPageChange}
              showItemsPerPage={!!pagination.onItemsPerPageChange}
              showTotalItems={true}
              showFirstLast={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Table;
