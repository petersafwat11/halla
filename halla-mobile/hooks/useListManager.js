import { useState, useCallback } from "react";
import EventsService from "../services/EventsService";

/**
 * Custom hook for managing guest/moderator lists
 * Provides unified interface for add, edit, remove, and import operations
 *
 * @param {Array} initialList - Initial list data
 * @param {Function} onUpdate - Callback when list is updated
 * @param {string} type - Type of list ('guest' or 'moderator')
 * @returns {Object} - List management functions and state
 */
export const useListManager = (initialList = [], onUpdate, type = "guest") => {
  const [currentItem, setCurrentItem] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Reset current item
  const resetCurrentItem = useCallback(() => {
    setCurrentItem({ name: "", phone: "" });
    setErrors({});
    setShowErrors(false);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((field, value) => {
    setCurrentItem((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setShowErrors(false);
  }, []);

  // Add item
  const handleAdd = useCallback(() => {
    const result = EventsService.addListItem(currentItem, initialList, type);

    if (result.success) {
      onUpdate(result.list);
      resetCurrentItem();
      return { success: true };
    }

    setErrors(result.errors);
    setShowErrors(true);
    return { success: false, errors: result.errors };
  }, [currentItem, initialList, type, onUpdate, resetCurrentItem]);

  // Edit item
  const handleEdit = useCallback(
    (id) => {
      const result = EventsService.editListItem(
        id,
        currentItem,
        initialList,
        type
      );

      if (result.success) {
        onUpdate(result.list);
        resetCurrentItem();
        return { success: true };
      }

      setErrors(result.errors);
      setShowErrors(true);
      return { success: false, errors: result.errors };
    },
    [currentItem, initialList, type, onUpdate, resetCurrentItem]
  );

  // Remove item
  const handleRemove = useCallback(
    (id) => {
      const updatedList = EventsService.removeListItem(id, initialList);
      onUpdate(updatedList);

      // Reset current item if it was the one being edited
      if (currentItem.id === id) {
        resetCurrentItem();
      }
    },
    [initialList, currentItem.id, onUpdate, resetCurrentItem]
  );

  // Bulk remove items
  const handleBulkRemove = useCallback(
    (ids) => {
      const updatedList = EventsService.bulkRemoveListItems(ids, initialList);
      onUpdate(updatedList);

      // Reset current item if it was in the deleted list
      if (ids.includes(currentItem.id)) {
        resetCurrentItem();
      }
    },
    [initialList, currentItem.id, onUpdate, resetCurrentItem]
  );

  // Load item for editing
  const handleEditClick = useCallback(
    (id) => {
      const item = initialList.find((item) => item.id === id);
      if (item) {
        setCurrentItem({
          name: item.name || "",
          phone: item.phone || "",
          id: item.id,
        });
        setErrors({});
        setShowErrors(false);
      }
    },
    [initialList]
  );

  // Import from CSV
  const handleImport = useCallback(
    async (importedData) => {
      setIsImporting(true);
      setImportErrors([]);

      try {
        const result = EventsService.processImportedCSV(
          importedData,
          initialList,
          type
        );

        if (result.validData.length > 0) {
          onUpdate([...initialList, ...result.validData]);
        }

        const allErrors = [...result.errors, ...result.duplicates];
        if (allErrors.length > 0) {
          setImportErrors(allErrors);
        }

        return {
          success: result.validData.length > 0,
          validCount: result.validData.length,
          errorCount: allErrors.length,
          errors: allErrors,
        };
      } catch (error) {
        console.error("Import error:", error);
        setImportErrors([{ row: 0, errors: [error.message] }]);
        return {
          success: false,
          validCount: 0,
          errorCount: 1,
          errors: [{ row: 0, errors: [error.message] }],
        };
      } finally {
        setIsImporting(false);
      }
    },
    [initialList, type, onUpdate]
  );

  // Export template
  const handleExportTemplate = useCallback(() => {
    return EventsService.generateCSVTemplate(type);
  }, [type]);

  // Clear import errors
  const clearImportErrors = useCallback(() => {
    setImportErrors([]);
  }, []);

  const isEditing = currentItem.id !== undefined;

  return {
    // State
    currentItem,
    errors,
    showErrors,
    importErrors,
    isImporting,
    isEditing,

    // Actions
    handleAdd,
    handleEdit,
    handleRemove,
    handleBulkRemove,
    handleEditClick,
    handleImport,
    handleExportTemplate,
    handleInputChange,
    resetCurrentItem,
    clearImportErrors,
  };
};

export default useListManager;
