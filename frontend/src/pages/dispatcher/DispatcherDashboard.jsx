import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Filter, Maximize2, Star, Trash2, Truck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  useAssignCargo,
  useCancelCargo,
  useCargoRequests,
  useDashboard,
  useTripActions,
  useTripFeedback,
  useTrips,
  useTrucks,
  useEarningsSummary
} from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { CANCELABLE_REQUEST_STATUSES, money, nextTripStatus } from "../../utils/helpers";
import { FleetMap } from "../../components/map/FleetMap";
import { TripFeedbackPanel } from "../../components/TripFeedbackPanel";
import { randomSomaliaCoords } from "../../utils/geo";

export function DispatcherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats } = useDashboard();
  const { data: earnings } = useEarningsSummary();
  const { data: requests } = useCargoRequests({ status: "Pending" });
  const { data: trucks } = useTrucks({ status: "Available" });
  const { data: trips } = useTrips();
  const { data: feedback, isLoading: feedbackLoading } = useTripFeedback({ limit: 8 });
  const assign = useAssignCargo();
  const cancel = useCancelCargo();
  const tripActions = useTripActions();
  const [selected, setSelected] = useState(null);
  const [truckId, setTruckId] = useState("");
  const [error, setError] = useState("");
  const available = trucks?.data || [];
  const live = (trips?.data || []).filter((t) =>
    ["Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delayed"].includes(t.status)
  );

  async function assignNow() {
    setError("");
    const truck = available.find((t) => t.id === truckId) || available[0];
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

  async function cancelRequest(id) {
    if (!confirm("Cancel this request?")) return;
    try {
      await cancel.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dispatcher Dashboard"
        subtitle="Assign pending cargo requests and monitor live shipments."
        actions={
          <Button onClick={() => navigate("/dispatcher/requests")}>
            <FileText size={16} /> Manage requests
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          icon={FileText}
          tone="bg-primary-container/10 text-primary-container"
          label="Total Requests"
          value={stats?.todaysOrders ?? requests?.total ?? 0}
          hint="+12% this week"
          hintTone="text-green-600 bg-green-50 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <MetricCard
          icon={AlertCircle}
          tone="bg-secondary-container/10 text-secondary-container"
          label="Pending Requests"
          value={stats?.pendingOrders ?? (requests?.data || []).length}
          hint="+5% this week"
          hintTone="text-error bg-error-container/20"
        />
        <MetricCard
          icon={CheckCircle2}
          tone="bg-on-tertiary-container/10 text-on-tertiary-container"
          label="Assigned Today"
          value={stats?.completedOrders ?? 0}
          hint="+8% this week"
          hintTone="text-green-600 bg-green-50 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <MetricCard
          icon={Truck}
          tone="bg-surface-tint/10 text-surface-tint"
          label="In Transit"
          value={stats?.inTransit ?? live.length}
          hint="Live"
          hintTone="text-secondary bg-secondary-fixed"
        />
        <MetricCard
          icon={Star}
          tone="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          label="Commission (available)"
          value={money(earnings?.available ?? 0)}
          hint="SLSH"
          hintTone="text-on-surface-variant"
        />
      </section>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-on-surface">Pending Requests</h2>
            <Link
              to="/dispatcher/requests"
              className="flex items-center gap-1 text-sm font-semibold text-secondary-container hover:text-secondary"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  {["ID", "From", "To", "Cargo", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(requests?.data || []).map((row) => (
                  <tr key={row.id} className="group transition hover:bg-on-tertiary-container/5">
                    <td className="px-6 py-4 text-[13px] font-medium tracking-wide text-primary-container">{row.id}</td>
                    <td className="px-6 py-4 text-sm">{row.pickup}</td>
                    <td className="px-6 py-4 text-sm">{row.destination}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-surface-container px-2 py-1 text-xs font-medium">{row.description || row.cargo}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{row.date || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-secondary-container px-3 py-1.5 text-xs font-semibold text-on-secondary transition hover:shadow-md active:scale-95"
                          onClick={() => {
                            setSelected(row);
                            setTruckId(available[0]?.id || "");
                          }}
                        >
                          Assign
                        </button>
                        {CANCELABLE_REQUEST_STATUSES.includes(row.status) && (
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-error hover:bg-error-container/20"
                            onClick={() => cancelRequest(row.id)}
                            title="Cancel"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!(requests?.data || []).length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                      No pending requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="col-span-12 flex h-[500px] flex-col rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-on-surface">Live Shipments</h2>
            <div className="flex gap-2">
              <Link to="/dispatcher/tracking" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low">
                <Filter size={18} />
              </Link>
              <Link to="/dispatcher/trips" className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low">
                <Maximize2 size={18} />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[300px] flex-1 overflow-hidden">
            <FleetMap trips={live} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-x-3 bottom-3 max-h-[45%] space-y-2 overflow-y-auto">
              {live.slice(0, 5).map((trip) => (
                <div key={trip.id} className="rounded-xl border border-white/20 bg-primary-container/85 p-3 text-white backdrop-blur">
                  <div className="mb-1 flex items-center justify-between">
                    <strong>{trip.id}</strong>
                    <StatusBadge status={trip.status} />
                  </div>
                  <p className="text-sm text-on-primary-container">
                    {trip.pickup} → {trip.destination}
                  </p>
                  <p className="mt-1 text-xs text-on-primary-container/80">{trip.driver || "Unassigned"} · {trip.truck || "—"}</p>
                  <div className="mt-2 flex gap-1">
                    <Button
                      className="px-2 py-1 text-xs"
                      onClick={() => tripActions.updateStatus.mutate({ id: trip.id, status: nextTripStatus(trip.status) })}
                    >
                      Advance
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        const { lat, lng } = randomSomaliaCoords();
                        tripActions.shareLocation.mutate({ id: trip.id, lat, lng });
                      }}
                    >
                      GPS
                    </Button>
                  </div>
                </div>
              ))}
              {!live.length && <p className="p-4 text-sm text-white/70">No live shipments.</p>}
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-amber-500" />
            <h2 className="text-xl font-semibold text-on-surface">Customer Feedback</h2>
          </div>
          <span className="text-sm text-on-surface-variant">Reviews on your dispatched trips</span>
        </div>
        <div className="p-6">
          <TripFeedbackPanel
            items={feedback?.data || []}
            summary={feedback?.summary}
            loading={feedbackLoading}
            showDriver
            showCustomer
            limit={8}
          />
        </div>
      </section>

      {selected && (
        <Modal title={`Assign ${selected.id}`} onClose={() => setSelected(null)}>
          <p className="mb-4 text-sm text-on-surface-variant">
            {selected.pickup} → {selected.destination} · {selected.description}
          </p>
          <label className="mb-4 block text-sm">
            Available truck / driver
            <select className="stitch-input mt-1" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
              {available.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.truckNumber} — {truck.driver} ({truck.status})
                </option>
              ))}
            </select>
          </label>
          {error && <p className="mb-3 text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={assignNow} disabled={assign.isPending || !available.length}>
              {assign.isPending ? "Assigning…" : "Assign now"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, tone, label, value, hint, hintTone }) {
  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon size={22} />
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${hintTone}`}>{hint}</span>
      </div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</h3>
      <p className="text-[32px] font-bold leading-10 text-on-surface">{value}</p>
    </article>
  );
}
