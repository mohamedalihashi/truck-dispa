export function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-primary">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
