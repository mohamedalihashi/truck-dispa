import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { z } from "zod";
import { requireAuth, requireRole, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();
const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "truck-uploads")
  : path.join(process.cwd(), "uploads");

try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  // Serverless filesystem may be read-only outside /tmp.
}

const upload = multer(
  process.env.VERCEL
    ? { storage: multer.memoryStorage() }
    : { dest: uploadDir }
);

const statusSchema = z.object({
  status: z.enum([
    "Pending",
    "Assigned",
    "Accepted",
    "Arrived Pickup",
    "Loaded",
    "In Transit",
    "Delivered",
    "Cancelled",
    "Delayed"
  ])
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  productRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional()
});

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get("/", async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };
    if (req.user.role === "driver") filters.driverId = req.user.sub;
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    const result = await db.listTrips(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === "driver") filters.driverId = req.user.sub;
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    res.json(await db.tripSummary(filters));
  } catch (error) {
    next(error);
  }
});

router.get("/feedback", requireRole("admin", "dispatcher", "driver"), async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit || 10
    };
    if (req.user.role === "driver") filters.driverId = req.user.sub;
    if (req.user.role === "dispatcher") filters.dispatcherId = req.user.sub;
    const result = await db.listTripFeedback(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireRole("driver", "dispatcher", "admin", "customer"), validate(statusSchema), async (req, res, next) => {
  try {
    const options = req.user.role === "driver" ? { driverId: req.user.sub } : {};
    const result = await db.updateTripStatus(req.params.id, req.body.status, req.user.sub, options);
    if (!result) return res.status(404).json({ message: "Trip not found" });
    req.app.get("io").emit("trip.status.updated", result.trip);
    if (result.notification) req.app.get("io").emit("notification.created", result.notification);
    res.json(result.trip);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/accept", requireRole("driver"), async (req, res, next) => {
  try {
    const result = await db.updateTripStatus(req.params.id, "Accepted", req.user.sub, { driverId: req.user.sub });
    if (!result) return res.status(404).json({ message: "Trip not found" });
    req.app.get("io").emit("trip.status.updated", result.trip);
    res.json(result.trip);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reject", requireRole("driver"), async (req, res, next) => {
  try {
    const result = await db.rejectTrip(req.params.id, req.user.sub);
    if (!result) return res.status(404).json({ message: "Trip not found" });
    req.app.get("io").emit("trip.rejected", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/location", requireRole("driver", "admin"), async (req, res, next) => {
  try {
    const options = req.user.role === "driver" ? { driverId: req.user.sub } : {};
    const trip = await db.updateTripLocation(
      req.params.id,
      { lat: Number(req.body.lat), lng: Number(req.body.lng) },
      options
    );
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    req.app.get("io").emit("location.updated", { tripId: trip.id, location: trip.lastLocation });
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/proof", requireRole("driver", "admin"), upload.single("proof"), async (req, res, next) => {
  try {
    const deliveryProofUrl = req.file
      ? process.env.VERCEL
        ? `mock://proof-uploaded-${Date.now()}`
        : `/uploads/${path.basename(req.file.filename)}`
      : req.body.deliveryProofUrl || "mock://proof-uploaded";
    const options = req.user.role === "driver" ? { driverId: req.user.sub } : {};
    const trip = await db.uploadTripProof(
      req.params.id,
      { deliveryProofUrl, signatureUrl: req.body.signatureUrl },
      options
    );
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/feedback", requireRole("customer"), validate(feedbackSchema), async (req, res, next) => {
  try {
    const trip = await db.submitTripFeedback(req.params.id, req.user.sub, req.body);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.driverId) {
      req.app.get("io").emit("trip.feedback.submitted", { tripId: trip.id, feedback: trip.feedback });
    }
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

export default router;
