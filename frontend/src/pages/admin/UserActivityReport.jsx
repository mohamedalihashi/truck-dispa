import { useMemo, useState } from "react";
import { Download, Eye, FileText, Printer, RotateCcw, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUserActivityReport, useUsers } from "../../hooks/useApi";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { money, titleCase } from "../../utils/helpers";

const ACTIVITY_TYPES = [
  "auth.login", "auth.logout", "cargo.created", "cargo.updated", "cargo.cancelled",
  "cargo.quote.sent", "cargo.assigned", "trip.assigned", "trip.accepted", "trip.rejected",
  "trip.status.updated", "trip.proof.uploaded", "payment.created", "payment.waafipay.completed",
  "payment.failed", "payment.refunded", "profile.updated", "password.changed", "user.created",
  "user.updated", "user.deleted", "driver.verified", "settings.updated", "report.user_activity.generated"
];

const SUMMARY_LABELS = {
  totalActivities: "Total activities", cargoRequestsCreated: "Cargo requests created",
  tripsAssigned: "Trips assigned", tripsAccepted: "Trips accepted", tripsCompleted: "Trips completed",
  tripsCancelled: "Trips cancelled", quotesSubmitted: "Quotes submitted",
  paymentsProcessed: "Payments processed", proofOfDeliveryUploads: "Proof of delivery uploads",
  profileOrAccountChanges: "Profile / account changes", lastLoginAt: "Last login date",
  totalActiveDays: "Total active days"
};

const PERFORMANCE_LABELS = {
  assignedTrips: "Assigned trips", acceptedTrips: "Accepted trips", completedTrips: "Completed trips",
  cancelledTrips: "Cancelled trips", onTimeDeliveries: "On-time deliveries", lateDeliveries: "Late deliveries",
  totalDistance: "Total distance", totalEarnings: "Total earnings", averageRating: "Average rating",
  cargoRequestsManaged: "Cargo requests managed", driversAssigned: "Drivers assigned", trucksAssigned: "Trucks assigned",
  activeDispatches: "Active dispatches", completedDispatches: "Completed dispatches",
  cancelledDispatches: "Cancelled dispatches", totalRevenueManaged: "Total revenue managed",
  cargoRequestsCreated: "Cargo requests created", acceptedRequests: "Accepted requests",
  cancelledRequests: "Cancelled requests", completedDeliveries: "Completed deliveries",
  totalAmountPaid: "Total amount paid", outstandingBalance: "Outstanding balance",
  usersCreatedOrSuspended: "Users created / suspended", trucksManaged: "Trucks managed",
  reportsGenerated: "Reports generated", settingsChanged: "Settings changed", paymentsReviewed: "Payments reviewed"
};

function localDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function rangeFor(preset, customFrom, customTo) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  if (preset === "custom") return { from: customFrom ? `${customFrom}T00:00:00` : "", to: customTo ? `${customTo}T23:59:59.999` : "" };
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (preset === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportActivities(rows, userName) {
  const headings = ["Date and time", "User", "Role", "Activity", "Description", "Related ID", "Previous value", "New value", "IP address", "Device / browser", "Status"];
  const values = rows.map((row) => [
    new Date(row.createdAt).toLocaleString(), row.userName, row.userRole, row.action, row.description,
    row.entityId, JSON.stringify(row.oldValues || ""), JSON.stringify(row.newValues || ""),
    row.ipAddress, row.userAgent, row.status
  ]);
  const blob = new Blob(["\uFEFF", [headings, ...values].map((line) => line.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${userName.replace(/\s+/g, "-").toLowerCase()}-activity-${localDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function displayValue(key, value) {
  if (value == null || value === "") return "—";
  if (key === "lastLoginAt") return new Date(value).toLocaleString();
  if (/earnings|revenue|amount|balance/i.test(key)) return money(value);
  if (key === "averageRating") return Number(value).toFixed(1);
  if (key === "totalDistance") return `${Number(value).toFixed(1)} km`;
  return value;
}

export function UserActivityReport() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [activityType, setActivityType] = useState("");
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [params, setParams] = useState(null);
  const [details, setDetails] = useState(null);
  const users = useUsers({ search: search || undefined, role: role || undefined, limit: 200 });
  const report = useUserActivityReport(params, { enabled: Boolean(params?.userId) });
  const result = report.data;
  const userOptions = users.data?.data || [];

  const timeline = useMemo(() => {
    const days = new Map();
    for (const row of result?.activities || []) {
      const day = new Date(row.createdAt).toLocaleDateString();
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(row);
    }
    return [...days.entries()].slice(0, 14);
  }, [result]);

  function generate() {
    if (!userId) return;
    const range = rangeFor(period, customFrom, customTo);
    setParams({ userId, activityType: activityType || undefined, groupBy, from: range.from || undefined, to: range.to || undefined, limit: 5000 });
  }

  function reset() {
    setSearch(""); setRole(""); setUserId(""); setActivityType(""); setPeriod("month");
    setCustomFrom(""); setCustomTo(""); setGroupBy("day"); setParams(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm print:hidden">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-primary-container">Detailed User Activity Report</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Select one user to review their complete server-recorded activity and performance.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Search user</span>
            <Search className="absolute bottom-3 left-3 text-on-surface-variant" size={16} />
            <input className="stitch-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone, email, or user ID" />
          </label>
          <Filter label="Role" value={role} onChange={(value) => { setRole(value); setUserId(""); }}>
            <option value="">All roles</option>
            {["customer", "driver", "dispatcher", "admin"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </Filter>
          <Filter label="Specific user" value={userId} onChange={setUserId}>
            <option value="">Select user</option>
            {userOptions.map((user) => <option key={user.id} value={user.id}>{user.name} · {titleCase(user.role)} · {user.phone || user.email}</option>)}
          </Filter>
          <Filter label="Activity type" value={activityType} onChange={setActivityType}>
            <option value="">All activities</option>
            {ACTIVITY_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll(".", " ")}</option>)}
          </Filter>
          <Filter label="Date range" value={period} onChange={setPeriod}>
            <option value="today">Today</option><option value="yesterday">Yesterday</option>
            <option value="week">This Week</option><option value="month">This Month</option>
            <option value="year">This Year</option><option value="custom">Custom Date Range</option>
          </Filter>
          {period === "custom" && <>
            <label><span className="mb-1 block text-xs font-semibold text-on-surface-variant">From</span><input className="stitch-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} max={customTo || undefined} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-on-surface-variant">To</span><input className="stitch-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} min={customFrom || undefined} max={localDate(new Date())} /></label>
          </>}
          <Filter label="Group results" value={groupBy} onChange={setGroupBy}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </Filter>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={reset}><RotateCcw size={16} /> Reset Filters</Button>
          <Button type="button" onClick={generate} disabled={!userId || report.isFetching}><FileText size={16} /> {report.isFetching ? "Generating…" : "Generate Report"}</Button>
        </div>
      </section>

      {report.isError && <p className="rounded-xl bg-error/10 p-4 text-sm text-error">{report.error.message}</p>}
      {!result && !report.isFetching && <p className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">Choose a user and generate the report.</p>}
      {result && <>
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Print</Button>
          <Button variant="outline" onClick={() => exportActivities(result.activities, result.profile.name)}><Download size={16} /> Export CSV</Button>
          <Button onClick={() => window.print()}><FileText size={16} /> Export PDF</Button>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="font-semibold text-primary-container">Profile information</h3>
            <dl className="mt-4 space-y-2 text-sm">
              {[["Name", result.profile.name], ["User ID", result.profile.id], ["Role", titleCase(result.profile.role)], ["Email", result.profile.email], ["Phone", result.profile.phone], ["Status", result.profile.status], ["Registered", new Date(result.profile.createdAt).toLocaleDateString()]].map(([label, value]) => <Info key={label} label={label} value={value} />)}
            </dl>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 lg:col-span-2">
            <h3 className="font-semibold text-primary-container">{titleCase(result.profile.role)} performance statistics</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {Object.entries(result.rolePerformance).map(([key, value]) => <Metric key={key} label={PERFORMANCE_LABELS[key] || titleCase(key)} value={displayValue(key, value)} />)}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Object.entries(result.summary).map(([key, value]) => <Metric key={key} label={SUMMARY_LABELS[key]} value={displayValue(key, value)} />)}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 xl:col-span-2">
            <h3 className="mb-5 font-semibold text-primary-container">Activity by {groupBy}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="activities" fill="#a04100" radius={[7, 7, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="mb-4 font-semibold text-primary-container">Daily activity timeline</h3>
            <div className="max-h-72 space-y-4 overflow-auto">
              {timeline.map(([day, rows]) => <div key={day} className="border-l-2 border-secondary-container pl-3"><p className="text-xs font-bold text-secondary-container">{day} · {rows.length}</p>{rows.slice(0, 3).map((row) => <p key={row.id} className="mt-1 text-xs text-on-surface-variant">{row.description}</p>)}</div>)}
              {!timeline.length && <p className="text-sm text-on-surface-variant">No activity in this period.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant px-5 py-4">
            <h3 className="font-semibold text-primary-container">User Activity History</h3>
            <p className="mt-1 text-xs text-on-surface-variant">{result.activities.length} filtered activities</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant"><tr>{["Date and time", "User", "Role", "Activity type", "Description", "Related ID", "Previous value", "New value", "IP address", "Device / browser", "Status", "Action"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody>{result.activities.map((row) => <tr key={row.id} className="border-t border-outline-variant/50">
                <td className="whitespace-nowrap px-3 py-3">{new Date(row.createdAt).toLocaleString()}</td><td className="px-3 py-3">{row.userName}</td><td className="px-3 py-3">{titleCase(row.userRole)}</td>
                <td className="px-3 py-3 font-medium">{row.action}</td><td className="max-w-64 px-3 py-3">{row.description}</td><td className="px-3 py-3 font-mono">{row.entityId || "—"}</td>
                <td className="max-w-48 truncate px-3 py-3">{JSON.stringify(row.oldValues || "") || "—"}</td><td className="max-w-48 truncate px-3 py-3">{JSON.stringify(row.newValues || "") || "—"}</td>
                <td className="px-3 py-3 font-mono">{row.ipAddress || "—"}</td><td className="max-w-48 truncate px-3 py-3">{row.userAgent || "—"}</td><td className="px-3 py-3">{row.status}</td>
                <td className="px-3 py-3 print:hidden"><button className="inline-flex items-center gap-1 text-secondary-container" onClick={() => setDetails(row)}><Eye size={14} /> View Details</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      </>}

      {details && <Modal title="Activity details" onClose={() => setDetails(null)} wide>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {Object.entries(details).map(([key, value]) => <div key={key} className={["oldValues", "newValues", "description", "userAgent"].includes(key) ? "sm:col-span-2" : ""}><p className="text-xs font-semibold uppercase text-on-surface-variant">{key}</p><pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-surface-container-low p-3 font-sans">{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? "—")}</pre></div>)}
        </div>
      </Modal>}
    </div>
  );
}

function Filter({ label, value, onChange, children }) {
  return <label><span className="mb-1 block text-xs font-semibold text-on-surface-variant">{label}</span><select className="stitch-input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"><p className="text-xs text-on-surface-variant">{label}</p><p className="mt-2 text-xl font-bold text-primary-container">{value ?? "—"}</p></div>;
}

function Info({ label, value }) {
  return <div className="flex gap-3 border-b border-outline-variant/40 pb-2"><dt className="w-24 shrink-0 text-on-surface-variant">{label}</dt><dd className="min-w-0 break-words font-medium text-primary-container">{value || "—"}</dd></div>;
}
