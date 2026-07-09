export const PWA_DISMISS_KEY = "td_pwa_install_dismissed";

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|LinkedInApp|wv\)/i.test(
    navigator.userAgent
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
