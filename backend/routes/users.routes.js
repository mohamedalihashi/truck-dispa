import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";
import { generateTempPassword } from "../lib/password.js";
import { sendWelcomeEmail } from "../services/emailService.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
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
router.use(requirePasswordChanged);

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

    const tempPassword = req.body.password || generateTempPassword();
    const { code } = await db.createVerificationCode({
      email: req.body.email,
      purpose: "login",
      ttlMinutes: 24 * 60
    });

    const user = await db.createUser({
      name: req.body.name,
      email: req.body.email,
      password: tempPassword,
      role: req.body.role,
      phone: req.body.phone,
      truck: req.body.truck,
      mustChangePassword: true,
      actorId: req.user.sub
    });

    const emailResult = await sendWelcomeEmail(req.body.email, tempPassword, code);

    res.status(201).json({
      user,
      message: `Account created. Temporary password and login code sent to ${req.body.email}.`,
      devCode: emailResult.devCode,
      devPassword: emailResult.devPassword
    });
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
