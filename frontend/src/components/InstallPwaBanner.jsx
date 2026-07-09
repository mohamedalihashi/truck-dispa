import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { IosInstallGuide } from "./IosInstallGuide";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { isInAppBrowser } from "../utils/pwa";

export function InstallPwaBanner() {
  const { canPrompt, showIosGuide, showAndroidInstall, dismiss, install } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  if (!canPrompt || (!showIosGuide && !showAndroidInstall)) return null;

  async function onInstall() {
    if (showIosGuide) {
      setGuideOpen(true);
      return;
    }
    await install();
  }

  return (
    <>
      <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] mx-auto max-w-lg rounded-2xl border border-outline-variant/30 bg-surface-container-high p-4 shadow-xl md:inset-x-auto md:right-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-secondary-container p-2 text-on-secondary-container">
            <Download size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-on-surface">Ku rakib TruckDispatch</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {showIosGuide
                ? isInAppBrowser()
                  ? "Fur Safari, kadib Share → Add to Home Screen si aad ugu rakibto app-ka."
                  : "Taabo Share, kadib dooro Add to Home Screen si aad ugu hesho app-ka shaashadda guriga."
                : "Add this app to your home screen for faster access — no app store required."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onInstall}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary"
              >
                {showIosGuide ? <Share size={16} /> : <Download size={16} />}
                {showIosGuide ? "Sida loo rakibo" : "Install app"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
              >
                Hadda ma aha
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Dismiss install prompt"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <IosInstallGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
