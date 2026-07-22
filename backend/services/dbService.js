import bcrypt from "bcryptjs";
import { coordsFromPlaceName, estimateEta, shouldRecordPoint } from "../lib/somaliaGeo.js";
import { prisma, withTransaction } from "../lib/prisma.js";
import { ADMIN, DEMO_PASSWORD } from "../config/seed.js";
import {
  buildWaafiAttemptReference,
  buildWaafiReferenceId,
  formatWaafiError,
  isWaafiSuccess,
  waafiPurchase
} from "./waafiPayService.js";
import { getCommissionSettings, syncEarningsForPayment } from "./commissionService.js";

// ─── Status mapping helpers ──────────────────────────────────────────
// Prisma enum values use underscores; the API uses spaces.
const tripStatusToDb = (s) => (s ? s.replace(/ /g, "_") : s);
const tripStatusToApi = (s) => (s ? s.replace(/_/g, " ") : s);
const reqStatusToDb = (s) => (s ? s.replace(/ /g, "_") : s);
const reqStatusToApi = (s) => (s ? s.replace(/_/g, " ") : s);

// ─── Mappers ─────────────────────────────────────────────────────────

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    avatarUrl: row.avatarUrl || null,
    driverLicense: row.driverLicense || null,
    driverLicenseUrl: row.driverLicenseUrl || null,
    driverImageUrl: row.driverImageUrl || null,
    status: row.status,
    mustChangePassword: Boolean(row.mustChangePassword),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    truckId: row.truck?.id || null,
    truckNumber: row.truck?.truckNumber || null,
    plateNumber: row.truck?.plateNumber || null,
    truckStatus: row.truck?.status || null,
    truckPhotoUrl1: row.truck?.photoUrl1 || null,
    truckPhotoUrl2: row.truck?.photoUrl2 || null,
    truckDocumentUrls: row.truck?.documentUrls || [],
    dispatcherProfile: row.dispatcherProfile
      ? { ...row.dispatcherProfile, commissionPercentage: Number(row.dispatcherProfile.commissionPercentage || 0) }
      : null,
  };
}

function mapTruck(row) {
  if (!row) return null;
  return {
    id: row.id,
    truckNumber: row.truckNumber,
    plateNumber: row.plateNumber,
    capacity: row.capacity,
    type: row.truckType,
    truckType: row.truckType,
    driverId: row.driverId,
    driver: row.driver?.name || null,
    status: row.status,
    photoUrl1: row.photoUrl1 || null,
    photoUrl2: row.photoUrl2 || null,
    documentUrls: row.documentUrls || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCargoRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customerId,
    customer: row.customer?.name || null,
    pickup: row.pickup,
    destination: row.destination,
    from: row.pickup,
    to: row.destination,
    truckType: row.truckType,
    weight: row.weight,
    description: row.description,
    cargo: row.description,
    receiver: row.receiver,
    sender: row.sender,
    specialInstructions: row.specialInstructions,
    preferredPickupDate: row.preferredPickupDate,
    quotedPrice: row.quotedPrice != null ? Number(row.quotedPrice) : null,
    quotedEstimatedTime: row.quotedEstimatedTime,
    quoteNotes: row.quoteNotes,
    quotedAt: row.quotedAt,
    quoteVersion: row.quoteVersion ?? 0,
    customerDecisionAt: row.customerDecisionAt,
    customerDecisionNote: row.customerDecisionNote,
    status: reqStatusToApi(row.status),
    driverId: row.driverId,
    driver: row.driver?.name || null,
    truckId: row.truckId,
    truck: row.truck?.truckNumber || null,
    dispatcherId: row.dispatcherId,
    dispatcher: row.dispatcher?.name || null,
    date: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    cargoRequestId: row.cargoRequestId,
    customerId: row.customerId,
    customer: row.customer?.name || null,
    driverId: row.driverId,
    driver: row.driver?.name || null,
    dispatcherId: row.dispatcherId,
    dispatcher: row.dispatcher?.name || null,
    truckId: row.truckId,
    truck: row.truck?.truckNumber || null,
    pickup: row.pickup,
    destination: row.destination,
    route: `${row.pickup} -> ${row.destination}`,
    distance: row.distance,
    estimatedTime: row.estimatedTime,
    eta: row.estimatedTime,
    status: tripStatusToApi(row.status),
    fare: Number(row.fare || 0),
    cargo: row.cargoRequest?.description || "Cargo",
    deliveryProofUrl: row.deliveryProofUrl,
    signatureUrl: row.signatureUrl,
    lastLocation:
      row.lastLat != null
        ? { lat: row.lastLat, lng: row.lastLng, updatedAt: row.lastLocationAt }
        : null,
    eta:
      row.lastLat != null &&
      row.destination &&
      !["Delivered", "Cancelled"].includes(tripStatusToApi(row.status))
        ? estimateEta(row.lastLat, row.lastLng, row.destination)
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    feedback: row.feedback ? mapFeedback(row.feedback) : null,
  };
}

function mapFeedback(row) {
  if (!row) return null;
  return {
    id: row.id,
    tripId: row.tripId,
    customerId: row.customerId,
    driverId: row.driverId,
    rating: row.rating,
    productRating: row.productRating,
    comment: row.comment,
    createdAt: row.createdAt,
  };
}

function mapFeedbackListItem(row) {
  if (!row) return null;
  const trip = row.trip;
  return {
    ...mapFeedback(row),
    customer: row.customer?.name || trip?.customer?.name || null,
    driver: row.driver?.name || trip?.driver?.name || null,
    dispatcher: trip?.dispatcher?.name || null,
    route: trip ? `${trip.pickup} → ${trip.destination}` : null,
    pickup: trip?.pickup || null,
    destination: trip?.destination || null,
    cargo: trip?.cargoRequest?.description || null,
    tripStatus: trip ? tripStatusToApi(trip.status) : null,
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    message: row.message,
    read: row.read,
    createdAt: row.createdAt,
  };
}

// ─── Include helpers ─────────────────────────────────────────────────

const userInclude = { truck: true, dispatcherProfile: true };

const cargoRequestInclude = {
  customer: true,
  driver: true,
  dispatcher: true,
  truck: true,
};

const tripInclude = {
  customer: true,
  driver: true,
  dispatcher: true,
  truck: true,
  cargoRequest: true,
  feedback: true,
};

const feedbackListInclude = {
  customer: true,
  driver: true,
  trip: {
    include: {
      customer: true,
      driver: true,
      dispatcher: true,
      cargoRequest: true,
    },
  },
};

// ─── DB Service ──────────────────────────────────────────────────────

export { prisma } from "../lib/prisma.js";

