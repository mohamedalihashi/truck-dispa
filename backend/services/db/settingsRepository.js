import { prisma } from "../../lib/prisma.js";
import { mergeRolePermissions, PERMISSION_CATALOG } from "../../lib/permissions.js";

export const settingsRepository = {
  async getSettings() {
    const rows = await prisma.setting.findMany();
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      ...settings,
      rolePermissions: mergeRolePermissions(settings.rolePermissions),
      permissionCatalog: PERMISSION_CATALOG,
    };
  },

  async getPermissionsForUser(userId) {
    const [user, row] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, isSuperAdmin: true } }),
      prisma.setting.findUnique({ where: { key: "rolePermissions" } }),
    ]);
    if (!user) return null;
    const all = Object.fromEntries(PERMISSION_CATALOG.map(({ key }) => [key, true]));
    return {
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.isSuperAdmin ? all : mergeRolePermissions(row?.value)[user.role],
      catalog: PERMISSION_CATALOG,
    };
  },

  async updateRolePermissions(value) {
    const normalized = mergeRolePermissions(value);
    return prisma.setting.upsert({
      where: { key: "rolePermissions" },
      update: { value: normalized, updatedAt: new Date() },
      create: { key: "rolePermissions", value: normalized },
    });
  },

  async updateSettings(key, value) {
    return prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
  },
};
