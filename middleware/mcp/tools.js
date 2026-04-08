/**
 * MCP-style tool definitions for the Finance Tracker.
 * Each tool wraps a Java backend API endpoint and can be invoked
 * by the Gemini model via function calling.
 */
const axios = require("axios");

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

// ── Helper: call backend with user's auth token ────────────────────────────
async function callBackend(method, path, authHeader, params = {}, data = null) {
  const url = `${BACKEND}/api${path}`;
  const headers = { Authorization: authHeader };
  const res = await axios({ method, url, headers, params, data, timeout: 15000 });
  return res.data;
}

// ── Tool Declarations (Gemini function-calling schema) ─────────────────────
const toolDeclarations = [
  {
    name: "get_transactions",
    description:
      "Retrieve the user's recent transactions. Returns a list with amount, category, date, description, type (INCOME/EXPENSE). Use this to analyse spending patterns, find specific purchases, or calculate totals.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_dashboard_stats",
    description:
      "Get a summary of the user's financial dashboard: total income, total expenses, net savings, savings rate, expense breakdown by category, and monthly trends. Best for overall financial overviews.",
    parameters: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "number",
          description: "Optional bank account ID to filter stats for a specific account.",
        },
      },
    },
  },
  {
    name: "get_budgets",
    description:
      "Get the user's budget list with each budget's category, monthly limit, amount spent, and remaining amount. Use this to check if the user is on track with their budgets.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_budget_alerts",
    description:
      "Get budget alerts — budgets that are close to or have exceeded their limit.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_categories",
    description:
      "Get the user's transaction categories with name, icon, color, and type.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_health_score",
    description:
      "Get the user's financial health score (0-100, grade A-F) with component breakdown (savings, debt, diversification, consistency). Use to assess overall financial wellness.",
    parameters: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "number",
          description: "Optional bank account ID.",
        },
      },
    },
  },
  {
    name: "get_carbon_footprint",
    description:
      "Get the user's carbon footprint estimate based on spending, broken down by category and month, with CO₂ equivalencies.",
    parameters: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "number",
          description: "Optional bank account ID.",
        },
      },
    },
  },
  {
    name: "get_monthly_review",
    description:
      "Get a detailed financial review for a date range: income, expenses, net savings, savings rate, top categories, and largest transactions.",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Start date in YYYY-MM-DD format. Defaults to first day of current month.",
        },
        to: {
          type: "string",
          description: "End date in YYYY-MM-DD format. Defaults to today.",
        },
      },
    },
  },
  {
    name: "get_bank_accounts",
    description:
      "Get the user's bank accounts with name, balance, type, and icon.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_savings_goals",
    description:
      "Get the user's savings goals with target amount, current amount, progress percentage, and deadline.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_recurring_transactions",
    description:
      "Get recurring/subscription transactions with amount, frequency, next due date, and category.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_subscriptions",
    description:
      "Get detected subscription services from transaction patterns, with merchant name, average amount, and frequency.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_income_breakdown",
    description:
      "Get income analytics: this month's income by source/category, 6-month trend, and YTD totals.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_net_worth",
    description:
      "Get the user's net worth calculation across all bank accounts, with history over time.",
    parameters: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "number",
          description: "Optional bank account ID.",
        },
      },
    },
  },
  {
    name: "get_cash_flow_forecast",
    description:
      "Get a cash flow forecast based on historical income/expense patterns and upcoming recurring transactions.",
    parameters: {
      type: "object",
      properties: {
        bankAccountId: {
          type: "number",
          description: "Optional bank account ID.",
        },
      },
    },
  },
];

// ── Tool Executors ─────────────────────────────────────────────────────────
const toolExecutors = {
  async get_transactions(_args, auth) {
    return await callBackend("GET", "/transactions", auth);
  },

  async get_dashboard_stats(args, auth) {
    const params = args.bankAccountId ? { bankAccountId: args.bankAccountId } : {};
    return await callBackend("GET", "/dashboard/stats", auth, params);
  },

  async get_budgets(_args, auth) {
    return await callBackend("GET", "/budgets", auth);
  },

  async get_budget_alerts(_args, auth) {
    return await callBackend("GET", "/budgets/alerts", auth);
  },

  async get_categories(_args, auth) {
    return await callBackend("GET", "/categories", auth);
  },

  async get_health_score(args, auth) {
    const params = args.bankAccountId ? { bankAccountId: args.bankAccountId } : {};
    return await callBackend("GET", "/dashboard/health-score", auth, params);
  },

  async get_carbon_footprint(args, auth) {
    const params = args.bankAccountId ? { bankAccountId: args.bankAccountId } : {};
    return await callBackend("GET", "/dashboard/carbon-footprint", auth, params);
  },

  async get_monthly_review(args, auth) {
    const today = new Date();
    const from = args.from || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const to = args.to || today.toISOString().slice(0, 10);
    return await callBackend("GET", "/review", auth, { from, to });
  },

  async get_bank_accounts(_args, auth) {
    return await callBackend("GET", "/bank-accounts", auth);
  },

  async get_savings_goals(_args, auth) {
    return await callBackend("GET", "/goals", auth);
  },

  async get_recurring_transactions(_args, auth) {
    return await callBackend("GET", "/recurring", auth);
  },

  async get_subscriptions(_args, auth) {
    return await callBackend("GET", "/subscriptions", auth);
  },

  async get_income_breakdown(_args, auth) {
    return await callBackend("GET", "/income/breakdown", auth);
  },

  async get_net_worth(args, auth) {
    const params = args.bankAccountId ? { bankAccountId: args.bankAccountId } : {};
    return await callBackend("GET", "/dashboard/net-worth", auth, params);
  },

  async get_cash_flow_forecast(args, auth) {
    const params = args.bankAccountId ? { bankAccountId: args.bankAccountId } : {};
    return await callBackend("GET", "/dashboard/cash-flow-forecast", auth, params);
  },
};

/**
 * Execute a tool by name.
 * @param {string} name  Tool name from Gemini function call
 * @param {object} args  Arguments from Gemini
 * @param {string} auth  Authorization header value
 * @returns {object}     Tool result data
 */
async function executeTool(name, args, auth) {
  const executor = toolExecutors[name];
  if (!executor) throw new Error(`Unknown tool: ${name}`);
  return await executor(args || {}, auth);
}

module.exports = { toolDeclarations, executeTool };
