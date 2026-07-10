export const PWA_DISMISS_KEY = "td_pwa_install_dismissed";

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|LinkedInApp|Telegram|wv\)/i.test(
    navigator.userAgent
  );
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function canShowInstallPrompt() {
  return !isStandalone() && window.isSecureContext === true;
}

export function isPwaDismissed() {
  return sessionStorage.getItem(PWA_DISMISS_KEY) === "1";
}

export function dismissPwaPrompt() {
  sessionStorage.setItem(PWA_DISMISS_KEY, "1");
}

export function openInSystemBrowser() {
  const url = window.location.href;

  if (isAndroid()) {
    const path = `${window.location.pathname}${window.location.search}`;
    window.location.href = `intent://${window.location.host}${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
