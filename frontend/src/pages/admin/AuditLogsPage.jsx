import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { useAuditLogs } from "../../hooks/useApi";

export function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable record of admin actions across users, trips, and settings."
      />

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">System Activity</h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading audit logs…</p>
        ) : (
          <DataTable
            rows={data?.data || []}
            empty="No audit events recorded yet."
            columns={[
              { key: "actor", label: "Actor" },
              { key: "action", label: "Action" },
              { key: "entity", label: "Entity" },
              { key: "entityId", label: "Entity ID" },
              {
                key: "createdAt",
                label: "When",
                render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "—")
              }
            ]}
          />
        )}
      </section>
    </div>
  );
}