export const db = {
  async ensureAdmin() {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: ADMIN.email, mode: "insensitive" } },
      select: { id: true, role: true, status: true, name: true, phone: true },
    });

    if (existing) {
      const needsUpdate =
        existing.role !== ADMIN.role ||
        existing.status !== "Active" ||
        existing.name !== ADMIN.name ||
        existing.phone !== ADMIN.phone;

      if (needsUpdate) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: ADMIN.role,
            status: "Active",
            name: ADMIN.name,
            phone: ADMIN.phone,
          },
        });
      }

      return { password: DEMO_PASSWORD, email: ADMIN.email };
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.create({
      data: {
        ...ADMIN,
        passwordHash,
      },
    });
    return { password: DEMO_PASSWORD, email: ADMIN.email };
  },

  async seedIfEmpty() {
    const count = await prisma.user.count();
    if (count > 0) return { seeded: false };

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.create({
      data: { ...ADMIN, passwordHash },
    });

    return { seeded: true, demoPassword: DEMO_PASSWORD };
  },

  // ── Users ────────────────────────────────────────────────────────

  async findUserByEmail(email) {
    const row = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: userInclude,
    });
    if (!row) return null;
    return {
      ...mapUser(row),
      passwordHash: row.passwordHash,
      failedLoginAttempts: row.failedLoginAttempts,
      lockedUntil: row.lockedUntil,
    };
  },

  async recordFailedLogin(id) {
    const user = await prisma.user.findUnique({ where: { id }, select: { failedLoginAttempts: true } });
    if (!user) return;
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts,
        lockedUntil: failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
  },

  async clearFailedLogins(id) {
    await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  async findUserById(id) {
    const row = await prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    return mapUser(row);
  },

  async listUsers({ role, search, page = 1, limit = 50 } = {}) {
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);
    return { data: data.map(mapUser), total, page: Number(page) };
  },

  async userSummary() {
    const [total, active, inactive, customers, dispatchers, drivers, driverActive, trucks] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "Active" } }),
      prisma.user.count({ where: { status: "Inactive" } }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.user.count({ where: { role: "dispatcher" } }),
      prisma.user.count({ where: { role: "driver" } }),
      prisma.user.count({ where: { role: "driver", status: "Active" } }),
      prisma.truck.count(),
    ]);

    return { total, active, inactive, customers, dispatchers, drivers, driverActive, trucks };
  },

  async createUser({ name, email, password, role, phone, driverLicense, driverLicenseUrl, driverImageUrl, dispatcherProfile, truck, mustChangePassword = false, actorId = null }) {
    const passwordHash = await bcrypt.hash(password, 10);
    return withTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          phone: phone || null,
          driverLicense: role === "driver" ? driverLicense : null,
          driverLicenseUrl: role === "driver" ? driverLicenseUrl : null,
          driverImageUrl: role === "driver" ? driverImageUrl : null,
          mustChangePassword: Boolean(mustChangePassword),
        },
      });

      let truckRow = null;
      if (role === "driver") {
        if (!truck?.truckNumber || !truck?.plateNumber || !truck?.capacity || !truck?.truckType) {
          const error = new Error("Driver registration requires truck details");
          error.status = 400;
          throw error;
        }
        if (!truck?.photoUrl1 || !truck?.photoUrl2) {
          const error = new Error("Driver registration requires two truck photos");
          error.status = 400;
          throw error;
        }
        if (!driverLicense || !driverLicenseUrl || !driverImageUrl || !truck.documentUrls?.length) {
          const error = new Error("Driver registration requires a license number, license document, driver photo, and truck documents");
          error.status = 400;
          throw error;
        }
        truckRow = await tx.truck.create({
          data: {
            truckNumber: truck.truckNumber,
            plateNumber: truck.plateNumber,
            capacity: truck.capacity,
            truckType: truck.truckType,
            photoUrl1: truck.photoUrl1,
            photoUrl2: truck.photoUrl2,
            documentUrls: truck.documentUrls,
            driverId: user.id,
            status: "Available",
          },
        });
      }

      if (role === "dispatcher") {
        if (!dispatcherProfile) {
          const error = new Error("Dispatcher registration requires a complete dispatcher profile");
          error.status = 400;
          throw error;
        }
        await tx.dispatcherProfile.create({
          data: {
            ...dispatcherProfile,
            userId: user.id,
            verifiedBy: dispatcherProfile.verificationStatus === "Verified" ? actorId : null,
            verifiedAt: dispatcherProfile.verificationStatus === "Verified" ? new Date() : null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actorId || user.id,
          action: "user.created",
          entity: "users",
          entityId: user.id,
          meta: { role, mustChangePassword: Boolean(mustChangePassword) },
        },
      });

      const created = await tx.user.findUnique({ where: { id: user.id }, include: userInclude });
      return mapUser(created);
    });
  },

  async updateUser(id, payload) {
    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.avatarUrl !== undefined) data.avatarUrl = payload.avatarUrl;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.role !== undefined) data.role = payload.role;
    if (payload.password) {
      data.passwordHash = await bcrypt.hash(payload.password, 10);
      data.mustChangePassword = false;
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id }, data });
    }
    return this.findUserById(id);
  },

  async deleteUser(id) {
    return withTransaction(async (tx) => {
      await tx.auditLog.updateMany({
        where: { actorId: id },
        data: { actorId: null },
      });
      const result = await tx.user.deleteMany({ where: { id } });
      return result.count > 0;
    });
  },

  // ── Trucks ───────────────────────────────────────────────────────

  async listTrucks({ status, search, page = 1, limit = 50 } = {}) {
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { truckNumber: { contains: search, mode: "insensitive" } },
        { plateNumber: { contains: search, mode: "insensitive" } },
        { truckType: { contains: search, mode: "insensitive" } },
        { driver: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.truck.findMany({
        where,
        include: { driver: true },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
      }),
      prisma.truck.count({ where }),
    ]);
    return { data: data.map(mapTruck), total, page: Number(page) };
  },

  async truckSummary() {
    const [total, active, busy, maintenance, inactive] = await Promise.all([
      prisma.truck.count(),
      prisma.truck.count({ where: { status: "Available" } }),
      prisma.truck.count({ where: { status: "Busy" } }),
      prisma.truck.count({ where: { status: "Maintenance" } }),
      prisma.truck.count({ where: { driver: { status: "Inactive" } } }),
    ]);

    return { total, active, inactive, busy, maintenance };
  },

  async createTruck(payload) {
    const truck = await prisma.truck.create({
      data: {
        truckNumber: payload.truckNumber,
        plateNumber: payload.plateNumber,
        capacity: payload.capacity,
        truckType: payload.truckType || payload.type,
        driverId: payload.driverId,
        status: payload.status || "Available",
      },
      include: { driver: true },
    });
    return mapTruck(truck);
  },

  async deleteTruck(id) {
    return withTransaction(async (tx) => {
      const truck = await tx.truck.findUnique({ where: { id } });
      if (!truck) return false;

      const activeTrip = await tx.trip.findFirst({
        where: {
          truckId: id,
          status: { notIn: ["Delivered", "Cancelled"] },
        },
      });
      if (activeTrip) {
        const error = new Error("Cannot delete truck with active trips");
        error.status = 400;
        throw error;
      }

      await tx.truck.delete({ where: { id } });
      return true;
    });
  },

  async updateTruck(id, payload, { driverId } = {}) {
    const existing = await prisma.truck.findUnique({ where: { id } });
    if (!existing) return null;
    if (driverId) {
      if (existing.driverId !== driverId) {
        const error = new Error("Not allowed to update this truck");
        error.status = 403;
        throw error;
      }
      payload = { status: payload.status };
      if (!payload.status) {
        const error = new Error("Drivers can only update truck status");
        error.status = 400;
        throw error;
      }
    }

    const data = {};
    if (payload.truckNumber !== undefined) data.truckNumber = payload.truckNumber;
    if (payload.plateNumber !== undefined) data.plateNumber = payload.plateNumber;
    if (payload.capacity !== undefined) data.capacity = payload.capacity;
    if (payload.truckType !== undefined) data.truckType = payload.truckType;
    if (payload.type !== undefined) data.truckType = payload.type;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.driverId !== undefined) data.driverId = payload.driverId;

    if (Object.keys(data).length > 0) {
      await prisma.truck.update({ where: { id }, data });
    }
    const truck = await prisma.truck.findUnique({
      where: { id },
      include: { driver: true },
    });
    return mapTruck(truck);
  },

  // ── Cargo Requests ───────────────────────────────────────────────

  async listCargoRequests({ status, customerId, search, page = 1, limit = 20 } = {}) {
    const where = {};
    if (status) where.status = reqStatusToDb(status);
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { pickup: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { driver: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.cargoRequest.findMany({
        where,
        include: cargoRequestInclude,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
      }),
      prisma.cargoRequest.count({ where }),
    ]);
    return { data: data.map(mapCargoRequest), total, page: Number(page) };
  },

  async cargoRequestSummary({ customerId } = {}) {
    const where = {};
    if (customerId) where.customerId = customerId;

    const activeStatuses = ["Approved", "Assigned", "Accepted", "Arrived_Pickup", "Loaded", "In_Transit"];

    const [total, pending, active, awaitingApproval, delivered, cancelled] = await Promise.all([
      prisma.cargoRequest.count({ where }),
      prisma.cargoRequest.count({ where: { ...where, status: "Pending" } }),
      prisma.cargoRequest.count({ where: { ...where, status: { in: activeStatuses } } }),
      prisma.cargoRequest.count({ where: { ...where, status: "Awaiting_Approval" } }),
      prisma.cargoRequest.count({ where: { ...where, status: "Delivered" } }),
      prisma.cargoRequest.count({ where: { ...where, status: "Cancelled" } }),
    ]);

    return { total, pending, active, awaitingApproval, delivered, cancelled };
  },

  async createCargoRequest(payload) {
    const id = `REQ-${Math.floor(9000 + Math.random() * 1000)}`;

    return withTransaction(async (tx) => {
      const request = await tx.cargoRequest.create({
        data: {
          id,
          customerId: payload.customerId,
          pickup: payload.pickup,
          destination: payload.destination,
          truckType: payload.truckType,
          weight: payload.weight,
          description: payload.description,
          receiver: payload.receiver || null,
          sender: payload.sender || null,
          specialInstructions: payload.specialInstructions || null,
          preferredPickupDate: payload.preferredPickupDate
            ? new Date(payload.preferredPickupDate)
            : null,
          status: "Pending",
        },
        include: cargoRequestInclude,
      });

      const [notification] = await Promise.all([
        tx.notification.create({
          data: {
            type: "order.created",
            message: `${id} created by ${payload.customerName || "Customer"}`,
          },
        }),
        tx.auditLog.create({
          data: {
            actorId: payload.customerId,
            action: "cargo.created",
            entity: "cargo_requests",
            entityId: id,
          },
        })
      ]);

      return { request: mapCargoRequest(request), notification: mapNotification(notification) };
    });
  },

  async updateCargoRequest(id, payload, { customerId } = {}) {
    const existing = await prisma.cargoRequest.findUnique({ where: { id } });
    if (!existing) return null;

    if (customerId && existing.customerId !== customerId) {
      const error = new Error("Not allowed to update this request");
      error.status = 403;
      throw error;
    }
    if (reqStatusToApi(existing.status) !== "Pending") {
      const error = new Error("Only pending requests can be edited");
      error.status = 400;
      throw error;
    }

    const data = {};
    if (payload.pickup !== undefined) data.pickup = payload.pickup;
    if (payload.destination !== undefined) data.destination = payload.destination;
    if (payload.truckType !== undefined) data.truckType = payload.truckType;
    if (payload.weight !== undefined) data.weight = payload.weight;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.receiver !== undefined) data.receiver = payload.receiver;
    if (payload.sender !== undefined) data.sender = payload.sender;
    if (payload.specialInstructions !== undefined) data.specialInstructions = payload.specialInstructions;
    if (payload.preferredPickupDate !== undefined) {
      data.preferredPickupDate = payload.preferredPickupDate
        ? new Date(payload.preferredPickupDate)
        : null;
    }

    if (Object.keys(data).length > 0) {
      await prisma.cargoRequest.update({ where: { id }, data });
    }

    const updated = await prisma.cargoRequest.findUnique({
      where: { id },
      include: cargoRequestInclude,
    });
    return mapCargoRequest(updated);
  },

  async submitCargoQuote(id, { quotedPrice, quotedEstimatedTime, quoteNotes, dispatcherId }) {
    return withTransaction(async (tx) => {
      const existing = await tx.cargoRequest.findUnique({ where: { id } });
      if (!existing) return null;

      const apiStatus = reqStatusToApi(existing.status);
      if (!["Pending", "Quote Rejected"].includes(apiStatus)) {
        const error = new Error("Only pending or quote-rejected requests can receive a quotation");
        error.status = 400;
        throw error;
      }
      if (quotedPrice == null || !quotedEstimatedTime?.trim()) {
        const error = new Error("quotedPrice and quotedEstimatedTime are required");
        error.status = 400;
        throw error;
      }

      await tx.cargoRequest.update({
        where: { id },
        data: {
          status: "Awaiting_Approval",
          quotedPrice,
          quotedEstimatedTime: quotedEstimatedTime.trim(),
          quoteNotes: quoteNotes?.trim() || null,
          quotedAt: new Date(),
          quoteVersion: (existing.quoteVersion || 0) + 1,
          dispatcherId: dispatcherId || existing.dispatcherId,
          customerDecisionAt: null,
          customerDecisionNote: null,
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: existing.customerId,
          type: "quote.sent",
          message: `Quotation ready for ${id}: $${Number(quotedPrice).toFixed(2)} — ${quotedEstimatedTime.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: dispatcherId,
          action: "cargo.quote.sent",
          entity: "cargo_requests",
          entityId: id,
          meta: { quotedPrice: Number(quotedPrice), quotedEstimatedTime },
        },
      });

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });

      return { request: mapCargoRequest(request), notification: mapNotification(notification) };
    });
  },

  async acceptCargoQuote(id, { customerId }) {
    return withTransaction(async (tx) => {
      const existing = await tx.cargoRequest.findUnique({ where: { id } });
      if (!existing) return null;

      if (existing.customerId !== customerId) {
        const error = new Error("Not allowed to approve this quotation");
        error.status = 403;
        throw error;
      }
      if (reqStatusToApi(existing.status) !== "Awaiting Approval") {
        const error = new Error("This request is not waiting for customer approval");
        error.status = 400;
        throw error;
      }

      await tx.cargoRequest.update({
        where: { id },
        data: {
          status: "Approved",
          customerDecisionAt: new Date(),
          customerDecisionNote: null,
        },
      });

      if (existing.dispatcherId) {
        await tx.notification.create({
          data: {
            userId: existing.dispatcherId,
            type: "quote.accepted",
            message: `Customer approved quotation for ${id}`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: customerId,
          type: "quote.accepted",
          message: `You approved the quotation for ${id}. A driver will be assigned soon.`,
        },
      });

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });
      return mapCargoRequest(request);
    });
  },

  async rejectCargoQuote(id, { customerId, note }) {
    return withTransaction(async (tx) => {
      const existing = await tx.cargoRequest.findUnique({ where: { id } });
      if (!existing) return null;

      if (existing.customerId !== customerId) {
        const error = new Error("Not allowed to reject this quotation");
        error.status = 403;
        throw error;
      }
      if (reqStatusToApi(existing.status) !== "Awaiting Approval") {
        const error = new Error("This request is not waiting for customer approval");
        error.status = 400;
        throw error;
      }

      await tx.cargoRequest.update({
        where: { id },
        data: {
          status: "Quote_Rejected",
          customerDecisionAt: new Date(),
          customerDecisionNote: note?.trim() || null,
        },
      });

      if (existing.dispatcherId) {
        await tx.notification.create({
          data: {
            userId: existing.dispatcherId,
            type: "quote.rejected",
            message: `Customer rejected quotation for ${id}${note ? `: ${note.trim()}` : ""}`,
          },
        });
      }

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });
      return mapCargoRequest(request);
    });
  },

  async assignCargoRequest(id, { driverId, truckId, dispatcherId }) {
    return withTransaction(async (tx) => {
      const truckCheck = await tx.truck.findFirst({
        where: { id: truckId, driverId },
      });
      if (!truckCheck) {
        const error = new Error("Truck must belong to the selected driver");
        error.status = 400;
        throw error;
      }

      const current = await tx.cargoRequest.findUnique({ where: { id } });
      if (!current) return null;

      const normalizeType = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (normalizeType(truckCheck.truckType) !== normalizeType(current.truckType)) {
        const error = new Error(
          `Truck type does not match. Request needs "${current.truckType}", selected truck is "${truckCheck.truckType}".`
        );
        error.status = 400;
        throw error;
      }

      const currentStatus = reqStatusToApi(current.status);
      if (currentStatus !== "Approved" && currentStatus !== "Assigned") {
        const error = new Error(
          "Customer must approve the quotation before assigning a driver"
        );
        error.status = 400;
        throw error;
      }
      if (currentStatus === "Approved" && (!current.quotedPrice || !current.quotedEstimatedTime)) {
        const error = new Error("Approved request is missing quotation details");
        error.status = 400;
        throw error;
      }

      const tripFare = current.quotedPrice != null
        ? current.quotedPrice
        : estimateFare(current.weight);
      const tripEta = current.quotedEstimatedTime || "8h 00m";

      // Release previous truck if reassigning
      if (current.truckId && current.truckId !== truckId) {
        await tx.truck.update({
          where: { id: current.truckId },
          data: { status: "Available" },
        });
      }

      const updated = await tx.cargoRequest.update({
        where: { id },
        data: {
          status: "Assigned",
          driverId,
          truckId,
          dispatcherId,
        },
      });

      // Find or create trip
      const existingTrip = await tx.trip.findFirst({
        where: {
          cargoRequestId: id,
          status: { notIn: ["Delivered", "Cancelled"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const pickupCoords = coordsFromPlaceName(updated.pickup);
      const locationFields = {
        lastLat: pickupCoords.lat,
        lastLng: pickupCoords.lng,
        lastLocationAt: new Date()
      };

      let tripId;
      if (existingTrip) {
        tripId = existingTrip.id;
        await tx.trip.update({
          where: { id: tripId },
          data: {
            driverId,
            truckId,
            dispatcherId,
            status: "Assigned",
            fare: tripFare,
            estimatedTime: tripEta,
            ...locationFields
          },
        });
      } else {
        tripId = `SHP-${Math.floor(10000 + Math.random() * 9000)}`;
        await tx.trip.create({
          data: {
            id: tripId,
            cargoRequestId: updated.id,
            customerId: updated.customerId,
            driverId,
            dispatcherId,
            truckId,
            pickup: updated.pickup,
            destination: updated.destination,
            distance: payloadDistance(updated.pickup, updated.destination),
            estimatedTime: tripEta,
            status: "Assigned",
            fare: tripFare,
            ...locationFields
          },
        });
      }

      await tx.tripLocationPoint.create({
        data: {
          tripId,
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
        },
      });

      await tx.truck.update({
        where: { id: truckId },
        data: { status: "Busy" },
      });

      const notification = await tx.notification.create({
        data: {
          userId: driverId,
          type: "driver.assigned",
          message: `${id} assigned to driver`,
        },
      });

      await tx.notification.create({
        data: {
          userId: updated.customerId,
          type: "driver.assigned",
          message: `${id} assigned. Trip ${tripId} created`,
        },
      });

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });

      return { request: mapCargoRequest(request), tripId, notification: mapNotification(notification) };
    });
  },

  async cancelCargoRequest(id, actorId, { customerId } = {}) {
    return withTransaction(async (tx) => {
      const existing = await tx.cargoRequest.findUnique({ where: { id } });
      if (!existing) return null;

      if (customerId && existing.customerId !== customerId) {
        const error = new Error("Not allowed to cancel this request");
        error.status = 403;
        throw error;
      }

      const apiStatus = reqStatusToApi(existing.status);
      const nonCancelable = ["Loaded", "In Transit", "Delivered", "Cancelled"];
      if (nonCancelable.includes(apiStatus)) {
        const error = new Error("Cannot cancel a request in this status");
        error.status = 400;
        throw error;
      }

      if (existing.truckId) {
        await tx.truck.update({
          where: { id: existing.truckId },
          data: { status: "Available" },
        });
      }

      await tx.trip.updateMany({
        where: {
          cargoRequestId: id,
          status: { notIn: ["Delivered", "Cancelled"] },
        },
        data: { status: "Cancelled" },
      });

      await tx.cargoRequest.update({
        where: { id },
        data: {
          status: "Cancelled",
          driverId: null,
          truckId: null,
        },
      });

      await tx.notification.create({
        data: {
          userId: existing.customerId,
          type: "order.cancelled",
          message: `${id} cancelled`,
        },
      });

      if (actorId && actorId !== existing.customerId) {
        await tx.notification.create({
          data: {
            userId: actorId,
            type: "order.cancelled",
            message: `${id} cancelled by dispatcher`,
          },
        });
      }

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });
      return mapCargoRequest(request);
    });
  },

  // ── Trips ────────────────────────────────────────────────────────

  async listTrips({ status, driverId, customerId, search, page = 1, limit = 50 } = {}) {
    const where = {};
    if (status) where.status = tripStatusToDb(status);
    if (driverId) where.driverId = driverId;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { pickup: { contains: search, mode: "insensitive" } },
        { destination: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { driver: { name: { contains: search, mode: "insensitive" } } },
        { truck: { truckNumber: { contains: search, mode: "insensitive" } } },
        { truck: { plateNumber: { contains: search, mode: "insensitive" } } },
      ];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: tripInclude,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
      }),
      prisma.trip.count({ where }),
    ]);
    return { data: data.map(mapTrip), total, page: Number(page) };
  },

  async tripSummary({ driverId, customerId } = {}) {
    const where = {};
    if (driverId) where.driverId = driverId;
    if (customerId) where.customerId = customerId;

    const activeStatuses = ["Assigned", "Accepted", "Arrived_Pickup", "Loaded", "In_Transit", "Delayed"];

    const [total, active, pending, cancelled, delivered] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.count({ where: { ...where, status: { in: activeStatuses } } }),
      prisma.trip.count({ where: { ...where, status: "Pending" } }),
      prisma.trip.count({ where: { ...where, status: "Cancelled" } }),
      prisma.trip.count({ where: { ...where, status: "Delivered" } }),
    ]);

    return { total, active, pending, cancelled, delivered };
  },

  async updateTripStatus(id, status, actorId, { driverId } = {}) {
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return null;
    if (driverId && existing.driverId !== driverId) {
      const error = new Error("Not allowed to update this trip");
      error.status = 403;
      throw error;
    }

    const dbStatus = tripStatusToDb(status);

    return withTransaction(async (tx) => {
      const trip = await tx.trip.update({
        where: { id },
        data: { status: dbStatus },
      }).catch(() => null);

      if (!trip) return null;

      // Sync cargo request status
      if (trip.cargoRequestId) {
        const requestStatus =
          status === "Delayed" ? "In Transit" : status === "Cancelled" ? "Cancelled" : status;
        const allowed = ["Pending", "Assigned", "Accepted", "Arrived Pickup", "Loaded", "In Transit", "Delivered", "Cancelled"];
        if (allowed.includes(requestStatus)) {
          await tx.cargoRequest.update({
            where: { id: trip.cargoRequestId },
            data: { status: reqStatusToDb(requestStatus) },
          });
        }
      }

      // Release truck & handle payment on terminal statuses
      if (status === "Delivered" || status === "Cancelled") {
        if (trip.truckId) {
          await tx.truck.update({
            where: { id: trip.truckId },
            data: { status: "Available" },
          });
        }
        if (status === "Delivered") {
          const existingPayment = await tx.payment.findFirst({
            where: { tripId: trip.id },
          });
          if (!existingPayment) {
            await tx.payment.create({
              data: {
                trip: { connect: { id: trip.id } },
                customer: { connect: { id: trip.customerId } },
                amount: trip.fare,
                amountPaid: 0,
                status: "Pending",
                method: "waafipay",
                provider: "waafipay",
                currency: process.env.WAAFI_CURRENCY || "SLSH",
                referenceId: buildWaafiReferenceId(trip.id),
                description: `Shipment ${trip.id} — ${trip.pickup} to ${trip.destination}`,
              },
            });
          }
        }
      }

      const typeMap = {
        Accepted: "driver.accepted",
        "Arrived Pickup": "driver.arrived",
        Delivered: "cargo.delivered",
      };

      const notification = await tx.notification.create({
        data: {
          userId: trip.customerId,
          type: typeMap[status] || "trip.status.updated",
          message: `${id} updated to ${status}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "trip.status.updated",
          entity: "trips",
          entityId: id,
          meta: { status },
        },
      });

      const joined = await tx.trip.findUnique({
        where: { id },
        include: tripInclude,
      });

      return { trip: mapTrip(joined), notification: mapNotification(notification) };
    });
  },

  async updateTripLocation(id, { lat, lng }, { driverId } = {}) {
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return null;
    if (driverId && existing.driverId !== driverId) {
      const error = new Error("Not allowed to update this trip location");
      error.status = 403;
      throw error;
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocationAt: new Date(),
      },
    }).catch(() => null);

    if (!trip) return null;

    if (shouldRecordPoint(existing.lastLat, existing.lastLng, lat, lng)) {
      await prisma.tripLocationPoint.create({
        data: { tripId: id, lat, lng },
      });

      const extra = await prisma.tripLocationPoint.count({ where: { tripId: id } });
      if (extra > 500) {
        const stale = await prisma.tripLocationPoint.findMany({
          where: { tripId: id },
          orderBy: { recordedAt: "asc" },
          take: extra - 500,
          select: { id: true },
        });
        if (stale.length) {
          await prisma.tripLocationPoint.deleteMany({
            where: { id: { in: stale.map((row) => row.id) } },
          });
        }
      }
    }

    const eta = trip.destination ? estimateEta(lat, lng, trip.destination) : null;

    return {
      id,
      lastLocation: { lat, lng, updatedAt: new Date().toISOString() },
      eta,
    };
  },

  async listTripLocationHistory(tripId, { userId, role } = {}) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return null;

    if (role === "customer" && trip.customerId !== userId) {
      const error = new Error("Not allowed to view this trip route");
      error.status = 403;
      throw error;
    }
    if (role === "driver" && trip.driverId !== userId) {
      const error = new Error("Not allowed to view this trip route");
      error.status = 403;
      throw error;
    }

    const points = await prisma.tripLocationPoint.findMany({
      where: { tripId },
      orderBy: { recordedAt: "asc" },
      take: 300,
      select: { lat: true, lng: true, recordedAt: true },
    });

    return points.map((point) => ({
      lat: point.lat,
      lng: point.lng,
      at: point.recordedAt,
    }));
  },

  async uploadTripProof(id, { deliveryProofUrl, signatureUrl }, { driverId } = {}) {
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return null;
    if (driverId && existing.driverId !== driverId) {
      const error = new Error("Not allowed to upload proof for this trip");
      error.status = 403;
      throw error;
    }

    const data = {};
    if (deliveryProofUrl) data.deliveryProofUrl = deliveryProofUrl;
    if (signatureUrl) data.signatureUrl = signatureUrl;

    const trip = await prisma.trip.update({
      where: { id },
      data,
    }).catch(() => null);

    if (!trip) return null;
    return { id, deliveryProofUrl: trip.deliveryProofUrl, signatureUrl: trip.signatureUrl };
  },

  async submitTripFeedback(tripId, customerId, { rating, productRating, comment }) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return null;
    if (trip.customerId !== customerId) {
      const error = new Error("Not allowed to rate this trip");
      error.status = 403;
      throw error;
    }
    if (tripStatusToApi(trip.status) !== "Delivered") {
      const error = new Error("Feedback is only allowed after delivery");
      error.status = 400;
      throw error;
    }

    const existing = await prisma.tripFeedback.findUnique({ where: { tripId } });
    if (existing) {
      const error = new Error("Feedback already submitted for this trip");
      error.status = 409;
      throw error;
    }

    return withTransaction(async (tx) => {
      const feedback = await tx.tripFeedback.create({
        data: {
          tripId,
          customerId,
          driverId: trip.driverId,
          rating,
          productRating: productRating ?? null,
          comment: comment?.trim() || null,
        },
      });

      if (trip.driverId) {
        await tx.notification.create({
          data: {
            userId: trip.driverId,
            type: "trip.feedback.received",
            message: `Customer rated trip ${tripId}: ${rating}/5 stars`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: customerId,
          action: "trip.feedback.submitted",
          entity: "trips",
          entityId: tripId,
          meta: { rating, productRating },
        },
      });

      const joined = await tx.trip.findUnique({
        where: { id: tripId },
        include: tripInclude,
      });
      return mapTrip(joined);
    });
  },

  async listTripFeedback({ driverId, dispatcherId, customerId, page = 1, limit = 20 } = {}) {
    const where = {};
    if (driverId) where.driverId = driverId;
    if (customerId) where.customerId = customerId;
    if (dispatcherId) where.trip = { dispatcherId };

    const offset = (Number(page) - 1) * Number(limit);
    const [data, total, aggregates] = await Promise.all([
      prisma.tripFeedback.findMany({
        where,
        include: feedbackListInclude,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: offset,
      }),
      prisma.tripFeedback.count({ where }),
      prisma.tripFeedback.aggregate({
        where,
        _avg: { rating: true, productRating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      data: data.map(mapFeedbackListItem),
      total,
      page: Number(page),
      summary: {
        count: aggregates._count._all,
        avgRating: aggregates._avg.rating ? Number(aggregates._avg.rating.toFixed(1)) : null,
        avgProductRating: aggregates._avg.productRating
          ? Number(aggregates._avg.productRating.toFixed(1))
          : null,
      },
    };
  },

  async rejectTrip(id, driverId) {
    return withTransaction(async (tx) => {
      const trip = await tx.trip.findFirst({
        where: { id, driverId },
      });
      if (!trip) return null;

      await tx.trip.update({
        where: { id },
        data: { status: "Cancelled" },
      });

      if (trip.cargoRequestId) {
        await tx.cargoRequest.update({
          where: { id: trip.cargoRequestId },
          data: { status: "Pending", driverId: null, truckId: null },
        });
      }

      if (trip.truckId) {
        await tx.truck.update({
          where: { id: trip.truckId },
          data: { status: "Available" },
        });
      }

      const notification = await tx.notification.create({
        data: {
          userId: trip.dispatcherId,
          type: "trip.rejected",
          message: `${id} rejected by driver`,
        },
      });

      return { id, status: "Cancelled", notification: mapNotification(notification) };
    });
  },

  // ── Notifications ────────────────────────────────────────────────

  async listNotifications({ userId, page = 1, limit = 50 } = {}) {
    const where = {};
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }
    const offset = (Number(page) - 1) * Number(limit);
    const data = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });
    return { data: data.map(mapNotification), total: data.length };
  },

  async markNotificationRead(id) {
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return mapNotification(notification);
  },

  // ── Dashboard & Reports ──────────────────────────────────────────

  async dashboardStats() {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));

    const [totalCustomers, totalDrivers, totalDispatchers] = await Promise.all([
      prisma.user.count({ where: { role: "customer" } }),
      prisma.user.count({ where: { role: "driver" } }),
      prisma.user.count({ where: { role: "dispatcher" } }),
    ]);

    const [totalUsers, totalTrucks, pendingOrders] = await Promise.all([
      prisma.user.count(),
      prisma.truck.count(),
      prisma.cargoRequest.count({ where: { status: "Pending" } }),
    ]);

    const [completedOrders, liveTrips, inTransit] = await Promise.all([
      prisma.trip.count({ where: { status: "Delivered" } }),
      prisma.trip.count({
        where: { status: { in: ["In_Transit", "Loaded", "Accepted", "Arrived_Pickup"] } },
      }),
      prisma.trip.count({ where: { status: "In_Transit" } }),
    ]);

    const [todaysOrders, availableTrucks, revenueResult] = await Promise.all([
      prisma.cargoRequest.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.truck.count({ where: { status: "Available" } }),
      prisma.payment.aggregate({
        where: { status: { in: ["Paid", "Partial"] } },
        _sum: { amountPaid: true },
      }),
    ]);

    return {
      totalCustomers,
      totalDrivers,
      totalDispatchers,
      totalUsers,
      totalTrucks,
      pendingOrders,
      completedOrders,
      liveTrips,
      inTransit,
      revenue: Number(revenueResult._sum.amountPaid || 0),
      todaysOrders,
      availableTrucks,
    };
  },

  async revenueReport({ period = "monthly" } = {}) {
    // Use raw query for date bucketing — Prisma doesn't support date_trunc grouping natively
    const buckets =
      period === "weekly"
        ? `TO_CHAR(created_at, 'Dy')`
        : period === "yearly"
          ? `TO_CHAR(created_at, 'YYYY')`
          : period === "daily"
            ? `TO_CHAR(created_at, 'HH24:00')`
            : `TO_CHAR(created_at, '"Week" WW')`;

    const result = await prisma.$queryRawUnsafe(
      `SELECT ${buckets} AS label, COALESCE(SUM(amount_paid), 0)::float AS revenue
       FROM payments
       WHERE status IN ('Paid', 'Partial')
       GROUP BY 1
       ORDER BY 1`
    );

    if (!result.length) {
      return {
        period,
        data: [
          { label: "Week 1", revenue: 0 },
          { label: "Week 2", revenue: 0 },
          { label: "Week 3", revenue: 0 },
          { label: "Week 4", revenue: 0 },
        ],
      };
    }
    return { period, data: result.map((row) => ({ label: row.label, revenue: row.revenue })) };
  },

  async performanceReport() {
    const drivers = await prisma.$queryRaw`
      SELECT u.name,
             COUNT(t.id)::int AS completed_trips,
             COALESCE(SUM(t.fare), 0)::float AS earnings,
             COALESCE(ROUND(AVG(f.rating)::numeric, 1), 0)::float AS rating
      FROM users u
      LEFT JOIN trips t ON t.driver_id = u.id AND t.status = 'Delivered'
      LEFT JOIN trip_feedback f ON f.driver_id = u.id
      WHERE u.role = 'driver'
      GROUP BY u.id
      ORDER BY completed_trips DESC
    `;

    const dispatchers = await prisma.$queryRaw`
      SELECT u.name,
             COUNT(t.id)::int AS assigned_trips,
             CASE WHEN COUNT(t.id) = 0 THEN 0
                  ELSE ROUND(COUNT(*) FILTER (WHERE t.status = 'Delivered')::numeric / COUNT(*)::numeric, 2)
             END AS close_rate
      FROM users u
      LEFT JOIN trips t ON t.dispatcher_id = u.id
      WHERE u.role = 'dispatcher'
      GROUP BY u.id
      ORDER BY assigned_trips DESC
    `;

    return {
      drivers: drivers.map((row) => ({
        name: row.name,
        completedTrips: row.completed_trips,
        earnings: row.earnings,
        rating: Number(row.rating),
      })),
      dispatchers: dispatchers.map((row) => ({
        name: row.name,
        assignedTrips: row.assigned_trips,
        closeRate: Number(row.close_rate),
      })),
    };
  },

  async shipmentDistribution() {
    const result = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int AS value
      FROM trips
      GROUP BY status
    `;
    return result.map((row) => ({ name: tripStatusToApi(row.status), value: row.value }));
  },

  // ── Truck Types ──────────────────────────────────────────────────

  async listTruckTypes() {
    return prisma.truckType.findMany({ orderBy: { name: "asc" } });
  },

  // ── Settings ─────────────────────────────────────────────────────

  async getSettings() {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },

  async updateSettings(key, value) {
    return prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
  },

  // ── Payments ─────────────────────────────────────────────────────

  mapPayment(row, customerName) {
    if (!row) return null;
    const amount = Number(row.amount);
    const amountPaid = Number(row.amountPaid || 0);
    return {
      id: row.id,
      tripId: row.tripId,
      customerId: row.customerId,
      customer: customerName ?? row.customer?.name,
      amount,
      amountPaid,
      balanceDue: Math.max(0, amount - amountPaid),
      status: row.status,
      method: row.method,
      currency: row.currency,
      referenceId: row.referenceId,
      description: row.description,
      provider: row.provider,
      providerTransactionId: row.providerTransactionId,
      createdAt: row.createdAt,
    };
  },

  async getPaymentById(id) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { customer: true, trip: true },
    });
    return payment ? this.mapPayment(payment) : null;
  },

  async processWaafiPayment({ paymentId, accountNo, customerId, actorId, payAmount }) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { trip: true, customer: true },
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.status = 404;
      throw error;
    }
    if (payment.customerId !== customerId) {
      const error = new Error("Not authorized to pay this invoice");
      error.status = 403;
      throw error;
    }

    const totalDue = Number(payment.amount);
    const alreadyPaid = Number(payment.amountPaid || 0);
    const balanceDue = Math.max(0, totalDue - alreadyPaid);

    if (payment.status === "Paid" || balanceDue <= 0) {
      const error = new Error("This payment is already completed");
      error.status = 409;
      throw error;
    }

    const chargeAmount =
      payAmount != null && payAmount !== "" ? Number(payAmount) : balanceDue;
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
      const error = new Error("Enter a valid payment amount greater than zero");
      error.status = 400;
      throw error;
    }
    if (chargeAmount > balanceDue + 0.01) {
      const error = new Error(`You can pay at most ${balanceDue.toFixed(2)} (remaining balance)`);
      error.status = 400;
      throw error;
    }

    const referenceId = buildWaafiAttemptReference(paymentId);
    const invoiceId = buildWaafiReferenceId(payment.tripId || payment.id);
    const description =
      payment.description ||
      (payment.trip
        ? `Trip ${payment.tripId} — ${payment.trip.pickup} to ${payment.trip.destination}`
        : "TruckDispatch shipment payment");

    const { response, currency } = await waafiPurchase({
      accountNo,
      referenceId,
      invoiceId,
      amount: chargeAmount,
      description,
    });

    if (isWaafiSuccess(response)) {
      const newAmountPaid = alreadyPaid + chargeAmount;
      const newStatus = newAmountPaid >= totalDue - 0.01 ? "Paid" : "Partial";

      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          amountPaid: newAmountPaid,
          method: "waafipay",
          provider: "waafipay",
          currency,
          referenceId,
          description,
          providerTransactionId: response.params?.transactionId
            ? String(response.params.transactionId)
            : null,
          providerResponse: response,
        },
        include: { customer: true },
      });

      await prisma.auditLog.create({
        data: {
          actorId,
          action: "payment.waafipay.completed",
          entity: "payment",
          entityId: paymentId,
          meta: {
            transactionId: response.params?.transactionId,
            referenceId,
            chargeAmount,
            amountPaid: newAmountPaid,
            totalDue,
          },
        },
      });

      const customerNotification = await prisma.notification.create({
        data: {
          userId: customerId,
          type: "payment.completed",
          message: `Payment of ${chargeAmount.toFixed(2)} ${currency} received for ${payment.tripId || "shipment"}.`,
        },
      });

      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });
      const customerName = payment.customer?.name || "Customer";
      const adminNotifications = await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: "payment.received",
              message: `${customerName} paid ${chargeAmount.toFixed(2)} ${currency} via Waafi (${newStatus}).`,
            },
          })
        )
      );

      const earnings = await syncEarningsForPayment(paymentId);

      return {
        payment: this.mapPayment(updated),
        notification: customerNotification,
        adminNotifications,
        earnings,
      };
    }

    console.error("WaafiPay declined:", JSON.stringify(response));

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        method: "waafipay",
        provider: "waafipay",
        currency,
        referenceId,
        description,
        providerResponse: response,
      },
    });

    const error = new Error(formatWaafiError(response));
    error.status = 402;
    error.details = response;
    throw error;
  },

  async createPayment({ tripId, customerId, amount, status = "Pending", method = "waafipay", description }) {
    const data = {
      customer: { connect: { id: customerId } },
      amount,
      amountPaid: status === "Paid" ? amount : 0,
      status,
      method,
      provider: method === "waafipay" ? "waafipay" : null,
      currency: process.env.WAAFI_CURRENCY || "SLSH",
    };
    if (description) data.description = description;
    if (tripId) {
      data.trip = { connect: { id: tripId } };
    }

    const payment = await prisma.payment.create({ data });
    if (Number(payment.amountPaid) > 0) {
      await syncEarningsForPayment(payment.id);
    }
    const customer = await prisma.user.findUnique({ where: { id: payment.customerId } });
    return this.mapPayment(payment, customer?.name);
  },

  async deletePayment(id) {
    const result = await prisma.payment.deleteMany({ where: { id } });
    return result.count > 0;
  },

  async updatePayment(id, { status, amount, description, amountPaid, method }) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return null;

    const data = {};
    if (status != null) data.status = status;
    if (amount != null) data.amount = amount;
    if (description != null) data.description = description;
    if (method != null) data.method = method;
    if (amountPaid != null) {
      data.amountPaid = amountPaid;
    } else if (status === "Paid") {
      data.amountPaid = amount != null ? amount : existing.amount;
    } else if (status === "Pending") {
      data.amountPaid = 0;
    }

    if (status === "Paid" && data.amountPaid == null) {
      data.amountPaid = amount != null ? amount : existing.amount;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data,
      include: { customer: true },
    }).catch(() => null);

    if (!payment) return null;
    await syncEarningsForPayment(id);
    return this.mapPayment(payment);
  },

  async updateCustomerPayment(id, { amount, description, customerId }) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      const error = new Error("Payment not found");
      error.status = 404;
      throw error;
    }
    if (payment.customerId !== customerId) {
      const error = new Error("Not authorized to edit this payment");
      error.status = 403;
      throw error;
    }
    if (payment.status === "Paid") {
      const error = new Error("Completed payments cannot be edited");
      error.status = 409;
      throw error;
    }
    if (Number(payment.amountPaid || 0) > 0) {
      const error = new Error("Cannot change invoice after a partial payment was made");
      error.status = 409;
      throw error;
    }

    const data = {};
    if (amount != null) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        const error = new Error("Amount must be greater than zero");
        error.status = 400;
        throw error;
      }
      data.amount = numericAmount;
    }
    if (description != null) data.description = description;

    const updated = await prisma.payment.update({
      where: { id },
      data,
      include: { customer: true },
    });

    return this.mapPayment(updated);
  },

  async listPayments({ page = 1, limit = 50, customerId } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = customerId ? { customerId } : {};
    const data = await prisma.payment.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });
    return {
      data: data.map((row) => this.mapPayment(row)),
      total: data.length,
    };
  },

  // ── Earnings & payouts ───────────────────────────────────────────

  mapEarning(row) {
    if (!row) return null;
    return {
      id: row.id,
      paymentId: row.paymentId,
      tripId: row.tripId,
      recipientId: row.recipientId,
      recipient: row.recipient?.name || (row.recipientRole === "platform" ? "Platform" : null),
      recipientRole: row.recipientRole,
      amount: Number(row.amount),
      percent: Number(row.percent),
      currency: row.currency,
      status: row.status,
      payoutMethod: row.payoutMethod,
      payoutReference: row.payoutReference,
      paidOutAt: row.paidOutAt,
      createdAt: row.createdAt,
    };
  },

  async listEarnings({ recipientId, recipientRole, status, page = 1, limit = 50 } = {}) {
    const where = {};
    if (recipientId) where.recipientId = recipientId;
    if (recipientRole) where.recipientRole = recipientRole;
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(limit);
    const data = await prisma.earning.findMany({
      where,
      include: { recipient: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });

    return {
      data: data.map((row) => this.mapEarning(row)),
      total: data.length,
    };
  },

  async getEarningsSummary({ userId, role } = {}) {
    if (role === "admin") {
      const [platformAvailable, platformPaid, driverPending, dispatcherPending] = await Promise.all([
        prisma.earning.aggregate({
          where: { recipientRole: "platform", status: "Available" },
          _sum: { amount: true },
        }),
        prisma.earning.aggregate({
          where: { recipientRole: "platform", status: "PaidOut" },
          _sum: { amount: true },
        }),
        prisma.earning.aggregate({
          where: { recipientRole: "driver", status: "Available" },
          _sum: { amount: true },
        }),
        prisma.earning.aggregate({
          where: { recipientRole: "dispatcher", status: "Available" },
          _sum: { amount: true },
        }),
      ]);

      return {
        platformAvailable: Number(platformAvailable._sum.amount || 0),
        platformPaidOut: Number(platformPaid._sum.amount || 0),
        driverOwed: Number(driverPending._sum.amount || 0),
        dispatcherOwed: Number(dispatcherPending._sum.amount || 0),
        commission: await getCommissionSettings(),
      };
    }

    const where = { recipientId: userId };
    const [available, paidOut, total] = await Promise.all([
      prisma.earning.aggregate({
        where: { ...where, status: "Available" },
        _sum: { amount: true },
      }),
      prisma.earning.aggregate({
        where: { ...where, status: "PaidOut" },
        _sum: { amount: true },
      }),
      prisma.earning.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      available: Number(available._sum.amount || 0),
      paidOut: Number(paidOut._sum.amount || 0),
      totalEarned: Number(total._sum.amount || 0),
      commission: await getCommissionSettings(),
    };
  },

  async payoutEarning(id, { actorId, payoutMethod = "manual", payoutReference }) {
    const earning = await prisma.earning.findUnique({
      where: { id },
      include: { recipient: true },
    });

    if (!earning) {
      const error = new Error("Earning not found");
      error.status = 404;
      throw error;
    }
    if (earning.status === "PaidOut") {
      const error = new Error("This earning is already paid out");
      error.status = 409;
      throw error;
    }
    if (earning.recipientRole === "platform") {
      const error = new Error("Platform earnings are kept by admin — no payout needed");
      error.status = 400;
      throw error;
    }

    const updated = await prisma.earning.update({
      where: { id },
      data: {
        status: "PaidOut",
        payoutMethod,
        payoutReference: payoutReference || null,
        paidOutAt: new Date(),
      },
      include: { recipient: true },
    });

    if (updated.recipientId) {
      await prisma.notification.create({
        data: {
          userId: updated.recipientId,
          type: "earning.paid",
          message: `Payout of ${Number(updated.amount).toFixed(2)} ${updated.currency || "SLSH"} sent (${payoutMethod}).`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: "earning.paid_out",
        entity: "earning",
        entityId: id,
        meta: {
          recipientId: updated.recipientId,
          amount: Number(updated.amount),
          payoutMethod,
        },
      },
    });

    return this.mapEarning(updated);
  },

  async payoutUserEarnings({ userId, actorId, payoutMethod = "manual", payoutReference }) {
    const available = await prisma.earning.findMany({
      where: { recipientId: userId, status: "Available" },
    });

    if (!available.length) {
      const error = new Error("No available earnings to pay out");
      error.status = 404;
      throw error;
    }

    const results = [];
    for (const earning of available) {
      results.push(
        await this.payoutEarning(earning.id, { actorId, payoutMethod, payoutReference })
      );
    }
    return results;
  },

  // ── Verification codes ─────────────────────────────────────────

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

    // The new code is usable immediately. Expire older codes without delaying the API response.
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

  // ── Audit Logs ───────────────────────────────────────────────────

  async listAuditLogs({ page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const data = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });
    return {
      data: data.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actor: row.actor?.name,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        meta: row.meta,
        createdAt: row.createdAt,
      })),
    };
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function payloadDistance(from, to) {
  return `${Math.max(80, Math.abs(String(from).length * 37 + String(to).length * 29))} mi`;
}

function estimateFare(weight) {
  const numeric = Number(String(weight).replace(/[^\d.]/g, "")) || 1;
  return Math.round(numeric * 650 * 100) / 100;
}
