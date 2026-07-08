import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Truck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, roleHome } from "../utils/helpers";

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: { email: "customer@truckdispatch.local", password: DEMO_PASSWORD }
  });

  if (isAuthenticated) return <Navigate to={roleHome(user.role)} replace />;

  async function onSubmit(values) {
    setError("");
    try {
      const result = await login(values);
      navigate(roleHome(result.user.role));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="text-white hover:bg-white/10" />
      </div>
      <div className="hero-gradient absolute inset-0" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute right-[-8%] top-10 h-[500px] w-[500px] rounded-full bg-secondary-container blur-[120px]" />
      </div>
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="text-white">
          <Link to="/" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container shadow-xl">
              <Truck />
            </span>
            <span className="text-2xl font-bold">TruckDispatch</span>
          </Link>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Sign in to the cargo marketplace
          </h1>
          <p className="mt-4 max-w-md text-on-primary-container">
            Navy command surfaces, orange CTAs, and live PostgreSQL-backed workflows — matching the Stitch Logistics Core system.
          </p>
        </div>

        <div className="auth-card p-6 md:p-8">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Email</span>
              <input className="stitch-input" type="email" {...register("email", { required: true })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Password</span>
              <input className="stitch-input" type="password" {...register("password", { required: true })} />
            </label>
            {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <span />
              <Link className="font-semibold text-secondary-container hover:underline" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-left text-sm hover:bg-surface-container"
                onClick={() => {
                  setValue("email", account.email);
                  setValue("password", DEMO_PASSWORD);
                }}
              >
                <strong className="block text-primary">{account.label}</strong>
                <span className="text-xs text-on-surface-variant">{account.email}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            New here?{" "}
            <Link className="font-semibold text-secondary-container hover:underline" to="/register">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
