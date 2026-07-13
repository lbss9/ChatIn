const required = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

export function validateEnvironment(config: Record<string, unknown>) {
  const missing = required.filter(
    (key) => typeof config[key] !== "string" || !String(config[key]).trim(),
  );
  if (missing.length)
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error("PORT must be a valid network port.");
  return { ...config, PORT: port, SMTP_PORT: Number(config.SMTP_PORT ?? 587) };
}
