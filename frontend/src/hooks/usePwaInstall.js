import { useEffect, useState } from "react";
import {
  canShowInstallPrompt,
  dismissPwaPrompt,
  isPwaDismissed,
  isStandalone
} from "../utils/pwa";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(isPwaDismissed);

  const canShow = canShowInstallPrompt() && !dismissed && Boolean(deferredPrompt);

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    function onBeforeInstall(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [dismissed]);

  function dismiss() {
    dismissPwaPrompt();
    setDismissed(true);
    setDeferredPrompt(null);
  }

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") dismiss();
    return outcome === "accepted";
  }

  return { canShow, dismiss, install };
}
