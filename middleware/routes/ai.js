const express = require("express");
const router = express.Router();
const { chat, generateSimple } = require("../mcp");

const isConfigured = () =>
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

if (isConfigured()) {
  console.log("✅ Gemini AI client initialised (MCP tools enabled)");
} else {
  console.log("ℹ️  No GEMINI_API_KEY — using mock AI responses");
}

// ── Mock responses for demo mode ────────────────────────────────────────────
const MOCK = {
  insights: {
    source: "mock",
    insights: [
      "🍽️ Food & Dining is your top expense — meal prepping could save €150/month",
      "🚗 Transport costs are 18% above average for your income bracket",
      "📈 Your savings rate improved 4% compared to last month — great progress!",
      "⚡ Utility spending spikes on weekends — consider energy-saving habits",
    ],
  },
  tips: {
    source: "mock",
    tips: [
      "💰 Set up an automatic transfer of 20% of your salary on payday",
      "🛍️ Use the 48-hour rule before any purchase over €50",
      "📱 Audit subscriptions monthly — average person wastes €45/month on unused services",
      "🍳 Cooking at home 3 extra days per week saves approximately €200/month in Dublin",
    ],
  },
  review: {
    source: "mock",
    highlights: [
      "📈 You maintained a positive savings rate over this period.",
      "🍽️ Dining and groceries remain your largest discretionary categories.",
    ],
    improvements: [
      "🧾 Set a hard weekly cap on takeaways and eating out.",
      "📅 Schedule a monthly money review to adjust budgets before overspending.",
    ],
  },
  carbon: {
    source: "mock",
    tips: [
      "🚌 Switching to public transport for your daily commute reduces CO₂ by up to 70%",
      "🛒 Buying local and seasonal produce cuts food-related emissions by 30%",
      "💻 Choosing digital entertainment over physical goods eliminates packaging waste",
      "🌱 Set a monthly CO₂ budget of 50kg alongside your spending budget",
    ],
  },
  budgetAdvice: {
    source: "mock",
    advice: [
      "📊 Your Food & Dining budget is at 85% — consider a weekly meal plan to stay on track",
      "🎯 You have no budget for Transport, your 3rd highest category — set one to control spending",
      "💡 Your Entertainment budget has €45 remaining — great restraint this month!",
      "📉 Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings",
    ],
  },
  chat: {
    source: "mock",
    message:
      "I'm running in demo mode without a Gemini API key. Add your GEMINI_API_KEY environment variable to get personalised AI-powered financial advice with real-time access to your financial data!",
    toolCalls: [],
  },
};

// ── /ai/insights — Spending pattern analysis ────────────────────────────────
router.post("/insights", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.insights);

    const auth = req.headers.authorization;
    const result = await chat(
      "Analyse my recent spending patterns. Call the get_dashboard_stats tool to get my financial data, then give me exactly 4 specific, actionable spending insights. Return JSON: {\"insights\": [\"insight1\", \"insight2\", \"insight3\", \"insight4\"]}. Each insight should be 1-2 sentences and start with an emoji.",
      auth,
      { jsonMode: true, maxTokens: 600 }
    );
    if (!result) return res.json(MOCK.insights);

    const data = typeof result.text === "string" ? JSON.parse(result.text) : result.text;
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("AI insights error:", err.message);
    res.status(500).json({ error: "AI service error", details: err.message });
  }
});

// ── /ai/savings-tips — Personalised savings advice ──────────────────────────
router.post("/savings-tips", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.tips);

    const auth = req.headers.authorization;
    const result = await chat(
      "I need personalised savings tips. First get my dashboard stats and income breakdown to understand my financial situation, then give exactly 4 practical, specific savings tips tailored to my actual spending. Return JSON: {\"tips\": [\"tip1\", \"tip2\", \"tip3\", \"tip4\"]}. Each tip should start with an emoji. Tailor advice to someone living in Ireland.",
      auth,
      { jsonMode: true, maxTokens: 600 }
    );
    if (!result) return res.json(MOCK.tips);

    const data = typeof result.text === "string" ? JSON.parse(result.text) : result.text;
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Savings tips error:", err.message);
    res.status(500).json({ error: "AI service error", details: err.message });
  }
});

