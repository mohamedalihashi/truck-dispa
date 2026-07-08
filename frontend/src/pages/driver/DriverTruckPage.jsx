import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useTruckMutations, useTrucks } from "../../hooks/useApi";
import { Truck } from "lucide-react";

export function DriverTruckPage() {
  const { user } = useAuth();
  const { data, isLoading } = useTrucks();
  const mutations = useTruckMutations();
  const [message, setMessage] = useState("");
  const truck = (data?.data || []).find((item) => item.driverId === user.id);

  async function setStatus(status) {
    if (!truck) return;
    setMessage("");
    try {
      await mutations.update.mutateAsync({ id: truck.id, payload: { status } });
      setMessage(`Truck status set to ${status}`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Truck" subtitle="View truck details and update availability status." />
      {message && (
        <p className="rounded-xl border border-primary-fixed bg-primary-fixed/40 px-4 py-3 text-sm text-primary-container">
          {message}
        </p>
      )}
      {isLoading ? (
        <p className="text-sm text-on-surface-variant">Loading truck…</p>
      ) : !truck ? (
        <p className="text-sm text-on-surface-variant">No truck linked to this driver.</p>
      ) : (
        <section className="max-w-xl rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary-container text-white">
            <Truck />
          </div>
          <h2 className="text-2xl font-bold text-primary-container">{truck.truckNumber}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Plate" value={truck.plateNumber} />
            <Row label="Type" value={truck.type || truck.truckType} />
            <Row label="Capacity" value={truck.capacity} />
            <Row label="Driver" value={truck.driver || user.name} />
            <Row label="Status" value={<StatusBadge status={truck.status} />} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Available", "Busy", "Maintenance"].map((status) => (
              <Button
                key={status}
                variant={truck.status === status ? "primary" : "secondary"}
                className="px-3 py-1.5 text-xs"
                onClick={() => setStatus(status)}
                disabled={mutations.update.isPending}
              >
                {status}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-primary-container">{value}</dd>
    </div>
  );
}
