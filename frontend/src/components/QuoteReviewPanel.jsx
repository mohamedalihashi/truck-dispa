import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "./ui/Button";
import { money } from "../utils/helpers";

export function QuoteReviewPanel({ request, onAccept, onReject, loading, error }) {
  const [note, setNote] = useState("");

  if (!request) return null;

  return (
    <div className="rounded-xl border border-secondary-container/30 bg-secondary-container/10 p-4">
      <p className="text-sm font-semibold text-on-surface">Quotation for review</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Review the price and estimated delivery time from dispatch.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Price</dt>
          <dd className="mt-1 text-lg font-bold text-primary">{money(request.quotedPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Estimated time</dt>
          <dd className="mt-1 font-semibold text-on-surface">{request.quotedEstimatedTime}</dd>
        </div>
        {request.quoteNotes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Notes</dt>
            <dd className="mt-1 text-sm text-on-surface">{request.quoteNotes}</dd>
          </div>
        ) : null}
      </dl>

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
    </div>
  );
}
