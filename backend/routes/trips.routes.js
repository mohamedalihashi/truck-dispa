import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), "uploads") });

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

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
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

router.patch("/:id/status", requireRole("driver", "dispatcher", "admin", "customer"), validate(statusSchema), async (req, res, next) => {
  try {
    const result = await db.updateTripStatus(req.params.id, req.body.status, req.user.sub);
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
    const result = await db.updateTripStatus(req.params.id, "Accepted", req.user.sub);
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
    const trip = await db.updateTripLocation(req.params.id, {
      lat: Number(req.body.lat),
      lng: Number(req.body.lng)
    });
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
      ? `/uploads/${path.basename(req.file.filename)}`
      : req.body.deliveryProofUrl || "mock://proof-uploaded";
    const trip = await db.uploadTripProof(req.params.id, {
      deliveryProofUrl,
      signatureUrl: req.body.signatureUrl
    });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

export default router;
