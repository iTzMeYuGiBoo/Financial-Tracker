const express = require("express");
const router = express.Router();
const { generateSimple } = require("../mcp");

const isConfigured = () =>
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

if (isConfigured()) {
  console.log("✅ Gemini client for subscriptions initialised");
} else {
  console.log("ℹ️  No Gemini key for subscriptions — using mock responses");
}

router.post("/advice", async (req, res) => {
  try {
    const { subscriptions, monthlyIncome } = req.body || {};
    if (!isConfigured()) {
      return res.json({
        source: "mock",
        suggestions: [
          "📺 Consider downgrading or cancelling at least one streaming service to save €15–€20/month.",
          "💾 Annual subscriptions (like cloud storage) are often cheaper than monthly billing.",
          "📱 Audit rarely used apps – gym, meditation, or language apps can add up.",
          "💳 Paying subscriptions from a single account makes them easier to track and renegotiate.",
        ],
      });
    }
    const lines = (subscriptions || [])
      .slice(0, 10)
      .map(
        (s) =>
          `${s.merchant} — avg €${s.avgAmount} per month, category ${s.categoryName}, next on ${s.nextChargeDate}`
      )
      .join("\n");

    const prompt = `You are a personal finance coach in Ireland.
User net income: €${monthlyIncome || "unknown"}.
These are their detected subscriptions (one per line):
${lines}

Pick 3–5 subscriptions or patterns that you would recommend cancelling, downgrading, or renegotiating.
Explain why, and estimate rough annual savings where possible.
Return JSON of the form {"suggestions":["s1","s2","s3",...]}. Each suggestion must be a single sentence starting with an emoji.`;

    const data = await generateSimple(prompt);
    if (!data) {
      return res.json({
        source: "mock",
        suggestions: [
          "📺 Consider downgrading or cancelling at least one streaming service to save €15–€20/month.",
          "💾 Annual subscriptions (like cloud storage) are often cheaper than monthly billing.",
          "📱 Audit rarely used apps – gym, meditation, or language apps can add up.",
          "💳 Paying subscriptions from a single account makes them easier to track and renegotiate.",
        ],
      });
    }
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Subscription advice error:", err.message);
    res.status(500).json({ error: "AI service error" });
  }
});

module.exports = router;
