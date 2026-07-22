import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth, signToken, requirePasswordChanged } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { db } from "../services/dbService.js";
import { dispatchVerificationEmail, verificationPayload } from "../services/emailService.js";
import { fileToPublicUrl, registrationUpload, upload } from "../lib/uploads.js";
import { deleteAssets, uploadBuffer } from "../services/cloudinaryService.js";
import { strongPasswordSchema } from "../lib/validation.js";
import { authLimiter, otpLimiter, passwordResetLimiter, registrationLimiter, resendLimiter } from "../middleware/security.js";

const router = Router();

export const registerSchema = z.object({
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
    companyAddress: z.string().trim().optional(),
    address: z.string().trim().optional(),
    businessRegistrationNumber: z.string().trim().optional(),
    profilePhotoUrl: z.string().url().optional(),
    profilePhotoPublicId: z.string().optional()
  }).optional(),
  nationalIdNumber: z.string().trim().min(1).optional(),
  driverLicense: z.string().trim().min(1).optional(),
  driverLicenseUrl: z.string().min(1).optional(),
  driverLicensePublicId: z.string().min(1).optional(),
  driverImageUrl: z.string().min(1).optional(),
  driverImagePublicId: z.string().min(1).optional(),
  truck: z
    .object({
      truckNumber: z.string().min(1),
      plateNumber: z.string().min(1),
      capacity: z.string().min(1),
      truckType: z.string().trim().min(1),
      photoUrl1: z.string().min(1),
      photoUrl2: z.string().min(1),
      photoPublicId1: z.string().min(1),
      photoPublicId2: z.string().min(1),
      registrationDocumentUrl: z.string().min(1),
      registrationDocumentPublicId: z.string().min(1)
    })
    .optional()
}).superRefine((data, ctx) => {
  if (data.role === "driver") {
    if (!data.truck || !data.nationalIdNumber || !data.driverLicense || !data.driverLicenseUrl || !data.driverImageUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["truck"], message: "Complete driver and truck information is required" });
    }
    return;
  }
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

router.post("/register", registrationLimiter, registrationUpload.fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "licenseImage", maxCount: 1 },
  { name: "truckPhoto1", maxCount: 1 },
  { name: "truckPhoto2", maxCount: 1 },
  { name: "truckRegistrationDocument", maxCount: 1 }
]), async (req, res, next) => {
  const uploadedPublicIds = [];
  try {
    if (!['customer', 'driver'].includes(req.body.role)) {
      return res.status(403).json({ message: "Public registration only supports customer or driver accounts" });
    }
    const conflict = await db.findRegistrationConflict({
      email: req.body.email,
      phone: req.body.phone,
      plateNumber: req.body.plateNumber,
      nationalIdNumber: req.body.nationalIdNumber
    });
    if (conflict) return res.status(409).json({ message: `${conflict} already registered` });

    let payload;
    if (req.body.role === "customer") {
      const profilePhoto = await uploadBuffer(req.files?.profilePhoto?.[0], "customers");
      if (profilePhoto) uploadedPublicIds.push(profilePhoto.publicId);
      payload = {
        name: req.body.name, email: req.body.email, phone: req.body.phone, password: req.body.password, role: "customer",
        customerProfile: {
          customerType: req.body.customerType,
          city: req.body.city,
          address: req.body.address || undefined,
          companyName: req.body.companyName || undefined,
          companyPhone: req.body.companyPhone || undefined,
          companyAddress: req.body.companyAddress || undefined,
          businessRegistrationNumber: req.body.businessRegistrationNumber || undefined,
          profilePhotoUrl: profilePhoto?.url,
          profilePhotoPublicId: profilePhoto?.publicId
        }
      };
    } else {
      const requiredFiles = ["profilePhoto", "licenseImage", "truckPhoto1", "truckPhoto2", "truckRegistrationDocument"];
      if (requiredFiles.some((field) => !req.files?.[field]?.[0])) {
        return res.status(400).json({ message: "Profile, licence, two truck photos, and truck registration document are required" });
      }
      const [profile, licence, photo1, photo2, registrationDocument] = await Promise.all([
        uploadBuffer(req.files.profilePhoto[0], "drivers"),
        uploadBuffer(req.files.licenseImage[0], "driver-licences"),
        uploadBuffer(req.files.truckPhoto1[0], "trucks"),
        uploadBuffer(req.files.truckPhoto2[0], "trucks"),
        uploadBuffer(req.files.truckRegistrationDocument[0], "truck-documents")
      ]);
      uploadedPublicIds.push(profile.publicId, licence.publicId, photo1.publicId, photo2.publicId, registrationDocument.publicId);
      payload = {
        name: req.body.name, email: req.body.email, phone: req.body.phone, password: req.body.password, role: "driver",
        nationalIdNumber: req.body.nationalIdNumber,
        driverLicense: req.body.driverLicense,
        driverLicenseUrl: licence.url,
        driverLicensePublicId: licence.publicId,
        driverImageUrl: profile.url,
        driverImagePublicId: profile.publicId,
        truck: {
          plateNumber: req.body.plateNumber,
          truckNumber: req.body.truckNumber,
          truckType: req.body.truckType,
          capacity: req.body.capacity,
          photoUrl1: photo1.url,
          photoUrl2: photo2.url,
          photoPublicId1: photo1.publicId,
          photoPublicId2: photo2.publicId,
          registrationDocumentUrl: registrationDocument.url,
          registrationDocumentPublicId: registrationDocument.publicId
        }
      };
    }

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      await deleteAssets(uploadedPublicIds);
      return res.status(400).json({ message: "Validation failed", details: parsed.error.flatten() });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const pendingPayload = { ...parsed.data, password: undefined, passwordHash };
    const { code } = await db.createVerificationCode({ email: parsed.data.email, purpose: "register", payload: pendingPayload });
    const emailResult = await dispatchVerificationEmail(parsed.data.email, code, "register");
    res.status(202).json(verificationResponse(parsed.data.email, emailResult));
  } catch (error) {
    await deleteAssets(uploadedPublicIds);
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

    const parsed = registerSchema.safeParse({ ...payload, password: "Pending1!" });
    if (!parsed.success) return res.status(400).json({ message: "Registration data expired. Please register again." });

    const existing = await db.findUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const user = await db.createUser({ ...parsed.data, password: undefined, passwordHash: payload.passwordHash });
    if (user.role === "driver") {
      return res.status(201).json({ user, verificationPending: true, message: "Registration complete. An admin or dispatcher must verify your account." });
    }
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
