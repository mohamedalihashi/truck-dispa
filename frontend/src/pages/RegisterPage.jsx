import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Truck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ThemeToggle";
import { roleHome } from "../utils/helpers";

export function RegisterPage() {
  const { register: registerUser, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      role: "customer",
      truckType: "Box Truck",
      capacity: "12 tons"
    }
  });
  const role = watch("role");

  if (isAuthenticated) return <Navigate to={roleHome(user.role)} replace />;

  async function onSubmit(values) {
    setError("");
    try {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        phone: values.phone || undefined
      };
      if (values.role === "driver") {
        payload.truck = {
          truckNumber: values.truckNumber,
          plateNumber: values.plateNumber,
          capacity: values.capacity,
          truckType: values.truckType
        };
      }
      const result = await registerUser(payload);
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
        <div className="absolute left-[-8%] top-10 h-[500px] w-[500px] rounded-full bg-secondary-container blur-[120px]" />
      </div>
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="text-white">
          <Link to="/" className="mb-8 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container shadow-xl">
              <Truck />
            </span>
            <span className="text-2xl font-bold">TruckDispatch</span>
          </Link>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">Join the cargo marketplace</h1>
          <p className="mt-4 max-w-md text-on-primary-container">
            Customers book loads, drivers register with one truck, and dispatchers coordinate the corridor in real time.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-on-primary-container">
            <li>• PostgreSQL-backed trips, payments, and notifications</li>
            <li>• Live tracking with Socket.io updates</li>
            <li>• Driver accounts require truck details at signup</li>
          </ul>
        </div>

        <div className="auth-card p-6 md:p-8">
          <h2 className="text-2xl font-bold text-primary">Create account</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Drivers must register with exactly one truck.</p>

          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Full name"><input className="stitch-input" {...register("name", { required: true })} /></Field>
            <Field label="Phone"><input className="stitch-input" {...register("phone")} /></Field>
            <Field label="Email" className="sm:col-span-2">
              <input className="stitch-input" type="email" {...register("email", { required: true })} />
            </Field>
            <Field label="Password">
              <input className="stitch-input" type="password" {...register("password", { required: true, minLength: 6 })} />
            </Field>
            <Field label="Role">
              <select className="stitch-input" {...register("role")}>
                <option value="customer">Customer</option>
                <option value="driver">Driver (+ Truck)</option>
                <option value="dispatcher">Dispatcher</option>
              </select>
            </Field>

            {role === "driver" && (
              <>
                <Field label="Truck number"><input className="stitch-input" {...register("truckNumber", { required: true })} /></Field>
                <Field label="Plate number"><input className="stitch-input" {...register("plateNumber", { required: true })} /></Field>
                <Field label="Capacity"><input className="stitch-input" {...register("capacity", { required: true })} /></Field>
                <Field label="Truck type">
                  <select className="stitch-input" {...register("truckType")}>
                    <option>Box Truck</option>
                    <option>Flatbed</option>
                    <option>Refrigerated</option>
                    <option>Tanker</option>
                  </select>
                </Field>
              </>
            )}

            {error && <p className="sm:col-span-2 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
            <div className="sm:col-span-2">
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Already registered?{" "}
            <Link className="font-semibold text-secondary-container" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
