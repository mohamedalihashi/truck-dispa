import { prisma } from "../../lib/prisma.js";
import { auditFields } from "../../lib/auditContext.js";
import { mapUser, tripStatusToApi, reqStatusToApi } from "./mappers.js";

export const auditRepository = {
  async recordAudit(payload) {
    return prisma.auditLog.create({ data: auditFields(payload) });
  },

  async listAuditLogs({ page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const data = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: offset,
    });
    return {
      data: data.map((row) => ({
        id: row.id,
        userId: row.userId,
        actor: row.user?.name,
        action: row.action,
        entity: row.entityType,
        entityId: row.entityId,
        meta: row.meta,
        createdAt: row.createdAt,
      })),
    };
  },

  async userActivityReport({ userId, activityType, from, to, groupBy = "day", limit = 1000 } = {}) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true, dispatcherProfile: true, truck: true },
    });
    if (!user) return null;

    const createdAt = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        ...(activityType ? { action: activityType } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit) || 1000, 5000),
    });
    const exact = (...actions) => logs.filter((row) => actions.includes(row.action)).length;
    const prefix = (value) => logs.filter((row) => row.action.startsWith(value)).length;
    const lastLogin = await prisma.auditLog.findFirst({
      where: { userId, action: "auth.login" },
      orderBy: { createdAt: "desc" },
    });
    const groupKey = (value) => {
      const date = new Date(value);
      if (groupBy === "month") return date.toISOString().slice(0, 7);
      if (groupBy === "week") {
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      }
      return date.toISOString().slice(0, 10);
    };
    const chartMap = new Map();
    logs.forEach((log) => {
      const key = groupKey(log.createdAt);
      chartMap.set(key, (chartMap.get(key) || 0) + 1);
    });

    const tripsWhere = user.role === "driver" ? { driverId: userId } :
      user.role === "dispatcher" ? { dispatcherId: userId } : { customerId: userId };
    const requestsWhere = user.role === "customer" ? { customerId: userId } :
      user.role === "dispatcher" ? { dispatcherId: userId } : { driverId: userId };
    const [trips, requests, payments, earnings, feedback] = await Promise.all([
      prisma.trip.findMany({ where: tripsWhere }),
      prisma.cargoRequest.findMany({ where: requestsWhere }),
      prisma.payment.findMany({ where: { customerId: userId } }),
      prisma.earning.findMany({ where: { recipientId: userId } }),
      user.role === "driver" ? prisma.tripFeedback.findMany({ where: { driverId: userId } }) : Promise.resolve([]),
    ]);
    const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
    const delivered = trips.filter((row) => tripStatusToApi(row.status) === "Delivered");
    const cancelled = trips.filter((row) => tripStatusToApi(row.status) === "Cancelled");
    let rolePerformance;
    if (user.role === "driver") {
      rolePerformance = {
        assignedTrips: trips.length, acceptedTrips: trips.filter((row) => !["Pending", "Assigned"].includes(tripStatusToApi(row.status))).length,
        completedTrips: delivered.length, cancelledTrips: cancelled.length,
        onTimeDeliveries: delivered.filter((row) => !String(row.estimatedTime || "").toLowerCase().includes("late")).length,
        lateDeliveries: delivered.filter((row) => String(row.estimatedTime || "").toLowerCase().includes("late")).length,
        totalDistance: trips.reduce((total, row) => total + (Number.parseFloat(row.distance) || 0), 0),
        totalEarnings: sum(earnings, "amount"), averageRating: feedback.length ? sum(feedback, "rating") / feedback.length : 0,
      };
    } else if (user.role === "dispatcher") {
      rolePerformance = {
        cargoRequestsManaged: requests.length, driversAssigned: new Set(trips.map((row) => row.driverId).filter(Boolean)).size,
        trucksAssigned: new Set(trips.map((row) => row.truckId).filter(Boolean)).size,
        activeDispatches: trips.filter((row) => !["Delivered", "Cancelled"].includes(tripStatusToApi(row.status))).length,
        completedDispatches: delivered.length, cancelledDispatches: cancelled.length, totalRevenueManaged: sum(trips, "fare"),
      };
    } else if (user.role === "customer") {
      rolePerformance = {
        cargoRequestsCreated: requests.length,
        acceptedRequests: requests.filter((row) => ["Accepted", "Assigned", "In Transit", "Delivered"].includes(reqStatusToApi(row.status))).length,
        cancelledRequests: requests.filter((row) => reqStatusToApi(row.status) === "Cancelled").length,
        completedDeliveries: delivered.length, totalAmountPaid: sum(payments, "amountPaid"),
        outstandingBalance: payments.reduce((total, row) => total + Math.max(0, Number(row.amount) - Number(row.amountPaid)), 0),
      };
    } else {
      rolePerformance = {
        usersCreatedOrSuspended: logs.filter((row) => ["user.created", "user.updated", "user.deleted"].includes(row.action)).length,
        trucksManaged: prefix("truck."), reportsGenerated: prefix("report."),
        settingsChanged: prefix("settings."), paymentsReviewed: prefix("payment."),
      };
    }

    return {
      profile: mapUser(user),
      summary: {
        totalActivities: logs.length, cargoRequestsCreated: exact("cargo.created"),
        tripsAssigned: exact("trip.assigned", "cargo.assigned"),
        tripsAccepted: exact("trip.accepted") + logs.filter((row) => row.action === "trip.status.updated" && row.newValues?.status === "Accepted").length,
        tripsCompleted: logs.filter((row) => row.action === "trip.status.updated" && row.newValues?.status === "Delivered").length,
        tripsCancelled: logs.filter((row) => row.action.includes("cancel")).length,
        quotesSubmitted: exact("cargo.quote.sent"), paymentsProcessed: prefix("payment."),
        proofOfDeliveryUploads: exact("trip.proof.uploaded"),
        profileOrAccountChanges: logs.filter((row) => ["user.updated", "profile.updated", "password.changed"].includes(row.action)).length,
        lastLoginAt: lastLogin?.createdAt || null,
        totalActiveDays: new Set(logs.map((row) => row.createdAt.toISOString().slice(0, 10))).size,
      },
      rolePerformance,
      chart: [...chartMap].sort(([a], [b]) => a.localeCompare(b)).map(([period, activities]) => ({ period, activities })),
      activityTypes: [...new Set(logs.map((row) => row.action))].sort(),
      activities: logs.map((row) => ({
        id: row.id, userId: row.userId, userName: user.name, userRole: user.role,
        action: row.action, description: row.description || row.action.replaceAll(".", " "),
        entityType: row.entityType, entityId: row.entityId, oldValues: row.oldValues,
        newValues: row.newValues, ipAddress: row.ipAddress, userAgent: row.userAgent,
        status: row.status, createdAt: row.createdAt,
      })),
    };
  },
};