// ── /ai/monthly-review — Period review with AI highlights ───────────────────
router.post("/monthly-review", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.review);

    const { summary } = req.body || {};
    const { from, to, totalIncome, totalExpenses, netSavings, savingsRate, topCategories, largestTransactions } = summary || {};
    const catLines = (topCategories || []).map((c) => `${c.categoryName}: €${c.amount} (${c.percentage}%)`).join("\n");
    const txLines = (largestTransactions || []).map((t) => `${t.date} — ${t.description} (${t.type}) €${t.amount} in ${t.categoryName}`).join("\n");

    const prompt = `You are a friendly personal finance coach living in Ireland.

Review period: ${from} to ${to}.
Income: €${totalIncome}, Expenses: €${totalExpenses}, Net: €${netSavings}, Savings rate: ${savingsRate}%.
Top spending categories:
${catLines}
Largest transactions:
${txLines}

Return a JSON object: {"highlights": ["..."], "improvements": ["..."]}.
- "highlights" = 2-4 short bullet-style sentences starting with an emoji, focusing on what went well.
- "improvements" = 3-5 short sentences starting with an emoji, with concrete suggestions for next month.`;

    const data = await generateSimple(prompt);
    if (!data) return res.json(MOCK.review);
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Monthly review AI error:", err.message);
    res.status(500).json({ error: "AI service error" });
  }
});

// ── /ai/carbon-insights — CO₂ reduction tips ───────────────────────────────
router.post("/carbon-insights", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.carbon);

    const { totalCo2Kg, byCategory } = req.body;
    const topCats = (byCategory || []).slice(0, 4).map((c) => `${c.name}: ${c.co2Kg}kg`).join(", ");
    const prompt = `You are a sustainability advisor. Total CO₂ this month: ${totalCo2Kg}kg. Top categories: ${topCats}.
Give 4 specific tips to reduce carbon footprint from spending. Return JSON: {"tips": ["tip1","tip2","tip3","tip4"]}. Each tip starts with an emoji.`;

    const data = await generateSimple(prompt);
    if (!data) return res.json(MOCK.carbon);
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Carbon insights error:", err.message);
    res.status(500).json({ error: "AI service error" });
  }
});

// ── /ai/budget-advice — Budget optimisation suggestions ─────────────────────
router.post("/budget-advice", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.budgetAdvice);

    const auth = req.headers.authorization;
    const result = await chat(
      "Review my budgets and spending. Call get_budgets and get_budget_alerts to see my budget limits and how much I've spent. Then give exactly 4 specific budget optimisation tips. Return JSON: {\"advice\": [\"advice1\", \"advice2\", \"advice3\", \"advice4\"]}. Each should start with an emoji.",
      auth,
      { jsonMode: true, maxTokens: 600 }
    );
    if (!result) return res.json(MOCK.budgetAdvice);

    const data = typeof result.text === "string" ? JSON.parse(result.text) : result.text;
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Budget advice error:", err.message);
    res.status(500).json({ error: "AI service error", details: err.message });
  }
});

// ── /ai/chat — Free-form financial chat with MCP tool access ────────────────
router.post("/chat", async (req, res) => {
  try {
    if (!isConfigured()) return res.json(MOCK.chat);

    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const auth = req.headers.authorization;

    // Convert frontend chat history to Gemini format
    const geminiHistory = (history || []).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));

    const result = await chat(message, auth, {
      jsonMode: false,
      maxTokens: 1024,
      history: geminiHistory,
    });
    if (!result) return res.json(MOCK.chat);

    res.json({
      source: "gemini",
      message: result.text,
      toolCalls: result.toolCalls.map((tc) => tc.name),
    });
  } catch (err) {
    console.error("AI chat error:", err.message);
    res.status(500).json({ error: "AI service error", details: err.message });
  }
});

module.exports = router;
