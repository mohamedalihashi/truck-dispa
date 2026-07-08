import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, Truck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useCreateCargo } from "../../hooks/useApi";

export function BookTruckPage() {
  const create = useCreateCargo();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      pickup: "Chicago",
      destination: "New York",
      truckType: "Box Truck",
      weight: "2.0 tons",
      description: "General cargo"
    }
  });

  const values = watch();

  async function onSubmit(formValues) {
    setError("");
    try {
      const request = await create.mutateAsync(formValues);
      navigate("/customer/shipments", { state: { created: request.id } });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Book a Truck" subtitle="Create a cargo request for pickup and delivery." />

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] sm:grid-cols-2 lg:col-span-8"
        >
          <Field label="Pickup">
            <input className="stitch-input" {...register("pickup", { required: true })} />
          </Field>
          <Field label="Destination">
            <input className="stitch-input" {...register("destination", { required: true })} />
          </Field>
          <Field label="Truck type">
            <select className="stitch-input" {...register("truckType")}>
              <option>Box Truck</option>
              <option>Flatbed</option>
              <option>Refrigerated</option>
              <option>Tanker</option>
            </select>
          </Field>
          <Field label="Cargo weight">
            <input className="stitch-input" {...register("weight", { required: true })} />
          </Field>
          <Field label="Sender">
            <input className="stitch-input" {...register("sender")} />
          </Field>
          <Field label="Receiver">
            <input className="stitch-input" {...register("receiver")} />
          </Field>
          <Field label="Cargo description" className="sm:col-span-2">
            <textarea className="stitch-input min-h-24" {...register("description", { required: true })} />
          </Field>
          <Field label="Special instructions" className="sm:col-span-2">
            <textarea className="stitch-input min-h-20" {...register("specialInstructions")} />
          </Field>
          {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button disabled={isSubmitting || create.isPending}>
              {create.isPending ? "Submitting…" : "Submit cargo request"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-outline-variant bg-primary-container p-6 text-white shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-medium uppercase tracking-wider text-on-primary-container">Route preview</p>
            <h3 className="mt-2 text-2xl font-bold">
              {values.pickup || "Pickup"} → {values.destination || "Destination"}
            </h3>
            <div className="mt-6 space-y-3 text-sm text-on-primary-container">
              <p className="flex items-center gap-2">
                <Truck size={16} className="text-secondary-fixed" /> {values.truckType}
              </p>
              <p className="flex items-center gap-2">
                <Package size={16} className="text-secondary-fixed" /> {values.weight}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-secondary-fixed" /> Marketplace dispatch
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <h4 className="text-sm font-semibold text-primary-container">What happens next</h4>
            <ol className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li>1. Request enters Pending queue</li>
              <li>2. Dispatcher assigns a truck + driver</li>
              <li>3. Driver accepts and moves status live</li>
            </ol>
          </div>
        </aside>
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
