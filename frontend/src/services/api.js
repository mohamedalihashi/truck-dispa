import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api";

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
    const message = error.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
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
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload),
  listUsers: (params = {}) => apiClient.get("/users", { params }),
  createUser: (payload) => apiClient.post("/users", payload),
  updateUser: (id, payload) => apiClient.patch(`/users/${id}`, payload),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
  createCargoRequest: (payload) => apiClient.post("/cargo-requests", payload),
  updateCargoRequest: (id, payload) => apiClient.patch(`/cargo-requests/${id}`, payload),
  listCargoRequests: (params = {}) => apiClient.get("/cargo-requests", { params }),
  assignCargoRequest: (id, payload) => apiClient.patch(`/cargo-requests/${id}/assign`, payload),
  cancelCargoRequest: (id) => apiClient.delete(`/cargo-requests/${id}`),
  listTrips: (params = {}) => apiClient.get("/trips", { params }),
  updateTripStatus: (id, status) => apiClient.patch(`/trips/${id}/status`, { status }),
  acceptTrip: (id) => apiClient.post(`/trips/${id}/accept`),
  rejectTrip: (id) => apiClient.post(`/trips/${id}/reject`),
  updateTripLocation: (id, payload) => apiClient.patch(`/trips/${id}/location`, payload),
  uploadProof: (id, formData) =>
    apiClient.post(`/trips/${id}/proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  listTrucks: (params = {}) => apiClient.get("/trucks", { params }),
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
  listPayments: () => apiClient.get("/admin/payments"),
  createPayment: (payload) => apiClient.post("/admin/payments", payload),
  updatePayment: (id, status) => apiClient.patch(`/admin/payments/${id}`, { status }),
  deletePayment: (id) => apiClient.delete(`/admin/payments/${id}`),
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
