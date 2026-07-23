import { money } from "../utils/helpers";

export function PriceBreakdown({
  distanceKm,
  weight,
  calculatedPrice,
  adjustmentType,
  adjustmentAmount,
  adjustmentReason,
  finalPrice,
  quotedPrice,
  status,
  quoteStatus
}) {
  const displayFinal = finalPrice ?? quotedPrice;
  const hasAdjustment =
    adjustmentType &&
    calculatedPrice != null &&
    displayFinal != null &&
    Number(displayFinal) !== Number(calculatedPrice);

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 p-4">
      <p className="text-sm font-semibold text-on-surface">Price breakdown</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {distanceKm != null ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Distance</dt>
            <dd className="mt-1 font-semibold">{distanceKm} km</dd>
          </div>
        ) : null}
        {weight ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Cargo weight</dt>
            <dd className="mt-1 font-semibold">{weight}</dd>
          </div>
        ) : null}
        {calculatedPrice != null ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Calculated price</dt>
            <dd className="mt-1 font-semibold">{money(calculatedPrice)}</dd>
          </div>
        ) : null}
        {hasAdjustment ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Adjustment</dt>
            <dd className="mt-1 font-semibold">
              {adjustmentType}
              {adjustmentType !== "Fixed" ? ` ${adjustmentType === "Discount" ? "−" : "+"}${money(adjustmentAmount)}` : ` ${money(adjustmentAmount)}`}
            </dd>
          </div>
        ) : null}
        {hasAdjustment && adjustmentReason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Reason</dt>
            <dd className="mt-1 text-sm">{adjustmentReason}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Final price</dt>
          <dd className="mt-1 text-lg font-bold text-primary">{money(displayFinal)}</dd>
        </div>
        {(quoteStatus || status) ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-on-surface-variant">Status</dt>
            <dd className="mt-1 font-semibold">{quoteStatus || status}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
