import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  useAssignCargo,
  useCancelCargo,
  useCargoRequests,
  useCreateCargo,
  useCustomers,
  useTrucks,
  useUpdateCargo
} from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { CANCELABLE_REQUEST_STATUSES } from "../../utils/helpers";

export function RequestsPage() {
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [truckId, setTruckId] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();
  const showCreate = user.role === "admin" || user.role === "dispatcher";
  const { data, isLoading } = useCargoRequests({ status: status || undefined });
  const { data: trucks } = useTrucks();
  const { data: customers } = useCustomers({ enabled: showCreate });
  const assign = useAssignCargo();
  const cancel = useCancelCargo();
  const create = useCreateCargo();
  const update = useUpdateCargo();
  const fleet = trucks?.data || [];

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    formState: { isSubmitting: creatingForm }
  } = useForm({
    defaultValues: {
      pickup: "",
      destination: "",
      truckType: "Box Truck",
      weight: "1.0 tons",
      description: "",
      customerId: ""
    }
  });

  const {
    register: registerEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { isSubmitting: editingForm }
  } = useForm();

  function openAssign(row) {
    setSelected(row);
    setTruckId(fleet.find((t) => t.status === "Available")?.id || fleet[0]?.id || "");
    setError("");
  }

  function openEdit(row) {
    setEditing(row);
    setError("");
    resetEdit({
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

  async function onAssign() {
    setError("");
    const truck = fleet.find((t) => t.id === truckId) || fleet.find((t) => t.status === "Available");
    if (!selected || !truck) {
      setError("Select an available truck");
      return;
    }
    try {
      await assign.mutateAsync({
        id: selected.id,
        payload: { driverId: truck.driverId, truckId: truck.id, dispatcherId: user.id }
      });
      setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onCancel(id) {
    if (!confirm("Cancel this cargo request?")) return;
    try {
      await cancel.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function onCreate(values) {
    setError("");
    try {
      await create.mutateAsync({ ...values, customerId: values.customerId });
      setCreating(false);
      resetCreate();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onUpdate(values) {
    setError("");
    try {
      await update.mutateAsync({ id: editing.id, payload: values });
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cargo Requests"
        subtitle="Create, view, assign, edit, and cancel marketplace orders."
        actions={
          showCreate ? (
            <Button onClick={() => { setCreating(true); setError(""); }}>
              <Plus size={16} /> New request
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          className="stitch-input max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["Pending", "Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delivered", "Cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Request Queue</h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading requests…</p>
        ) : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: "id", label: "ID" },
              { key: "customer", label: "Customer" },
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
                    <button type="button" className="p-1 text-on-surface-variant" onClick={() => setViewing(row)} title="View">
                      <Eye size={16} />
                    </button>
                    {row.status === "Pending" && (
                      <button type="button" className="p-1 text-secondary-container" onClick={() => openEdit(row)} title="Edit">
                        <Pencil size={16} />
                      </button>
                    )}
                    {(row.status === "Pending" || row.status === "Assigned") && (
                      <Button className="px-2 py-1 text-xs" onClick={() => openAssign(row)}>
                        {row.status === "Pending" ? "Assign" : "Reassign"}
                      </Button>
                    )}
                    {CANCELABLE_REQUEST_STATUSES.includes(row.status) && (
                      <button type="button" className="p-1 text-error" onClick={() => onCancel(row.id)} title="Cancel">
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

      {selected && (
        <Modal title={`${selected.status === "Pending" ? "Assign" : "Reassign"} ${selected.id}`} onClose={() => setSelected(null)}>
          <select className="mb-4 w-full stitch-input" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            {fleet.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.truckNumber} — {truck.driver} ({truck.status})
              </option>
            ))}
          </select>
          {error && <p className="mb-3 text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={onAssign} disabled={assign.isPending || !fleet.length}>
              {assign.isPending ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Request ${viewing.id}`} onClose={() => setViewing(null)} wide>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Customer" value={viewing.customer} />
            <Detail label="Status" value={<StatusBadge status={viewing.status} />} />
            <Detail label="Pickup" value={viewing.pickup} />
            <Detail label="Destination" value={viewing.destination} />
            <Detail label="Truck type" value={viewing.truckType} />
            <Detail label="Weight" value={viewing.weight} />
            <Detail label="Driver" value={viewing.driver || "—"} />
            <Detail label="Truck" value={viewing.truck || "—"} />
            <Detail label="Description" value={viewing.description} className="sm:col-span-2" />
            <Detail label="Sender" value={viewing.sender || "—"} />
            <Detail label="Receiver" value={viewing.receiver || "—"} />
            <Detail label="Instructions" value={viewing.specialInstructions || "—"} className="sm:col-span-2" />
          </dl>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.id}`} onClose={() => setEditing(null)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleEdit(onUpdate)}>
            <input className="stitch-input" placeholder="Pickup" {...registerEdit("pickup", { required: true })} />
            <input className="stitch-input" placeholder="Destination" {...registerEdit("destination", { required: true })} />
            <select className="stitch-input" {...registerEdit("truckType")}>
              <option>Box Truck</option>
              <option>Flatbed</option>
              <option>Refrigerated</option>
              <option>Tanker</option>
            </select>
            <input className="stitch-input" placeholder="Weight" {...registerEdit("weight", { required: true })} />
            <input className="stitch-input" placeholder="Sender" {...registerEdit("sender")} />
            <input className="stitch-input" placeholder="Receiver" {...registerEdit("receiver")} />
            <textarea className="stitch-input min-h-20 sm:col-span-2" placeholder="Description" {...registerEdit("description", { required: true })} />
            <textarea className="stitch-input min-h-16 sm:col-span-2" placeholder="Special instructions" {...registerEdit("specialInstructions")} />
            {error && <p className="sm:col-span-2 text-sm text-error">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={editingForm || update.isPending}>Save changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {creating && (
        <Modal title="Create cargo request" onClose={() => setCreating(false)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreate(onCreate)}>
            <select className="stitch-input sm:col-span-2" {...registerCreate("customerId", { required: true })}>
              <option value="">Select customer</option>
              {(customers?.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
            <input className="stitch-input" placeholder="Pickup" {...registerCreate("pickup", { required: true })} />
            <input className="stitch-input" placeholder="Destination" {...registerCreate("destination", { required: true })} />
            <select className="stitch-input" {...registerCreate("truckType")}>
              <option>Box Truck</option>
              <option>Flatbed</option>
              <option>Refrigerated</option>
              <option>Tanker</option>
            </select>
            <input className="stitch-input" placeholder="Weight" {...registerCreate("weight", { required: true })} />
            <textarea className="stitch-input min-h-20 sm:col-span-2" placeholder="Description" {...registerCreate("description", { required: true })} />
            {error && <p className="sm:col-span-2 text-sm text-error">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button disabled={creatingForm || create.isPending}>Create request</Button>
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
