import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, requirePasswordChanged } from "../middleware/auth.js";
import { db } from "../services/dbService.js";
import { generateTempPassword } from "../lib/password.js";
import { sendWelcomeEmail } from "../services/emailService.js";
import { fileToPublicUrl, upload } from "../lib/uploads.js";

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
      truckType: z.string().min(1),
      photoUrl1: z.string().min(1),
      photoUrl2: z.string().min(1)
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

router.get("/summary", requireRole("admin", "dispatcher"), async (_req, res, next) => {
  try {
    res.json(await db.userSummary());
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireRole("admin", "dispatcher"),
  upload.fields([
    { name: "truckPhoto1", maxCount: 1 },
    { name: "truckPhoto2", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const requestedRole = req.body.role;
      if (req.user.role === "dispatcher") {
        if (requestedRole && requestedRole !== "driver") {
          return res.status(403).json({ message: "Dispatchers can only register drivers with their truck" });
        }
      }

      const role = req.user.role === "dispatcher" ? "driver" : requestedRole;
      const truckPayload =
        role === "driver"
          ? {
              truckNumber: req.body.truckNumber,
              plateNumber: req.body.plateNumber,
              capacity: req.body.capacity,
              truckType: req.body.truckType,
              photoUrl1: fileToPublicUrl(req.files?.truckPhoto1?.[0]),
              photoUrl2: fileToPublicUrl(req.files?.truckPhoto2?.[0])
            }
          : undefined;

      const parsed = createSchema.safeParse({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password || undefined,
        role,
        phone: req.body.phone || undefined,
        truck: truckPayload
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", details: parsed.error.flatten() });
      }

      if (parsed.data.role === "driver" && !parsed.data.truck) {
        return res.status(400).json({ message: "Driver accounts require a truck" });
      }

      if (parsed.data.role === "driver" && (!req.files?.truckPhoto1?.[0] || !req.files?.truckPhoto2?.[0])) {
        return res.status(400).json({ message: "Two truck photos are required for driver registration" });
      }

      const existing = await db.findUserByEmail(parsed.data.email);
      if (existing) return res.status(409).json({ message: "Email already registered" });

      const tempPassword = parsed.data.password || generateTempPassword();
      const { code } = await db.createVerificationCode({
        email: parsed.data.email,
        purpose: "login",
        ttlMinutes: 24 * 60
      });

      const user = await db.createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        password: tempPassword,
        role: parsed.data.role,
        phone: parsed.data.phone,
        truck: parsed.data.truck,
        mustChangePassword: true,
        actorId: req.user.sub
      });

      const emailResult = await sendWelcomeEmail(parsed.data.email, tempPassword, code);

      res.status(201).json({
        user,
        message: `Account created. Temporary password and login code sent to ${parsed.data.email}.`,
        devCode: emailResult.devCode,
        devPassword: emailResult.devPassword
      });
    } catch (error) {
      next(error);
    }
  }
);

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
