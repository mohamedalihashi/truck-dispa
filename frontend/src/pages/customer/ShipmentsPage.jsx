import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useCargoRequests, useTrips, useUpdateCargo } from "../../hooks/useApi";
import { api } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";

export function ShipmentsPage() {
  const location = useLocation();
  const { data: trips } = useTrips();
  const { data: requests } = useCargoRequests();
  const updateCargo = useUpdateCargo();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  function openEdit(row) {
    setEditing(row);
    setError("");
    reset({
      pickup: row.pickup,
      destination: row.destination,
      truckType: row.truckType,
      weight: row.weight,
      description: row.description,
      sender: row.sender || "",
      receiver: row.receiver || "",
      specialInstructions: row.specialInstructions || ""
    });
  }

  async function onUpdate(values) {
    setError("");
    try {
      await updateCargo.mutateAsync({ id: editing.id, payload: values });
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelRequest(id) {
    await api.cancelCargoRequest(id);
    qc.invalidateQueries({ queryKey: ["cargo-requests"] });
  }

  async function confirmDelivery(id) {
    await api.updateTripStatus(id, "Delivered");
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Shipments" subtitle="Track active loads and review shipment history." />
      {location.state?.created && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Cargo request {location.state.created} created successfully.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Trips</h2>
        </div>
        <DataTable
          rows={trips?.data || []}
          columns={[
            { key: "id", label: "Trip" },
            {
              key: "route",
              label: "Route",
              render: (row) => `${row.pickup} → ${row.destination}`
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status} />
            },
            { key: "driver", label: "Driver" },
            {
              key: "actions",
              label: "",
              render: (row) =>
                row.status === "In Transit" || row.status === "Loaded" ? (
                  <Button className="px-3 py-1.5 text-xs" onClick={() => confirmDelivery(row.id)}>
                    Confirm delivery
                  </Button>
                ) : null
            }
          ]}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Cargo requests</h2>
        </div>
        <DataTable
          rows={requests?.data || []}
          columns={[
            { key: "id", label: "Request" },
            {
              key: "route",
              label: "Route",
              render: (row) => `${row.pickup} → ${row.destination}`
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex gap-2">
                  {row.status === "Pending" && (
                    <>
                      <button type="button" className="text-secondary-container" onClick={() => openEdit(row)}>
                        <Pencil size={16} />
                      </button>
                      <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => cancelRequest(row.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )
            }
          ]}
        />
      </section>

      {editing && (
        <Modal title={`Edit ${editing.id}`} onClose={() => setEditing(null)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onUpdate)}>
            <input className="stitch-input" placeholder="Pickup" {...register("pickup", { required: true })} />
            <input className="stitch-input" placeholder="Destination" {...register("destination", { required: true })} />
            <select className="stitch-input" {...register("truckType")}>
              <option>Box Truck</option>
              <option>Flatbed</option>
              <option>Refrigerated</option>
              <option>Tanker</option>
            </select>
            <input className="stitch-input" placeholder="Weight" {...register("weight", { required: true })} />
            <input className="stitch-input" placeholder="Sender" {...register("sender")} />
            <input className="stitch-input" placeholder="Receiver" {...register("receiver")} />
            <textarea className="stitch-input min-h-20 sm:col-span-2" placeholder="Description" {...register("description", { required: true })} />
            <textarea className="stitch-input min-h-16 sm:col-span-2" placeholder="Special instructions" {...register("specialInstructions")} />
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={isSubmitting || updateCargo.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
