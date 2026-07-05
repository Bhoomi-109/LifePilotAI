/**
 * Agent Routes - Express Router
 * Exposes endpoints for planning orchestrations and MCP status inquiries.
 */

import express from "express";
import { runCoordinatorAgent } from "../agents/coordinatorAgent.js";
import { listLocalTools } from "../mcp/server.js";

const router = express.Router();

/**
 * Validate incoming JSON request body for planning.
 */
function validatePlanRequest(req, res, next) {
  const { tasks, goals, subjects, availableStudyHours } = req.body;

  // Reusable error response helper
  const errResponse = (field, message) => res.status(400).json({
    success: false,
    error: `Validation Error on ${field}: ${message}`
  });

  if (tasks && !Array.isArray(tasks)) {
    return errResponse("tasks", "Must be an array of task items.");
  }

  if (goals && !Array.isArray(goals)) {
    return errResponse("goals", "Must be an array of goals strings.");
  }

  if (subjects && !Array.isArray(subjects)) {
    return errResponse("subjects", "Must be an array of subject names.");
  }

  if (availableStudyHours !== undefined) {
    const hours = parseFloat(availableStudyHours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      return errResponse("availableStudyHours", "Must be a number between 0 and 24.");
    }
  }

  next();
}

/**
 * POST /api/plan
 * Starts the multi-agent system to formulate schedules and recommendations.
 */
router.post("/plan", validatePlanRequest, async (req, res) => {
  try {
    const result = await runCoordinatorAgent(req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    console.error("Route orchestration error:", err);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred in the agent orchestration pipeline."
    });
  }
});

/**
 * GET /api/mcp-status
 * Queries the local MCP Server's registered tools list to verify connectivity.
 */
router.get("/mcp-status", async (req, res) => {
  try {
    const tools = listLocalTools();
    res.json({
      success: true,
      status: "connected",
      toolCount: tools.length,
      tools: tools.map(t => ({ name: t.name, description: t.description }))
    });
  } catch (err) {
    console.error("Failed to query MCP tools list:", err);
    res.status(500).json({
      success: false,
      status: "disconnected",
      error: err.message || "Failed to contact MCP server."
    });
  }
});

export default router;
