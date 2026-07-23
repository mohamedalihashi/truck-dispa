import { Router } from "express";
import { requireAuth, requireRole, requirePasswordChanged, requirePermission } from "../middleware/auth.js";
import { db } from "../services/dbService.js";

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get("/dashboard", requirePermission("dashboard"), async (req, res, next) => {
  try {
    res.json(await db.dashboardStats({ role: req.user.role, userId: req.user.sub }));
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard-analytics", requireRole("admin"), requirePermission("reports"), async (_req, res, next) => {
  try {
    res.json(await db.dashboardAnalytics());
  } catch (error) {
    next(error);
  }
});

router.get("/revenue", requireRole("admin", "dispatcher"), requirePermission("reports"), async (req, res, next) => {
  try {
    res.json(await db.revenueReport({ period: req.query.period || "monthly" }));
  } catch (error) {
    next(error);
  }
});

router.get("/performance", requireRole("admin", "dispatcher"), requirePermission("reports"), async (_req, res, next) => {
  try {
    res.json(await db.performanceReport());
  } catch (error) {
    next(error);
  }
});

router.get("/shipments", requireRole("admin", "dispatcher"), requirePermission("reports"), async (_req, res, next) => {
  try {
    res.json({ data: await db.shipmentDistribution() });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", requireRole("admin", "dispatcher"), requirePermission("reports"), async (req, res, next) => {
  try {
    const [dashboard, revenue, performance, shipments] = await Promise.all([
      db.dashboardStats(),
      db.revenueReport({ period: req.query.period || "monthly" }),
      db.performanceReport(),
      db.shipmentDistribution()
    ]);
    res.json({ dashboard, revenue, performance, shipments });
  } catch (error) {
    next(error);
  }
});

export default router;
