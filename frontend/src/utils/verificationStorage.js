const LOGIN_KEY = "td_verify_login";
const REGISTER_KEY = "td_verify_register";

export function saveLoginVerification(email, password) {
  sessionStorage.setItem(LOGIN_KEY, JSON.stringify({ email, password }));
}

export function loadLoginVerification() {
  try {
    return JSON.parse(sessionStorage.getItem(LOGIN_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearLoginVerification() {
  sessionStorage.removeItem(LOGIN_KEY);
}

export function saveRegisterVerification(email, registration) {
  sessionStorage.setItem(REGISTER_KEY, JSON.stringify({ email, registration }));
}

export function loadRegisterVerification() {
  try {
    return JSON.parse(sessionStorage.getItem(REGISTER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearRegisterVerification() {
  sessionStorage.removeItem(REGISTER_KEY);
}
