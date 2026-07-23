import { prisma } from "../../lib/prisma.js";
import { mapNotification } from "./mappers.js";

export const notificationRepository = {
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
};
