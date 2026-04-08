/**
 * Gemini AI client with MCP tool orchestration.
 * Uses Google Gemini's function-calling to dynamically invoke
 * finance-tracker backend tools and generate contextual responses.
 */
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { toolDeclarations, executeTool } = require("./tools");

const MAX_TOOL_ROUNDS = 6; // prevent infinite loops

const SYSTEM_INSTRUCTION = `You are a friendly, expert personal finance advisor embedded in a Finance Tracker application.
You have access to tools that retrieve the user's real financial data — transactions, budgets, health score, goals, subscriptions, etc.

Guidelines:
- Always call tools to get real data before answering financial questions. Never guess or assume numbers.
- Give specific, actionable advice with concrete amounts in EUR (€).
- Start each bullet point or insight with a relevant emoji.
- Keep responses concise — prefer bullet points over long paragraphs.
- When asked about spending patterns, always call get_transactions or get_dashboard_stats first.
- When asked about budgets, call get_budgets and get_budget_alerts.
- For overall financial health, call get_health_score.
- Be encouraging but honest about areas for improvement.
- If the user lives in Ireland, tailor advice accordingly.
- Format numbers as currency where appropriate.
- If a tool call fails, explain what happened and suggest alternatives.`;

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") return null;
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Build Gemini function declarations from MCP tool definitions.
 */
function getGeminiTools() {
  return [
    {
      functionDeclarations: toolDeclarations.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

/**
 * Run a single prompt through Gemini with tool-calling loop.
 * The model may call multiple tools before generating a final text response.
 *
 * @param {string} prompt        User prompt or system-generated prompt
 * @param {string} authHeader    User's Authorization header for backend calls
 * @param {object} opts          Options: { jsonMode, maxTokens, history }
 * @returns {object}             { text, toolCalls }
 */
async function chat(prompt, authHeader, opts = {}) {
  const client = getClient();
  if (!client) return null; // signal caller to use mock

  const { jsonMode = false, maxTokens = 1024, history = [] } = opts;

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: getGeminiTools(),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  const chatSession = model.startChat({ history });

  let response = await chatSession.sendMessage(prompt);
  const allToolCalls = [];

  // Tool-calling loop: Gemini may request tool calls, we execute and feed back
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) break; // model is done calling tools

    // Execute all requested tools in parallel
    const toolResults = await Promise.all(
      functionCalls.map(async (part) => {
        const { name, args } = part.functionCall;
        allToolCalls.push({ name, args });
        try {
          const result = await executeTool(name, args, authHeader);
          return {
            functionResponse: {
              name,
              response: { success: true, data: result },
            },
          };
        } catch (err) {
          console.error(`Tool ${name} failed:`, err.message);
          return {
            functionResponse: {
              name,
              response: { success: false, error: err.message },
            },
          };
        }
      })
    );

    // Send tool results back to model
    response = await chatSession.sendMessage(toolResults);
  }

  const text = response.response.text();
  return { text, toolCalls: allToolCalls };
}

/**
 * Simple prompt (no tool calling) — for structured JSON responses
 * when we already have the data and just need AI analysis.
 */
async function generateSimple(prompt, opts = {}) {
  const client = getClient();
  if (!client) return null;

  const { jsonMode = true, maxTokens = 600 } = opts;

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return jsonMode ? JSON.parse(text) : text;
}

/**
 * Vision analysis — for receipt OCR using Gemini's multimodal capabilities.
 */
async function analyzeImage(imageBase64, prompt, mimeType = "image/jpeg") {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
  ]);

  return JSON.parse(result.response.text());
}

module.exports = { chat, generateSimple, analyzeImage };
