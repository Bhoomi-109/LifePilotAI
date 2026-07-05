/**
 * Integration Test and Verification Script
 * Validates that the coordinator agent, sub-agents, and MCP tool local bridges load
 * and execute correctly under simulated user inputs.
 */

import { runCoordinatorAgent } from "./agents/coordinatorAgent.js";
import dotenv from "dotenv";

// Load environment configurations
dotenv.config();

async function runVerification() {
  console.log("==================================================");
  console.log("🧪 Starting LifePilot AI Integration Verification...");
  console.log("==================================================");

  const mockUserInput = {
    tasks: [
      { title: "Complete chemistry prep test", priority: "high", deadline: "2026-07-06" },
      { title: "Walk dog & buy groceries", priority: "low", deadline: "2026-07-06" }
    ],
    goals: ["Axe the Chemistry Midterm Exam", "Build personal consistency"],
    subjects: ["Chemistry"],
    subjectsDifficulty: {
      "Chemistry": "high"
    },
    examDates: {
      "Chemistry": "2026-07-10"
    },
    availableStudyHours: 4,
    energyPreference: "morning",
    workHours: "09:00 - 17:00",
    startHour: 8,
    endHour: 21
  };

  try {
    const startTime = Date.now();
    const result = await runCoordinatorAgent(mockUserInput);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log("\n✅ Orchestration Successful!");
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log("\n💬 Coordinator Summary:");
      console.log(`   "${result.coordinatorSummary}"`);
      
      console.log("\n📋 Tasks Extracted (Eisenhower Quadrants):");
      result.tasks.forEach(t => {
        console.log(`   - [${t.priority.toUpperCase()}] ${t.title} -> Q: ${t.quadrant}`);
      });

      console.log("\n🎓 Study Plan Allocated:");
      result.study.studyTimetable.forEach(item => {
        console.log(`   - ${item.subject} (${item.difficulty}): ${item.hoursAllocated}h via ${item.technique}`);
      });

      console.log("\n📅 Daily Calendar Blocks scheduled:");
      result.schedule.forEach(block => {
        console.log(`   - [${block.start} - ${block.end}] [${block.type.toUpperCase()}] ${block.title}`);
      });

      console.log("\n⚡ Burnout Fatigue Assessment:");
      console.log(`   - Risk Level: ${result.burnout.level} (Score: ${result.burnout.score})`);
      console.log(`   - Alert Msg:  "${result.burnout.alert}"`);

      console.log("\n💡 AI focus suggestions:");
      result.suggestions.forEach((tip, i) => {
        console.log(`   ${i + 1}. ${tip}`);
      });

      console.log("\n==================================================");
      console.log("🎉 Verification Complete: All agents and tools operational!");
      console.log("==================================================");
      process.exit(0);
    } else {
      console.error("\n❌ Orchestration failed:", result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error in integration test runner:", error);
    process.exit(1);
  }
}

runVerification();
