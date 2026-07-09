import { Star } from "lucide-react";
import { DataTable } from "./ui/DataTable";
import { EmptyState } from "./ui/EmptyState";

export function StarRatingDisplay({ value, size = 14 }) {
  if (value == null) return <span className="text-on-surface-variant">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      {value}/5
    </span>
  );
}

export function TripFeedbackPanel({
  items = [],
  summary,
  loading = false,
  emptyTitle = "No customer feedback yet",
  emptyText = "Ratings appear here after customers review delivered goods.",
  showDriver = false,
  showCustomer = true,
  limit
}) {
  const rows = limit ? items.slice(0, limit) : items;

  if (loading) {
    return <p className="py-8 text-center text-sm text-on-surface-variant">Loading feedback…</p>;
  }

  return (
    <div className="space-y-4">
      {summary?.count > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Total reviews" value={summary.count} />
          <SummaryCard label="Avg delivery rating" value={summary.avgRating ?? "—"} star />
          <SummaryCard label="Avg goods rating" value={summary.avgProductRating ?? "—"} star />
        </div>
      )}

      {!rows.length ? (
        <EmptyState title={emptyTitle} text={emptyText} />
      ) : (
        <DataTable
          rows={rows}
          empty={emptyTitle}
          columns={[
            { key: "tripId", label: "Trip" },
            {
              key: "route",
              label: "Route",
              render: (row) => row.route || "—"
            },
            ...(showCustomer
              ? [{ key: "customer", label: "Customer", render: (row) => row.customer || "—" }]
              : []),
            ...(showDriver
              ? [{ key: "driver", label: "Driver", render: (row) => row.driver || "—" }]
              : []),
            {
              key: "rating",
              label: "Delivery",
              render: (row) => <StarRatingDisplay value={row.rating} />
            },
            {
              key: "productRating",
              label: "Goods",
              render: (row) => <StarRatingDisplay value={row.productRating} />
            },
            {
              key: "comment",
              label: "Comment",
              render: (row) => (
                <span className="line-clamp-2 max-w-xs text-sm text-on-surface-variant">
                  {row.comment || "—"}
                </span>
              )
            },
            {
              key: "createdAt",
              label: "Date",
              render: (row) =>
                row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"
            }
          ]}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, star = false }) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-xl font-bold text-primary-container">
        {star && value !== "—" ? <Star size={18} className="fill-amber-400 text-amber-400" /> : null}
        {value}
      </p>
    </div>
  );
}
