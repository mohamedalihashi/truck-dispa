import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { db } from "./services/dbService.js";
import { createApp } from "./createApp.js";

const port = Number(process.env.PORT || 4000);
const uniqueOrigins = [
  ...(process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [...new Set(uniqueOrigins)],
    credentials: true
  }
});

app.set("io", io);

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
} catch (error) {
  console.error("Failed to connect to PostgreSQL:", error.message);
  process.exit(1);
}

try {
  const seedResult = await db.seedIfEmpty();
  if (seedResult.seeded) {
    console.log(`PostgreSQL seeded. Demo password: ${seedResult.demoPassword}`);
  }
  const admin = await db.ensureAdmin();
  console.log(`Admin account ready: ${admin.email} (password: ${admin.password})`);
} catch (error) {
  console.warn("Database seed skipped:", error.message);
}

server.listen(port, () => {
  console.log(`TruckDispatch API running on http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other backend process first.`);
    process.exit(1);
  }
  throw error;
});

async function shutdown(signal) {
  console.log(`${signal} received — closing database connections`);
  await disconnectDatabase();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
