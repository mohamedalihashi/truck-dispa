import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "dispatcher", "customer", "driver"]),
  phone: z.string().optional(),
  truck: z
    .object({
      truckNumber: z.string().min(1),
      plateNumber: z.string().min(1),
      capacity: z.string().min(1),
      truckType: z.string().min(1)
    })
    .optional()
});

router.use(requireAuth);

router.get("/", requireRole("admin", "dispatcher"), async (req, res, next) => {
  try {
    if (req.user.role === "dispatcher") {
      const role = req.query.role;
      if (role && !["driver", "customer"].includes(role)) {
        return res.status(403).json({ message: "Dispatchers can only list drivers or customers" });
      }
    }
    res.json(
      await db.listUsers({
        role: req.query.role,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("admin"), validate(createSchema), async (req, res, next) => {
  try {
    if (req.body.role === "driver" && !req.body.truck) {
      return res.status(400).json({ message: "Driver accounts require a truck" });
    }
    const existing = await db.findUserByEmail(req.body.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });
    const user = await db.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const user = await db.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const ok = await db.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
