import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useCancelCargo, useCargoRequests, useTrips, useUpdateCargo } from "../../hooks/useApi";
import { api } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";
import { CANCELABLE_REQUEST_STATUSES } from "../../utils/helpers";

export function ShipmentsPage() {
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState("");
  const [viewingRequest, setViewingRequest] = useState(null);
  const [viewingTrip, setViewingTrip] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const { data: trips, isLoading: tripsLoading } = useTrips();
  const { data: requests, isLoading: requestsLoading } = useCargoRequests({
    status: statusFilter || undefined
  });
  const updateCargo = useUpdateCargo();
  const cancelCargo = useCancelCargo();
  const qc = useQueryClient();

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
    if (!confirm("Cancel this cargo request?")) return;
    try {
      await cancelCargo.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function confirmDelivery(id) {
    if (!confirm("Confirm that this shipment was delivered?")) return;
    try {
      await api.updateTripStatus(id, "Delivered");
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["cargo-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Shipments"
        subtitle="Create, view, edit, and cancel your cargo requests and trips."
        actions={
          <Link to="/customer/book">
            <Button>
              <Plus size={16} /> Book truck
            </Button>
          </Link>
        }
      />

      {location.state?.created && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Cargo request {location.state.created} created successfully.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Cargo requests</h2>
          <select
            className="stitch-input max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {["Pending", "Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delivered", "Cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {requestsLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading requests…</p>
        ) : (
          <DataTable
            rows={requests?.data || []}
            empty="No cargo requests yet. Book a truck to get started."
            columns={[
              { key: "id", label: "Request" },
              {
                key: "route",
                label: "Route",
                render: (row) => `${row.pickup} → ${row.destination}`
              },
              { key: "truckType", label: "Type" },
              { key: "weight", label: "Weight" },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="p-1 text-on-surface-variant" onClick={() => setViewingRequest(row)} title="View">
                      <Eye size={16} />
                    </button>
                    {row.status === "Pending" && (
                      <button type="button" className="p-1 text-secondary-container" onClick={() => openEdit(row)} title="Edit">
                        <Pencil size={16} />
                      </button>
                    )}
                    {CANCELABLE_REQUEST_STATUSES.includes(row.status) && (
                      <button type="button" className="p-1 text-error" onClick={() => cancelRequest(row.id)} title="Cancel">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Trips</h2>
        </div>
        {tripsLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading trips…</p>
        ) : (
          <DataTable
            rows={trips?.data || []}
            empty="No trips yet."
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
              { key: "truck", label: "Truck" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="p-1 text-on-surface-variant" onClick={() => setViewingTrip(row)} title="View">
                      <Eye size={16} />
                    </button>
                    {["In Transit", "Loaded"].includes(row.status) && (
                      <>
                        <Link to="/customer/tracking" className="text-xs font-semibold text-secondary-container hover:underline">
                          Track
                        </Link>
                        <Button className="px-2 py-1 text-xs" onClick={() => confirmDelivery(row.id)}>
                          Confirm delivery
                        </Button>
                      </>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {viewingRequest && (
        <Modal title={`Request ${viewingRequest.id}`} onClose={() => setViewingRequest(null)} wide>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Route" value={`${viewingRequest.pickup} → ${viewingRequest.destination}`} className="sm:col-span-2" />
            <Detail label="Status" value={<StatusBadge status={viewingRequest.status} />} />
            <Detail label="Truck type" value={viewingRequest.truckType} />
            <Detail label="Weight" value={viewingRequest.weight} />
            <Detail label="Driver" value={viewingRequest.driver || "—"} />
            <Detail label="Truck" value={viewingRequest.truck || "—"} />
            <Detail label="Description" value={viewingRequest.description} className="sm:col-span-2" />
            <Detail label="Sender" value={viewingRequest.sender || "—"} />
            <Detail label="Receiver" value={viewingRequest.receiver || "—"} />
            <Detail label="Instructions" value={viewingRequest.specialInstructions || "—"} className="sm:col-span-2" />
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            {viewingRequest.status === "Pending" && (
              <Button onClick={() => { setViewingRequest(null); openEdit(viewingRequest); }}>Edit</Button>
            )}
            <Button variant="secondary" onClick={() => setViewingRequest(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {viewingTrip && (
        <Modal title={`Trip ${viewingTrip.id}`} onClose={() => setViewingTrip(null)} wide>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Route" value={`${viewingTrip.pickup} → ${viewingTrip.destination}`} className="sm:col-span-2" />
            <Detail label="Status" value={<StatusBadge status={viewingTrip.status} />} />
            <Detail label="Driver" value={viewingTrip.driver || "—"} />
            <Detail label="Truck" value={viewingTrip.truck || "—"} />
            <Detail label="Distance" value={viewingTrip.distance || "—"} />
            <Detail label="ETA" value={viewingTrip.estimatedTime || "—"} />
            <Detail label="Fare" value={viewingTrip.fare != null ? `$${Number(viewingTrip.fare).toLocaleString()}` : "—"} />
            <Detail
              label="Last location"
              value={
                viewingTrip.lastLocation
                  ? `${Number(viewingTrip.lastLocation.lat).toFixed(4)}, ${Number(viewingTrip.lastLocation.lng).toFixed(4)}`
                  : "—"
              }
              className="sm:col-span-2"
            />
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            {["In Transit", "Loaded", "Accepted", "Assigned"].includes(viewingTrip.status) && (
              <Link to="/customer/tracking">
                <Button>Live tracking</Button>
              </Link>
            )}
            <Button variant="secondary" onClick={() => setViewingTrip(null)}>Close</Button>
          </div>
        </Modal>
      )}

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
            {error && <p className="sm:col-span-2 text-sm text-error">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={isSubmitting || updateCargo.isPending}>Save changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="mt-1 font-semibold text-on-surface">{value}</dd>
    </div>
  );
}
