import { useState } from "react";
import { Filter, LocateFixed, Maximize2, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useTripActions, useTrips } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { nextTripStatus, roleHome } from "../../utils/helpers";

const MAP_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAvgSFM7C9zxGI0dbL4BsG6SiX3I_nnO2z7wJ5f8A-e88-SUzPW9d2924TpCNo0r3lwpK23jWfi7AK_fCUpE9RtLQO8AV_btGaPvIELjHgW0bsRyT7VDvavzWBFUgXJTVyxhL14simHhF44emgfmJecOnJpoxrwc6VF3N0xvPNsNpdqyszT6RjVT1wnQLSw4yBRHYeNaaBwwkL74h3xPY5mVcg1sd4K0S2jNAcSea7CEpXe7IZ6y5S_gBeEklkvRoJBnOMcoKi1kfE";

export function TrackingPage() {
  const { user } = useAuth();
  const { data } = useTrips();
  const actions = useTripActions();
  const [selectedId, setSelectedId] = useState(null);
  const canManage = user.role === "dispatcher" || user.role === "admin";
  const base = roleHome(user.role);
  const live = (data?.data || []).filter((trip) =>
    ["Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delayed"].includes(trip.status)
  );
  const selected = live.find((t) => t.id === selectedId) || live[0] || null;

  async function refreshLocation(trip) {
    if (!trip) return;
    try {
      await actions.shareLocation.mutateAsync({
        id: trip.id,
        lat: 41.2 + Math.random() * 2,
        lng: -87.6 + Math.random() * 2
      });
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateStatus(trip, status) {
    try {
      await actions.updateStatus.mutateAsync({ id: trip.id, status });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Tracking"
        subtitle="Realtime trip positions and dispatcher status controls."
        actions={
          canManage ? (
            <Link to={`${base}/trips`}>
              <Button variant="secondary">All trips</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">Fleet Map</h2>
              <p className="text-xs text-on-surface-variant">{live.length} active loads on corridor</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low">
                <Filter size={18} />
              </button>
              <button type="button" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low">
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
          <div className="relative flex-1">
            <img src={MAP_IMG} alt="Live fleet map" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container/50 to-transparent" />
            <div className="absolute inset-4 grid content-end gap-3 sm:grid-cols-2">
              {live.slice(0, 4).map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setSelectedId(trip.id)}
                  className={`rounded-xl border p-4 text-left text-white backdrop-blur transition ${
                    selected?.id === trip.id
                      ? "border-secondary-container bg-primary-container"
                      : "border-white/20 bg-primary-container/80"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-sm tracking-wide">{trip.id}</strong>
                    <LocateFixed size={16} className="text-secondary-fixed-dim" />
                  </div>
                  <p className="text-sm text-on-primary-container">
                    {trip.pickup} → {trip.destination}
                  </p>
                  <p className="mt-2 text-xs text-on-primary-container/80">
                    {trip.lastLocation
                      ? `${Number(trip.lastLocation.lat).toFixed(2)}, ${Number(trip.lastLocation.lng).toFixed(2)}`
                      : "Awaiting GPS ping"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-12 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-4">
          <div className="border-b border-outline-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-on-surface">Active Trips</h2>
          </div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
            {live.map((trip) => (
              <article
                key={trip.id}
                className={`rounded-lg border p-4 transition ${
                  selected?.id === trip.id
                    ? "border-secondary-container bg-secondary-fixed/20"
                    : "border-outline-variant hover:bg-surface-container-low"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-container">
                    <Truck size={16} className="text-secondary-container" />
                    {trip.id}
                  </div>
                  <StatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  {trip.driver || "Unassigned"} · {trip.truck || "No truck"}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {trip.pickup} → {trip.destination}
                </p>
                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button className="px-2 py-1 text-xs" onClick={() => updateStatus(trip, nextTripStatus(trip.status))}>
                      Advance
                    </Button>
                    <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => refreshLocation(trip)}>
                      Refresh GPS
                    </Button>
                    {trip.status !== "Delayed" && (
                      <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => updateStatus(trip, "Delayed")}>
                        Delayed
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
            {!live.length && (
              <p className="px-2 py-10 text-center text-sm text-on-surface-variant">No live trips right now.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
