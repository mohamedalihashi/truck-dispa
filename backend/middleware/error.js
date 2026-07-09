export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  let message = error.message || "Unexpected server error";

  if (
    message.includes("connection pool") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("closed the connection") ||
    message.includes("Connection terminated")
  ) {
    message = "Database connection lost. Please try again in a few seconds.";
  }

  res.status(status).json({
    message,
    status,
    ...(error.details ? { details: error.details } : {})
  });
}
