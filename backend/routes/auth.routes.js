import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";

const router = Router();

const registerSchema = z.object({
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    if (req.body.role === "driver" && !req.body.truck) {
      return res.status(400).json({ message: "Driver accounts require a truck" });
    }
    const existing = await db.findUserByEmail(req.body.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = await db.createUser(req.body);
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await db.findUserByEmail(req.body.email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });
    const { passwordHash: _passwordHash, ...safe } = user;
    res.json({ user: safe, token: signToken(safe) });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (phone !== undefined) payload.phone = phone;
    if (password) payload.password = password;
    const user = await db.updateUser(req.user.sub, payload);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await db.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res) => {
  res.json({ message: `Password reset link queued for ${req.body.email || "user"}` });
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

    const user = await db.findUserByEmail(parsed.data.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    await db.updateUser(user.id, { password: parsed.data.password });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
