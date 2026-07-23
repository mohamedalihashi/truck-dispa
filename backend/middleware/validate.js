export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      return res.status(400).json({
        message: issues[0]?.message || "Validation failed",
        issues,
        details: {
          ...result.error.flatten(),
          issues
        }
      });
    }
    req.body = result.data;
    next();
  };
}
