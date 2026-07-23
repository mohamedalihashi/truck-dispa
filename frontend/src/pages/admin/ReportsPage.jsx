import { useMemo, useState } from "react";
import { Download, Printer, RotateCcw, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { usePayments, useTrips, useTrucks, useUsers } from "../../hooks/useApi";
import { money } from "../../utils/helpers";
import { UserActivityReport } from "./UserActivityReport";
import { DeliveryFeedbackReport } from "./DeliveryFeedbackReport";

const REPORTS = {
  trucks: { label: "Truck report", description: "Fleet, assigned drivers, capacity, and availability." },
  users: { label: "User report", description: "Customers, dispatchers, drivers, and account status." },
  dispatch: { label: "Dispatch report", description: "Trips, routes, assignments, fares, and delivery status." },
  payments: { label: "Payment report", description: "Invoices, collections, balances, and payment status." }
};

const date = (value) => (value ? new Date(value).toLocaleDateString() : "—");

/** Local YYYY-MM-DD (avoids UTC day-shift from toISOString). */
function toLocalDateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inDateRange(value, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const rowDate = toLocalDateKey(value);
  if (!rowDate) return false;
  if (dateFrom && rowDate < dateFrom) return false;
  if (dateTo && rowDate > dateTo) return false;
  return true;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(name, columns, rows) {
  const csv = [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(column.export ? column.export(row) : row[column.key])).join(","))
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildTruckReport(rows, loading) {
  return {
    rows,
    loading,
    chartTitle: "Fleet status distribution",
    chartData: ["Available", "Busy", "Maintenance"].map((status) => ({
      name: status,
      value: rows.filter((row) => row.status === status).length
    })),
    metrics: [
      ["Total trucks", rows.length],
      ["Available", rows.filter((row) => row.status === "Available").length],
      ["Busy", rows.filter((row) => row.status === "Busy").length],
      ["Maintenance", rows.filter((row) => row.status === "Maintenance").length]
    ],
    columns: [
      { key: "truckNumber", label: "Truck" },
      { key: "plateNumber", label: "Plate" },
      { key: "truckType", label: "Type" },
      { key: "capacity", label: "Capacity" },
      { key: "driver", label: "Driver" },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Registered", render: (row) => date(row.createdAt), export: (row) => date(row.createdAt) }
    ]
  };
}

function buildUserReport(rows, loading) {
  return {
    rows,
    loading,
    chartTitle: "Users by role",
    chartData: ["customer", "dispatcher", "driver", "admin"].map((role) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: rows.filter((row) => row.role === role).length
    })),
    metrics: [
      ["Total users", rows.length],
      ["Customers", rows.filter((row) => row.role === "customer").length],
      ["Dispatchers", rows.filter((row) => row.role === "dispatcher").length],
      ["Drivers", rows.filter((row) => row.role === "driver").length]
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Registered", render: (row) => date(row.createdAt), export: (row) => date(row.createdAt) }
    ]
  };
}

function buildDispatchReport(rows, loading) {
  return {
    rows,
    loading,
    chartTitle: "Trips by status",
    chartData: ["Pending", "Assigned", "In Transit", "Delivered", "Cancelled"].map((status) => ({
      name: status,
      value: rows.filter((row) => row.status === status).length
    })),
    metrics: [
      ["Total trips", rows.length],
      ["Delivered", rows.filter((row) => row.status === "Delivered").length],
      ["Active", rows.filter((row) => !["Delivered", "Cancelled", "Pending"].includes(row.status)).length],
      ["Total fares", money(rows.reduce((sum, row) => sum + Number(row.fare || 0), 0))]
    ],
    columns: [
      { key: "id", label: "Trip", render: (row) => String(row.id).slice(0, 8), export: (row) => row.id },
      { key: "customer", label: "Customer" },
      { key: "driver", label: "Driver" },
      { key: "dispatcher", label: "Dispatcher" },
      { key: "route", label: "Route" },
      { key: "fare", label: "Fare", render: (row) => money(row.fare) },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Created", render: (row) => date(row.createdAt), export: (row) => date(row.createdAt) }
    ]
  };
}

function buildPaymentReport(rows, loading) {
  return {
    rows,
    loading,
    chartTitle: "Payment collection overview",
    chartData: [
      { name: "Invoiced", value: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) },
      { name: "Collected", value: rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0) },
      { name: "Balance", value: rows.reduce((sum, row) => sum + Number(row.balanceDue || 0), 0) }
    ],
    metrics: [
      ["Invoices", rows.length],
      ["Invoice total", money(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0))],
      ["Collected", money(rows.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0))],
      ["Balance due", money(rows.reduce((sum, row) => sum + Number(row.balanceDue || 0), 0))]
    ],
    columns: [
      { key: "referenceId", label: "Reference" },
      { key: "customer", label: "Customer" },
      { key: "amount", label: "Amount", render: (row) => `${money(row.amount)} ${row.currency || ""}` },
      { key: "amountPaid", label: "Paid", render: (row) => money(row.amountPaid) },
      { key: "balanceDue", label: "Balance", render: (row) => money(row.balanceDue) },
      { key: "method", label: "Method" },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Date", render: (row) => date(row.createdAt), export: (row) => date(row.createdAt) }
    ]
  };
}

