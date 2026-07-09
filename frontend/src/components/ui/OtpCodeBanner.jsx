/** Shows OTP on screen when email delivery failed or for local demo accounts. */
export function OtpCodeBanner({ code, message }) {
  if (!code && !message) return null;

  return (
    <div className="space-y-2">
      {message && (
        <p className="rounded-lg bg-secondary-fixed/40 px-3 py-2 text-sm text-on-surface">{message}</p>
      )}
      {code ? (
        <div className="rounded-xl border-2 border-dashed border-secondary-container bg-secondary-fixed/30 px-4 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Your code</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em] text-primary-container">{code}</p>
          <p className="mt-2 text-xs text-on-surface-variant">Copy into the field above</p>
        </div>
      ) : null}
    </div>
  );
}
