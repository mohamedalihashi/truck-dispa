import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";

export const verificationRepository = {
  async createVerificationCode({ email, purpose, payload = null, ttlMinutes = 10 }) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const normalizedEmail = email.toLowerCase().trim();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const created = await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        codeHash,
        purpose,
        payload: payload || undefined,
        expiresAt,
      },
    });

    void prisma.verificationCode.updateMany({
      where: { email: normalizedEmail, purpose, usedAt: null, id: { not: created.id } },
      data: { usedAt: new Date() },
    }).catch((error) => console.warn("Could not expire older verification codes:", error.message));

    return { code, expiresAt };
  },

  async consumeVerificationCode({ email, code, purpose }) {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    const row = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, payload: true, codeHash: true, attempts: true, maxAttempts: true },
    });
    if (!row) return null;

    const matches = await bcrypt.compare(code, row.codeHash);
    if (!matches) {
      const nextAttempts = row.attempts + 1;
      await prisma.verificationCode.update({
        where: { id: row.id },
        data: {
          attempts: nextAttempts,
          usedAt: nextAttempts >= row.maxAttempts ? now : undefined,
        },
      });
      return null;
    }

    const { count } = await prisma.verificationCode.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count === 0) return null;

    if (!row.payload) return { __verified: true };
    return row.payload;
  },

  async getPendingVerificationPayload(email, purpose) {
    const normalizedEmail = email.toLowerCase().trim();
    const row = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!row?.payload) return null;
    return row.payload;
  },

  async getLatestRegisterPayload(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const rows = await prisma.verificationCode.findMany({
      where: {
        email: normalizedEmail,
        purpose: "register",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { payload: true },
    });
    const row = rows.find((entry) => entry.payload);
    return row?.payload || null;
  },
};
