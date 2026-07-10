import { useEffect, useState } from "react";
import {
  canShowInstallPrompt,
  dismissPwaPrompt,
  isInAppBrowser,
  isPwaDismissed,
  isStandalone,
  openInSystemBrowser
} from "../utils/pwa";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(isPwaDismissed);

  const canShow = canShowInstallPrompt() && !dismissed;
  const canNativeInstall = Boolean(deferredPrompt);

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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") dismiss();
      return outcome === "accepted";
    }

    if (isInAppBrowser()) {
      openInSystemBrowser();
      return false;
    }

    return false;
  }

  return { canShow, canNativeInstall, dismiss, install };
}
