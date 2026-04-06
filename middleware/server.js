require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT       = process.env.PORT        || 4000;
const BACKEND    = process.env.BACKEND_URL  || "http://localhost:8080";
const FRONTEND   = process.env.FRONTEND_URL || "http://localhost:3000";

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND, credentials: true }));

// ─── 1. NODE-ONLY routes (body parsing scoped here only) ─────────────────────
// These routes are handled entirely by Node. They MUST be registered before
// the Java proxy so they intercept first.
const nodeRouter = express.Router();
nodeRouter.use(express.json({ limit: "10mb" }));

const aiLimiter = rateLimit({
  windowMs: 60_000, max: 20,
  message: { error: "Too many AI requests, please try again in a minute." },
});
const subsLimiter = rateLimit({
  windowMs: 60_000, max: 10,
  message: { error: "Too many subscription requests, please try again later." },
});

nodeRouter.use("/ai",             aiLimiter,   require("./routes/ai"));
nodeRouter.use("/receipt",                     require("./routes/receipt"));
nodeRouter.use("/exchange-rates",              require("./routes/exchangeRates"));
nodeRouter.use("/subscriptions",  subsLimiter, require("./routes/subscriptions"));

app.use("/api", nodeRouter);

// ─── 2. JAVA PROXY — everything else under /api goes straight to Spring Boot ──
// IMPORTANT: registered AFTER node routes but BEFORE any body-parser on app
// level, so the raw request stream is intact for forwarding.
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward JWT token
        const auth = req.headers["authorization"];
        if (auth) proxyReq.setHeader("Authorization", auth);

        // Set Origin to a value Java trusts (avoids CORS rejection)
        proxyReq.setHeader("Origin", FRONTEND);

        console.log(`[→ Java] ${req.method} ${req.originalUrl}`);
      },
      error: (err, req, res) => {
        console.error(`[Proxy Error] ${req.method} ${req.originalUrl}:`, err.message);
        res.status(502).json({ error: "Backend unavailable", detail: err.message });
      },
    },
  })
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.listen(PORT, () =>
  console.log(`✅ Middleware :${PORT}  |  Node routes: /api/ai /api/receipt /api/exchange-rates /api/subscriptions  |  Everything else → ${BACKEND}`)
);
