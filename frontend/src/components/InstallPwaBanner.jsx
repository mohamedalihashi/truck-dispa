import { Download, X } from "lucide-react";
import { usePwaInstall } from "../hooks/usePwaInstall";

export function InstallPwaBanner() {
  const { canShow, dismiss, install } = usePwaInstall();

  if (!canShow) return null;

  return (
    <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-high p-3 shadow-xl md:inset-x-auto md:right-6">
      <div className="rounded-xl bg-secondary-container p-2 text-on-secondary-container">
        <Download size={20} />
      </div>
      <p className="min-w-0 flex-1 font-semibold text-on-surface">Ku rakib TruckDispatch</p>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
}
