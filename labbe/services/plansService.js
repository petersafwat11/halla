/**
 * Plans Service
 * Handles fetching subscription plans and pricing from backend
 */

import api from "./apiClient";

/**
 * Get WhiteLabel/Enterprise plans
 * @returns {Promise<Object>} Plans data with customBranding and info
 */
export const getEnterprisePlans = async () => {
  try {
    const response = await api.get("/plans/enterprise");
    return response.data;
  } catch (error) {
    console.error("Error fetching enterprise plans:", error);
    throw error;
  }
};

/**
 * Get Host plans (trial, lite, single event)
 * @returns {Promise<Object>} Host plans data
 */
export const getHostPlans = async () => {
  try {
    const response = await api.get("/plans/host");
    return response.data;
  } catch (error) {
    console.error("Error fetching host plans:", error);
    throw error;
  }
};

/**
 * Get all plans (for admin dashboard)
 * @returns {Promise<Array>} All plans
 */
export const getAllPlans = async () => {
  try {
    const response = await api.get("/plans");
    return response.data || response;
  } catch (error) {
    console.error("Error fetching all plans:", error);
    throw error;
  }
};

const plansService = {
  getEnterprisePlans,
  getHostPlans,
  getAllPlans,
};

export default plansService;
