import { prisma } from "../lib/prisma.js";
import { normalizeSomaliPhone } from "../lib/phone.js";

const MAX_ATTEMPTS = 3;

function providerConfig() {
  const rawUrl = String(process.env.SMS_API_URL || "").trim().replace(/\/+$/, "");
  const baseUrl = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
  return {
    url: baseUrl.includes("/sms/") ? baseUrl : `${baseUrl}/sms/3/messages`,
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID || "ServiceSMS",
  };
}

export async function attemptSms(id) {
  const row = await prisma.smsNotification.findUnique({ where: { id } });
  if (!row || row.status === "Sent" || row.attempts >= MAX_ATTEMPTS) return row;
  const config = providerConfig();
  try {
    if (!config.url || !config.apiKey) throw new Error("SMS provider is not configured");
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `App ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages: [{
          sender: config.senderId,
          destinations: [{ to: row.recipientPhone.replace(/^\+/, "") }],
          content: { text: row.message },
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.requestError?.serviceException?.text || body.message || `SMS provider returned ${response.status}`);
    }
    const providerMessage = body.messages?.[0] || {};
    return prisma.smsNotification.update({
      where: { id },
      data: {
        status: "Sent",
        attempts: { increment: 1 },
        providerMessageId: String(providerMessage.messageId || body.messageId || body.id || ""),
        failureReason: null,
        nextRetryAt: null,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    const attempts = row.attempts + 1;
    return prisma.smsNotification.update({
      where: { id },
      data: {
        status: attempts >= MAX_ATTEMPTS ? "Failed" : "Retrying",
        attempts,
        failureReason: String(error.message || error).slice(0, 1000),
        nextRetryAt: attempts >= MAX_ATTEMPTS ? null : new Date(Date.now() + attempts * 5 * 60_000),
      },
    });
  }
}

export async function queueSms({ entityType, entityId, event, recipientName, recipientPhone, message }) {
  if (!recipientPhone) return null;
  const phone = normalizeSomaliPhone(recipientPhone);
  const row = await prisma.smsNotification.upsert({
    where: {
      event_recipientPhone_entityType_entityId: {
        event, recipientPhone: phone, entityType, entityId,
      },
    },
    update: {},
    create: {
      entityType, entityId, event, recipientName: recipientName || null,
      recipientPhone: phone, message, status: "Pending",
    },
  });
  if (row.status === "Pending" || row.status === "Retrying") {
    void attemptSms(row.id).catch(() => {});
  }
  return row;
}

export async function retryDueSms() {
  const due = await prisma.smsNotification.findMany({
    where: {
      status: "Retrying",
      nextRetryAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    take: 25,
    orderBy: { nextRetryAt: "asc" },
  });
  return Promise.all(due.map((row) => attemptSms(row.id)));
}

export async function resendSms(id) {
  const row = await prisma.smsNotification.update({
    where: { id },
    data: { status: "Pending", attempts: 0, failureReason: null, nextRetryAt: null },
  });
  return attemptSms(row.id);
}

export async function listSmsNotifications({ status, page = 1, limit = 50 } = {}) {
  const where = status ? { status } : {};
  const [data, total] = await Promise.all([
    prisma.smsNotification.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
    }),
    prisma.smsNotification.count({ where }),
  ]);
  return { data, total, page: Number(page) };
}
