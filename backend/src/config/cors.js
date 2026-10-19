function createCorsOptions(frontendUrl, environment = process.env.NODE_ENV) {
  const allowedOrigins = frontendUrl.split(",").map((value) => value.trim()).filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

      // Vite may choose another port when its default port is already occupied.
      if (environment !== "production") {
        try {
          const url = new URL(origin);
          if (["http:", "https:"].includes(url.protocol) &&
              ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
              origin === url.origin) {
            return callback(null, true);
          }
        } catch {
          // Invalid origins are rejected below.
        }
      }

      const error = new Error(`CORS blocked origin: ${origin}`);
      error.status = 403;
      error.code = "CORS_FORBIDDEN";
      return callback(error);
    },
    credentials: true,
  };
}

module.exports = { createCorsOptions };
