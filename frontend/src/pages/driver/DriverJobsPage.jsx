import { useRef, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useTripActions, useTrips } from "../../hooks/useApi";
import { nextTripStatus } from "../../utils/helpers";
import { api } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";

export function DriverJobsPage() {
  const { data } = useTrips();
  const actions = useTripActions();
  const fileRef = useRef(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  async function uploadProof(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedTrip) return;
    const formData = new FormData();
    formData.append("proof", file);
    try {
      await api.uploadProof(selectedTrip, formData);
      setMessage(`Proof uploaded for ${selectedTrip}`);
      qc.invalidateQueries({ queryKey: ["trips"] });
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Jobs" subtitle="Accept, reject, update status, and upload delivery proof." />
      {message && (
        <p className="rounded-xl border border-primary-fixed bg-primary-fixed/40 px-4 py-3 text-sm text-primary-container">
          {message}
        </p>
      )}
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Assigned Deliveries</h2>
        </div>
        <DataTable
          rows={data?.data || []}
          columns={[
            { key: "id", label: "Trip" },
            {
              key: "route",
              label: "Route",
              render: (row) => `${row.pickup} → ${row.destination}`
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.status === "Assigned" && (
                    <>
                      <Button className="px-3 py-1.5 text-xs" onClick={() => actions.accept.mutate(row.id)}>
                        Accept
                      </Button>
                      <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => actions.reject.mutate(row.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {!["Assigned", "Delivered", "Cancelled"].includes(row.status) && (
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() =>
                        actions.updateStatus.mutate({ id: row.id, status: nextTripStatus(row.status) })
                      }
                    >
                      Next status
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      setSelectedTrip(row.id);
                      fileRef.current?.click();
                    }}
                  >
                    Upload POD
                  </Button>
                </div>
              )
            }
          ]}
        />
      </section>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadProof} />
    </div>
  );
}
