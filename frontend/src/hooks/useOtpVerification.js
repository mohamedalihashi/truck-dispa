import { useCallback, useEffect, useRef, useState } from "react";

export function useResendCooldown(initialSeconds = 60) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const startCooldown = useCallback((seconds = initialSeconds) => {
    setSecondsLeft(Math.max(0, seconds));
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return {
    secondsLeft,
    startCooldown,
    canResend: secondsLeft <= 0
  };
}

export function useOtpAutoSubmit({ code, enabled, submitting, onComplete }) {
  const lastSubmitted = useRef("");

  useEffect(() => {
    if (!enabled || submitting) return;
    const normalized = String(code || "").trim();
    if (!/^[0-9]{6}$/.test(normalized)) return;
    if (lastSubmitted.current === normalized) return;
    lastSubmitted.current = normalized;
    onComplete();
  }, [code, enabled, submitting, onComplete]);

  useEffect(() => {
    if (!enabled) lastSubmitted.current = "";
  }, [enabled]);
}
