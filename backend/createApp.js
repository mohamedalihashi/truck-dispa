import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler, notFound } from "./middleware/error.js";
import { db } from "./services/dbService.js";
import authRoutes from "./routes/auth.routes.js";
import cargoRequestRoutes from "./routes/cargoRequests.routes.js";
import tripRoutes from "./routes/trips.routes.js";
import truckRoutes from "./routes/trucks.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import userRoutes from "./routes/users.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import earningsRoutes from "./routes/earnings.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import { auditContextMiddleware } from "./lib/auditContext.js";
import { isCloudinaryConfigured } from "./services/cloudinaryService.js";
import { getWaafiPublicConfig } from "./services/waafiPayService.js";
import { isSmsConfigured } from "./services/smsService.js";

function looksLikePlaceholder(value = "") {
  return /your[_-]?|replace-with|xxxxx|changeme|example|<|>/i.test(String(value || ""));
}

function getIntegrationsStatus() {
  const waafi = getWaafiPublicConfig();
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const emailReady =
    process.env.EMAIL_DEV_MODE === "true" ||
    (Boolean(smtpUser && smtpPass) && !looksLikePlaceholder(smtpUser) && !looksLikePlaceholder(smtpPass));

  return {
    database: true,
    cloudinary: {
      configured: isCloudinaryConfigured(),
      fallback: isCloudinaryConfigured() ? "cloudinary" : "local-uploads"
    },
    waafiPay: {
      configured: waafi.enabled,
      currency: waafi.currency,
      devMock: waafi.devMock
    },
    sms: {
      configured: isSmsConfigured()
    },
    email: {
      configured: emailReady,
      otpEnabled: process.env.AUTH_OTP_ENABLED !== "false",
      devMode: process.env.EMAIL_DEV_MODE === "true"
    }
  };
}

export function createNoopIo() {
  const noop = () => {};
  const room = { emit: noop };
  return {
    emit: noop,
    on: noop,
    to: () => room
  };
}

function buildAllowedOrigins() {
  const fromEnv = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const vercelBranch = process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : null;

  return [...new Set([
    ...fromEnv,
    vercelOrigin,
    vercelBranch,
    "http://127.0.0.1:5173",
    "http://localhost:5173"
  ].filter(Boolean))];
}

export function createApp({ io } = {}) {
  const app = express();
  const uniqueOrigins = buildAllowedOrigins();

  function corsOrigin(origin, callback) {
    if (!origin || uniqueOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked: ${origin}`));
  }

  app.set("io", io || createNoopIo());
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(auditContextMiddleware);
  if (!process.env.VERCEL) {
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  }

  app.get("/api/health", async (_req, res) => {
    const integrations = getIntegrationsStatus();
    try {
      const stats = await db.dashboardStats();
      const missing = Object.entries(integrations)
        .filter(([, value]) => value && typeof value === "object" && value.configured === false)
        .map(([key]) => key);

      res.json({
        status: missing.length ? "degraded" : "ok",
        database: "postgresql",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        integrations,
        missing,
        stats
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
        integrations: { ...integrations, database: false }
      });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/public/feedback", feedbackRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/cargo-requests", cargoRequestRoutes);
  app.use("/api/trips", tripRoutes);
  app.use("/api/trucks", truckRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/earnings", earningsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
