/**
 * Study Agent - Google ADK Agent
 * Responsible for generating study timetables, revision plans, and exam prep strategies.
 */

import { generateContent } from "./aiHelper.js";
import { executeLocalTool } from "../mcp/server.js";

const SYSTEM_INSTRUCTIONS = `
You are the Study Agent, a specialized agent in the LifePilot AI system.
Your job is to read subjects, exam dates, difficulties, and available study hours, and generate an optimal study timetable and exam preparation strategy.

CRITICAL:
1. Allocate available study hours to each subject based on its difficulty (more hours for high difficulty).
2. Recommend specific revision techniques for each subject depending on its difficulty.
3. Outline a step-by-step revision plan leading up to the exam date.
4. Output your response STRICTLY as a valid JSON object. Do not output markdown code blocks outside of standard JSON.

Response JSON Schema:
{
  "studyTimetable": [
    {
      "subject": "Subject Name",
      "difficulty": "high" | "medium" | "low",
      "hoursAllocated": 4.5,
      "recommendedTopics": ["Topic 1", "Topic 2"]
    }
  ],
  "revisionPlan": [
    "Step 1...",
    "Step 2..."
  ],
  "examStrategy": "Overall exam preparation advice..."
}
`;

/**
 * Runs the Study Agent to generate a study timetable.
 * @param {Object} input - { subjects, difficulties, examDates, hoursAvailable }
 * @returns {Promise<Object>} Timetable, revision steps, and exam strategy.
 */
export async function runStudyAgent(input = {}) {
  const prompt = `
Subjects: ${JSON.stringify(input.subjects || [])}
Difficulties: ${JSON.stringify(input.difficulties || {})}
Exam Dates: ${JSON.stringify(input.examDates || {})}
Available Study Hours: ${input.hoursAvailable || 4}
  `;

  const mockGenerator = (sanitizedPrompt) => {
    const subjects = input.subjects || ["Calculus", "Chemistry"];
    const difficulties = input.difficulties || {};
    const hours = parseFloat(input.hoursAvailable) || 6.0;

    // Distribute hours: high difficulty gets 50%, medium gets 30%, low gets 20%
    const timetable = subjects.map(sub => {
      const diff = (difficulties[sub] || "medium").toLowerCase();
      let weight = 0.3;
      if (diff === "high") weight = 0.5;
      if (diff === "low") weight = 0.2;

      // Adjust weight if only 1 subject
      const finalWeight = subjects.length === 1 ? 1.0 : weight / subjects.reduce((sum, s) => {
        const d = (difficulties[s] || "medium").toLowerCase();
        return sum + (d === "high" ? 0.5 : d === "low" ? 0.2 : 0.3);
      }, 0);

      const hoursAllocated = parseFloat((hours * finalWeight).toFixed(1));

      let topics = ["Foundational chapters", "Review of key vocabulary"];
      if (sub.toLowerCase().includes("math") || sub.toLowerCase().includes("calculus")) {
        topics = ["Derivatives & Limits", "Integrals & Applications", "Practice exam solving"];
      } else if (sub.toLowerCase().includes("chem") || sub.toLowerCase().includes("science")) {
        topics = ["Periodic table & bonding", "Chemical reaction equilibrium", "Lab formulas & errors"];
      } else if (sub.toLowerCase().includes("code") || sub.toLowerCase().includes("program")) {
        topics = ["Algorithmic complexity", "Data structures (trees, graphs)", "Code syntax & compilation"];
      }

      return {
        subject: sub,
        difficulty: diff,
        hoursAllocated,
        recommendedTopics: topics
      };
    });

    const revisionPlan = [
      "Phase 1 (Concepts): Review textbooks and make condensed active recall notes.",
      "Phase 2 (Practice): Solve standard exercises and identify points of confusion.",
      "Phase 3 (Mock Exams): Run mock timed tests and correct mistakes.",
      "Phase 4 (Buffer): Do light reviewing and sleep early before the exam."
    ];

    const examStrategy = "Review your weakest topics first. Focus heavily on active recall and practice papers instead of passive reading. Maintain a consistent sleep schedule to improve consolidation.";

    return JSON.stringify({
      studyTimetable: timetable,
      revisionPlan,
      examStrategy
    });
  };

  const aiResponse = await generateContent({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    prompt: prompt,
    mockCallback: mockGenerator
  });

  try {
    const studyPlan = JSON.parse(aiResponse);

    // Call MCP productivity tool to augment each subject with optimal techniques
    if (studyPlan.studyTimetable && Array.isArray(studyPlan.studyTimetable)) {
      for (const item of studyPlan.studyTimetable) {
        const prodDetails = await executeLocalTool("productivity/getStrategy", {
          subject: item.subject,
          difficulty: item.difficulty || "medium"
        });
        
        // Enrich timetable item
        item.technique = prodDetails.technique;
        item.techniqueExplanation = prodDetails.explanation;
        item.revisionSteps = prodDetails.steps;
      }
    }

    return studyPlan;
  } catch (err) {
    console.error("Study Agent JSON Parse / MCP Tool call failed:", err);
    return {
      studyTimetable: [],
      revisionPlan: ["Review standard material"],
      examStrategy: "Study consistently."
    };
  }
}
