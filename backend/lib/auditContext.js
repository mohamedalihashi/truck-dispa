import { AsyncLocalStorage } from "node:async_hooks";

const auditStorage = new AsyncLocalStorage();

function requestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

export function auditContextMiddleware(req, _res, next) {
  auditStorage.run({
    ipAddress: requestIp(req),
    userAgent: req.get("user-agent") || null
  }, next);
}

export function auditFields(data = {}) {
  const context = auditStorage.getStore() || {};
  return {
    status: "Success",
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    ...data
  };
}
