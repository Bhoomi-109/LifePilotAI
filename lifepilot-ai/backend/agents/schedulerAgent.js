/**
 * Scheduler Agent - Google ADK Agent
 * Responsible for calendar organization, balancing work/study, and generating daily/weekly timetables.
 */

import { generateContent } from "./aiHelper.js";
import { executeLocalTool } from "../mcp/server.js";

const SYSTEM_INSTRUCTIONS = `
You are the Scheduler Agent, part of the LifePilot AI Multi-Agent system.
Your job is to structure calendar blocks, balancing work, study, chores, and rest.

CRITICAL:
1. Arrange a realistic hour-by-hour daily schedule starting from morning (e.g. 08:00) to evening (e.g. 21:00).
2. Incorporate breaks, meals, and study sessions.
3. Call out balance tips (work vs study).
4. Output your response STRICTLY as a valid JSON object. Do not output markdown code blocks outside of standard JSON.

Response JSON Schema:
{
  "dailySchedule": [
    {
      "start": "HH:MM",
      "end": "HH:MM",
      "title": "Block activity name",
      "type": "study" | "work" | "leisure" | "chore",
      "priority": "high" | "medium" | "low"
    }
  ],
  "weeklyHighlights": [
    "Focus area 1...",
    "Focus area 2..."
  ],
  "balanceAssessment": "Review of the user's workload balance..."
}
`;

/**
 * Runs the Scheduler Agent to plan daily blocks.
 * @param {Object} input - { studyPlan, taskList, workHours, availability }
 * @returns {Promise<Object>} Formatted calendar schedule.
 */
export async function runSchedulerAgent(input = {}) {
  const prompt = `
Study Plan: ${JSON.stringify(input.studyPlan || {})}
Tasks to integrate: ${JSON.stringify(input.taskList || [])}
Work hours: ${input.workHours || "09:00 - 17:00"}
Preferences: ${JSON.stringify(input.preferences || {})}
  `;

  const mockGenerator = (sanitizedPrompt) => {
    const rawTasks = input.taskList || [];
    const studyPlan = input.studyPlan || {};
    const timetable = studyPlan.studyTimetable || [];

    // Create seed items to schedule
    const newItems = [];
    
    // Add study items
    timetable.forEach(item => {
      newItems.push({
        title: `Study Session: ${item.subject} (${item.technique || "Review"})`,
        duration: item.hoursAllocated || 2.0,
        type: "study",
        priority: item.difficulty === "high" ? "high" : "medium"
      });
    });

    // Add tasks
    rawTasks.forEach(task => {
      newItems.push({
        title: task.title,
        duration: task.priority === "high" ? 1.5 : 1.0,
        type: "work",
        priority: task.priority || "medium"
      });
    });

    // Add a default rest/exercise task
    newItems.push({
      title: "Evening physical exercise/walk",
      duration: 1.0,
      type: "leisure",
      priority: "low"
    });

    // Run the scheduler simulator
    const existingEvents = [
      { title: "Morning routine & breakfast", start: "08:00", end: "09:00", type: "leisure", priority: "low" },
      { title: "Lunch Break", start: "13:00", end: "14:00", type: "leisure", priority: "medium" },
      { title: "Dinner & wind-down", start: "19:00", end: "20:00", type: "leisure", priority: "low" }
    ];

    const opt = {
      startHour: 8,
      endHour: 21
    };

    const optimizationResult = calendarToolOptimize(existingEvents, newItems, opt);

    const weeklyHighlights = [
      "Monday-Wednesday: Focus heavily on Core Exam Topics.",
      "Thursday-Friday: Address pending task backlogs & practical coding.",
      "Weekend: Rest and complete brief active recall cards."
    ];

    const balanceAssessment = "Your schedule has a healthy mixture of intensive study blocks, break hours, and physical activity. No major stress spikes predicted.";

    return JSON.stringify({
      dailySchedule: optimizationResult.schedule,
      weeklyHighlights,
      balanceAssessment
    });
  };

  const aiResponse = await generateContent({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    prompt: prompt,
    mockCallback: mockGenerator
  });

  try {
    const parsedSchedule = JSON.parse(aiResponse);
    return parsedSchedule;
  } catch (err) {
    console.error("Scheduler Agent JSON Parse failed:", err);
    return {
      dailySchedule: [],
      weeklyHighlights: [],
      balanceAssessment: "Could not assess balance."
    };
  }
}

// Minimal helper to simulate calendar tool locally inside mock callback
function calendarToolOptimize(existing, newItems, opt) {
  const schedule = [...existing];
  
  const decimalToTime = (d) => {
    const h = Math.floor(d);
    const m = Math.round((d - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let currentHour = opt.startHour;
  for (const item of newItems) {
    const duration = parseFloat(item.duration) || 1.0;
    let scheduled = false;

    // Scan for gap
    while (currentHour <= opt.endHour - duration) {
      const slotStart = decimalToTime(currentHour);
      const slotEnd = decimalToTime(currentHour + duration);

      const overlap = schedule.some(evt => {
        return (slotStart < evt.end && slotEnd > evt.start);
      });

      if (!overlap) {
        schedule.push({
          title: item.title,
          start: slotStart,
          end: slotEnd,
          type: item.type,
          priority: item.priority
        });
        currentHour += duration;
        scheduled = true;
        break;
      }
      currentHour += 0.5;
    }
  }

  schedule.sort((a, b) => a.start.localeCompare(b.start));
  return { schedule };
}
