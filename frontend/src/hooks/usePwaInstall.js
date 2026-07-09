import { useEffect, useState } from "react";
import {
  canShowInstallPrompt,
  dismissPwaPrompt,
  isIos,
  isPwaDismissed,
  isStandalone
} from "../utils/pwa";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(isPwaDismissed);

  const standalone = isStandalone();
  const ios = isIos();
  const canPrompt = canShowInstallPrompt() && !dismissed;
  const showIosGuide = ios && canPrompt;
  const showAndroidInstall = !ios && Boolean(deferredPrompt) && canPrompt;

  useEffect(() => {
    if (standalone || dismissed || ios) return;

    function onBeforeInstall(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [standalone, dismissed, ios]);

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

  return {
    standalone,
    ios,
    canPrompt,
    showIosGuide,
    showAndroidInstall,
    dismiss,
    install
  };
}
