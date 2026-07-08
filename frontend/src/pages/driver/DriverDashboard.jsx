import { useRef, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Headphones,
  Info,
  MapPin,
  Minus,
  Navigation,
  Package,
  Plus,
  RefreshCw,
  Truck,
  Wallet
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard, useTripActions, useTrips } from "../../hooks/useApi";
import { money, nextTripStatus } from "../../utils/helpers";
import { EmptyState } from "../../components/ui/EmptyState";
import { api } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";

const MAP_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAvgSFM7C9zxGI0dbL4BsG6SiX3I_nnO2z7wJ5f8A-e88-SUzPW9d2924TpCNo0r3lwpK23jWfi7AK_fCUpE9RtLQO8AV_btGaPvIELjHgW0bsRyT7VDvavzWBFUgXJTVyxhL14simHhF44emgfmJecOnJpoxrwc6VF3N0xvPNsNpdqyszT6RjVT1wnQLSw4yBRHYeNaaBwwkL74h3xPY5mVcg1sd4K0S2jNAcSea7CEpXe7IZ6y5S_gBeEklkvRoJBnOMcoKi1kfE";

export function DriverDashboard() {
  const { user } = useAuth();
  const { data: stats } = useDashboard();
  const { data: trips } = useTrips();
  const actions = useTripActions();
  const fileRef = useRef(null);
  const qc = useQueryClient();
  const [podMessage, setPodMessage] = useState("");
  const jobs = trips?.data || [];
  const active = jobs.filter((t) => !["Delivered", "Cancelled"].includes(t.status));
  const live = active[0];
  const firstName = (user?.name || "Driver").split(" ")[0];

  async function uploadPod(event) {
    const file = event.target.files?.[0];
    if (!file || !live) return;
    const formData = new FormData();
    formData.append("proof", file);
    try {
      await api.uploadProof(live.id, formData);
      setPodMessage(`Proof uploaded for ${live.id}`);
      qc.invalidateQueries({ queryKey: ["trips"] });
    } catch (err) {
      setPodMessage(err.message);
    }
    event.target.value = "";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Driver Account"
        subtitle={`Welcome back, ${firstName}. You have ${active.length} ${active.length === 1 ? "delivery" : "deliveries"} scheduled.`}
      />

      {podMessage && (
        <p className="rounded-xl border border-primary-fixed bg-primary-fixed/40 px-4 py-3 text-sm text-primary-container">
          {podMessage}
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CenterMetric
          icon={Truck}
          tone="bg-primary-fixed-dim text-primary-container"
          value={jobs.length}
          label="Deliveries Today"
        />
        <CenterMetric
          icon={Navigation}
          tone="bg-secondary-fixed text-on-secondary-fixed"
          value={active.length}
          label="In Progress"
        />
        <CenterMetric
          icon={CheckCircle2}
          tone="bg-tertiary-fixed text-on-tertiary-fixed"
          value={stats?.completedOrders ?? 0}
          label="Completed (Monthly)"
        />
        <CenterMetric
          icon={Wallet}
          tone="bg-secondary-container text-on-secondary"
          value={money(stats?.revenue)}
          label="Earnings (Weekly)"
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <section className="col-span-12 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-outline-variant p-6">
            <h3 className="text-xl font-semibold text-on-surface">Today&apos;s Deliveries</h3>
            <Link to="/driver/jobs" className="text-sm font-semibold text-secondary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4 p-4">
            {!jobs.length && <EmptyState title="No jobs yet" text="When a dispatcher assigns your truck, jobs appear here." />}
            {jobs.slice(0, 5).map((trip, idx) => {
              const isLive = live?.id === trip.id || (idx === 0 && active.includes(trip));
              return (
                <article
                  key={trip.id}
                  className={
                    isLive
                      ? "rounded-lg border-l-4 border-secondary-container bg-secondary-fixed p-4"
                      : "cursor-pointer rounded-lg border border-outline-variant p-4 transition hover:bg-surface-container-low"
                  }
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[13px] font-medium tracking-wide text-on-secondary-container uppercase">
                        {trip.id}
                      </span>
                      <h4 className="text-sm font-semibold text-on-surface">
                        {trip.pickup} → {trip.destination}
                      </h4>
                    </div>
                    {isLive ? (
                      <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs font-medium text-on-secondary">
                        In Progress
                      </span>
                    ) : (
                      <StatusBadge status={trip.status} />
                    )}
                  </div>
                  <div className="mb-3 flex items-center gap-2 text-sm text-on-surface-variant">
                    {isLive ? (
                      <>
                        <Navigation size={16} />
                        <span>ETA: {trip.estimatedTime || trip.eta || "TBD"}</span>
                      </>
                    ) : (
                      <>
                        <Package size={16} />
                        <span>{trip.cargo || trip.description || "Cargo load"}</span>
                      </>
                    )}
                  </div>
                  {isLive && (
                    <div className="flex gap-2">
                      {trip.status === "Assigned" ? (
                        <>
                          <Button className="flex-1" onClick={() => actions.accept.mutate(trip.id)}>
                            Accept
                          </Button>
                          <Button variant="danger" onClick={() => actions.reject.mutate(trip.id)}>
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          {!["Delivered", "Cancelled"].includes(trip.status) && (
                            <button
                              type="button"
                              className="flex-1 rounded-lg bg-secondary-container py-2 text-sm font-semibold text-on-secondary shadow-sm transition hover:brightness-110 active:scale-95"
                              onClick={() =>
                                actions.updateStatus.mutate({ id: trip.id, status: nextTripStatus(trip.status) })
                              }
                            >
                              Update Status
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex w-12 items-center justify-center rounded-lg border border-secondary-container text-secondary-container transition hover:bg-secondary-fixed"
                            onClick={() =>
                              actions.shareLocation.mutate({
                                id: trip.id,
                                lat: 41.2 + Math.random(),
                                lng: -87.6 + Math.random()
                              })
                            }
                          >
                            <MapPin size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {!isLive && trip.status === "Assigned" && (
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => actions.accept.mutate(trip.id)}>Accept</Button>
                      <Button variant="danger" onClick={() => actions.reject.mutate(trip.id)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="col-span-12 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest p-6">
            <div>
              <h3 className="text-xl font-semibold text-on-surface">Navigation</h3>
              <p className="flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                <MapPin size={14} />
                {live ? `${live.pickup} → ${live.destination}` : "Awaiting assignment"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-on-tertiary-container">{live?.estimatedTime || "—"}</p>
              <p className="text-xs font-medium text-on-surface-variant">
                Status: {live?.status || "Idle"}
              </p>
            </div>
          </div>
          <div className="relative min-h-[400px] flex-1 overflow-hidden">
            <img src={MAP_IMG} alt="Route navigation map" className="h-full w-full object-cover" />
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-lg hover:bg-surface-container-high">
                <Plus size={20} />
              </button>
              <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-lg hover:bg-surface-container-high">
                <Minus size={20} />
              </button>
              <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary shadow-lg hover:brightness-110">
                <Navigation size={20} />
              </button>
            </div>
            <div className="absolute left-6 top-6 max-w-[240px] rounded-xl border border-outline-variant bg-surface-container-lowest/90 p-4 shadow-lg backdrop-blur-md">
              <p className="mb-1 text-xs font-medium text-on-surface-variant">Current Action</p>
              <p className="mb-2 text-base font-bold text-on-surface">
                {live ? nextTripStatus(live.status) || live.status : "Standby"}
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-variant">
                <div
                  className="h-full bg-secondary-container"
                  style={{
                    width: live
                      ? `${Math.min(90, ["Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delivered"].indexOf(live.status) * 22 + 20)}%`
                      : "10%"
                  }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-medium text-on-primary-container">
                {live?.cargo || "One truck · one account"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <QuickAction
          icon={RefreshCw}
          label="Update Status"
          onClick={() => {
            if (!live || ["Assigned", "Delivered", "Cancelled"].includes(live.status)) return;
            actions.updateStatus.mutate({ id: live.id, status: nextTripStatus(live.status) });
          }}
        />
        <QuickAction
          icon={CloudUpload}
          label="Upload POD"
          onClick={() => {
            if (!live) {
              setPodMessage("No active job to upload proof for.");
              return;
            }
            fileRef.current?.click();
          }}
        />
        <QuickAction icon={Headphones} label="Call Dispatcher" />
        <Link to={live ? `/driver/jobs` : "/driver/truck"}>
          <QuickAction icon={Info} label="View Details" asDiv />
        </Link>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPod} />
    </div>
  );
}

function CenterMetric({ icon: Icon, tone, value, label }) {
  return (
    <article className="flex flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
        <Icon size={28} />
      </div>
      <p className="text-[32px] font-bold leading-10 text-on-surface">{value}</p>
      <p className="text-sm font-semibold text-on-primary-container">{label}</p>
    </article>
  );
}

function QuickAction({ icon: Icon, label, onClick, asDiv }) {
  const className =
    "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition hover:bg-secondary-fixed active:scale-95 group";
  const content = (
    <>
      <Icon size={32} className="text-on-primary-container transition group-hover:text-secondary-container" />
      <span className="text-sm font-semibold text-on-surface">{label}</span>
    </>
  );
  if (asDiv) return <div className={className}>{content}</div>;
  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
