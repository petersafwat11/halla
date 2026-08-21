"use client";
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import styles from "./table.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { FiDownload, FiX } from "react-icons/fi";
import Pagination from "@/ui/commen/pagination/Pagination";

const Table = ({
  headers = [],
  headerKeys = null,
  data = [],
  onRowClick = null,
  onRowHover = null,
  actions = [],
  getRowActions = null,
  filterOptions = [],
  activeFilter = null,
  onFilterChange = null,
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
  // When true, the selected-row bulk actions render as inline labeled
  // buttons beside the export button instead of being hidden behind a
  // 3-dots dropdown. Opt-in so existing tables keep the dropdown; the
  // guest table turns this on for a clearer resend/reminder UX.
  inlineBulkActions = false,
  // Optional: lift the current checkbox selection out of the table so a
  // parent (e.g. a modal footer) can drive its own confirm button instead of
  // the inline bulk-action buttons. Fires with the array of selected row ids.
  onSelectionChange = null,
  pagination = null,
  // Mode configuration: "client" (default) or "server"
  mode = "client",
  searchValue = undefined,
  onSearchChange = null,
  debounceMs = 300,
  emptyMessage = null,
}) => {
  const { t } = useTranslation("table");

  // Use translations with fallback to props or defaults
  const labels = {
    search: searchPlaceholder || t("search", "بحث..."),
    actions: actionsLabel || t("actions", "الإجراءات"),
    filter: filterLabel || t("filter", "التصفية"),
    export: exportLabel || t("export", "تصدير البيانات"),
    clearSelection: t("clearSelection", "إلغاء التحديد"),
    clearSearch: t("clearSearch", "مسح البحث"),
    noData: emptyMessage || t("noData", "لا توجد بيانات"),
  };
  const [selectedRows, setSelectedRows] = useState([]);

  // Lift selection to parent using a ref to avoid unnecessary re-triggers
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    onSelectionChangeRef.current?.(selectedRows);
  }, [selectedRows]);

  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [bulkActionsDropdownOpen, setBulkActionsDropdownOpen] = useState(false);

  // Controlled vs uncontrolled search handling
  const isSearchControlled = searchValue !== undefined;
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchValue ?? "");
  const debounceTimerRef = useRef(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    if (isSearchControlled) {
      setInternalSearchQuery(searchValue ?? "");
    }
  }, [isSearchControlled, searchValue]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
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

  // Close dropdowns on Escape key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActionsDropdownOpen(null);
        setFilterDropdownOpen(false);
        setBulkActionsDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(data.map((item) => item.id || item._id).filter(Boolean));
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
    const filterVal = option.value !== undefined ? option.value : option.id;
    if (onFilterChange) {
      onFilterChange(filterVal, option);
    }
    if (option.onClick) {
      option.onClick(option);
    }
    setFilterDropdownOpen(false);
  };

  const handleSearchInputChange = (e) => {
    const nextVal = e.target.value;
    setInternalSearchQuery(nextVal);

    if (mode === "server" || onSearchChange) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearchChangeRef.current?.(nextVal.trim());
      }, debounceMs);
    }
  };

  const handleClearSearch = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setInternalSearchQuery("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (mode === "server" || onSearchChange) {
      onSearchChangeRef.current?.("");
    }
  };

  // In server mode, data is authoritative from server (never locally re-filtered).
  // In client mode, data is filtered locally against the search query.
  const filteredData = useMemo(() => {
    if (mode === "server") {
      return data;
    }

    if (!internalSearchQuery) return data;

    const searchLower = internalSearchQuery.toLowerCase();
    return data.filter((row) => {
      return Object.keys(row).some((key) => {
        if (key === "id" || key === "_id") return false;
        const value = row[key];
        return String(value ?? "").toLowerCase().includes(searchLower);
      });
    });
  }, [data, internalSearchQuery, mode]);

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

  const handleClearSelection = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSelectedRows([]);
  };

  const isFilterActive = useMemo(() => {
    if (activeFilter === null || activeFilter === undefined) return false;
    const str = String(activeFilter).trim();
    return str !== "" && str !== "all";
  }, [activeFilter]);

  const totalColumnCount = (showCheckboxes ? 1 : 0) +
    headers.length +
    ((getRowActions || (actions && actions.length > 0)) ? 1 : 0);

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
            aria-haspopup="menu"
            aria-expanded={actionsDropdownOpen === row.id}
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
              role="menu"
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
                    role="menuitem"
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
            <div className={styles.titleRow}>
              {title && <h2 className={styles.tableTitle}>{title}</h2>}
              {bulkActions &&
                bulkActions.length > 0 &&
                selectedRows.length > 0 && (
                  <span className={styles.selectedCount}>
                    {selectedRows.length} محدد
                  </span>
                )}
            </div>

            <div
              className={`${styles.headerActions} ${
                inlineBulkActions && selectedRows.length > 0
                  ? styles.headerActionsWithSelection
                  : ""
              }`}
            >
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
                    value={internalSearchQuery}
                    onChange={handleSearchInputChange}
                    aria-label={labels.search}
                  />
                  {internalSearchQuery ? (
                    <button
                      type="button"
                      className={styles.clearSearchButton}
                      onClick={handleClearSearch}
                      aria-label={labels.clearSearch}
                      title={labels.clearSearch}
                    >
                      <FiX size={14} />
                    </button>
                  ) : null}
                </div>
              )}

              {showFilter && filterOptions && filterOptions.length > 0 && (
                <div className={styles.filterWrapper} ref={filterRef}>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${isFilterActive ? styles.filterButtonActive : ""}`}
                    onClick={handleFilterClick}
                    aria-haspopup="listbox"
                    aria-expanded={filterDropdownOpen}
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
                      role="listbox"
                    >
                      {filterOptions.map((option, index) => {
                        const optionLabel = option.label ?? option.text;
                        const optionVal = option.value !== undefined ? option.value : option.id;
                        const isActive = activeFilter !== null && activeFilter !== undefined
                          ? String(activeFilter) === String(optionVal ?? "")
                          : false;
                        return (
                          <button
                            type="button"
                            key={`filter-${optionLabel || index}`}
                            className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ""}`}
                            onClick={() => handleFilterOptionClick(option)}
                            role="option"
                            aria-selected={isActive}
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
                  <FiDownload size={14} />
                  <span>{labels.export}</span>
                </button>
              )}
              {bulkActions &&
                bulkActions.length > 0 &&
                selectedRows.length > 0 &&
                (inlineBulkActions ? (
                  // Inline mode — show each bulk action as a clear labeled
                  // button right beside the export button, plus a
                  // clear-selection control.
                  <div className={styles.selectionToolbar}>
                    {bulkActions.map((action, index) => (
                      <button
                        type="button"
                        key={`bulk-${action.text || index}`}
                        className={`${styles.bulkActionButton} ${
                          action.destructive ? styles.bulkActionButtonDanger : ""
                        }`}
                        onClick={(e) => handleBulkActionClick(action, e)}
                      >
                        {action.icon &&
                          (typeof action.icon === "string" ? (
                            <Image
                              src={action.icon}
                              alt=""
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
                    <button
                      type="button"
                      className={styles.clearSelectionButton}
                      onClick={handleClearSelection}
                      aria-label={labels.clearSelection}
                      title={labels.clearSelection}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={styles.bulkActionsWrapper}
                    ref={bulkActionsRef}
                  >
                    <button
                      type="button"
                      className={styles.moreButton}
                      onClick={handleBulkActionsClick}
                      title="إجراءات جماعية"
                      aria-haspopup="menu"
                      aria-expanded={bulkActionsDropdownOpen}
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
                        role="menu"
                      >
                        {bulkActions.map((action, index) => (
                          <button
                            type="button"
                            key={`bulk-${action.text || index}`}
                            className={styles.dropdownItem}
                            onClick={(e) => handleBulkActionClick(action, e)}
                            role="menuitem"
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
                ))}
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
                        selectedRows.length === filteredData.length && filteredData.length > 0
                      }
                      aria-label={t("selectAll", "تحديد الكل")}
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
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={totalColumnCount || 1} className={styles.emptyCell}>
                    {labels.noData}
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr
                    key={row.id || row._id}
                    onClick={(e) => handleRowClick(row, e)}
                    onMouseEnter={() => onRowHover?.(row)}
                    className={onRowClick ? styles.clickableRow : ""}
                  >
                    {showCheckboxes && (
                      <td>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedRows.includes(row.id || row._id)}
                          onChange={() => handleSelectRow(row.id || row._id)}
                          aria-label={`تحديد ${row.title || row.subject || row.id || ""}`}
                        />
                      </td>
                    )}
                    {(headerKeys || Object.keys(row).filter((key) => key !== "id" && key !== "_id")).map((key) => (
                      <td key={`${row.id || row._id}-cell-${key}`}>
                        {renderCell ? renderCell(key, row[key], row) : (row[key] ?? "-")}
                      </td>
                    ))}
                    {(getRowActions || (actions && actions.length > 0)) && (
                      <td className={styles.actionsCell}>{renderActions(row)}</td>
                    )}
                  </tr>
                ))
              )}
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
