import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { usePricing } from "../../hooks/useApi";
import { api } from "../../services/api";

const EMPTY = {
  baseFee: 20,
  pricePerKm: 10,
  pricePerTon: 5,
  minimumCharge: 50,
  maximumCharge: "",
  automaticPricing: true
};

export function PricingSettingsPage() {
  const { data, isLoading, error } = usePricing();
  const [draft, setDraft] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (data) {
      setDraft({
        baseFee: data.baseFee,
        pricePerKm: data.pricePerKm,
        pricePerTon: data.pricePerTon,
        minimumCharge: data.minimumCharge,
        maximumCharge: data.maximumCharge ?? "",
        automaticPricing: Boolean(data.automaticPricing)
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.updatePricing({
        ...draft,
        maximumCharge: draft.maximumCharge === "" ? null : Number(draft.maximumCharge)
      }),
    onSuccess: (saved) => {
      qc.setQueryData(["pricing"], saved);
      setMessage("Pricing settings saved.");
    },
    onError: (err) => setMessage(err.message || "Failed to save pricing")
  });

  function setField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading) return <p className="text-sm text-on-surface-variant">Loading pricing…</p>;
  if (error) return <p className="text-sm text-error">{error.message}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Settings"
        subtitle="Define automatic transport rates. Dispatchers can still adjust quotes before sending them to customers."
      />

      <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6">
        <label className="mb-6 flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.automaticPricing}
            onChange={(e) => setField("automaticPricing", e.target.checked)}
          />
          Enable automatic pricing on new bookings
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["baseFee", "Base fee"],
            ["pricePerKm", "Price per kilometer"],
            ["pricePerTon", "Price per ton"],
            ["minimumCharge", "Minimum charge"],
            ["maximumCharge", "Maximum charge (optional)"]
          ].map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">{label}</span>
              <input
                className="stitch-input w-full"
                type="number"
                step="0.01"
                min="0"
                value={draft[key]}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={key === "maximumCharge" ? "No maximum" : undefined}
              />
            </label>
          ))}
        </div>

        <p className="mt-4 text-sm text-on-surface-variant">
          Formula: Base fee + (Distance × Price/km) + (Weight × Price/ton), then apply min/max.
        </p>

        {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}

        <div className="mt-6">
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save pricing"}
          </Button>
        </div>
      </section>
    </div>
  );
}
