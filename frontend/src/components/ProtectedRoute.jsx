import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/helpers";

export function ProtectedRoute({ roles }) {
  const { isAuthenticated, booting, user } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-on-surface-variant">
        Loading workspace…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}
