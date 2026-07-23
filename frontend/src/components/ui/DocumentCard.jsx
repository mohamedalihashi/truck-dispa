import { ExternalLink, FileText } from "lucide-react";
import { resolveUploadUrl } from "../../config/api.js";

function isLikelyImage(url) {
  if (!url) return false;
  return /\.(jpe?g|png|webp|gif|bmp)(\?|#|$)/i.test(url) || /\/image\//i.test(url);
}

export function DocumentCard({ label, url, meta }) {
  if (!url) {
    return (
      <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
        <p className="mt-2 text-sm text-on-surface-variant">Not uploaded</p>
        {meta ? <p className="mt-1 text-xs text-on-surface-variant">{meta}</p> : null}
      </div>
    );
  }

  const href = resolveUploadUrl(url);
  const image = isLikelyImage(url);

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-container hover:underline"
        >
          Open <ExternalLink size={12} />
        </a>
      </div>
      {image ? (
        <a href={href} target="_blank" rel="noreferrer" className="block">
          <img src={href} alt={label} className="h-40 w-full object-cover" />
        </a>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex h-40 flex-col items-center justify-center gap-2 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
        >
          <FileText size={28} className="text-secondary-container" />
          <span className="text-sm font-medium">View document</span>
        </a>
      )}
      {meta ? <p className="border-t border-outline-variant px-3 py-2 text-xs text-on-surface-variant">{meta}</p> : null}
    </div>
  );
}

export function DocumentsGrid({ title = "Documents", children }) {
  return (
    <div className="mt-8 rounded-xl border border-outline-variant bg-surface-container-low/30 p-5">
      <h3 className="mb-4 text-lg font-semibold text-on-surface">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
