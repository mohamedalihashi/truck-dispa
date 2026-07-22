import axios from "axios";
import { getApiBaseUrl } from "../config/api.js";

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("td_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const status = error.response?.status;
    let message = data?.message;

    if (!message) {
      if (!error.response) {
        const code = error.code || error.cause?.code;
        if (code === "ECONNRESET" || code === "ECONNREFUSED" || error.message?.includes("Network Error")) {
          message = "Server is restarting. Wait a few seconds and try again.";
        } else {
          message = "Cannot reach the server. Start the app with npm run dev and try again.";
        }
      } else if (status === 503) {
        message = data?.message || "Database is busy. Please wait a moment and try again.";
      } else if (status === 502 || status === 504) {
        message = "Server is restarting. Wait a few seconds and try again.";
      } else if (status === 500) {
        // Vite proxy often returns bare 500 HTML when the backend restarts mid-request
        const looksLikeProxyDrop =
          typeof data !== "object" || data === null || !data.message;
        message = looksLikeProxyDrop
          ? "Server is restarting. Wait a few seconds and try again."
          : data.message;
      } else {
        message = error.message || "Request failed";
      }
    }

    const err = new Error(message);
    if (data?.details) err.details = data.details;
    return Promise.reject(err);
  }
);

export const api = {
  health: () => apiClient.get("/health"),
  register: (payload) => apiClient.post("/auth/register", payload),
  verifyRegister: (payload) => apiClient.post("/auth/register/verify", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  verifyLogin: (payload) => apiClient.post("/auth/login/verify", payload),
  resendCode: (payload) => apiClient.post("/auth/resend-code", payload),
  changePassword: (payload) => apiClient.post("/auth/change-password", payload),
  me: () => apiClient.get("/auth/me"),
  updateProfile: (payload) => apiClient.patch("/auth/me", payload),
  uploadAvatar: (formData) =>
    apiClient.post("/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload),
  listUsers: (params = {}) => apiClient.get("/users", { params }),
  userSummary: () => apiClient.get("/users/summary"),
  createUser: (payload) => {
    if (payload instanceof FormData) {
      return apiClient.post("/users", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }
    return apiClient.post("/users", payload);
  },
  updateUser: (id, payload) => apiClient.patch(`/users/${id}`, payload),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
  verifyDriver: (id) => apiClient.post(`/users/${id}/verify-driver`),
  createCargoRequest: (payload) => apiClient.post("/cargo-requests", payload),
  updateCargoRequest: (id, payload) => apiClient.patch(`/cargo-requests/${id}`, payload),
  listCargoRequests: (params = {}) => apiClient.get("/cargo-requests", { params }),
  cargoRequestSummary: () => apiClient.get("/cargo-requests/summary"),
  assignCargoRequest: (id, payload) => apiClient.patch(`/cargo-requests/${id}/assign`, payload),
  submitCargoQuote: (id, payload) => apiClient.patch(`/cargo-requests/${id}/quote`, payload),
  acceptCargoQuote: (id) => apiClient.post(`/cargo-requests/${id}/quote/accept`),
  rejectCargoQuote: (id, payload) => apiClient.post(`/cargo-requests/${id}/quote/reject`, payload),
  cancelCargoRequest: (id) => apiClient.delete(`/cargo-requests/${id}`),
  listTrips: (params = {}) => apiClient.get("/trips", { params }),
  tripSummary: () => apiClient.get("/trips/summary"),
  listTripFeedback: (params = {}) => apiClient.get("/trips/feedback", { params }),
  updateTripStatus: (id, status) => apiClient.patch(`/trips/${id}/status`, { status }),
  acceptTrip: (id) => apiClient.post(`/trips/${id}/accept`),
  rejectTrip: (id) => apiClient.post(`/trips/${id}/reject`),
  updateTripLocation: (id, payload) => apiClient.patch(`/trips/${id}/location`, payload),
  getTripLocations: (id) => apiClient.get(`/trips/${id}/locations`),
  uploadProof: (id, formData) =>
    apiClient.post(`/trips/${id}/proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  submitTripFeedback: (id, payload) => apiClient.post(`/trips/${id}/feedback`, payload),
  listTrucks: (params = {}) => apiClient.get("/trucks", { params }),
  truckSummary: () => apiClient.get("/trucks/summary"),
  createTruck: (payload) => apiClient.post("/trucks", payload),
  listTruckTypes: () => apiClient.get("/trucks/types"),
  updateTruck: (id, payload) => apiClient.patch(`/trucks/${id}`, payload),
  deleteTruck: (id) => apiClient.delete(`/trucks/${id}`),
  listNotifications: () => apiClient.get("/notifications"),
  markNotificationRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  dashboardReport: () => apiClient.get("/reports/dashboard"),
  revenueReport: (period = "monthly") => apiClient.get("/reports/revenue", { params: { period } }),
  performanceReport: () => apiClient.get("/reports/performance"),
  shipmentsReport: () => apiClient.get("/reports/shipments"),
  listPayments: (params = {}) => apiClient.get("/admin/payments", { params }),
  createPayment: (payload) => apiClient.post("/admin/payments", payload),
  updatePayment: (id, payload) => apiClient.patch(`/admin/payments/${id}`, payload),
  updateCustomerPayment: (id, payload) => apiClient.patch(`/payments/${id}`, payload),
  deletePayment: (id) => apiClient.delete(`/admin/payments/${id}`),
  getWaafiConfig: () => apiClient.get("/payments/waafi/config"),
  payWithWaafi: (payload) => apiClient.post("/payments/waafi/purchase", payload),
  getEarnings: (params) => apiClient.get("/earnings", { params }),
  getMyEarnings: (params) => apiClient.get("/earnings/me", { params }),
  getEarningsSummary: () => apiClient.get("/earnings/summary"),
  getCommission: () => apiClient.get("/earnings/commission"),
  payoutEarning: (id, payload) => apiClient.post(`/earnings/${id}/payout`, payload),
  payoutUserEarnings: (userId, payload) => apiClient.post(`/earnings/user/${userId}/payout-all`, payload),
  getSettings: () => apiClient.get("/admin/settings"),
  updateSettings: (key, value) => apiClient.put(`/admin/settings/${key}`, value),
  listAuditLogs: () => apiClient.get("/admin/audit-logs")
};

export function saveSession({ token, user }) {
  localStorage.setItem("td_token", token);
  localStorage.setItem("td_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("td_token");
  localStorage.removeItem("td_user");
}

export function loadSession() {
  const token = localStorage.getItem("td_token");
  const raw = localStorage.getItem("td_user");
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    return null;
  }
}
