const smtpConfigured = Boolean(
  process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter = null;

function smtpHost() {
  return process.env.SMTP_HOST || "smtp.gmail.com";
}

function smtpPort() {
  return Number(process.env.SMTP_PORT || 587);
}

function smtpPass() {
  return String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

async function getTransporter() {
  if (!smtpConfigured) return null;
  if (!transporter) {
    const nodemailer = await import("nodemailer");
    transporter = nodemailer.default.createTransport({
      host: smtpHost(),
      port: smtpPort(),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass()
      }
    });
  }
  return transporter;
}

export function isEmailDevMode() {
  return process.env.EMAIL_DEV_MODE === "true";
}

function purposeLabel(purpose) {
  if (purpose === "register") return "complete your registration";
  if (purpose === "reset") return "reset your password";
  return "sign in";
}

export async function sendVerificationEmail(email, code, purpose) {
  if (!smtpConfigured && !isEmailDevMode()) {
    throw new Error("Email is not configured. Set SMTP_USER and SMTP_PASS in backend .env");
  }

  const appName = "TruckDispatch";
  const action = purposeLabel(purpose);
  const subject = `${appName} verification code`;
  const text = [
    `Your ${appName} verification code is: ${code}`,
    "",
    `Use this code to ${action}. It expires in 10 minutes.`,
    "",
    "If you did not request this, you can ignore this email."
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0d1c32;margin:0 0 12px">${appName}</h2>
      <p style="color:#444;line-height:1.5">Use this code to ${action}:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#fe6b00;margin:20px 0">${code}</p>
      <p style="color:#666;font-size:14px">This code expires in 10 minutes.</p>
    </div>
  `;

  const mailer = await getTransporter();
  if (!mailer) {
    console.log(`[EMAIL DEV] Verification requested for ${email} (purpose: ${purpose})`);
    return { devMode: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await mailer.sendMail({ from, to: email, subject, text, html });
  console.log(`Verification email sent to ${email}`);
  return { devMode: false };
}
