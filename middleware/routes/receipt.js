const express = require("express");
const router = express.Router();
const { analyzeImage } = require("../mcp");

// Receipt OCR endpoint — extracts amount, date, description from base64 image
router.post("/scan", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      // Mock response for demo
      return res.json({
        source: "mock",
        amount: 24.99,
        description: "Grocery Store",
        date: new Date().toISOString().split("T")[0],
        category: "Food & Dining",
      });
    }

    const prompt = 'Extract from this receipt: total amount, date, merchant name. Return JSON: {"amount": number, "description": "merchant name", "date": "YYYY-MM-DD", "category": "Food & Dining|Transport|Shopping|Entertainment|Health|Utilities|Other"}';
    const data = await analyzeImage(imageBase64, prompt);
    if (!data) {
      return res.json({
        source: "mock",
        amount: 24.99,
        description: "Grocery Store",
        date: new Date().toISOString().split("T")[0],
        category: "Food & Dining",
      });
    }
    res.json({ source: "gemini", ...data });
  } catch (err) {
    console.error("Receipt scan error:", err.message);
    res.status(500).json({ error: "Receipt scan failed" });
  }
});

module.exports = router;
