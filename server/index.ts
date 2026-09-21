import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerPersistentRequestRoutes } from "./persistent-request-routes";
import { registerOrderChatRoutes } from "./order-chat-routes";
import { registerOrderReviewRoutes } from "./order-review-routes";
import { registerDirectChatRoutes } from "./direct-chat-routes";
import { registerPushRoutes } from "./push-routes";
import { registerProviderRoutes } from "./provider-routes";
import { ensureAdminTables, registerAdminRoutes } from "./admin-routes";
import { ensureDirectoryTables } from "./directory-service";
import { registerDirectoryRoutes } from "./directory-routes";
import { ensureCategoryTables } from "./category-service";
import { registerCategoryRoutes } from "./category-routes";
import { ensureProviderImportTables, startProviderImportScheduler } from "./provider-importer";
import { registerProviderImportRoutes } from "./provider-import-routes";
import { ensureVerificationWorkflowTables } from "./verification-service";
import { registerVerificationRoutes } from "./verification-routes";
import { ensureProviderTables } from "./provider-service";
import { initializePushService } from "./push-service";
import { startProviderLifecycleScheduler } from "./provider-lifecycle";
import { registerRoutes } from "./routes";
import { registerRealtimeRoutes, registerRealtimeServer } from "./realtime";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const PgSession = connectPgSimple(session);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "12mb", // certificate photos are sent as data-URLs (up to 10 × ~1 МБ)
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("SESSION_SECRET is required"); })() : "govza-dev-secret"),
    store: new PgSession({
      pool,
      tableName: "user_sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (
        capturedJsonResponse &&
        !path.startsWith("/api/auth") &&
        !path.startsWith("/api/lost-found") &&
        !path.startsWith("/api/requests") &&
        !path.startsWith("/api/orders") &&
        !path.startsWith("/api/order-chats") &&
        !path.startsWith("/api/direct-chats") &&
        !path.startsWith("/api/realtime-token") &&
        !path.includes("/reviews") &&
        !path.endsWith("/review") &&
        !path.startsWith("/api/push") &&
        !path.startsWith("/api/providers") &&
        !path.startsWith("/api/internal/providers") &&
        !path.startsWith("/api/admin") &&
        !path.startsWith("/api/internal/admin")
      ) {
        // Truncate to keep uploaded document images / PII out of the logs
        const body = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${body.length > 200 ? body.slice(0, 200) + "…" : body}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Persistent request routes are registered first so they replace the legacy in-memory
  // /api/requests handlers while the rest of the application continues using registerRoutes.
  await ensureProviderTables();
  await ensureAdminTables();
  await ensureDirectoryTables();
  await ensureCategoryTables();
  await ensureProviderImportTables();
  await ensureVerificationWorkflowTables();
  await initializePushService();
  await registerPersistentRequestRoutes(app);
  await registerOrderChatRoutes(app);
  await registerOrderReviewRoutes(app);
  await registerDirectChatRoutes(app);
  registerRealtimeRoutes(app);
  await registerPushRoutes(app);
  await registerProviderRoutes(app);
  await registerAdminRoutes(app);
  await registerDirectoryRoutes(app);
  await registerCategoryRoutes(app);
  await registerProviderImportRoutes(app);
  await registerVerificationRoutes(app);
  await registerRoutes(httpServer, app);
  startProviderLifecycleScheduler();
  startProviderImportScheduler();
  registerRealtimeServer(httpServer);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
