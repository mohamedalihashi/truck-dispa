import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Shield, Truck, User } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { useProfileUpdate, useTrucks } from "../../hooks/useApi";
import { roleHome } from "../../utils/helpers";

const roleLabels = {
  admin: "System Administrator",
  dispatcher: "Senior Dispatcher",
  customer: "Fleet Manager",
  driver: "Driver Account"
};

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { data: trucks } = useTrucks();
  const updateProfile = useProfileUpdate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const base = roleHome(user.role);
  const truck =
    user.role === "driver"
      ? (trucks?.data || []).find((item) => item.driverId === user.id)
      : null;

  function openEdit() {
    setForm({ name: user.name || "", phone: user.phone || "", password: "" });
    setError("");
    setOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.password) payload.password = form.password;
      await updateProfile.mutateAsync(payload);
      await refreshUser();
      setMessage("Profile updated.");
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        subtitle="Your marketplace account and role details."
        actions={
          <Button variant="secondary" onClick={openEdit}>
            Edit profile
          </Button>
        }
      />

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-outline-variant bg-primary-container p-6 text-white shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-4">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-secondary-container bg-surface-tint text-3xl font-bold">
            {user.name?.charAt(0) || "U"}
          </div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="mt-1 text-sm text-on-primary-container">{roleLabels[user.role]}</p>
          <div className="mt-6 space-y-3 text-sm text-on-primary-container">
            <p className="flex items-center gap-2">
              <Mail size={16} className="text-secondary-fixed" /> {user.email}
            </p>
            {user.phone && (
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-secondary-fixed" /> {user.phone}
              </p>
            )}
            <p className="flex items-center gap-2">
              <Shield size={16} className="text-secondary-fixed" /> {user.status || "Active"}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-8">
          <h3 className="mb-4 text-xl font-semibold text-primary-container">Account Details</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Full name" value={user.name} icon={User} />
            <Info label="Email" value={user.email} icon={Mail} />
            <Info label="Role" value={roleLabels[user.role]} icon={Shield} />
            <Info label="Phone" value={user.phone || "—"} icon={Phone} />
          </dl>

          {truck && (
            <div className="mt-8 rounded-xl border border-outline-variant bg-surface-container-low p-5">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-primary-container">
                <Truck size={20} className="text-secondary-container" />
                Linked Truck
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Info label="Truck number" value={truck.truckNumber} />
                <Info label="Plate" value={truck.plateNumber} />
                <Info label="Type" value={truck.type || truck.truckType} />
                <Info label="Status" value={<StatusBadge status={truck.status} />} />
              </dl>
              {user.role === "driver" && (
                <Link
                  to={`${base}/truck`}
                  className="mt-4 inline-block text-sm font-semibold text-secondary-container hover:underline"
                >
                  Open truck details
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {open && (
        <Modal title="Edit profile" onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={saveProfile}>
            <input
              className="stitch-input w-full"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="stitch-input w-full"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              className="stitch-input w-full"
              type="password"
              placeholder="New password (optional)"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-outline-variant/50 px-4 py-3">
      <dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
        {Icon && <Icon size={14} />}
        {label}
      </dt>
      <dd className="text-sm font-semibold text-primary-container">{value}</dd>
    </div>
  );
}
