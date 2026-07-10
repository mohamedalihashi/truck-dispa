import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";
import { sendVerificationEmail, verificationPayload } from "../services/emailService.js";
import { fileToPublicUrl, upload } from "../lib/uploads.js";

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
      truckType: z.string().min(1),
      photoUrl1: z.string().min(1),
      photoUrl2: z.string().min(1)
    })
    .optional()
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1)
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

function isDbBusyError(error) {
  const message = String(error?.message || "");
  return (
    error?.code === "P2024" ||
    message.includes("connection pool") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("closed the connection") ||
    message.includes("Connection terminated") ||
    message.includes("Unable to start a transaction")
  );
}

function dbBusyResponse(res) {
  return res.status(503).json({ message: "Database is busy. Please wait a moment and try again." });
}

function verificationResponse(email, emailResult) {
  return verificationPayload(email, emailResult);
}

router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    if (req.body.role === "driver" && !req.body.truck) {
      return res.status(400).json({ message: "Driver accounts require a truck" });
    }
    const existing = await db.findUserByEmail(req.body.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const { code } = await db.createVerificationCode({
      email: req.body.email,
      purpose: "register",
      payload: req.body
    });
    const emailResult = await sendVerificationEmail(req.body.email, code, "register");
    res.status(202).json(verificationResponse(req.body.email, emailResult));
  } catch (error) {
    if (isDbBusyError(error)) return dbBusyResponse(res);
    next(error);
  }
});

router.post("/register/verify", validate(verifySchema), async (req, res, next) => {
  try {
    const payload = await db.consumeVerificationCode({
      email: req.body.email,
      code: req.body.code,
      purpose: "register"
    });
    if (!payload || payload.__verified) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) return res.status(400).json({ message: "Registration data expired. Please register again." });

    const existing = await db.findUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = await db.createUser(parsed.data);
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

    const { code } = await db.createVerificationCode({
      email: req.body.email,
      purpose: "login"
    });
    const emailResult = await sendVerificationEmail(req.body.email, code, "login");
    res.json(verificationResponse(req.body.email, emailResult));
  } catch (error) {
    if (isDbBusyError(error)) return dbBusyResponse(res);
    next(error);
  }
});

router.post("/login/verify", validate(verifySchema), async (req, res, next) => {
  try {
    const verified = await db.consumeVerificationCode({
      email: req.body.email,
      code: req.body.code,
      purpose: "login"
    });
    if (!verified) return res.status(400).json({ message: "Invalid or expired verification code" });

    const user = await db.findUserByEmail(req.body.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { passwordHash: _passwordHash, ...safe } = user;
    res.json({ user: safe, token: signToken(safe) });
  } catch (error) {
    next(error);
  }
});

router.post("/resend-code", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email().transform((v) => v.trim().toLowerCase()),
      purpose: z.enum(["login", "register", "reset"]),
      password: z.string().optional(),
      registration: registerSchema.optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

    const { email, purpose, password, registration } = parsed.data;
    let payload = null;

    if (purpose === "login") {
      if (!password) return res.status(400).json({ message: "Password is required to resend login code" });
      const user = await db.findUserByEmail(email);
      if (!user?.passwordHash) return res.status(401).json({ message: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });
    } else if (purpose === "register") {
      payload = await db.getPendingVerificationPayload(email, "register");
      if (!payload && registration) {
        const registrationParsed = registerSchema.safeParse(registration);
        if (registrationParsed.success) payload = registrationParsed.data;
      }
      if (!payload) payload = await db.getLatestRegisterPayload(email);
      if (!payload) {
        return res.status(400).json({ message: "No pending registration found. Please fill the form again." });
      }
      const existing = await db.findUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already registered" });
    } else {
      const user = await db.findUserByEmail(email);
      if (!user) {
        return res.json({
          message: `If an account exists for ${email}, a reset code was sent.`,
        });
      }
    }

    const { code } = await db.createVerificationCode({ email, purpose, payload });
    const emailResult = await sendVerificationEmail(email, code, purpose);
    res.json(verificationResponse(email, emailResult));
  } catch (error) {
    if (
      String(error?.message || "").includes("connection pool") ||
      String(error?.message || "").includes("Timed out fetching a new connection") ||
      error?.code === "P2024"
    ) {
      return res.status(503).json({ message: "Database is busy. Please wait a moment and try again." });
    }
    next(error);
  }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

    const row = await db.findUserByEmail(req.user.email);
    if (!row?.passwordHash) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

    const user = await db.updateUser(req.user.sub, { password: parsed.data.newPassword });
    res.json({ user, token: signToken(user), message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, requirePasswordChanged, async (req, res, next) => {
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

router.post("/me/avatar", requireAuth, requirePasswordChanged, upload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Profile photo is required" });
    }
    const avatarUrl = fileToPublicUrl(req.file);
    const user = await db.updateUser(req.user.sub, { avatarUrl });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user, message: "Profile photo updated." });
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

router.post("/forgot-password", async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Valid email is required" });

    const user = await db.findUserByEmail(parsed.data.email);
    if (!user) {
      return res.json({ message: `If an account exists for ${parsed.data.email}, a reset code was sent.` });
    }

    const { code } = await db.createVerificationCode({
      email: parsed.data.email,
      purpose: "reset"
    });
    const emailResult = await sendVerificationEmail(parsed.data.email, code, "reset");
    res.json({
      message: emailResult.userMessage || `Password reset code sent to ${parsed.data.email}. Check your inbox.`,
      devCode: emailResult.devCode
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      code: z.string().length(6)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed" });

    const verified = await db.consumeVerificationCode({
      email: parsed.data.email,
      code: parsed.data.code,
      purpose: "reset"
    });
    if (!verified) return res.status(400).json({ message: "Invalid or expired verification code" });

    const user = await db.findUserByEmail(parsed.data.email);
    if (!user) return res.status(404).json({ message: "User not found" });
    await db.updateUser(user.id, { password: parsed.data.password });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
