import { toast, Id as ToastId } from "react-toastify";

export const toastUtils = {
  // Success toasts
  createSuccess: (itemType) => {
    toast.success(`${itemType} created successfully!`);
  },

  updateSuccess: (itemType) => {
    toast.success(`${itemType} updated successfully!`);
  },

  deleteSuccess: (itemType) => {
    toast.success(`${itemType} deleted successfully!`);
  },

  // Error toasts
  createError: (itemType, error) => {
    toast.error(error || `Failed to create ${itemType}. Please try again.`);
  },

  updateError: (itemType, error) => {
    toast.error(error || `Failed to update ${itemType}. Please try again.`);
  },

  deleteError: (itemType, error) => {
    toast.error(error || `Failed to delete ${itemType}. Please try again.`);
  },

  // Generic toasts
  success: (message) => {
    toast.success(message);
  },

  error: (message) => {
    toast.error(message);
  },

  info: (message) => {
    toast.info(message);
  },

  warning: (message) => {
    toast.warning(message);
  },


  // Update loading toast
};
