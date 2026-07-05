/**
 * Planner Agent - Google ADK Agent
 * Responsible for breaking down goals into actionable tasks and assigning priorities.
 */

import { generateContent } from "./aiHelper.js";
import { executeLocalTool } from "../mcp/server.js";

const SYSTEM_INSTRUCTIONS = `
You are the Planner Agent, a crucial node in the LifePilot AI Multi-Agent system.
Your job is to read the user's goals, schedules, and deadlines, and output a structured list of actionable tasks.

CRITICAL:
1. Break down broad goals (e.g. "pass my calculus exam") into bite-sized, specific tasks (e.g. "Review calculus limits chapter", "Complete practice exam questions").
2. Assign a realistic priority ('high', 'medium', or 'low') based on urgency.
3. If the user mentions a deadline or date, attach it to the tasks in YYYY-MM-DD format.
4. Output your response STRICTLY as a valid JSON array of tasks. Do not output markdown code blocks outside of standard JSON.

Response JSON Schema:
[
  {
    "title": "Short descriptive task title",
    "priority": "high" | "medium" | "low",
    "deadline": "YYYY-MM-DD"
  }
]
`;

/**
 * Runs the Planner Agent to decompose goals into tasks.
 * @param {Object} input - { goals, rawTasks, deadline }
 * @returns {Promise<Array>} List of prioritized tasks.
 */
export async function runPlannerAgent(input = {}) {
  const prompt = `
Goals to break down: ${JSON.stringify(input.goals || [])}
Raw tasks provided: ${JSON.stringify(input.rawTasks || [])}
Global deadlines: ${input.deadline || "None"}
  `;

  // Standard Mock callback for local/demo runs
  const mockGenerator = (sanitizedPrompt) => {
    const mockTasks = [];
    const goalsList = input.goals || [];
    const rawList = input.rawTasks || [];
    const deadline = input.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Deconstruct goals
    if (goalsList.length > 0) {
      goalsList.forEach(goal => {
        if (goal.toLowerCase().includes('exam') || goal.toLowerCase().includes('study')) {
          mockTasks.push({ title: `Review key concepts for: ${goal}`, priority: 'high', deadline });
          mockTasks.push({ title: `Complete practice tests for: ${goal}`, priority: 'high', deadline });
          mockTasks.push({ title: `Create summary study notes for: ${goal}`, priority: 'medium', deadline });
        } else {
          mockTasks.push({ title: `Break down project milestones for: ${goal}`, priority: 'high', deadline });
          mockTasks.push({ title: `Execute phase 1 steps for: ${goal}`, priority: 'medium', deadline });
          mockTasks.push({ title: `Review final delivery requirements for: ${goal}`, priority: 'low', deadline });
        }
      });
    }

    // Process raw inputs
    if (rawList.length > 0) {
      rawList.forEach(task => {
        const titleStr = typeof task === 'string' ? task : task.title;
        const priorityStr = typeof task === 'string' ? 'medium' : (task.priority || 'medium');
        mockTasks.push({
          title: titleStr,
          priority: priorityStr,
          deadline: (typeof task === 'object' && task.deadline) ? task.deadline : deadline
        });
      });
    }

    // Default tasks if nothing provided
    if (mockTasks.length === 0) {
      mockTasks.push({ title: "Organize study space & gather textbooks", priority: "low", deadline });
      mockTasks.push({ title: "Setup weekly scheduling calendar slots", priority: "medium", deadline });
      mockTasks.push({ title: "Review tomorrow's urgent assignment outline", priority: "high", deadline });
    }

    return JSON.stringify(mockTasks);
  };

  const aiResponse = await generateContent({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    prompt: prompt,
    mockCallback: mockGenerator
  });

  try {
    let parsedTasks = JSON.parse(aiResponse);
    if (!Array.isArray(parsedTasks)) {
      parsedTasks = [parsedTasks];
    }
    
    // Call the MCP Task Tool to prioritize and score
    const prioritizedTasks = await executeLocalTool("tasks/prioritize", { tasks: parsedTasks });
    return prioritizedTasks;
  } catch (err) {
    console.error("Planner Agent JSON Parse / MCP Tool call failed:", err);
    // Return a minimal list if parsing fails
    return [{ title: "Focus session", priority: "high", quadrant: "Do First", advice: "Urgent. Focus." }];
  }
}
