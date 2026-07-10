export const PWA_DISMISS_KEY = "td_pwa_install_dismissed";

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function canShowInstallPrompt() {
  return !isStandalone();
}

export function isPwaDismissed() {
  return localStorage.getItem(PWA_DISMISS_KEY) === "1";
}

export function dismissPwaPrompt() {
  localStorage.setItem(PWA_DISMISS_KEY, "1");
}
