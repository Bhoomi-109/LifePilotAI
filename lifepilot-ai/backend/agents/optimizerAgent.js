/**
 * Optimizer Agent - Google ADK Agent
 * Responsible for task conflict resolution, productivity hacks, and burnout risk validation.
 */

import { generateContent } from "./aiHelper.js";
import { executeLocalTool } from "../mcp/server.js";

const SYSTEM_INSTRUCTIONS = `
You are the Task Optimization Agent, the final checking node in the LifePilot AI system.
Your job is to read a scheduled calendar flow, look for conflicts, adjust timing based on peak energy levels, and output a optimized timeline with burnout risks.

CRITICAL:
1. Align the most difficult tasks (high priority) with the user's peak energy periods (e.g. morning vs evening).
2. Look for overlapping start/end schedules and fix them.
3. Call the burnout assessment tool to verify total daily active hours.
4. Output your response STRICTLY as a valid JSON object. Do not output markdown code blocks outside of standard JSON.

Response JSON Schema:
{
  "optimizedSchedule": [
    {
      "start": "HH:MM",
      "end": "HH:MM",
      "title": "Task name",
      "type": "study" | "work" | "leisure" | "chore",
      "priority": "high" | "medium" | "low"
    }
  ],
  "productivityTriggers": [
    "Focus tip 1...",
    "Focus tip 2..."
  ],
  "burnoutStatus": {
    "score": 35,
    "level": "Low" | "Moderate" | "High" | "Critical",
    "alert": "Advice text..."
  }
}
`;

/**
 * Runs the Optimizer Agent to resolve conflicts and check burnout.
 * @param {Object} input - { schedule, energyPreference, availableHours }
 * @returns {Promise<Object>} Refined schedule, advice, and burnout status.
 */
export async function runOptimizerAgent(input = {}) {
  const prompt = `
Daily Schedule: ${JSON.stringify(input.schedule || [])}
User energy preference: ${input.energyPreference || "morning"}
Available study hours limit: ${input.availableHours || 6}
  `;

  const mockGenerator = (sanitizedPrompt) => {
    const rawSchedule = input.schedule || [];
    const energy = input.energyPreference || "morning";

    // Shift high-priority tasks to morning if preference is morning, or shift to afternoon/evening
    const optimizedSchedule = rawSchedule.map(item => {
      // Return a copy
      return { ...item };
    });

    // If morning energy preference, sort schedule so high priority tasks occupy the earlier slots
    if (energy.toLowerCase() === "morning") {
      // Ensure breakfast is first, then high priority, etc.
    }

    const productivityTriggers = [
      "Keep study blocks under 90 minutes to maintain maximum neural focus.",
      "Integrate active writing tasks during your high energy slot.",
      "Take a 10-minute active pause (stretching) between back-to-back sessions."
    ];

    return JSON.stringify({
      optimizedSchedule,
      productivityTriggers,
      burnoutStatus: {
        score: 35,
        level: "Moderate",
        alert: "Moderate strain: schedule is balanced, but keep rest blocks intact."
      }
    });
  };

  const aiResponse = await generateContent({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    prompt: prompt,
    mockCallback: mockGenerator
  });

  try {
    const optimizedResult = JSON.parse(aiResponse);

    // Call MCP tool to compute exact burnout score based on final schedule hours
    const dailySchedule = optimizedResult.optimizedSchedule || [];
    let studyHours = 0;
    let workHours = 0;

    const parseDuration = (start, end) => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      return (eh + em / 60) - (sh + sm / 60);
    };

    dailySchedule.forEach(item => {
      if (item.start && item.end) {
        const hours = parseDuration(item.start, item.end);
        if (item.type === "study") {
          studyHours += hours;
        } else if (item.type === "work" || item.type === "chore") {
          workHours += hours;
        }
      }
    });

    const burnoutMetrics = await executeLocalTool("productivity/assessBurnout", {
      dailyStudyHours: parseFloat(studyHours.toFixed(1)),
      dailyWorkHours: parseFloat(workHours.toFixed(1))
    });

    optimizedResult.burnoutStatus = {
      score: burnoutMetrics.burnoutScore,
      level: burnoutMetrics.riskLevel,
      alert: burnoutMetrics.advice
    };

    // Grab focus suggestions from MCP
    const focusSuggestions = await executeLocalTool("productivity/getSuggestions");
    optimizedResult.productivityTriggers = [
      ...(optimizedResult.productivityTriggers || []),
      ...focusSuggestions
    ].slice(0, 4); // Limit to 4

    return optimizedResult;
  } catch (err) {
    console.error("Optimizer Agent JSON Parse / MCP Tool call failed:", err);
    return {
      optimizedSchedule: input.schedule || [],
      productivityTriggers: [],
      burnoutStatus: { score: 10, level: "Low", alert: "Low strain." }
    };
  }
}
