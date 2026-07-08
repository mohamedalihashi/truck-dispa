import "dotenv/config";
import http from "node:http";
import path from "node:path";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectDatabase } from "./config/db.js";
import { db } from "./services/dbService.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import cargoRequestRoutes from "./routes/cargoRequests.routes.js";
import tripRoutes from "./routes/trips.routes.js";
import truckRoutes from "./routes/trucks.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import userRoutes from "./routes/users.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4000);

/** Vite may be opened as 127.0.0.1 or localhost — treat both as allowed. */
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];
const uniqueOrigins = [...new Set(allowedOrigins)];

function corsOrigin(origin, callback) {
  if (!origin || uniqueOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked: ${origin}`));
}

const io = new Server(server, {
  cors: {
    origin: uniqueOrigins,
    credentials: true
  }
});

app.set("io", io);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", async (_req, res) => {
  try {
    const stats = await db.dashboardStats();
    res.json({
      status: "ok",
      database: "postgresql",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cargo-requests", cargoRequestRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

io.on("connection", (socket) => {
  socket.emit("system.ready", { message: "TruckDispatch realtime connected" });
  socket.on("location.updated", (payload) => {
    socket.broadcast.emit("location.updated", payload);
  });
  socket.on("join", (room) => {
    if (room) socket.join(String(room));
  });
});

try {
  await connectDatabase();
  const seedResult = await db.seedIfEmpty();
  if (seedResult.seeded) {
    console.log(`PostgreSQL seeded. Demo password: ${seedResult.demoPassword}`);
  }
} catch (error) {
  console.error("Failed to connect to PostgreSQL:", error.message);
  console.error("Start Postgres with: docker compose up -d");
  process.exit(1);
}

server.listen(port, () => {
  console.log(`TruckDispatch API running on http://127.0.0.1:${port}`);
});
