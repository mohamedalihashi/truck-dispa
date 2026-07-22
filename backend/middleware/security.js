import { rateLimit } from "express-rate-limit";

function limiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message }
  });
}

export const authLimiter = limiter(15 * 60 * 1000, 10, "Too many authentication attempts. Try again later.");
export const registrationLimiter = limiter(60 * 60 * 1000, 5, "Too many registration attempts. Try again later.");
export const otpLimiter = limiter(15 * 60 * 1000, 8, "Too many verification attempts. Try again later.");
export const resendLimiter = limiter(15 * 60 * 1000, 3, "Too many code requests. Try again later.");
export const passwordResetLimiter = limiter(60 * 60 * 1000, 5, "Too many password reset attempts. Try again later.");
