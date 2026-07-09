import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Download,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Route,
  Search,
  Settings,
  Truck,
  User,
  Users,
  X
} from "lucide-react";
import { useState } from "react";
import { IosInstallGuide } from "../components/IosInstallGuide";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useRealtimeInvalidation } from "../hooks/useApi";
import { navForRole, roleHome } from "../utils/helpers";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ThemeToggle";

const icons = {
  dashboard: LayoutDashboard,
  route: Route,
  bell: Bell,
  users: Users,
  truck: Truck,
  chart: BarChart3,
  settings: Settings,
  file: FileText,
  map: MapPin,
  plus: Plus,
  package: Package
};

const roleTitles = {
  admin: "System Administrator",
  dispatcher: "Senior Dispatcher",
  customer: "Fleet Manager",
  driver: "Driver Account"
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { standalone, showIosGuide, showAndroidInstall, install } = usePwaInstall();
  useRealtimeInvalidation();

  const items = navForRole(user.role);
  const base = roleHome(user.role);
  const brand =
    user.role === "admin" ? "Logistics Core" : "TruckDispatch";

  function signOut() {
    logout();
    navigate("/login");
  }

  function primaryAction() {
    if (user.role === "customer") navigate(`${base}/book`);
    else if (user.role === "dispatcher") navigate(`${base}/requests`);
    else if (user.role === "driver") navigate(`${base}/jobs`);
    else navigate(`${base}/users`);
  }

  async function onInstallApp() {
    if (showIosGuide) {
      setInstallGuideOpen(true);
      return;
    }
    if (showAndroidInstall) await install();
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-outline-variant/30 bg-primary-container p-5 text-white shadow-md transition lg:w-[260px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="mb-8 flex items-start justify-between">
          <button type="button" onClick={() => navigate(base)} className="text-left">
            <h1 className="text-xl font-bold text-secondary-container">{brand}</h1>
            <p className="mt-1 text-xs text-on-primary-container">{roleTitles[user.role]}</p>
          </button>
          <button type="button" className="rounded-lg p-1 lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = icons[item.icon] || LayoutDashboard;
            const to = item.to ? `${base}/${item.to}` : base;
            return (
              <NavLink
                key={to}
                to={to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "scale-[0.98] border-l-4 border-secondary-fixed-dim bg-secondary-container text-on-secondary"
                      : "text-on-primary-container hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          {!standalone ? (
            <button
              type="button"
              onClick={onInstallApp}
              className="mb-3 flex w-full items-center gap-3 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-on-primary-container hover:bg-white/5"
            >
              <Download size={18} />
              {showIosGuide ? "Ku rakib App-ka" : "Install App"}
            </button>
          ) : null}
          <Button className="mb-4 w-full" onClick={primaryAction}>
            <Plus size={16} />
            {user.role === "dispatcher" ? "New Assignment" : user.role === "customer" ? "Book a Truck" : "New Dispatch"}
          </Button>
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-on-primary-container">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            {connected ? "Realtime connected" : "Reconnecting…"}
          </div>
          <button
            type="button"
            onClick={() => navigate(`${base}/profile`)}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-on-primary-container hover:bg-white/5 hover:text-white"
          >
            <User size={18} /> Profile
          </button>
          <button
            type="button"
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-on-primary-container hover:bg-white/5 hover:text-white"
          >
            <HelpCircle size={18} /> Support
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-on-primary-container hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <header className="fixed right-0 top-0 z-30 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 pt-[env(safe-area-inset-top)] shadow-sm lg:left-[260px] lg:w-[calc(100%-260px)]">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-lg p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-on-surface-variant lg:hidden">Menu</span>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 rounded-full border border-outline-variant bg-surface-container-low py-1.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-secondary-container/40"
              placeholder="Search shipments, trucks, drivers..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!standalone ? (
            <button
              type="button"
              onClick={onInstallApp}
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low lg:hidden"
              aria-label="Install app"
            >
              <Download size={18} />
            </button>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate(`${base}/notifications`)}
            className="relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
          >
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-secondary-container" />
          </button>
          <div className="hidden h-8 w-px bg-outline-variant sm:block" />
          <button
            type="button"
            onClick={() => navigate(`${base}/profile`)}
            className="flex items-center gap-3 pl-1"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-on-surface">{user.name}</p>
              <p className="text-xs text-on-surface-variant">{roleTitles[user.role]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-secondary-container bg-primary-container text-sm font-bold text-white">
              {user.name?.charAt(0) || "U"}
            </div>
          </button>
        </div>
      </header>

      <main className="min-h-screen px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[calc(6rem+env(safe-area-inset-top))] lg:ml-[260px] lg:px-6 lg:pt-24">
        <div className="mx-auto max-w-[1400px]">
          <Outlet context={{ search }} />
        </div>
      </main>

      <IosInstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
    </div>
  );
}
