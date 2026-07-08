import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useUserMutations, useUsers } from "../../hooks/useApi";

export function UsersPage() {
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const { data, isLoading } = useUsers({ role: role || undefined, search: search || undefined });
  const mutations = useUserMutations();
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { role: "customer", truckType: "Box Truck", capacity: "12 tons", status: "Active" }
  });
  const selectedRole = watch("role");

  function openCreate() {
    setEditing(null);
    setError("");
    reset({ role: "customer", truckType: "Box Truck", capacity: "12 tons", status: "Active" });
    setOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setError("");
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      status: user.status || "Active"
    });
    setOpen(true);
  }

  async function onSubmit(values) {
    setError("");
    try {
      if (editing) {
        const payload = {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          role: values.role,
          status: values.status
        };
        if (values.password) payload.password = values.password;
        await mutations.update.mutateAsync({ id: editing.id, payload });
      } else {
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
        await mutations.create.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await mutations.remove.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        subtitle="Manage admins, dispatchers, customers, and driver-truck accounts."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Add user
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="stitch-input max-w-sm"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="stitch-input max-w-xs"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="dispatcher">Dispatcher</option>
          <option value="customer">Customer</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Directory</h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading users…</p>
        ) : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "truckNumber",
                label: "Truck",
                render: (row) => row.truckNumber || "—"
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex gap-2">
                    <button type="button" className="text-on-surface-variant" onClick={() => setViewing(row)} title="View">
                      <Eye size={16} />
                    </button>
                    <button type="button" className="text-secondary-container" onClick={() => openEdit(row)} title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="text-error" onClick={() => onDelete(row.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)} wide>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Email" value={viewing.email} />
            <Detail label="Phone" value={viewing.phone || "—"} />
            <Detail label="Role" value={viewing.role} />
            <Detail label="Status" value={<StatusBadge status={viewing.status} />} />
            <Detail label="Truck number" value={viewing.truckNumber || "—"} />
            <Detail label="Plate" value={viewing.plateNumber || "—"} />
            <Detail label="Truck type" value={viewing.truckType || "—"} />
            <Detail label="Capacity" value={viewing.capacity || "—"} />
            <Detail label="Truck status" value={viewing.truckStatus ? <StatusBadge status={viewing.truckStatus} /> : "—"} />
            <Detail
              label="Joined"
              value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : "—"}
              className="sm:col-span-2"
            />
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
            <Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit user</Button>
          </div>
        </Modal>
      )}

      {open && (
        <Modal title={editing ? "Edit user" : "Create user"} onClose={() => setOpen(false)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <input className="stitch-input" placeholder="Name" {...register("name", { required: true })} />
            <input className="stitch-input" placeholder="Phone" {...register("phone")} />
            <input className="stitch-input sm:col-span-2" type="email" placeholder="Email" {...register("email", { required: true })} />
            <input
              className="stitch-input"
              type="password"
              placeholder={editing ? "New password (optional)" : "Password"}
              {...register("password", { required: !editing })}
            />
            <select className="stitch-input" {...register("role")}>
              <option value="customer">Customer</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
            {editing && (
              <select className="stitch-input" {...register("status")}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            )}
            {!editing && selectedRole === "driver" && (
              <>
                <input className="stitch-input" placeholder="Truck number" {...register("truckNumber", { required: true })} />
                <input className="stitch-input" placeholder="Plate number" {...register("plateNumber", { required: true })} />
                <input className="stitch-input" placeholder="Capacity" {...register("capacity", { required: true })} />
                <select className="stitch-input" {...register("truckType")}>
                  <option>Box Truck</option>
                  <option>Flatbed</option>
                  <option>Refrigerated</option>
                </select>
              </>
            )}
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={isSubmitting || mutations.create.isPending || mutations.update.isPending}>
                {editing ? "Save changes" : "Create"}
              </Button>
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
