import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();

const createSchema = z.object({
  pickup: z.string().min(1),
  destination: z.string().min(1),
  truckType: z.string().trim().min(1),
  weight: z.string().min(1),
  description: z.string().min(1),
  receiver: z.string().optional(),
  sender: z.string().optional(),
  specialInstructions: z.string().optional(),
  preferredPickupDate: z.string().optional(),
  customerId: z.string().uuid().optional()
});

const assignSchema = z.object({
  driverId: z.string().uuid(),
  truckId: z.string().uuid(),
  dispatcherId: z.string().uuid().optional()
});

const quoteSchema = z.object({
  quotedPrice: z.coerce.number().positive(),
  quotedEstimatedTime: z.string().min(1),
  quoteNotes: z.string().optional()
});

const rejectQuoteSchema = z.object({
  note: z.string().optional()
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
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    if (req.user.role === "driver") filters.statuses = ["Pending", "Quote Rejected"];
    const result = await db.listCargoRequests(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === "customer") filters.customerId = req.user.sub;
    if (req.user.role === "driver") filters.statuses = ["Pending", "Quote Rejected"];
    res.json(await db.cargoRequestSummary(filters));
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
  "/:id/quote",
  requireRole("driver"),
  validate(quoteSchema),
  async (req, res, next) => {
    try {
      const result = await db.submitCargoQuote(req.params.id, {
        quotedPrice: req.body.quotedPrice,
        quotedEstimatedTime: req.body.quotedEstimatedTime,
        quoteNotes: req.body.quoteNotes,
        driverId: req.user.sub
      });
      if (!result) return res.status(404).json({ message: "Cargo request not found" });
      req.app.get("io").emit("quote.sent", result.request);
      if (result.notification) req.app.get("io").emit("notification.created", result.notification);
      res.json(result.request);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/quote/accept",
  requireRole("customer"),
  async (req, res, next) => {
    try {
      const request = await db.acceptCargoQuote(req.params.id, { customerId: req.user.sub });
      if (!request) return res.status(404).json({ message: "Cargo request not found" });
      req.app.get("io").emit("quote.accepted", request);
      res.json(request);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/quote/reject",
  requireRole("customer"),
  validate(rejectQuoteSchema),
  async (req, res, next) => {
    try {
      const request = await db.rejectCargoQuote(req.params.id, {
        customerId: req.user.sub,
        note: req.body.note
      });
      if (!request) return res.status(404).json({ message: "Cargo request not found" });
      req.app.get("io").emit("quote.rejected", request);
      res.json(request);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/assign",
  requireRole("admin"),
  validate(assignSchema),
  async (req, res, next) => {
    try {
      const result = await db.assignCargoRequest(req.params.id, {
        driverId: req.body.driverId,
        truckId: req.body.truckId,
        dispatcherId: req.body.dispatcherId
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
    const options = {};
    if (req.user.role === "customer") options.customerId = req.user.sub;
    const request = await db.cancelCargoRequest(req.params.id, req.user.sub, options);
    if (!request) return res.status(404).json({ message: "Cargo request not found" });
    req.app.get("io").emit("order.cancelled", request);
    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;
