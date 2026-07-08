import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Truck } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { api } from "../services/api";

export function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm();

  async function onSubmit(values) {
    setError("");
    setMessage("");
    try {
      const result = await api.forgotPassword(values.email);
      setMessage(result.message || "Reset instructions sent.");
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
      <div className="relative mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
        <div className="auth-card w-full p-6 md:p-8">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xl font-bold text-primary">
            <span className="rounded-lg bg-secondary-container p-2 text-white">
              <Truck size={18} />
            </span>
            TruckDispatch
          </Link>
          <h1 className="text-3xl font-bold text-primary">Reset password</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Enter your email and we&apos;ll queue a password reset for your account.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Email</span>
              <input className="stitch-input" type="email" {...register("email", { required: true })} />
            </label>
            {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
            {message && (
              <p className="rounded-lg bg-primary-fixed px-3 py-2 text-sm text-primary-container">{message}</p>
            )}
            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Remembered it?{" "}
            <Link className="font-semibold text-secondary-container hover:underline" to="/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
