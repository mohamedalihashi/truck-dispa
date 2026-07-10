import { Download, MoreVertical, Smartphone, X } from "lucide-react";
import { isInAppBrowser } from "../utils/pwa";

const steps = [
  {
    icon: MoreVertical,
    title: "Fur menu-ga Chrome",
    titleEn: "Open Chrome menu",
    body: "Geeska midig sare, taabo saddex dhibcood (⋮).",
    bodyEn: "Tap the three dots in the top-right corner."
  },
  {
    icon: Download,
    title: "Install app / Add to Home screen",
    titleEn: "Install app",
    body: "Dooro “Install app” ama “Add to Home screen”.",
    bodyEn: "Choose “Install app” or “Add to Home screen”."
  },
  {
    icon: Smartphone,
    title: "Xaqiiji",
    titleEn: "Confirm",
    body: "Taabo “Install” si app-ka ugu dhejiso shaashadda guriga.",
    bodyEn: "Tap “Install” to add TruckDispatch to your home screen."
  }
];

export function AndroidInstallGuide({ open, onClose }) {
  if (!open) return null;

  const inApp = isInAppBrowser();

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close install guide"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-install-title"
        className="relative w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-container">
              Android
            </p>
            <h2 id="android-install-title" className="mt-1 text-lg font-bold text-on-surface">
              Ku rakib Home Screen
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Haddii “Install” aanu soo bixin, raac tillaabooyinkan Chrome.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {inApp ? (
          <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Fur Chrome marka hore</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
              Haddii aad WhatsApp ama app kale ka timid, taabo ⋯ kadib “Open in browser”.
            </p>
          </div>
        ) : null}

        <ol className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.titleEn}
                className="flex gap-3 rounded-xl border border-outline-variant/25 bg-surface-container-low p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">
                    {index + 1}. {step.title}
                    <span className="font-normal text-on-surface-variant"> · {step.titleEn}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
        >
          Waan fahmay
        </button>
      </div>
    </div>
  );
}
