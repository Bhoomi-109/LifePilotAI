/**
 * LifePilot AI - Express Backend Server
 * Initializes server configurations, routes, static asset delivery, and starts listening.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import agentRoutes from "./routes/agentRoutes.js";

// Load configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, "../frontend");

// Security & Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend assets statically
app.use(express.static(frontendDir));

// API Routes
app.use("/api", agentRoutes);

// Catch-all route to serve the Single-Page Application (SPA) index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Server Error:", err.stack || err);
  res.status(500).json({
    success: false,
    error: "A critical internal server error occurred."
  });
});

// Boot the server
app.listen(PORT, () => {
  console.log("=================================================");
  console.log(`🚀 LifePilot AI backend is active!`);
  console.log(`🌐 Local Web Portal: http://localhost:${PORT}`);
  console.log(`⚡ Environment:      ${process.env.NODE_ENV || "development"}`);
  console.log(`🤖 Fallback AI Mode: ${process.env.ENABLE_MOCK_AI === "true" ? "ENABLED (Mock Mode)" : "DISABLED (Gemini API Connected)"}`);
  console.log("=================================================");
});
