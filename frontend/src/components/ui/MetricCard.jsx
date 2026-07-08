export function MetricCard({ icon: Icon, label, value, hint, tone = "orange" }) {
  const tones = {
    orange: "bg-secondary/10 text-secondary",
    amber: "bg-secondary/10 text-secondary",
    blue: "bg-tertiary-container/10 text-on-tertiary-container",
    navy: "bg-surface-tint/10 text-surface-tint",
    green: "bg-secondary-container/10 text-secondary-container",
    soft: "bg-secondary-fixed text-on-secondary-fixed"
  };

  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition hover:shadow-[0px_8px_24px_rgba(0,0,0,0.1)]">
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-2 ${tones[tone] || tones.orange}`}>
          <Icon size={22} />
        </div>
        {hint && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{hint}</span>
        )}
      </div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</h3>
      <p className="text-[32px] font-bold leading-10 text-on-surface">{value}</p>
    </article>
  );
}
