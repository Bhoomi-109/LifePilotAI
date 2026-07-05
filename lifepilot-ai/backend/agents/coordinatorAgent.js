/**
 * Coordinator Agent - Google ADK Agent
 * Directs the multi-agent flow, executing sub-agents sequentially and assembling the final response.
 */

import { generateContent } from "./aiHelper.js";
import { runPlannerAgent } from "./plannerAgent.js";
import { runStudyAgent } from "./studyAgent.js";
import { runSchedulerAgent } from "./schedulerAgent.js";
import { runOptimizerAgent } from "./optimizerAgent.js";

const SYSTEM_INSTRUCTIONS = `
You are the Coordinator Agent for LifePilot AI.
Your responsibility is to take outputs from specialized sub-agents (Planner, Study Coach, Scheduler, and Optimizer) and synthesize them into a coherent executive summary.

Your response must be STRICTLY valid JSON with a single key "summary" containing a high-level briefing of the generated schedule, highlighting the key focus items, exam prep strategy, and any potential warnings about burnout.
`;

/**
 * Coordinates and executes the complete multi-agent pipeline.
 * @param {Object} userData - Direct inputs from the UI.
 * @returns {Promise<Object>} The aggregated final plan.
 */
export async function runCoordinatorAgent(userData = {}) {
  console.log("[Coordinator Agent] Starting multi-agent pipeline...");

  try {
    // 1. Run Planner Agent to decompose goals and prioritize tasks
    console.log("[Coordinator Agent] Spawning Planner Agent...");
    const taskList = await runPlannerAgent({
      goals: userData.goals || [],
      rawTasks: userData.tasks || [],
      deadline: userData.deadline || ""
    });

    // 2. Run Study Agent to generate timetable and revision plan
    console.log("[Coordinator Agent] Spawning Study Agent...");
    const studyPlan = await runStudyAgent({
      subjects: userData.subjects || [],
      difficulties: userData.subjectsDifficulty || {},
      examDates: userData.examDates || {},
      hoursAvailable: userData.availableStudyHours || 4
    });

    // 3. Run Scheduler Agent to construct daily hourly blocks
    console.log("[Coordinator Agent] Spawning Scheduler Agent...");
    const calendarPlan = await runSchedulerAgent({
      studyPlan,
      taskList,
      workHours: userData.workHours || "09:00 - 17:00",
      preferences: {
        startHour: userData.startHour || 8,
        endHour: userData.endHour || 22
      }
    });

    // 4. Run Task Optimization Agent to adjust times and compute fatigue
    console.log("[Coordinator Agent] Spawning Optimizer Agent...");
    const optimizationResults = await runOptimizerAgent({
      schedule: calendarPlan.dailySchedule || [],
      energyPreference: userData.energyPreference || "morning",
      availableHours: userData.availableStudyHours || 4
    });

    // 5. Generate Coordinator Summary
    console.log("[Coordinator Agent] Compiling Final Plan and Summary...");
    const summaryPrompt = `
Tasks: ${JSON.stringify(taskList.map(t => t.title))}
Study Topics: ${JSON.stringify(studyPlan.studyTimetable?.map(s => s.subject))}
Fatigue: ${optimizationResults.burnoutStatus?.level} (Score: ${optimizationResults.burnoutStatus?.score})
Brief this user on their day in 2-3 sentences.
    `;

    const mockSummary = () => {
      return JSON.stringify({
        summary: `Your day is structured with high-intensity focus sessions on ${userData.subjects?.join(", ") || "your study topics"} in the morning, followed by task completions in the afternoon. Burnout risk is ${optimizationResults.burnoutStatus?.level || "Low"}, giving you ample time for recovery.`
      });
    };

    const aiSummaryResponse = await generateContent({
      systemInstructions: SYSTEM_INSTRUCTIONS,
      prompt: summaryPrompt,
      mockCallback: mockSummary
    });

    let executiveSummary = "Schedule optimized successfully. Focus on high priority items first.";
    try {
      const parsedSummary = JSON.parse(aiSummaryResponse);
      executiveSummary = parsedSummary.summary || executiveSummary;
    } catch (e) {
      console.warn("Could not parse coordinator summary JSON:", e);
    }

    // Return the combined multi-agent result
    return {
      success: true,
      coordinatorSummary: executiveSummary,
      tasks: taskList,
      study: studyPlan,
      schedule: optimizationResults.optimizedSchedule || [],
      burnout: optimizationResults.burnoutStatus || { score: 10, level: "Low", alert: "Sustainable." },
      suggestions: optimizationResults.productivityTriggers || [],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("[Coordinator Agent] Pipeline error:", error);
    return {
      success: false,
      error: error.message || "Failed to orchestrate agents."
    };
  }
}
