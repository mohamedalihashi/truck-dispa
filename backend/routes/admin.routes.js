import { Router } from "express";
import { requireAuth, requireRole, requirePasswordChanged } from "../middleware/auth.js";
import { db } from "../services/dbService.js";

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get("/payments", requireRole("admin", "customer"), async (req, res, next) => {
  try {
    const customerId = req.user.role === "customer" ? req.user.sub : undefined;
    res.json(
      await db.listPayments({
        page: req.query.page,
        limit: req.query.limit,
        customerId
      })
    );
  } catch (error) {
    next(error);
  }
});

router.get("/settings", requireRole("admin"), async (_req, res, next) => {
  try {
    res.json(await db.getSettings());
  } catch (error) {
    next(error);
  }
});

router.put("/settings/:key", requireRole("admin"), async (req, res, next) => {
  try {
    res.json(await db.updateSettings(req.params.key, req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/payments", requireRole("admin"), async (req, res, next) => {
  try {
    const { tripId, customerId, amount, status, method, description } = req.body;
    if (!customerId || amount == null) {
      return res.status(400).json({ message: "customerId and amount are required" });
    }
    const payment = await db.createPayment({ tripId, customerId, amount, status, method, description });
    const io = req.app.get("io");
    if (io) io.emit("payment.updated", payment);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

router.delete("/payments/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const ok = await db.deletePayment(req.params.id);
    if (!ok) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch (error) {
    next(error);
  }
});

router.patch("/payments/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const { status, amount, description, amountPaid, method } = req.body;
    if (!status && amount == null && description == null && amountPaid == null && !method) {
      return res.status(400).json({ message: "No payment fields to update" });
    }
    const payment = await db.updatePayment(req.params.id, {
      status,
      amount,
      description,
      amountPaid,
      method,
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    const io = req.app.get("io");
    if (io) io.emit("payment.updated", payment);
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", requireRole("admin"), async (req, res, next) => {
  try {
    res.json(await db.listAuditLogs({ page: req.query.page, limit: req.query.limit }));
  } catch (error) {
    next(error);
  }
});

export default router;
