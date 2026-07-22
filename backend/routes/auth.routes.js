import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";
import { dispatchVerificationEmail, verificationPayload } from "../services/emailService.js";
import { fileToPublicUrl, upload } from "../lib/uploads.js";
import { strongPasswordSchema } from "../lib/validation.js";
import { authLimiter, otpLimiter, passwordResetLimiter, registrationLimiter, resendLimiter } from "../middleware/security.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPasswordSchema,
  role: z.enum(["customer", "driver"]),
  phone: z.string().trim().min(1),
  customerProfile: z.object({
    customerType: z.enum(["Individual", "Business"]),
    city: z.string().trim().min(1),
    companyName: z.string().trim().optional(),
    companyPhone: z.string().trim().optional(),
    companyAddress: z.string().trim().optional()
  }).optional(),
  driverLicense: z.string().trim().min(1).optional(),
  driverLicenseUrl: z.string().min(1).optional(),
  driverImageUrl: z.string().min(1).optional(),
  truck: z
    .object({
      truckNumber: z.string().min(1),
      plateNumber: z.string().min(1),
      capacity: z.string().min(1),
      truckType: z.string().trim().min(1),
      photoUrl1: z.string().min(1),
      photoUrl2: z.string().min(1).optional(),
      documentUrls: z.array(z.string().min(1)).min(1)
    })
    .optional()
}).superRefine((data, ctx) => {
  if (data.role !== "customer") return;
  if (!data.customerProfile) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerProfile"], message: "Customer profile is required" });
    return;
  }
  if (data.customerProfile.customerType === "Business") {
    for (const field of ["companyName", "companyPhone", "companyAddress"]) {
      if (!data.customerProfile[field]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerProfile", field], message: `${field} is required for business customers` });
    }
  }
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

router.post("/register", registrationLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    if (req.body.role === "driver" && !req.body.truck) {
      return res.status(400).json({ message: "Driver accounts require a truck" });
    }
    if (req.body.role === "driver" && (!req.body.driverLicense || !req.body.driverLicenseUrl || !req.body.driverImageUrl)) {
      return res.status(400).json({ message: "Driver license number/document and driver photo are required" });
    }
    const existing = await db.findUserByEmail(req.body.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = await db.createUser(req.body);
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    if (isDbBusyError(error)) return dbBusyResponse(res);
    next(error);
  }
});

router.post("/register/verify", otpLimiter, validate(verifySchema), async (req, res, next) => {
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

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await db.findUserByEmail(req.body.email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ message: "Account temporarily locked. Try again later." });
    }
    if (user.status !== "Active") {
      return res.status(403).json({ message: "Account is not active or is awaiting verification" });
    }
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) {
      await db.recordFailedLogin(user.id);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await db.clearFailedLogins(user.id);

    const { passwordHash: _passwordHash, ...safe } = user;
    res.json({ user: safe, token: signToken(safe) });
  } catch (error) {
    if (isDbBusyError(error)) return dbBusyResponse(res);
    next(error);
  }
});

router.post("/login/verify", otpLimiter, validate(verifySchema), async (req, res, next) => {
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

router.post("/resend-code", resendLimiter, async (req, res, next) => {
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
    const emailResult = await dispatchVerificationEmail(email, code, purpose);
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
      newPassword: strongPasswordSchema
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

router.post("/forgot-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Valid email is required" });

    const email = parsed.data.email.trim().toLowerCase();
    void (async () => {
      try {
        const { code } = await db.createVerificationCode({ email, purpose: "reset" });
        await dispatchVerificationEmail(email, code, "reset");
      } catch (error) {
        console.error(`[RESET] Could not prepare reset code for ${email}:`, error.message);
      }
    })();

    res.json({
      message: `If an account exists for ${email}, a reset code will arrive by email shortly.`
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: strongPasswordSchema,
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
