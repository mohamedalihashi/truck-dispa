import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();

const truckSchema = z.object({
  truckNumber: z.string().min(1),
  plateNumber: z.string().min(1),
  capacity: z.string().min(1),
  truckType: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  driverId: z.string().uuid(),
  status: z.enum(["Available", "Busy", "Maintenance"]).default("Available")
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const result = await db.listTrucks({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/types", async (_req, res, next) => {
  try {
    res.json({ data: await db.listTruckTypes() });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin", "dispatcher"), validate(truckSchema), async (req, res, next) => {
  try {
    if (!req.body.truckType && !req.body.type) {
      return res.status(400).json({ message: "truckType is required" });
    }
    const truck = await db.createTruck(req.body);
    res.status(201).json(truck);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("admin", "dispatcher", "driver"), async (req, res, next) => {
  try {
    const truck = await db.updateTruck(req.params.id, req.body);
    if (!truck) return res.status(404).json({ message: "Truck not found" });
    res.json(truck);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("admin", "dispatcher"), async (req, res, next) => {
  try {
    const ok = await db.deleteTruck(req.params.id);
    if (!ok) return res.status(404).json({ message: "Truck not found" });
    res.json({ message: "Truck deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
