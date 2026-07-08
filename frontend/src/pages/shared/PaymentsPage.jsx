import { useState } from "react";
import { useForm } from "react-hook-form";
import { CreditCard, DollarSign, Plus, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { MetricCard } from "../../components/ui/MetricCard";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import {
  useCustomers,
  usePaymentMutations,
  usePayments,
  useTrips
} from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { money } from "../../utils/helpers";

export function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { data, isLoading } = usePayments();
  const { update, create, remove } = usePaymentMutations();
  const { data: customers } = useCustomers({ enabled: isAdmin });
  const { data: trips } = useTrips({ limit: 100, enabled: isAdmin });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: { amount: "", method: "card", status: "Pending", tripId: "", customerId: "" }
  });

  const rows = (data?.data || []).filter((row) =>
    isAdmin ? true : row.customerId === user.id
  );
  const paid = rows.filter((r) => r.status === "Paid");
  const pending = rows.filter((r) => r.status !== "Paid");
  const total = paid.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  async function setStatus(id, status) {
    try {
      await update.mutateAsync({ id, status });
    } catch (err) {
      alert(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this payment record?")) return;
    try {
      await remove.mutateAsync(id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function onCreate(values) {
    setError("");
    try {
      await create.mutateAsync({
        customerId: values.customerId,
        tripId: values.tripId || undefined,
        amount: Number(values.amount),
        method: values.method,
        status: values.status
      });
      setCreating(false);
      reset();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? "Finance" : "Payment History"}
        subtitle={
          isAdmin
            ? "Track marketplace payments, invoices, and settlement status."
            : "Review charges and payment status for your shipments."
        }
        actions={
          isAdmin ? (
            <Button onClick={() => { setCreating(true); setError(""); }}>
              <Plus size={16} /> Add payment
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Wallet} label="Total collected" value={money(total)} tone="green" />
        <MetricCard icon={CreditCard} label="Transactions" value={rows.length} tone="orange" />
        <MetricCard icon={DollarSign} label="Pending" value={pending.length} tone="navy" />
      </div>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">
            {isAdmin ? "All Payments" : "Your Payments"}
          </h2>
        </div>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">Loading payments…</p>
        ) : (
          <DataTable
            rows={rows}
            empty="No payment records yet."
            columns={[
              { key: "id", label: "Payment" },
              { key: "tripId", label: "Trip" },
              ...(isAdmin ? [{ key: "customer", label: "Customer" }] : []),
              {
                key: "amount",
                label: "Amount",
                render: (row) => money(row.amount)
              },
              { key: "method", label: "Method" },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "createdAt",
                label: "Date",
                render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—")
              },
              ...(isAdmin
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      render: (row) => (
                        <div className="flex flex-wrap items-center gap-1">
                          {["Paid", "Pending", "Failed", "Refunded"].map((status) => (
                            <Button
                              key={status}
                              variant="secondary"
                              className="px-2 py-1 text-xs"
                              onClick={() => setStatus(row.id, status)}
                            >
                              {status}
                            </Button>
                          ))}
                          <button
                            type="button"
                            className="p-1 text-error"
                            onClick={() => onDelete(row.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    }
                  ]
                : [])
            ]}
          />
        )}
      </section>

      {creating && (
        <Modal title="Create payment" onClose={() => setCreating(false)} wide>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onCreate)}>
            <select className="stitch-input sm:col-span-2" {...register("customerId", { required: true })}>
              <option value="">Select customer</option>
              {(customers?.data || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
            <select className="stitch-input sm:col-span-2" {...register("tripId")}>
              <option value="">Trip (optional)</option>
              {(trips?.data || []).map((t) => (
                <option key={t.id} value={t.id}>{t.id} — {t.pickup} → {t.destination}</option>
              ))}
            </select>
            <input
              className="stitch-input"
              type="number"
              step="0.01"
              placeholder="Amount"
              {...register("amount", { required: true })}
            />
            <select className="stitch-input" {...register("method")}>
              <option value="card">Card</option>
              <option value="bank">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
            <select className="stitch-input" {...register("status")}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
            {error && <p className="sm:col-span-2 text-sm text-error">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
              <Button disabled={isSubmitting || create.isPending}>Create payment</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
