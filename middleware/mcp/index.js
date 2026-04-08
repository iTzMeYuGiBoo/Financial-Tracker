/**
 * MCP Server index — re-exports for convenience.
 */
const { toolDeclarations, executeTool } = require("./tools");
const { chat, generateSimple, analyzeImage } = require("./gemini");

module.exports = { toolDeclarations, executeTool, chat, generateSimple, analyzeImage };
