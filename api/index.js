let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      const { connectDatabase } = await import("../backend/config/db.js");
      const { createApp, createNoopIo } = await import("../backend/createApp.js");
      const { db } = await import("../backend/services/dbService.js");

      await connectDatabase();
      try {
        await db.seedIfEmpty();
        await db.ensureAdmin();
      } catch (error) {
        console.warn("Database seed skipped:", error.message);
      }
      app = createApp({ io: createNoopIo() });
    }
    return app(req, res);
  } catch (error) {
    console.error("API bootstrap failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: error.message || "Server failed to start",
        name: error.name,
        status: 500
      });
    }
  }
}
