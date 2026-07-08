import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const DEMO_PASSWORD = "Password123!";

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
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    truckId: row.truck?.id || null,
    truckNumber: row.truck?.truckNumber || null,
    plateNumber: row.truck?.plateNumber || null,
    truckStatus: row.truck?.status || null,
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

const userInclude = { truck: true };

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
};

// ─── DB Service ──────────────────────────────────────────────────────

export { prisma } from "../lib/prisma.js";

export const db = {
  async seedIfEmpty() {
    const count = await prisma.user.count();
    if (count > 0) return { seeded: false };

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    try {
      await prisma.$transaction(async (tx) => {
      const roles = [
        { name: "System Admin", email: "admin@truckdispatch.local", role: "admin", phone: "+10000000001" },
        { name: "Alex Thompson", email: "dispatcher@truckdispatch.local", role: "dispatcher", phone: "+10000000002" },
        { name: "Retail Solutions", email: "customer@truckdispatch.local", role: "customer", phone: "+10000000003" },
        { name: "Mike Driver", email: "driver@truckdispatch.local", role: "driver", phone: "+10000000004" },
        { name: "Sarah Miller", email: "driver2@truckdispatch.local", role: "driver", phone: "+10000000005" },
        { name: "Robert Brown", email: "driver3@truckdispatch.local", role: "driver", phone: "+10000000006" },
      ];

      const userIds = {};
      for (const { name, email, role, phone } of roles) {
        const user = await tx.user.create({ data: { name, email, passwordHash, role, phone } });
        userIds[email] = user.id;
      }

      for (const name of ["Box Truck", "Flatbed", "Refrigerated", "Tanker"]) {
        await tx.truckType.upsert({
          where: { name },
          update: {},
          create: { name, description: `${name} category` },
        });
      }

      const truckDefs = [
        { truckNumber: "Freightliner #82", plateNumber: "TX-82-LC", capacity: "12 tons", truckType: "Box Truck", driverEmail: "driver@truckdispatch.local", status: "Busy" },
        { truckNumber: "Peterbilt #45", plateNumber: "GA-45-FL", capacity: "18 tons", truckType: "Flatbed", driverEmail: "driver2@truckdispatch.local", status: "Available" },
        { truckNumber: "Kenworth #12", plateNumber: "AZ-12-KW", capacity: "10 tons", truckType: "Refrigerated", driverEmail: "driver3@truckdispatch.local", status: "Maintenance" },
      ];

      const truckIds = {};
      for (const { truckNumber, plateNumber, capacity, truckType, driverEmail, status } of truckDefs) {
        const truck = await tx.truck.create({
          data: { truckNumber, plateNumber, capacity, truckType, driverId: userIds[driverEmail], status },
        });
        truckIds[driverEmail] = { id: truck.id, truckNumber: truck.truckNumber };
      }

      const customerId = userIds["customer@truckdispatch.local"];
      const dispatcherId = userIds["dispatcher@truckdispatch.local"];
      const driver1 = userIds["driver@truckdispatch.local"];
      const driver2 = userIds["driver2@truckdispatch.local"];

      const requests = [
        { id: "REQ-9012", pickup: "New York", destination: "Chicago", truckType: "Box Truck", weight: "1.4 tons", description: "Electronics", status: "Pending" },
        { id: "REQ-9013", pickup: "Dallas", destination: "Houston", truckType: "Flatbed", weight: "2.1 tons", description: "Furniture", status: "Pending" },
        { id: "REQ-9014", pickup: "Atlanta", destination: "Miami", truckType: "Refrigerated", weight: "4.0 tons", description: "Beverages", status: "Pending" },
        { id: "REQ-9015", pickup: "Seattle", destination: "Portland", truckType: "Box Truck", weight: "0.8 tons", description: "Food Items", status: "Assigned" },
      ];

      for (const req of requests) {
        await tx.cargoRequest.create({
          data: {
            id: req.id,
            customerId,
            pickup: req.pickup,
            destination: req.destination,
            truckType: req.truckType,
            weight: req.weight,
            description: req.description,
            sender: "Retail Solutions",
            receiver: "Warehouse Desk",
            status: reqStatusToDb(req.status),
            driverId: req.status === "Assigned" ? driver2 : null,
            truckId: req.status === "Assigned" ? truckIds["driver2@truckdispatch.local"].id : null,
            dispatcherId: req.status === "Assigned" ? dispatcherId : null,
          },
        });
      }

      await tx.trip.createMany({
        data: [
          {
            id: "SHP-1001", customerId, driverId: driver1, dispatcherId,
            truckId: truckIds["driver@truckdispatch.local"].id,
            pickup: "Chicago, IL", destination: "Houston, TX",
            distance: "1,084 mi", estimatedTime: "18h 45m",
            status: "In_Transit", fare: 2450,
            lastLat: 41.5, lastLng: -87.6, lastLocationAt: new Date(),
          },
          {
            id: "SHP-1003", customerId, driverId: driver2, dispatcherId,
            truckId: truckIds["driver2@truckdispatch.local"].id,
            pickup: "Atlanta, GA", destination: "Miami, FL",
            distance: "662 mi", estimatedTime: "10h 20m",
            status: "Delayed", fare: 1890,
            lastLat: 25.7, lastLng: -80.2, lastLocationAt: new Date(),
          },
          {
            id: "SHP-10294", cargoRequestId: "REQ-9015", customerId,
            driverId: driver2, dispatcherId,
            truckId: truckIds["driver2@truckdispatch.local"].id,
            pickup: "Chicago, IL", destination: "New York, NY",
            distance: "790 mi", estimatedTime: "12h 30m",
            status: "In_Transit", fare: 2100,
            lastLat: 41.4, lastLng: -81.7, lastLocationAt: new Date(),
          },
        ],
      });

      await tx.payment.createMany({
        data: [
          { tripId: "SHP-1001", customerId, amount: 2450, status: "Paid", method: "card" },
          { tripId: "SHP-1003", customerId, amount: 1890, status: "Pending", method: "card" },
          { tripId: "SHP-10294", customerId, amount: 2100, status: "Paid", method: "card" },
        ],
      });

      await tx.setting.createMany({
        data: [
          { key: "general", value: { companyName: "TruckDispatch", supportEmail: "support@truckdispatch.local", currency: "USD" } },
          { key: "notifications", value: { email: true, sms: false, push: true } },
        ],
      });

      await tx.notification.createMany({
        data: [
          { userId: dispatcherId, type: "order.created", message: "New cargo request REQ-9012 created" },
          { userId: driver1, type: "driver.assigned", message: "SHP-1001 assigned to Mike Driver" },
          { userId: customerId, type: "cargo.delivered", message: "Previous shipment delivered successfully" },
        ],
      });
    }, { timeout: 60_000, maxWait: 15_000 });
    } catch (error) {
      const exists = await prisma.user.count();
      if (exists > 0) return { seeded: false };
      throw error;
    }

    return { seeded: true, demoPassword: DEMO_PASSWORD };
  },

  // ── Users ────────────────────────────────────────────────────────

  async findUserByEmail(email) {
    const row = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: userInclude,
    });
    if (!row) return null;
    return { ...mapUser(row), passwordHash: row.passwordHash };
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

  async createUser({ name, email, password, role, phone, truck }) {
    return prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: { name, email, passwordHash, role, phone: phone || null },
      });

      let truckRow = null;
      if (role === "driver") {
        if (!truck?.truckNumber || !truck?.plateNumber || !truck?.capacity || !truck?.truckType) {
          const error = new Error("Driver registration requires truck details");
          error.status = 400;
          throw error;
        }
        truckRow = await tx.truck.create({
          data: {
            truckNumber: truck.truckNumber,
            plateNumber: truck.plateNumber,
            capacity: truck.capacity,
            truckType: truck.truckType,
            driverId: user.id,
            status: "Available",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "user.created",
          entity: "users",
          entityId: user.id,
          meta: { role },
        },
      });

      return mapUser({ ...user, truck: truckRow });
    });
  },

  async updateUser(id, payload) {
    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.role !== undefined) data.role = payload.role;
    if (payload.password) data.passwordHash = await bcrypt.hash(payload.password, 10);

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id }, data });
    }
    return this.findUserById(id);
  },

  async deleteUser(id) {
    return prisma.$transaction(async (tx) => {
      await tx.auditLog.updateMany({
        where: { actorId: id },
        data: { actorId: null },
      });
      const result = await tx.user.deleteMany({ where: { id } });
      return result.count > 0;
    });
  },

  // ── Trucks ───────────────────────────────────────────────────────

  async listTrucks({ status, page = 1, limit = 50 } = {}) {
    const where = {};
    if (status) where.status = status;
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
    return prisma.$transaction(async (tx) => {
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

  async listCargoRequests({ status, customerId, page = 1, limit = 20 } = {}) {
    const where = {};
    if (status) where.status = reqStatusToDb(status);
    if (customerId) where.customerId = customerId;
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

  async createCargoRequest(payload) {
    const id = `REQ-${Math.floor(9000 + Math.random() * 1000)}`;

    return prisma.$transaction(async (tx) => {
      await tx.cargoRequest.create({
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
          status: "Pending",
        },
      });

      const notification = await tx.notification.create({
        data: {
          type: "order.created",
          message: `${id} created by ${payload.customerName || "Customer"}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: payload.customerId,
          action: "cargo.created",
          entity: "cargo_requests",
          entityId: id,
        },
      });

      const request = await tx.cargoRequest.findUnique({
        where: { id },
        include: cargoRequestInclude,
      });

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

    if (Object.keys(data).length > 0) {
      await prisma.cargoRequest.update({ where: { id }, data });
    }

    const updated = await prisma.cargoRequest.findUnique({
      where: { id },
      include: cargoRequestInclude,
    });
    return mapCargoRequest(updated);
  },

  async assignCargoRequest(id, { driverId, truckId, dispatcherId }) {
    return prisma.$transaction(async (tx) => {
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

      let tripId;
      if (existingTrip) {
        tripId = existingTrip.id;
        await tx.trip.update({
          where: { id: tripId },
          data: { driverId, truckId, dispatcherId, status: "Assigned" },
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
            estimatedTime: "8h 00m",
            status: "Assigned",
            fare: estimateFare(updated.weight),
          },
        });
      }

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
    return prisma.$transaction(async (tx) => {
      const existing = await tx.cargoRequest.findUnique({ where: { id } });
      if (!existing) return null;

      if (customerId && existing.customerId !== customerId) {
        const error = new Error("Not allowed to cancel this request");
        error.status = 403;
        throw error;
      }

      const apiStatus = reqStatusToApi(existing.status);
      if (["Loaded", "In Transit", "Delivered", "Cancelled"].includes(apiStatus)) {
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

  async listTrips({ status, driverId, customerId, page = 1, limit = 50 } = {}) {
    const where = {};
    if (status) where.status = tripStatusToDb(status);
    if (driverId) where.driverId = driverId;
    if (customerId) where.customerId = customerId;
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

  async updateTripStatus(id, status, actorId, { driverId } = {}) {
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) return null;
    if (driverId && existing.driverId !== driverId) {
      const error = new Error("Not allowed to update this trip");
      error.status = 403;
      throw error;
    }

    const dbStatus = tripStatusToDb(status);

    return prisma.$transaction(async (tx) => {
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
                tripId: trip.id,
                customerId: trip.customerId,
                amount: trip.fare,
                status: "Paid",
                method: "card",
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
    return {
      id,
      lastLocation: { lat, lng, updatedAt: new Date().toISOString() },
    };
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

  async rejectTrip(id, driverId) {
    return prisma.$transaction(async (tx) => {
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
        where: { status: "Paid" },
        _sum: { amount: true },
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
      revenue: Number(revenueResult._sum.amount || 0),
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
      `SELECT ${buckets} AS label, COALESCE(SUM(amount), 0)::float AS revenue
       FROM payments
       WHERE status = 'Paid'
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
             4.8 AS rating
      FROM users u
      LEFT JOIN trips t ON t.driver_id = u.id AND t.status = 'Delivered'
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

  async createPayment({ tripId, customerId, amount, status = "Pending", method = "card" }) {
    const payment = await prisma.payment.create({
      data: {
        tripId: tripId || null,
        customerId,
        amount,
        status,
        method,
      },
    });
    const customer = await prisma.user.findUnique({ where: { id: payment.customerId } });
    return {
      id: payment.id,
      tripId: payment.tripId,
      customerId: payment.customerId,
      customer: customer?.name,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
    };
  },

  async deletePayment(id) {
    const result = await prisma.payment.deleteMany({ where: { id } });
    return result.count > 0;
  },

  async updatePayment(id, { status }) {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status },
    }).catch(() => null);

    if (!payment) return null;
    const customer = payment.customerId
      ? await prisma.user.findUnique({ where: { id: payment.customerId } })
      : null;

    return {
      id: payment.id,
      tripId: payment.tripId,
      customerId: payment.customerId,
      customer: customer?.name,
      amount: Number(payment.amount),
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
    };
  },

  async listPayments({ page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const data = await prisma.payment.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });
    return {
      data: data.map((row) => ({
        id: row.id,
        tripId: row.tripId,
        customerId: row.customerId,
        customer: row.customer?.name,
        amount: Number(row.amount),
        status: row.status,
        method: row.method,
        createdAt: row.createdAt,
      })),
      total: data.length,
    };
  },

  // ── Verification codes ─────────────────────────────────────────

  async createVerificationCode({ email, purpose, payload = null, ttlMinutes = 10 }) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const normalizedEmail = email.toLowerCase().trim();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.verificationCode.updateMany({
      where: { email: normalizedEmail, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        code,
        purpose,
        payload: payload || undefined,
        expiresAt,
      },
    });

    return { code, expiresAt };
  },

  async consumeVerificationCode({ email, code, purpose }) {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const row = await tx.verificationCode.findFirst({
        where: {
          email: normalizedEmail,
          code,
          purpose,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, payload: true },
      });
      if (!row) return null;

      await tx.verificationCode.update({
        where: { id: row.id },
        data: { usedAt: now },
      });

      if (!row.payload) return { __verified: true };
      return row.payload;
    });
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
