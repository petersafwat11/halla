"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import { adminKeys } from "./keys";

export const useAdminDashboard = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.dashboard(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.dashboard.getAdminDashboard,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminHosts = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.hosts(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminHost = (hostId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.hostDetail(hostId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.getById(hostId),
      }),
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminBusinesses = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.businesses(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.businesses.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminBusiness = (businessId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.businessDetail(businessId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.businesses.getById(businessId),
      }),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useVerifyHostPhone = (phoneNumber, options = {}) => {
  return useQuery({
    queryKey: adminKeys.hostVerifyPhone(phoneNumber),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.hosts.verifyPhone,
        params: { phoneNumber },
      }),
    enabled: !!phoneNumber && phoneNumber.length >= 10,
    staleTime: 0,
    ...options,
  });
};

export const useAdminVendors = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.vendors(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.vendors.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminVendor = (vendorId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.vendorDetail(vendorId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.vendors.getById(vendorId),
      }),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminModerators = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.moderators(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.moderators.getAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminPlans = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.plans(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.plans.adminGetAll,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminPayments = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.payments(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.payments.getAll,
        params: filters,
      }),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useAdminPaymentDetail = (paymentId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.paymentDetail(paymentId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.payments.getById(paymentId),
      }),
    enabled: !!paymentId,
    staleTime: 30 * 1000,
    ...options,
  });
};

export const useAdminEvents = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: adminKeys.adminEventsList(filters),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getAllEvents,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminEvent = (eventId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.eventDetail(eventId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.events.getById(eventId),
      }),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminEventTargets = (type = "host", options = {}) => {
  return useQuery({
    queryKey: adminKeys.eventTargets(type),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.events.eventTargets,
        params: { type },
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useAdminUserSubscriptionInfo = (userId, options = {}) => {
  return useQuery({
    queryKey: adminKeys.userSubscriptionInfo(userId),
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.admin.events.userSubscriptionInfo(userId),
      }),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};
