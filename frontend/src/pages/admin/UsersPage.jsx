import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, Pencil, Plus, Trash2, Truck, UserCheck, UserCog, Users, UserX } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { MetricCard } from "../../components/ui/MetricCard";
import { useUserMutations, useUserSummary, useUsers } from "../../hooks/useApi";
import { useDashboardSearch } from "../../hooks/useDashboardSearch";
import { useAuth } from "../../contexts/AuthContext";

export function UsersPage() {
  const { user: authUser } = useAuth();
  const isDispatcher = authUser.role === "dispatcher";
  const [role, setRole] = useState(isDispatcher ? "driver" : "");
  const { search, hasSearch } = useDashboardSearch();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [createInfo, setCreateInfo] = useState("");
  const [truckPhoto1, setTruckPhoto1] = useState(null);
  const [truckPhoto2, setTruckPhoto2] = useState(null);
  const [driverImage, setDriverImage] = useState(null);
  const [truckDocuments, setTruckDocuments] = useState([]);
  const [nationalIdFront, setNationalIdFront] = useState(null);
  const [nationalIdBack, setNationalIdBack] = useState(null);
  const [dispatcherPhoto, setDispatcherPhoto] = useState(null);
  const [dispatcherCv, setDispatcherCv] = useState(null);
  const [photo1Preview, setPhoto1Preview] = useState("");
  const [photo2Preview, setPhoto2Preview] = useState("");
  const { data, isLoading } = useUsers({ role: role || undefined, search: search || undefined });
  const { data: summary } = useUserSummary();
  const mutations = useUserMutations();
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { role: isDispatcher ? "driver" : "customer", truckType: "", capacity: "12 tons", status: "Active" }
  });
  const selectedRole = isDispatcher ? "driver" : watch("role");

  function openCreate() {
    setEditing(null);
    setError("");
    setCreateInfo("");
    setTruckPhoto1(null);
    setTruckPhoto2(null);
    setDriverImage(null);
    setTruckDocuments([]);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setDispatcherPhoto(null);
    setDispatcherCv(null);
    setPhoto1Preview("");
    setPhoto2Preview("");
    reset({ role: isDispatcher ? "driver" : "customer", truckType: "", capacity: "12 tons", status: "Active" });
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
        if (isDispatcher) {
          setError("Dispatchers cannot edit accounts. Contact an admin.");
          return;
        }
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
        let result;
        const createRole = isDispatcher ? "driver" : values.role;
        if (createRole === "driver") {
          if (!truckPhoto1 || !truckPhoto2 || !driverImage || truckDocuments.length === 0) {
            setError("Driver photo, two truck photos, and at least one truck document are required.");
            return;
          }
          const formData = new FormData();
          formData.append("name", values.name);
          formData.append("email", values.email);
          formData.append("role", createRole);
          if (values.phone) formData.append("phone", values.phone);
          formData.append("driverLicense", values.driverLicense);
          formData.append("truckNumber", values.truckNumber);
          formData.append("plateNumber", values.plateNumber);
          formData.append("capacity", values.capacity);
          formData.append("truckType", values.truckType);
          formData.append("truckPhoto1", truckPhoto1);
          formData.append("truckPhoto2", truckPhoto2);
          formData.append("driverImage", driverImage);
          truckDocuments.forEach((file) => formData.append("truckDocuments", file));
          result = await mutations.create.mutateAsync(formData);
        } else if (createRole === "dispatcher") {
          if (!nationalIdFront || !nationalIdBack || !dispatcherPhoto || !dispatcherCv) {
            setError("National ID images, profile photo, and CV are required.");
            return;
          }
          const formData = new FormData();
          ["name", "email", "phone", "dispatcherCode", "nationalIdNumber", "dateOfBirth", "gender", "city", "address", "yearsOfExperience", "assignedRegion", "workShift", "emergencyContactName", "emergencyContactPhone", "commissionPercentage", "verificationStatus", "accountStatus"].forEach((key) => {
            if (values[key] !== undefined && values[key] !== "") formData.append(key, values[key]);
          });
          formData.append("role", "dispatcher");
          formData.append("nationalIdFront", nationalIdFront);
          formData.append("nationalIdBack", nationalIdBack);
          formData.append("dispatcherPhoto", dispatcherPhoto);
          formData.append("dispatcherCv", dispatcherCv);
          result = await mutations.create.mutateAsync(formData);
        } else {
          const payload = {
            name: values.name,
            email: values.email,
            role: values.role,
            phone: values.phone || undefined
          };
          result = await mutations.create.mutateAsync(payload);
        }
        const parts = [result.message || "User created. Credentials sent by email."];
        if (result.devPassword) parts.push(`Temp password: ${result.devPassword}`);
        setCreateInfo(parts.join(" "));
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (isDispatcher) return;
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
        title={isDispatcher ? "Drivers" : "Users"}
        subtitle={
          isDispatcher
            ? "Register drivers together with their truck and photos."
            : "Manage admins, dispatchers, customers, and driver-truck accounts."
        }
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> {isDispatcher ? "Add driver" : "Add user"}
          </Button>
        }
      />

      {createInfo && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {createInfo}
        </p>
      )}

      <section className={`grid grid-cols-2 gap-3 ${isDispatcher ? "md:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-6"}`}>
        {isDispatcher ? (
          <>
            <MetricCard icon={Users} label="Total Drivers" value={summary?.drivers ?? "—"} tone="navy" />
            <MetricCard icon={UserCheck} label="Active Drivers" value={summary?.driverActive ?? "—"} tone="green" />
            <MetricCard icon={Truck} label="Fleet Trucks" value={summary?.trucks ?? "—"} tone="soft" />
          </>
        ) : (
          <>
            <MetricCard icon={Users} label="Total Users" value={summary?.total ?? "—"} tone="navy" />
            <MetricCard icon={UserCheck} label="Total Active" value={summary?.active ?? "—"} tone="green" />
            <MetricCard icon={UserX} label="Total Inactive" value={summary?.inactive ?? "—"} tone="orange" />
            <MetricCard icon={Users} label="Total Customers" value={summary?.customers ?? "—"} tone="blue" />
            <MetricCard icon={UserCog} label="Total Dispatchers" value={summary?.dispatchers ?? "—"} tone="amber" />
            <MetricCard icon={Truck} label="Total Trucks" value={summary?.trucks ?? "—"} tone="soft" />
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {hasSearch ? (
          <p className="text-sm text-on-surface-variant">
            Showing results for <span className="font-semibold text-on-surface">&quot;{search}&quot;</span>
          </p>
        ) : null}
        {!isDispatcher ? (
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
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Directory</h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">{isDispatcher ? "Loading drivers…" : "Loading users…"}</p>
        ) : (
          <DataTable
            rows={data?.data || []}
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              ...(!isDispatcher ? [{ key: "role", label: "Role" }] : []),
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
                    {!isDispatcher ? (
                      <>
                        <button type="button" className="text-secondary-container" onClick={() => openEdit(row)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="text-error" onClick={() => onDelete(row.id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : null}
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
            {viewing.role === "driver" ? (
              <>
                <Detail label="Driver license" value={viewing.driverLicense || "—"} />
                <Detail label="Truck documents" value={`${viewing.truckDocumentUrls?.length || 0} uploaded`} />
              </>
            ) : null}
            <Detail
              label="Joined"
              value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : "—"}
              className="sm:col-span-2"
            />
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>
            {!isDispatcher ? (
              <Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit user</Button>
            ) : null}
          </div>
        </Modal>
      )}

      {open && (
        <Modal
          title={editing ? (isDispatcher ? "Edit driver" : "Edit user") : (isDispatcher ? "Add driver" : "Create user")}
          onClose={() => setOpen(false)}
          wide
        >
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <input className="stitch-input" placeholder="Name" {...register("name", { required: true })} />
            <input className="stitch-input" placeholder="Phone" {...register("phone")} />
            <input className="stitch-input sm:col-span-2" type="email" placeholder="Email" {...register("email", { required: true })} />
            {editing ? (
              <input
                className="stitch-input"
                type="password"
                placeholder="New password (optional)"
                {...register("password")}
              />
            ) : (
              <p className="sm:col-span-2 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                A temporary password will be emailed automatically. The driver must set a new password on first sign-in.
              </p>
            )}
            {!isDispatcher ? (
              <select className="stitch-input" {...register("role")}>
                <option value="customer">Customer</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="driver">Driver</option>
                {editing?.role === "admin" ? <option value="admin">Admin</option> : null}
              </select>
            ) : (
              <input type="hidden" {...register("role")} value="driver" />
            )}
            {editing && !isDispatcher && (
              <select className="stitch-input" {...register("status")}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            )}
            {!editing && selectedRole === "driver" && (
              <>
                <input className="stitch-input sm:col-span-2" placeholder="Driver license number" {...register("driverLicense", { required: true })} />
                <label className="sm:col-span-2 block text-sm">
                  <span className="mb-1.5 block font-medium text-on-surface-variant">Driver photo *</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="stitch-input w-full"
                    onChange={(e) => setDriverImage(e.target.files?.[0] || null)}
                    required
                  />
                </label>
                <input className="stitch-input" placeholder="Truck number" {...register("truckNumber", { required: true })} />
                <input className="stitch-input" placeholder="Plate number" {...register("plateNumber", { required: true })} />
                <input className="stitch-input" placeholder="Capacity" {...register("capacity", { required: true })} />
                <input className="stitch-input" placeholder="Write truck type" {...register("truckType", { required: true })} />
                <label className="sm:col-span-2 block text-sm">
                  <span className="mb-1.5 block font-medium text-on-surface-variant">Truck photo 1 *</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="stitch-input w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setTruckPhoto1(file || null);
                      setPhoto1Preview(file ? URL.createObjectURL(file) : "");
                    }}
                    required
                  />
                  {photo1Preview ? (
                    <img src={photo1Preview} alt="Truck preview 1" className="mt-2 h-24 w-full rounded-lg object-cover" />
                  ) : null}
                </label>
                <label className="sm:col-span-2 block text-sm">
                  <span className="mb-1.5 block font-medium text-on-surface-variant">Truck photo 2 *</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="stitch-input w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setTruckPhoto2(file || null);
                      setPhoto2Preview(file ? URL.createObjectURL(file) : "");
                    }}
                    required
                  />
                  {photo2Preview ? (
                    <img src={photo2Preview} alt="Truck preview 2" className="mt-2 h-24 w-full rounded-lg object-cover" />
                  ) : null}
                </label>
                <label className="sm:col-span-2 block text-sm">
                  <span className="mb-1.5 block font-medium text-on-surface-variant">Truck documents * (up to 5 images)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="stitch-input w-full"
                    onChange={(e) => setTruckDocuments(Array.from(e.target.files || []).slice(0, 5))}
                    required
                  />
                </label>
              </>
            )}
            {!editing && selectedRole === "dispatcher" && (
              <>
                <input className="stitch-input" placeholder="Dispatcher code" {...register("dispatcherCode", { required: true })} />
                <input className="stitch-input" placeholder="National ID number" {...register("nationalIdNumber", { required: true })} />
                <input className="stitch-input" type="date" {...register("dateOfBirth", { required: true })} />
                <select className="stitch-input" {...register("gender", { required: true })}><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>
                <input className="stitch-input" placeholder="City" {...register("city", { required: true })} />
                <input className="stitch-input" placeholder="Address" {...register("address", { required: true })} />
                <input className="stitch-input" type="number" min="0" placeholder="Years of experience" {...register("yearsOfExperience", { required: true })} />
                <input className="stitch-input" placeholder="Assigned region" {...register("assignedRegion", { required: true })} />
                <input className="stitch-input" placeholder="Work shift" {...register("workShift", { required: true })} />
                <input className="stitch-input" placeholder="Emergency contact name" {...register("emergencyContactName", { required: true })} />
                <input className="stitch-input" placeholder="Emergency contact phone" {...register("emergencyContactPhone", { required: true })} />
                <input className="stitch-input" type="number" min="0" max="100" step="0.01" placeholder="Commission %" {...register("commissionPercentage", { required: true })} />
                <select className="stitch-input" {...register("verificationStatus")}><option>Pending</option><option>Verified</option><option>Rejected</option></select>
                <select className="stitch-input" {...register("accountStatus")}><option>Active</option><option>Inactive</option><option>Suspended</option></select>
                <FileField label="National ID front *" accept="image/jpeg,image/png,image/webp" onChange={setNationalIdFront} />
                <FileField label="National ID back *" accept="image/jpeg,image/png,image/webp" onChange={setNationalIdBack} />
                <FileField label="Profile photo *" accept="image/jpeg,image/png,image/webp" onChange={setDispatcherPhoto} />
                <FileField label="CV *" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={setDispatcherCv} />
              </>
            )}
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={isSubmitting || mutations.create.isPending || mutations.update.isPending}>
                {editing ? "Save changes" : (isDispatcher ? "Register driver" : "Create")}
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

function FileField({ label, accept, onChange }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-on-surface-variant">{label}</span>
      <input type="file" accept={accept} className="stitch-input w-full" onChange={(event) => onChange(event.target.files?.[0] || null)} required />
    </label>
  );
}
