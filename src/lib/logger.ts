type LogMeta = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }
  return error;
}

function write(level: "info" | "warn" | "error", message: string, meta?: LogMeta) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(entry));
    return;
  }

  console[level](message, meta ?? "");
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    write("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    write("warn", message, meta);
  },
  error(message: string, error?: unknown, meta?: LogMeta) {
    write("error", message, { ...meta, error: normalizeError(error) });
  },
};
