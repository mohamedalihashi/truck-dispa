import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { useReports } from "../../hooks/useApi";
import { money } from "../../utils/helpers";
import { useState } from "react";

export function ReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const { data } = useReports(period);
  const chart = (data?.revenue?.data || []).map((row) => ({ name: row.label, revenue: row.revenue }));

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Daily, weekly, monthly, and yearly revenue with driver and dispatcher performance."
        actions={
          <select
            className="stitch-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        }
      />

      <section className="mb-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <h2 className="mb-4 text-xl font-semibold text-primary-container">Revenue ({period})</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart.length ? chart : [{ name: "N/A", revenue: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#a04100" fill="#ffdbcc" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">Driver performance</h2>
          <DataTable
            rows={(data?.performance?.drivers || []).map((row, i) => ({ id: i, ...row }))}
            columns={[
              { key: "name", label: "Driver" },
              { key: "completedTrips", label: "Completed" },
              {
                key: "earnings",
                label: "Earnings",
                render: (row) => money(row.earnings)
              },
              { key: "rating", label: "Rating" }
            ]}
          />
        </section>
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">Dispatcher performance</h2>
          <DataTable
            rows={(data?.performance?.dispatchers || []).map((row, i) => ({ id: i, ...row }))}
            columns={[
              { key: "name", label: "Dispatcher" },
              { key: "assignedTrips", label: "Assigned" },
              {
                key: "closeRate",
                label: "Close rate",
                render: (row) => `${Math.round(Number(row.closeRate || 0) * 100)}%`
              }
            ]}
          />
        </section>
      </div>
    </div>
  );
}
