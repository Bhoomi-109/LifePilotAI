/**
 * LifePilot AI - MCP Server Entry point
 * Implements the Model Context Protocol (MCP) server.
 * Supports both standalone Stdio transport and in-app library calls.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import tool logic
import * as calendarTool from "./tools/calendarTool.js";
import * as taskTool from "./tools/taskTool.js";
import * as reminderTool from "./tools/reminderTool.js";
import * as timeTool from "./tools/timeTool.js";
import * as productivityTool from "./tools/productivityTool.js";

// Initialize the MCP Server
const server = new Server(
  {
    name: "lifepilot-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Map tool calls locally for direct integration
const toolHandlers = {
  // Calendar tools
  "calendar/checkConflicts": (args) => calendarTool.checkConflicts(args.events),
  "calendar/optimizeSchedule": (args) => calendarTool.optimizeSchedule(args.existingEvents, args.newItems, args.preferences),
  "calendar/getAvailability": (args) => calendarTool.getAvailability(args.events, args.startHour, args.endHour),

  // Task tools
  "tasks/prioritize": (args) => taskTool.prioritizeTasks(args.tasks),
  "tasks/filter": (args) => taskTool.filterTasks(args.tasks, args.filters),
  "tasks/summarize": (args) => taskTool.summarizeTasks(args.tasks),

  // Reminder tools
  "reminders/generate": (args) => reminderTool.generateReminders(args.items),

  // Time tools
  "time/analyzeAvailability": (args) => timeTool.analyzeTimeAvailability(args.availableHours, args.activities),
  "time/divideSession": (args) => timeTool.divideSession(args.totalHours, args.sessionBlockMinutes, args.breakMinutes),
  "time/formatHours": (args) => timeTool.formatHours(args.hours),

  // Productivity tools
  "productivity/getStrategy": (args) => productivityTool.getProductivityStrategy(args.subject, args.difficulty),
  "productivity/assessBurnout": (args) => productivityTool.assessBurnoutRisk(args.dailyStudyHours, args.dailyWorkHours),
  "productivity/getSuggestions": () => productivityTool.getQuickSuggestions()
};

export const toolsList = [
  {
    name: "calendar/checkConflicts",
    description: "Checks a list of calendar events for overlapping blocks.",
    inputSchema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          description: "Array of events: {title, start, end}"
        }
      },
      required: ["events"]
    }
  },
  {
    name: "calendar/optimizeSchedule",
    description: "Places new tasks/sessions into free calendar slots based on priorities.",
    inputSchema: {
      type: "object",
      properties: {
        existingEvents: { type: "array" },
        newItems: { type: "array" },
        preferences: { type: "object" }
      },
      required: ["existingEvents", "newItems"]
    }
  },
  {
    name: "calendar/getAvailability",
    description: "Finds free time slots in a day's schedule.",
    inputSchema: {
      type: "object",
      properties: {
        events: { type: "array" },
        startHour: { type: "number" },
        endHour: { type: "number" }
      },
      required: ["events"]
    }
  },
  {
    name: "tasks/prioritize",
    description: "Scores and categorizes tasks using the Eisenhower Matrix quadrant logic.",
    inputSchema: {
      type: "object",
      properties: {
        tasks: { type: "array", description: "Array of task objects: {id, title, deadline, priority}" }
      },
      required: ["tasks"]
    }
  },
  {
    name: "tasks/summarize",
    description: "Returns analytics (total, completed, pending, completion rate) for a task list.",
    inputSchema: {
      type: "object",
      properties: {
        tasks: { type: "array" }
      },
      required: ["tasks"]
    }
  },
  {
    name: "reminders/generate",
    description: "Generates warning trigger dates and times for high-priority items.",
    inputSchema: {
      type: "object",
      properties: {
        items: { type: "array", description: "List of tasks/exams: {id, title, deadline, priority}" }
      },
      required: ["items"]
    }
  },
  {
    name: "time/analyzeAvailability",
    description: "Checks if planned study hours exceed total daily limits.",
    inputSchema: {
      type: "object",
      properties: {
        availableHours: { type: "number" },
        activities: { type: "array", description: "List of activities: {title, duration}" }
      },
      required: ["availableHours", "activities"]
    }
  },
  {
    name: "time/divideSession",
    description: "Segments a study window into Pomodoro-style work and break intervals.",
    inputSchema: {
      type: "object",
      properties: {
        totalHours: { type: "number" },
        sessionBlockMinutes: { type: "number" },
        breakMinutes: { type: "number" }
      },
      required: ["totalHours"]
    }
  },
  {
    name: "productivity/getStrategy",
    description: "Recommends study techniques (e.g. Feynman, Mind Mapping) based on subject difficulty.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        difficulty: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["subject", "difficulty"]
    }
  },
  {
    name: "productivity/assessBurnout",
    description: "Estimates burnout risk metrics based on combined work and study hours.",
    inputSchema: {
      type: "object",
      properties: {
        dailyStudyHours: { type: "number" },
        dailyWorkHours: { type: "number" }
      },
      required: ["dailyStudyHours", "dailyWorkHours"]
    }
  },
  {
    name: "productivity/getSuggestions",
    description: "Fetches simple, actionable focus hacks.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// Define MCP list tools capability
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolsList };
});

export function listLocalTools() {
  return toolsList;
}


// Handle tool executions
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (toolHandlers[name]) {
    try {
      const result = toolHandlers[name](args || {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Tool execution failed: ${err.message}`
          }
        ]
      };
    }
  }

  throw new Error(`MCP Tool "${name}" not found`);
});

/**
 * Local direct execution helper.
 * Allows Express server and agents to invoke MCP tools programmatically.
 */
export async function executeLocalTool(name, args = {}) {
  if (toolHandlers[name]) {
    return toolHandlers[name](args);
  }
  throw new Error(`Local MCP Tool "${name}" is not registered`);
}

// Connect server via Stdio transport if run directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith("mcp/server.js") || 
  process.argv[1].endsWith("mcp\\server.js")
);

if (isDirectRun) {
  console.error("Starting LifePilot MCP Server over Stdio...");
  const transport = new StdioServerTransport();
  server.connect(transport).catch((err) => {
    console.error("Failed to start MCP server:", err);
  });
}
export { server };
