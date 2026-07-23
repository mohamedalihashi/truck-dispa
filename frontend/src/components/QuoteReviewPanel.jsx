import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard, X } from "lucide-react";
import { Button } from "./ui/Button";
import { PriceBreakdown } from "./PriceBreakdown";
import { usePricingMutations } from "../hooks/useApi";

export function QuoteReviewPanel({ request, onAccept, onReject, loading, error }) {
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const pricing = usePricingMutations();

  if (!request) return null;

  const canPay = ["Approved", "Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delivered"].includes(
    request.status
  );

  async function handlePay() {
    const result = await pricing.pay.mutateAsync(request.id);
    navigate(result.payPath || "/customer/payments");
  }

  return (
    <div className="rounded-xl border border-secondary-container/30 bg-secondary-container/10 p-4">
      <p className="text-sm font-semibold text-on-surface">Quotation for review</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Review the calculated price, any dispatcher adjustment, and estimated delivery time.
      </p>

      <div className="mt-4">
        <PriceBreakdown
          distanceKm={request.distanceKm}
          weight={request.weight}
          calculatedPrice={request.calculatedPrice}
          adjustmentType={request.adjustmentType}
          adjustmentAmount={request.adjustmentAmount}
          adjustmentReason={request.adjustmentReason}
          finalPrice={request.finalPrice ?? request.quotedPrice}
          quotedPrice={request.quotedPrice}
          status={request.status}
          quoteStatus={
            request.status === "Awaiting Approval"
              ? "Waiting for Approval"
              : request.status === "Quote Rejected"
                ? "Rejected"
                : request.status === "Approved"
                  ? "Accepted"
                  : undefined
          }
        />
      </div>

      {request.quotedEstimatedTime ? (
        <p className="mt-3 text-sm text-on-surface-variant">
          Estimated time: <strong className="text-on-surface">{request.quotedEstimatedTime}</strong>
        </p>
      ) : null}
      {request.quoteNotes ? (
        <p className="mt-2 text-sm text-on-surface-variant">
          Notes: <span className="text-on-surface">{request.quoteNotes}</span>
        </p>
      ) : null}

      {request.status === "Awaiting Approval" ? (
        <>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block font-medium text-on-surface-variant">
              Rejection note (optional)
            </span>
            <textarea
              className="stitch-input min-h-16 w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell dispatch what should change…"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => onAccept(request.id)} disabled={loading}>
              <Check size={16} />
              Accept quote
            </Button>
            <Button type="button" variant="secondary" onClick={() => onReject(request.id, note)} disabled={loading}>
              <X size={16} />
              Reject quote
            </Button>
          </div>
        </>
      ) : null}

      {canPay ? (
        <div className="mt-4">
          <Button type="button" onClick={handlePay} disabled={pricing.pay.isPending}>
            <CreditCard size={16} />
            {pricing.pay.isPending ? "Preparing…" : "Pay online"}
          </Button>
          {pricing.pay.isError ? (
            <p className="mt-2 text-sm text-error">{pricing.pay.error.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
