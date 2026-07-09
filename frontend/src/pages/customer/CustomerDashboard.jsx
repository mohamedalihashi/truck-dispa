import { Link } from "react-router-dom";
import {
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  HelpCircle,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Star,
  Truck,
  Wallet
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useCargoRequests, useDashboard, useTrips } from "../../hooks/useApi";
import { money } from "../../utils/helpers";
import { FleetMap } from "../../components/map/FleetMap";

export function CustomerDashboard() {
  const { data: stats } = useDashboard();
  const { data: trips } = useTrips({ limit: 8 });
  const { data: requests } = useCargoRequests({ limit: 5 });
  const shipments = trips?.data || [];
  const active = shipments.filter((t) => !["Delivered", "Cancelled"].includes(t.status));
  const live = active[0];
  const needsFeedback = shipments.find((t) => t.status === "Delivered" && !t.feedback);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fleet Manager Dashboard"
        subtitle="Book trucks, track shipments, and manage your cargo requests."
        actions={
          <>
            <Link to="/customer/payments">
              <Button variant="secondary">
                <Clock3 size={18} /> Payment History
              </Button>
            </Link>
            <Link to="/customer/book">
              <Button>
                <Plus size={18} /> Book a Truck
              </Button>
            </Link>
          </>
        }
      />

      {needsFeedback && (
        <Link
          to="/customer/shipments"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <Star size={18} className="shrink-0 fill-amber-400 text-amber-500" />
          <span>
            <strong>Trip {needsFeedback.id}</strong> was delivered — rate the goods and delivery service.
          </span>
          <ChevronRight className="ml-auto shrink-0" size={18} />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Package}
          tone="bg-secondary-fixed text-on-secondary-fixed"
          value={shipments.length || stats?.completedOrders || 0}
          label="Total Shipments"
          foot="+15 vs last month"
          hint={<span className="flex items-center gap-1 text-emerald-600">+12%</span>}
        />
        <Metric
          icon={Truck}
          tone="bg-tertiary-fixed text-on-tertiary-fixed"
          value={stats?.inTransit ?? active.filter((t) => t.status === "In Transit").length}
          label="In Transit"
          foot="Live corridor"
          hint={<span className="rounded bg-surface-container-high px-2 py-1 text-[10px] font-bold text-on-surface-variant">LIVE</span>}
        />
        <Metric
          icon={Package}
          tone="bg-primary-fixed text-on-primary-fixed"
          value={stats?.completedOrders ?? 0}
          label="Delivered"
          foot="Last 30 days"
          hint={<span className="text-emerald-600">98.2%</span>}
        />
        <article className="rounded-xl border border-primary bg-primary-container p-6 text-white shadow-lg">
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-secondary-container p-2 text-on-secondary">
              <Wallet size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold leading-10">{money(stats?.revenue)}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider opacity-70">Total Spent</div>
          <div className="mt-4 border-t border-white/10 pt-4 text-xs opacity-80">Cycle ends in 4 days</div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-surface-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-primary-container">Recent Shipments</h2>
            <Link to="/customer/shipments" className="text-sm font-semibold text-on-tertiary-container hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  {["Shipment ID", "Route", "Status", "ETA", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {shipments.map((row) => (
                  <tr key={row.id} className="group cursor-pointer transition hover:bg-surface-container-low">
                    <td className="px-6 py-5">
                      <div className="text-[13px] font-medium tracking-wide text-primary-container">{row.id}</div>
                      <div className="text-xs text-on-surface-variant">{row.cargo || "Cargo"}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{(row.pickup || "").slice(0, 3).toUpperCase() || "SRC"}</span>
                        <span className="text-on-surface-variant">→</span>
                        <span>{(row.destination || "").slice(0, 3).toUpperCase() || "DST"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-5 text-[13px] font-medium">{row.estimatedTime || row.eta || "—"}</td>
                    <td className="px-6 py-5 text-right text-on-surface-variant group-hover:text-primary">
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                ))}
                {!shipments.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                      No shipments yet. Book a truck to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-4">
          <div className="border-b border-surface-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-primary-container">Live Tracking</h2>
            <p className="text-xs text-on-surface-variant">Active Load: {live?.id || "—"}</p>
          </div>
          <div className="relative min-h-[280px] flex-1">
            <FleetMap trips={live ? [live] : active} selectedId={live?.id} className="absolute inset-0 h-full w-full" />
            <div className="absolute left-4 right-4 top-4 z-10 rounded-lg border border-outline-variant bg-surface-container-lowest/90 p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed">
                    <Truck size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{live ? "On route" : "No active load"}</div>
                    <div className="text-xs font-bold text-emerald-600">On Schedule</div>
                  </div>
                </div>
                <span className="text-[13px] font-medium">{live?.estimatedTime || "—"}</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-low p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Driver: {live?.driver || "Unassigned"}</span>
              <span className="text-xs font-medium text-secondary-container">★ 4.9</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-container py-2 text-xs font-semibold text-white">
                <MessageSquare size={16} /> Message
              </button>
              <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest py-2 text-xs font-semibold">
                <Phone size={16} /> Call
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/customer/book" className="block">
          <QuickLink icon={HelpCircle} tone="bg-secondary-fixed text-on-secondary-fixed" title="Book a Truck" text="Create a new cargo request" />
        </Link>
        <Link to="/customer/shipments" className="block">
          <QuickLink icon={FileText} tone="bg-tertiary-fixed text-on-tertiary-fixed" title="My Shipments" text="View, edit, and cancel requests" />
        </Link>
        <Link to="/customer/payments" className="block">
          <QuickLink icon={CreditCard} tone="bg-primary-fixed text-on-primary-fixed" title="Billing Central" text="Payment history and invoices" />
        </Link>
      </div>

      {(requests?.data || []).length > 0 && (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">Recent Requests</h2>
          <div className="space-y-3">
            {(requests?.data || []).slice(0, 4).map((req) => (
              <Link
                key={req.id}
                to="/customer/shipments"
                className="flex items-center justify-between rounded-lg border border-outline-variant/50 px-4 py-3 transition hover:bg-surface-container-low"
              >
                <div>
                  <p className="font-semibold text-primary">{req.id}</p>
                  <p className="text-sm text-on-surface-variant">
                    {req.pickup} → {req.destination}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon: Icon, tone, value, label, foot, hint }) {
  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition hover:shadow-[0px_8px_24px_rgba(0,0,0,0.1)]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon size={20} />
        </div>
        {hint}
      </div>
      <div className="text-[32px] font-bold leading-10 text-primary-container">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</div>
      <div className="mt-4 border-t border-surface-variant pt-4 text-xs text-on-surface-variant">{foot}</div>
    </article>
  );
}

function QuickLink({ icon: Icon, tone, title, text }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left transition hover:shadow-md">
      <div className={`rounded-xl p-3 ${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-primary-container">{title}</h3>
        <p className="text-xs text-on-surface-variant">{text}</p>
      </div>
      <ChevronRight className="ml-auto text-on-surface-variant" size={18} />
    </div>
  );
}
