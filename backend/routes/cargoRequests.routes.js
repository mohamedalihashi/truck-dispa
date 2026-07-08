import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();

const createSchema = z.object({
  pickup: z.string().min(1),
  destination: z.string().min(1),
  truckType: z.string().min(1),
  weight: z.string().min(1),
  description: z.string().min(1),
  receiver: z.string().optional(),
  sender: z.string().optional(),
  specialInstructions: z.string().optional(),
  customerId: z.string().uuid().optional()
});

const assignSchema = z.object({
  driverId: z.string().uuid(),
  truckId: z.string().uuid(),
  dispatcherId: z.string().uuid().optional()
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit
    };
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    const result = await db.listCargoRequests(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("customer", "admin", "dispatcher"), validate(createSchema), async (req, res, next) => {
  try {
    let customerId = req.user.sub;
    if (req.user.role === "dispatcher" || req.user.role === "admin") {
      if (!req.body.customerId) {
        return res.status(400).json({ message: "customerId is required" });
      }
      customerId = req.body.customerId;
    }
    const customer = await db.findUserById(customerId);
    if (!customer || customer.role !== "customer") {
      return res.status(400).json({ message: "Valid customer is required" });
    }
    const { request, notification } = await db.createCargoRequest({
      ...req.body,
      customerId,
      customerName: customer.name
    });
    req.app.get("io").emit("order.created", request);
    if (notification) req.app.get("io").emit("notification.created", notification);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("customer", "admin", "dispatcher"), validate(createSchema.partial()), async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    const request = await db.updateCargoRequest(req.params.id, req.body, filters);
    if (!request) return res.status(404).json({ message: "Cargo request not found" });
    req.app.get("io").emit("order.updated", request);
    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/assign",
  requireRole("dispatcher", "admin"),
  validate(assignSchema),
  async (req, res, next) => {
    try {
      const result = await db.assignCargoRequest(req.params.id, {
        driverId: req.body.driverId,
        truckId: req.body.truckId,
        dispatcherId: req.body.dispatcherId || req.user.sub
      });
      if (!result) return res.status(404).json({ message: "Cargo request not found" });
      req.app.get("io").emit("driver.assigned", result.request);
      if (result.notification) req.app.get("io").emit("notification.created", result.notification);
      res.json(result.request);
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", requireRole("customer", "dispatcher", "admin"), async (req, res, next) => {
  try {
    const request = await db.cancelCargoRequest(req.params.id, req.user.sub);
    if (!request) return res.status(404).json({ message: "Cargo request not found" });
    req.app.get("io").emit("order.cancelled", request);
    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;
