import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { InstallPwaBanner } from "./components/InstallPwaBanner";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersPage } from "./pages/admin/UsersPage";
import { TrucksPage } from "./pages/admin/TrucksPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { DispatcherDashboard } from "./pages/dispatcher/DispatcherDashboard";
import { RequestsPage } from "./pages/shared/RequestsPage";
import { CustomerDashboard } from "./pages/customer/CustomerDashboard";
import { BookTruckPage } from "./pages/customer/BookTruckPage";
import { ShipmentsPage } from "./pages/customer/ShipmentsPage";
import { DriverDashboard } from "./pages/driver/DriverDashboard";
import { DriverJobsPage } from "./pages/driver/DriverJobsPage";
import { DriverTruckPage } from "./pages/driver/DriverTruckPage";
import { TripsPage } from "./pages/shared/TripsPage";
import { NotificationsPage } from "./pages/shared/NotificationsPage";
import { TrackingPage } from "./pages/shared/TrackingPage";
import { PaymentsPage } from "./pages/shared/PaymentsPage";
import { ProfilePage } from "./pages/shared/ProfilePage";
import { useAuth } from "./contexts/AuthContext";
import { roleHome } from "./utils/helpers";

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) return <Navigate to={roleHome(user.role)} replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <>
      <PwaUpdatePrompt />
      <InstallPwaBanner />
      <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="trucks" element={<TrucksPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["dispatcher"]} />}>
        <Route path="/dispatcher" element={<DashboardLayout />}>
          <Route index element={<DispatcherDashboard />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trucks" element={<TrucksPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["customer"]} />}>
        <Route path="/customer" element={<DashboardLayout />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="book" element={<BookTruckPage />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="trips" element={<ShipmentsPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["driver"]} />}>
        <Route path="/driver" element={<DashboardLayout />}>
          <Route index element={<DriverDashboard />} />
          <Route path="jobs" element={<DriverJobsPage />} />
          <Route path="trips" element={<DriverJobsPage />} />
          <Route path="truck" element={<DriverTruckPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
