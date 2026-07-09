import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  Truck,
  UserPlus,
  X
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { IosInstallGuide } from "./IosInstallGuide";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { roleHome } from "../utils/helpers";

const LANDING_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#process", label: "How it Works" },
  { href: "#testimonials", label: "Clients" }
];

export function PublicSiteHeader({ variant = "landing", className = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { standalone, showIosGuide, showAndroidInstall, install } = usePwaInstall();

  function closeMenu() {
    setMenuOpen(false);
  }

  function goAnchor(href) {
    closeMenu();
    if (variant === "landing") {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate(`/${href}`);
  }

  async function onInstallClick() {
    closeMenu();
    if (showIosGuide) {
      setInstallGuideOpen(true);
      return;
    }
    if (showAndroidInstall) await install();
  }

  const showInstallItem = !standalone;

  return (
    <>
      <header
        className={`glass-effect fixed inset-x-0 top-0 z-50 h-16 border-b border-outline-variant/20 px-4 pt-[env(safe-area-inset-top)] sm:h-20 sm:px-6 md:px-12 ${className}`}
      >
        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="rounded-lg bg-secondary-container p-2 text-white">
              <Truck size={22} />
            </div>
            <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">TruckDispatch</span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {variant === "landing"
              ? LANDING_LINKS.map((link) => (
                  <a
                    key={link.href}
                    className="text-sm font-semibold text-on-surface-variant hover:text-secondary"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ))
              : null}
            <div className="h-6 w-px bg-outline-variant" />
            <ThemeToggle />
            <div className="h-6 w-px bg-outline-variant" />
            {showInstallItem ? (
              <button
                type="button"
                onClick={onInstallClick}
                className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-secondary"
              >
                <Download size={16} />
                Install
              </button>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate(roleHome(user.role))}
                className="rounded-lg bg-secondary-container px-6 py-2.5 text-sm font-semibold text-on-secondary shadow-md"
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <Link className="text-sm font-semibold text-primary hover:text-secondary-container" to="/login">
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-secondary-container px-6 py-2.5 text-sm font-semibold text-on-secondary shadow-md transition hover:shadow-lg active:scale-95"
                >
                  Book a Truck
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg border border-outline-variant p-2.5 text-on-surface"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          onClick={closeMenu}
          aria-label="Close menu overlay"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-[min(100%,300px)] flex-col border-l border-outline-variant/30 bg-surface-container-lowest p-5 shadow-2xl transition duration-300 lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">Menu</p>
          <button type="button" className="rounded-lg p-1.5 hover:bg-surface-container" onClick={closeMenu}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {variant === "landing"
            ? LANDING_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => goAnchor(link.href)}
                  className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-on-surface hover:bg-surface-container"
                >
                  {link.label}
                </button>
              ))
            : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/");
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-on-surface hover:bg-surface-container"
              >
                <Home size={18} />
                Home
              </button>
            )}

          <div className="my-3 h-px bg-outline-variant/40" />

          {showInstallItem ? (
            <button
              type="button"
              onClick={onInstallClick}
              className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-3 text-left text-sm font-semibold text-primary"
            >
              <Download size={18} />
              {showIosGuide ? "Ku rakib App-ka (iOS)" : "Install App"}
            </button>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigate(roleHome(user.role));
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-on-surface hover:bg-surface-container"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
              >
                <LogIn size={18} />
                Log In
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg bg-secondary-container px-3 py-3 text-sm font-semibold text-on-secondary"
              >
                <UserPlus size={18} />
                Book a Truck
              </Link>
            </>
          )}
        </nav>
      </aside>

      <IosInstallGuide open={installGuideOpen} onClose={() => setInstallGuideOpen(false)} />
    </>
  );
}
