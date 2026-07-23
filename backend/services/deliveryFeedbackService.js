import crypto from "node:crypto";
import { prisma, withTransaction } from "../lib/prisma.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const maskName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.map((part) => part.length <= 2 ? `${part[0] || ""}*` : `${part.slice(0, 2)}${"*".repeat(Math.min(4, part.length - 2))}`).join(" ");
};

export async function createFeedbackToken(tripId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await prisma.deliveryFeedbackToken.upsert({
    where: { tripId },
    update: { tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000), usedAt: null },
    create: { tripId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
  });
  return token;
}

async function resolveToken(token) {
  if (!token || token.length < 32) return null;
  return prisma.deliveryFeedbackToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      trip: {
        include: { cargoRequest: true, driver: true, feedback: true },
      },
    },
  });
}

function assertValid(row) {
  if (!row) return { status: 404, message: "Invalid feedback link" };
  if (row.usedAt || row.trip.feedback) return { status: 409, message: "Feedback has already been submitted" };
  if (row.expiresAt <= new Date()) return { status: 410, message: "This feedback link has expired" };
  return null;
}

export async function getPublicFeedback(token) {
  const row = await resolveToken(token);
  const error = assertValid(row);
  if (error) return { error };
  const trip = row.trip;
  const cargo = trip.cargoRequest;
  return {
    data: {
      bookingNumber: trip.id,
      senderName: maskName(cargo?.senderName || cargo?.sender),
      receiverName: maskName(cargo?.receiverName || cargo?.receiver),
      from: cargo?.fromRegion || cargo?.fromDistrict || "Pickup area",
      to: cargo?.toRegion || cargo?.toDistrict || "Destination area",
      deliveryDate: trip.updatedAt,
      driverFirstName: trip.driver?.name?.split(/\s+/)[0] || "Driver",
      expiresAt: row.expiresAt,
    },
  };
}

export async function submitPublicFeedback(token, payload) {
  const row = await resolveToken(token);
  const invalid = assertValid(row);
  if (invalid) return { error: invalid };
  const trip = row.trip;
  const cargo = trip.cargoRequest;
  return withTransaction(async (tx) => {
    const claimed = await tx.deliveryFeedbackToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return { error: { status: 409, message: "Feedback link is no longer available" } };
    const feedback = await tx.tripFeedback.create({
      data: {
        tripId: trip.id,
        customerId: trip.customerId,
        driverId: trip.driverId,
        rating: payload.rating,
        productRating: payload.cargoConditionRating,
        driverBehaviourRating: payload.driverBehaviourRating,
        deliverySpeedRating: payload.deliverySpeedRating,
        cargoConditionRating: payload.cargoConditionRating,
        cargoReceivedSafely: payload.cargoReceivedSafely,
        reportProblem: payload.reportProblem,
        complaintStatus: payload.reportProblem ? "Open" : "None",
        senderName: cargo?.senderName || cargo?.sender || null,
        senderPhone: cargo?.senderPhone || null,
        receiverName: cargo?.receiverName || cargo?.receiver || null,
        receiverPhone: cargo?.receiverPhone || null,
        comment: payload.comment?.trim() || null,
      },
    });
    return { data: feedback };
  });
}
