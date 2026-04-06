require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// CORS for the frontend
app.use(cors({ origin: [FRONTEND_URL], credentials: true }));

// ─── Java proxy MUST be registered BEFORE express.json() ─────────────────────
// express.json() consumes the body stream; if it runs first the proxy can't
// forward the raw body to Java, causing malformed / empty requests → 403.
//
// We list every route that Node does NOT handle so they bypass body parsing
// entirely and go straight through to Java.
const javaProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      // Always forward the JWT token
      const auth = req.headers["authorization"];
      if (auth) proxyReq.setHeader("Authorization", auth);

      // Spoof Origin to a value Java already trusts so CORS never blocks us
      proxyReq.setHeader("Origin", FRONTEND_URL);

      console.log(`[Proxy] ${req.method} ${req.url} → ${BACKEND_URL}${req.url}`);
    },
    error: (err, req, res) => {
      console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
      res.status(502).json({ error: "Backend unavailable", detail: err.message });
    },
  },
});

// Routes that Node handles itself (NOT proxied to Java)
const NODE_ONLY_ROUTES = [
  "/api/ai",
  "/api/receipt",
  "/api/exchange-rates",
  "/api/subscriptions",
];

// Attach proxy for every /api/* route that is NOT a Node-only route
app.use("/api", (req, res, next) => {
  const isNodeRoute = NODE_ONLY_ROUTES.some(r => req.path.startsWith(r.replace("/api", "")));
  if (isNodeRoute) return next();
  return javaProxy(req, res, next);
});

// ─── Body parsing only for Node-handled routes ────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// Rate limiters
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many AI requests, please try again in a minute." } });
const subsLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Too many subscription requests, please try again later." } });

// Node-handled routes
app.use("/api/ai", aiLimiter, require("./routes/ai"));
app.use("/api/receipt", require("./routes/receipt"));
app.use("/api/exchange-rates", require("./routes/exchangeRates"));
app.use("/api/subscriptions", subsLimiter, require("./routes/subscriptions"));

app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`✅ Middleware running on http://localhost:${PORT} → proxying non-node /api/* to ${BACKEND_URL}`));
