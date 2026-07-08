import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

const ADMIN = {
  name: "System Admin",
  email: "wllhero145@gmail.com",
  role: "admin",
  phone: "+10000000001",
};

async function ensureAdmin(passwordHash) {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } });
  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN.email },
      data: {
        name: ADMIN.name,
        passwordHash,
        role: ADMIN.role,
        phone: ADMIN.phone,
        status: "Active",
      },
    });
    console.log(`Admin updated: ${ADMIN.email}`);
    return existing.id;
  }

  const user = await prisma.user.create({
    data: { ...ADMIN, passwordHash },
  });
  console.log(`Admin created: ${ADMIN.email}`);
  return user.id;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const countBefore = await prisma.user.count();

  if (countBefore > 0) {
    await ensureAdmin(passwordHash);
    console.log(`Database already seeded. Admin password: ${DEMO_PASSWORD}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // ── Users ──
    const roles = [
      { name: ADMIN.name, email: ADMIN.email, role: ADMIN.role, phone: ADMIN.phone },
      { name: "Alex Thompson", email: "dispatcher@truckdispatch.local", role: "dispatcher", phone: "+10000000002" },
      { name: "Retail Solutions", email: "customer@truckdispatch.local", role: "customer", phone: "+10000000003" },
      { name: "Mike Driver", email: "driver@truckdispatch.local", role: "driver", phone: "+10000000004" },
      { name: "Sarah Miller", email: "driver2@truckdispatch.local", role: "driver", phone: "+10000000005" },
      { name: "Robert Brown", email: "driver3@truckdispatch.local", role: "driver", phone: "+10000000006" },
    ];

    const userIds = {};
    for (const { name, email, role, phone } of roles) {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role, phone },
      });
      userIds[email] = user.id;
    }

    // ── Truck Types ──
    for (const name of ["Box Truck", "Flatbed", "Refrigerated", "Tanker"]) {
      await tx.truckType.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} category` },
      });
    }

    // ── Trucks ──
    const truckDefs = [
      { truckNumber: "Freightliner #82", plateNumber: "TX-82-LC", capacity: "12 tons", truckType: "Box Truck", driverEmail: "driver@truckdispatch.local", status: "Busy" },
      { truckNumber: "Peterbilt #45", plateNumber: "GA-45-FL", capacity: "18 tons", truckType: "Flatbed", driverEmail: "driver2@truckdispatch.local", status: "Available" },
      { truckNumber: "Kenworth #12", plateNumber: "AZ-12-KW", capacity: "10 tons", truckType: "Refrigerated", driverEmail: "driver3@truckdispatch.local", status: "Maintenance" },
    ];

    const truckIds = {};
    for (const { truckNumber, plateNumber, capacity, truckType, driverEmail, status } of truckDefs) {
      const truck = await tx.truck.create({
        data: {
          truckNumber,
          plateNumber,
          capacity,
          truckType,
          driverId: userIds[driverEmail],
          status,
        },
      });
      truckIds[driverEmail] = { id: truck.id, truckNumber: truck.truckNumber };
    }

    const customerId = userIds["customer@truckdispatch.local"];
    const dispatcherId = userIds["dispatcher@truckdispatch.local"];
    const driver1 = userIds["driver@truckdispatch.local"];
    const driver2 = userIds["driver2@truckdispatch.local"];

    // ── Cargo Requests ──
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
          status: req.status,
          driverId: req.status === "Assigned" ? driver2 : null,
          truckId: req.status === "Assigned" ? truckIds["driver2@truckdispatch.local"].id : null,
          dispatcherId: req.status === "Assigned" ? dispatcherId : null,
        },
      });
    }

    // ── Trips ──
    await tx.trip.createMany({
      data: [
        {
          id: "SHP-1001",
          customerId,
          driverId: driver1,
          dispatcherId,
          truckId: truckIds["driver@truckdispatch.local"].id,
          pickup: "Chicago, IL",
          destination: "Houston, TX",
          distance: "1,084 mi",
          estimatedTime: "18h 45m",
          status: "In_Transit",
          fare: 2450,
          lastLat: 41.5,
          lastLng: -87.6,
          lastLocationAt: new Date(),
        },
        {
          id: "SHP-1003",
          customerId,
          driverId: driver2,
          dispatcherId,
          truckId: truckIds["driver2@truckdispatch.local"].id,
          pickup: "Atlanta, GA",
          destination: "Miami, FL",
          distance: "662 mi",
          estimatedTime: "10h 20m",
          status: "Delayed",
          fare: 1890,
          lastLat: 25.7,
          lastLng: -80.2,
          lastLocationAt: new Date(),
        },
        {
          id: "SHP-10294",
          cargoRequestId: "REQ-9015",
          customerId,
          driverId: driver2,
          dispatcherId,
          truckId: truckIds["driver2@truckdispatch.local"].id,
          pickup: "Chicago, IL",
          destination: "New York, NY",
          distance: "790 mi",
          estimatedTime: "12h 30m",
          status: "In_Transit",
          fare: 2100,
          lastLat: 41.4,
          lastLng: -81.7,
          lastLocationAt: new Date(),
        },
      ],
    });

    // ── Payments ──
    await tx.payment.createMany({
      data: [
        { tripId: "SHP-1001", customerId, amount: 2450, status: "Paid", method: "card" },
        { tripId: "SHP-1003", customerId, amount: 1890, status: "Pending", method: "card" },
        { tripId: "SHP-10294", customerId, amount: 2100, status: "Paid", method: "card" },
      ],
    });

    // ── Settings ──
    await tx.setting.createMany({
      data: [
        {
          key: "general",
          value: { companyName: "TruckDispatch", supportEmail: "support@truckdispatch.local", currency: "USD" },
        },
        {
          key: "notifications",
          value: { email: true, sms: false, push: true },
        },
      ],
    });

    // ── Notifications ──
    await tx.notification.createMany({
      data: [
        { userId: dispatcherId, type: "order.created", message: "New cargo request REQ-9012 created" },
        { userId: driver1, type: "driver.assigned", message: "SHP-1001 assigned to Mike Driver" },
        { userId: customerId, type: "cargo.delivered", message: "Previous shipment delivered successfully" },
      ],
    });
  });

  console.log(`Database seeded. Admin: ${ADMIN.email} | Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
