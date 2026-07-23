import { prisma } from "../lib/prisma.js";
import { queueSms } from "./smsService.js";

const publicUrl = () => (process.env.APP_PUBLIC_URL || process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173").replace(/\/$/, "");
const safeLocation = (cargo, prefix) => {
  const region = cargo?.[`${prefix}Region`];
  const district = cargo?.[`${prefix}District`];
  return [district, region].filter(Boolean).join(", ") || `${prefix === "from" ? "Pickup" : "Destination"} area`;
};
const parties = (cargo) => [
  { name: cargo?.senderName || cargo?.sender, phone: cargo?.senderPhone, type: "Sender" },
  { name: cargo?.receiverName || cargo?.receiver, phone: cargo?.receiverPhone, type: "Receiver" },
].filter((party, index, rows) => party.phone && rows.findIndex((row) => row.phone === party.phone) === index);

async function sendMany(cargo, entityType, entityId, event, messageFor, recipients = parties(cargo)) {
  return Promise.all(recipients.map((party) => queueSms({
    entityType, entityId, event, recipientName: party.name, recipientPhone: party.phone,
    message: messageFor(party),
  })));
}

export async function sendBookingCreatedSms(request) {
  const recipients = parties(request).filter((party) =>
    request.customerRole === "SENDER" ? party.type === "Receiver" : party.type === "Sender"
  );
  const sender = request.senderName || "The sender";
  const receiver = request.receiverName || "the receiver";
  return sendMany(request, "cargo_request", request.id, "booking.created", (party) =>
    `Hello ${party.name || party.type}, ${sender} has booked a cargo delivery for ${receiver}. Booking number: ${request.id}. From: ${safeLocation(request, "from")}. To: ${safeLocation(request, "to")}. Track: ${publicUrl()}/tracking`,
  recipients);
}

export async function sendCargoRequestEventSms(request, event) {
  const labels = {
    "booking.accepted": "Your cargo booking has been accepted.",
    "booking.assigned": `Driver and truck have been assigned to cargo ${request.id}.`,
    "booking.cancelled": `Cargo delivery ${request.id} has been cancelled.`,
  };
  return sendMany(request, "cargo_request", request.id, event, (party) =>
    `Hello ${party.name || party.type}, ${labels[event] || "Your cargo booking was updated"} Booking number: ${request.id}.`);
}

export async function sendTripEventSms(tripId, event, { feedbackToken } = {}) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { cargoRequest: true },
  });
  if (!trip?.cargoRequest) return [];
  const cargo = trip.cargoRequest;
  const text = {
    "cargo.picked_up": `Cargo ${trip.id} has been picked up.`,
    "cargo.in_transit": `Cargo ${trip.id} is now in transit.`,
    "cargo.near_destination": `Driver carrying cargo ${trip.id} is near the destination.`,
    "cargo.cancelled": `Cargo delivery ${trip.id} has been cancelled.`,
  };
  if (event === "cargo.delivered") {
    const feedbackLink = `${publicUrl()}/feedback/${feedbackToken}`;
    return sendMany(cargo, "trip", trip.id, event, () =>
      `Your cargo ${trip.id} has been marked as delivered. Please confirm delivery and rate the service using this secure link: ${feedbackLink}`);
  }
  return sendMany(cargo, "trip", trip.id, event, (party) =>
    `Hello ${party.name || party.type}, ${text[event]} Track: ${publicUrl()}/tracking`);
}
