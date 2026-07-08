import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { useTruckMutations, useTrucks, useDrivers } from "../../hooks/useApi";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

export function TrucksPage() {
  const { data, isLoading } = useTrucks();
  const { data: drivers } = useDrivers();
  const mutations = useTruckMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { truckType: "Box Truck", capacity: "12 tons", status: "Available" }
  });

  const assignedDriverIds = new Set((data?.data || []).map((t) => t.driverId));
  const availableDrivers = (drivers?.data || []).filter((d) => !assignedDriverIds.has(d.id) || editing?.driverId === d.id);

  function openCreate() {
    setEditing(null);
    setError("");
    reset({ truckType: "Box Truck", capacity: "12 tons", status: "Available" });
    setOpen(true);
  }

  function openEdit(truck) {
    setEditing(truck);
    setError("");
    reset({
      truckNumber: truck.truckNumber,
      plateNumber: truck.plateNumber,
      capacity: truck.capacity,
      truckType: truck.type || truck.truckType,
      status: truck.status,
      driverId: truck.driverId
    });
    setOpen(true);
  }

  async function onSubmit(values) {
    setError("");
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          payload: {
            truckNumber: values.truckNumber,
            plateNumber: values.plateNumber,
            capacity: values.capacity,
            truckType: values.truckType,
            status: values.status,
            driverId: values.driverId
          }
        });
      } else {
        await mutations.create.mutateAsync({
          truckNumber: values.truckNumber,
          plateNumber: values.plateNumber,
          capacity: values.capacity,
          truckType: values.truckType,
          driverId: values.driverId,
          status: values.status || "Available"
        });
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this truck?")) return;
    try {
      await mutations.remove.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function setStatus(id, status) {
    try {
      await mutations.update.mutateAsync({ id, payload: { status } });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fleet"
        subtitle="Each truck is permanently owned by one driver account."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add truck
          </Button>
        }
      />
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">All Trucks</h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading fleet…</p>
        ) : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: "truckNumber", label: "Truck" },
              { key: "plateNumber", label: "Plate" },
              { key: "type", label: "Type" },
              { key: "capacity", label: "Capacity" },
              { key: "driver", label: "Driver" },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" className="p-1 text-secondary-container" onClick={() => openEdit(row)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="p-1 text-error" onClick={() => onDelete(row.id)}>
                      <Trash2 size={16} />
                    </button>
                    {["Available", "Busy", "Maintenance"].map((status) => (
                      <Button key={status} variant="secondary" className="px-2 py-1 text-xs" onClick={() => setStatus(row.id, status)}>
                        {status}
                      </Button>
                    ))}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {open && (
        <Modal title={editing ? "Edit truck" : "Add truck"} onClose={() => setOpen(false)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <input className="stitch-input" placeholder="Truck number" {...register("truckNumber", { required: true })} />
            <input className="stitch-input" placeholder="Plate number" {...register("plateNumber", { required: true })} />
            <input className="stitch-input" placeholder="Capacity" {...register("capacity", { required: true })} />
            <select className="stitch-input" {...register("truckType")}>
              <option>Box Truck</option>
              <option>Flatbed</option>
              <option>Refrigerated</option>
              <option>Tanker</option>
            </select>
            <select className="stitch-input sm:col-span-2" {...register("driverId", { required: true })}>
              <option value="">Select driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} ({driver.email})
                </option>
              ))}
            </select>
            <select className="stitch-input" {...register("status")}>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={isSubmitting || mutations.create.isPending || mutations.update.isPending}>
                {editing ? "Save changes" : "Create truck"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
