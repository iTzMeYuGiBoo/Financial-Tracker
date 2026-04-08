require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const app = express();
const PORT     = process.env.PORT        || 4000;
const BACKEND  = process.env.BACKEND_URL;
const FRONTEND = process.env.FRONTEND_URL;

if (!BACKEND || !FRONTEND) {
  console.error("FATAL: BACKEND_URL and FRONTEND_URL env vars are required.");
  process.exit(1);
}

// ─── Global ───────────────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND, credentials: true }));

// ─── Node-only routes (with body parsing scoped to them) ──────────────────────
const nodeRouter = express.Router();
nodeRouter.use(express.json({ limit: "10mb" }));

const aiLimiter   = rateLimit({ windowMs: 60_000, max: 20,  message: { error: "Too many AI requests." } });
const subsLimiter = rateLimit({ windowMs: 60_000, max: 10,  message: { error: "Too many subscription requests." } });

nodeRouter.use("/ai",             aiLimiter,   require("./routes/ai"));
nodeRouter.use("/receipt",                     require("./routes/receipt"));
nodeRouter.use("/exchange-rates",              require("./routes/exchangeRates"));
nodeRouter.use("/subscriptions",  subsLimiter, require("./routes/subscriptions"));

app.use("/api", nodeRouter);

// ─── Java catch-all proxy ──────────────────────────────────────────────────────────
app.use("/api", express.raw({ type: "*/*", limit: "20mb" }), async (req, res) => {
  const url         = `${BACKEND}${req.originalUrl}`;
  const contentType = (req.headers["content-type"] || "").toLowerCase();

  // Convert parsed/streamed body to the right type for axios.
  let data;
  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > 0) {
        data = (contentType.includes("application/json") || contentType.includes("text/"))
          ? req.body.toString("utf8")
          : req.body;
      }
    } else if (typeof req.body === "string") {
      if (req.body.length > 0) data = req.body;
    } else if (typeof req.body === "object") {
      // express.json() on nodeRouter may already parse body for unmatched /api routes.
      if (Object.keys(req.body).length > 0) data = req.body;
    }
  }

  const headers = {
    ...req.headers,
    host:   new URL(BACKEND).host,
    origin: FRONTEND,
  };
  delete headers["content-length"]; // axios recalculates correctly

  console.log(`[\u2192 Java] ${req.method} ${req.originalUrl}`);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // ms

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios({
        method:         req.method,
        url,
        headers,
        data,
        responseType:   "arraybuffer",
        validateStatus: () => true,
        timeout:        30000,
      });

      Object.entries(response.headers).forEach(([k, v]) => {
        if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
      });
      return res.status(response.status).send(Buffer.from(response.data));
    } catch (err) {
      const isRetryable = err.code === "ECONNREFUSED" || err.code === "ECONNRESET" || err.code === "ENOTFOUND";
      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`[Proxy Retry ${attempt}/${MAX_RETRIES}] ${req.method} ${req.originalUrl}: ${err.message}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      console.error(`[Proxy Error] ${req.method} ${req.originalUrl}:`, err.message);
      return res.status(502).json({ error: "Backend unavailable", detail: err.message });
    }
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.listen(PORT, () =>
  console.log(`\u2705 Middleware :${PORT} | Node: /api/ai /api/receipt /api/exchange-rates /api/subscriptions | Everything else \u2192 ${BACKEND}`)
);
