import { useMemo, useState } from "react";
import { Eye, MessageSquareWarning, RotateCcw, Search } from "lucide-react";
import { useDeliveryFeedbackReport } from "../../hooks/useApi";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";

const stars = (value) => value ? `${value}/5` : "—";

export function DeliveryFeedbackReport() {
  const [complaintsOnly, setComplaintsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [details, setDetails] = useState(null);
  const query = useDeliveryFeedbackReport({ complaintsOnly, limit: 500 });

  const rows = useMemo(() => (query.data?.data || []).filter((row) => {
    const created = row.createdAt?.slice(0, 10);
    if (dateFrom && created < dateFrom) return false;
    if (dateTo && created > dateTo) return false;
    const needle = search.trim().toLowerCase();
    return !needle || [row.tripId, row.customer, row.driver, row.senderName, row.receiverName, row.comment]
      .filter(Boolean).join(" ").toLowerCase().includes(needle);
  }), [query.data, search, dateFrom, dateTo]);

  const columns = [
    { key: "tripId", label: "Booking number" },
    { key: "customer", label: "Customer" },
    { key: "driver", label: "Driver" },
    { key: "rating", label: "Overall", render: (row) => stars(row.rating) },
    { key: "individual", label: "Individual ratings", render: (row) => `Behaviour ${stars(row.driverBehaviourRating)} · Speed ${stars(row.deliverySpeedRating)} · Condition ${stars(row.cargoConditionRating)}` },
    { key: "comment", label: "Comment", render: (row) => row.comment || "—" },
    { key: "complaintStatus", label: "Complaint", type: "status" },
    { key: "createdAt", label: "Submitted", render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: "actions", label: "Action", render: (row) => <Button variant="outline" onClick={() => setDetails(row)}><Eye size={15} /> View Details</Button> }
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant px-6 py-5">
        <h2 className="text-xl font-semibold text-primary-container">Admin Feedback Report</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Delivery ratings and complaints submitted through secure feedback links.</p>
      </div>
      <div className="grid gap-3 border-b border-outline-variant p-5 md:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search className="absolute bottom-3 left-3 text-on-surface-variant" size={16} />
          <span className="mb-1 block text-xs font-semibold">Search booking, customer, or driver</span>
          <input className="stitch-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label><span className="mb-1 block text-xs font-semibold">From</span><input className="stitch-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || undefined} /></label>
        <label><span className="mb-1 block text-xs font-semibold">To</span><input className="stitch-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom || undefined} /></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={complaintsOnly} onChange={(e) => setComplaintsOnly(e.target.checked)} /><MessageSquareWarning size={16} /> Complaints only</label>
        <Button variant="outline" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setComplaintsOnly(false); }}><RotateCcw size={15} /> Reset</Button>
      </div>
      {query.isLoading ? <p className="p-8 text-center text-on-surface-variant">Loading feedback…</p> : <DataTable columns={columns} rows={rows} empty="No delivery feedback matches these filters." />}
      {details && <Modal title={`Feedback · ${details.tripId}`} onClose={() => setDetails(null)} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Customer", details.customer], ["Driver", details.driver], ["Sender", details.senderName],
            ["Receiver", details.receiverName], ["Overall", stars(details.rating)],
            ["Driver behaviour", stars(details.driverBehaviourRating)], ["Delivery speed", stars(details.deliverySpeedRating)],
            ["Cargo condition", stars(details.cargoConditionRating)], ["Cargo received safely", details.cargoReceivedSafely ? "Yes" : "No"],
            ["Complaint status", details.complaintStatus], ["Route", details.route], ["Submitted", new Date(details.createdAt).toLocaleString()]
          ].map(([label, value]) => <div key={label}><p className="text-xs uppercase text-on-surface-variant">{label}</p><p className="font-semibold">{value || "—"}</p></div>)}
          <div className="sm:col-span-2"><p className="text-xs uppercase text-on-surface-variant">Comment</p><p className="mt-1 whitespace-pre-wrap">{details.comment || "—"}</p></div>
        </div>
      </Modal>}
    </section>
  );
}
