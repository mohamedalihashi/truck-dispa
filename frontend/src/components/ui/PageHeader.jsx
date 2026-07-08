export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[32px] font-bold leading-10 tracking-[-0.02em] text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