export function ReportsPage() {
  const [type, setType] = useState("trucks");
  const [reportSearch, setReportSearch] = useState("");
  const [reportUserId, setReportUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const trucks = useTrucks({ limit: 500 });
  const users = useUsers({ limit: 500 });
  const trips = useTrips({ limit: 500 });
  const payments = usePayments({ limit: 500 });

  const report = useMemo(() => {
    const needle = reportSearch.trim().toLowerCase();
    let source = [];
    let loading = false;
    let build = buildTruckReport;

    if (type === "trucks") {
      source = trucks.data?.data || [];
      loading = trucks.isLoading;
      build = buildTruckReport;
    } else if (type === "users") {
      source = users.data?.data || [];
      loading = users.isLoading;
      build = buildUserReport;
    } else if (type === "dispatch") {
      source = trips.data?.data || [];
      loading = trips.isLoading;
      build = buildDispatchReport;
    } else {
      source = payments.data?.data || [];
      loading = payments.isLoading;
      build = buildPaymentReport;
    }

    const rows = source.filter((row) => {
      if (type === "users" && reportUserId && String(row.id) !== String(reportUserId)) return false;
      if (!inDateRange(row.createdAt, dateFrom, dateTo)) return false;
      if (!needle) return true;

      const searchable = [
        row.id,
        row.truckId,
        row.truckNumber,
        row.plateNumber,
        row.name,
        row.email,
        row.phone,
        row.customer,
        row.driver,
        row.dispatcher,
        row.referenceId,
        row.route,
        row.pickup,
        row.destination,
        row.status,
        row.role,
        row.method
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(needle);
    });

    return build(rows, loading);
  }, [
    type,
    reportSearch,
    reportUserId,
    dateFrom,
    dateTo,
    trucks.data,
    trucks.isLoading,
    users.data,
    users.isLoading,
    trips.data,
    trips.isLoading,
    payments.data,
    payments.isLoading
  ]);

  function resetReportFilters() {
    setReportSearch("");
    setReportUserId("");
    setDateFrom("");
    setDateTo("");
  }

  const dateFilterActive = Boolean(dateFrom || dateTo);

  return (
    <div>
      <PageHeader
        title="Report Center"
        subtitle="Prepare and export a separate operational report for every part of the business."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={17} /> Print
            </Button>
            <Button onClick={() => downloadCsv(type, report.columns, report.rows)} disabled={!report.rows.length}>
              <Download size={17} /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        {Object.entries(REPORTS).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setType(key);
              setReportUserId("");
            }}
            className={`rounded-xl border p-4 text-left transition ${
              type === key
                ? "border-secondary-container bg-secondary-container text-on-secondary-container shadow-md"
                : "border-outline-variant bg-surface-container-lowest hover:border-secondary-container"
            }`}
          >
            <span className="font-semibold">{item.label}</span>
            <span className={`mt-1 block text-xs ${type === key ? "text-on-secondary-container/80" : "text-on-surface-variant"}`}>
              {item.description}
            </span>
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm print:hidden">
        <div className="mb-4">
          <h2 className="font-semibold text-on-surface">Search and filter report</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Filter by date range (registered / created date), search text, or a specific user. Metrics and chart update with the filter.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Search report</span>
            <Search className="absolute bottom-3 left-3 text-on-surface-variant" size={16} />
            <input
              className="stitch-input pl-9"
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="Truck ID, user, driver, phone, or email"
            />
          </label>
          {type === "users" && (
            <label>
              <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Select specific user</span>
              <select className="stitch-input" value={reportUserId} onChange={(event) => setReportUserId(event.target.value)}>
                <option value="">All users</option>
                {(users.data?.data || []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role} · {user.phone || user.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Date from</span>
            <input
              className="stitch-input"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              max={dateTo || undefined}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-on-surface-variant">Date to</span>
            <input
              className="stitch-input"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              min={dateFrom || undefined}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">{report.rows.length}</span> matching records
            {dateFilterActive ? (
              <span className="ml-2 text-xs text-secondary-container">
                · {dateFrom || "…"} → {dateTo || "…"}
              </span>
            ) : null}
          </p>
          <Button type="button" variant="outline" onClick={resetReportFilters}>
            <RotateCcw size={16} /> Reset Filters
          </Button>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-2 text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </section>

      {type === "users" && (
        <div className="mb-6">
          <UserActivityReport />
        </div>
      )}

      <section className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold text-on-surface">{report.chartTitle}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.chartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={type === "payments"} />
              <Tooltip formatter={(value) => (type === "payments" ? money(value) : value)} />
              <Bar dataKey="value" name={type === "payments" ? "Amount" : "Records"} fill="#fe6b00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{REPORTS[type].label}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Generated {new Date().toLocaleString()} · {report.rows.length} records
            </p>
          </div>
        </div>
        {report.loading ? (
          <p className="px-6 py-10 text-center text-on-surface-variant">Preparing report…</p>
        ) : (
          <DataTable columns={report.columns} rows={report.rows} empty="No data available for this report." />
        )}
      </section>
      <DeliveryFeedbackReport />
    </div>
  );
}
