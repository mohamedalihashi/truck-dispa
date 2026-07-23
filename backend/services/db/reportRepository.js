import { prisma } from "../../lib/prisma.js";
import { tripStatusToApi } from "./mappers.js";

export const reportRepository = {
async dashboardStats({ role = "admin", userId } = {}) {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const cargoWhere = role === "customer" ? { customerId: userId } : role === "driver" ? { driverId: userId } : role === "dispatcher" ? { dispatcherId: userId } : {};
  const tripWhere = role === "customer" ? { customerId: userId } : role === "driver" ? { driverId: userId } : role === "dispatcher" ? { dispatcherId: userId } : {};
  const paymentWhere = role === "customer" ? { customerId: userId } : role === "admin" ? {} : { id: "__none__" };
  const showGlobalUsers = role === "admin";

  const [totalCustomers, totalDrivers, totalDispatchers] = await Promise.all([
    showGlobalUsers ? prisma.user.count({ where: { role: "customer" } }) : 0,
    showGlobalUsers ? prisma.user.count({ where: { role: "driver" } }) : 0,
    showGlobalUsers ? prisma.user.count({ where: { role: "dispatcher" } }) : 0,
  ]);

  const [totalUsers, totalTrucks, pendingOrders] = await Promise.all([
    showGlobalUsers ? prisma.user.count() : 0,
    role === "driver" ? prisma.truck.count({ where: { driverId: userId } }) : showGlobalUsers ? prisma.truck.count() : 0,
    prisma.cargoRequest.count({ where: { ...cargoWhere, status: "Pending" } }),
  ]);

  const [completedOrders, liveTrips, inTransit] = await Promise.all([
    prisma.trip.count({ where: { ...tripWhere, status: "Delivered" } }),
    prisma.trip.count({
      where: { ...tripWhere, status: { in: ["In_Transit", "Loaded", "Accepted", "Arrived_Pickup"] } },
    }),
    prisma.trip.count({ where: { ...tripWhere, status: "In_Transit" } }),
  ]);

  const [todaysOrders, availableTrucks, revenueResult] = await Promise.all([
    prisma.cargoRequest.count({ where: { ...cargoWhere, createdAt: { gte: startOfDay } } }),
    role === "driver" ? prisma.truck.count({ where: { driverId: userId, status: "Available" } }) : showGlobalUsers ? prisma.truck.count({ where: { status: "Available" } }) : 0,
    prisma.payment.aggregate({
      where: { ...paymentWhere, status: { in: ["Paid", "Partial"] } },
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

async dashboardAnalytics() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const [users, requests, trips, roleCounts] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.cargoRequest.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.trip.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const months = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 2 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      name: date.toLocaleString("en", { month: "long" }),
      users: 0,
      requests: 0,
      trips: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  const add = (rows, field) => rows.forEach((row) => {
    const key = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const month = byMonth.get(key);
    if (month) month[field] += 1;
  });
  add(users, "users");
  add(requests, "requests");
  add(trips, "trips");

  return {
    growth: months.map(({ key: _key, ...month }) => month),
    userRoles: roleCounts.map((row) => ({
      name: row.role.charAt(0).toUpperCase() + row.role.slice(1),
      value: row._count._all,
    })),
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


};
