/**
 * Productivity Tool - MCP Tool Implementation
 * Formulates tailored revision strategies, calculates burnout risk scores, and offers productivity tips.
 */

/**
 * Returns study techniques suited to the subject difficulty.
 * @param {string} subject - Name of the subject.
 * @param {string} difficulty - Difficulty levels ('high', 'medium', 'low').
 * @returns {Object} Strategy description and detailed steps.
 */
export function getProductivityStrategy(subject = 'General', difficulty = 'medium') {
  const diff = difficulty.toLowerCase();
  
  const strategies = {
    high: {
      technique: 'Feynman Technique & Active Recall',
      explanation: 'High-difficulty subjects require deep conceptual understanding rather than rote memorization.',
      steps: [
        'Study the topic and write down a summary as if explaining it to a 10-year-old child.',
        'Identify gaps in your explanation, go back to the source material, and fill those gaps.',
        'Convert key concepts into flashcards and test yourself using active recall.',
        'Perform a 20-minute practice test without looking at notes.'
      ]
    },
    medium: {
      technique: 'Pomodoro + Spaced Repetition',
      explanation: 'Medium-difficulty subjects require steady absorption and reinforcement over time.',
      steps: [
        'Study for 25 minutes using focused attention, then take a 5-minute break.',
        'Summarize key ideas into 3 main takeaways at the end of each session.',
        'Review the same topic at increasing intervals: 1 day, 3 days, then 7 days later.',
        'Practice solving active problems or writing short answers.'
      ]
    },
    low: {
      technique: 'Mind Mapping & Rapid Review',
      explanation: 'Lower difficulty concepts are best integrated by understanding their global structure.',
      steps: [
        'Create a visual mind map connecting all major subtopics.',
        'Skim through notes rapidly for 15 minutes, highlighting key terms.',
        'Talk aloud to yourself for 5 minutes explaining the core flow of the subject.',
        'Do a quick quiz or summarize the topic in a single paragraph.'
      ]
    }
  };

  return {
    subject,
    difficulty: diff,
    ...(strategies[diff] || strategies.medium)
  };
}

/**
 * Assesses potential burnout risk based on total hours scheduled.
 * @param {number} dailyStudyHours - Daily study hours planned.
 * @param {number} dailyWorkHours - Daily work/chore hours planned.
 * @returns {Object} Burnout assessment metrics.
 */
export function assessBurnoutRisk(dailyStudyHours = 0, dailyWorkHours = 0) {
  const totalDailyHours = parseFloat(dailyStudyHours) + parseFloat(dailyWorkHours);
  
  let riskLevel = 'Low';
  let advice = 'Excellent work-life balance! You have plenty of time for rest and recovery.';
  let score = 0; // 0 to 100

  if (totalDailyHours > 12) {
    riskLevel = 'Critical';
    advice = 'WARNING: You are working/studying over 12 hours a day. This schedule is unsustainable and will lead to severe burnout. Reduce tasks or extend deadlines immediately!';
    score = 90;
  } else if (totalDailyHours > 9) {
    riskLevel = 'High';
    advice = 'Caution: 9-12 hours of total daily engagement is very high. Ensure you get 7-8 hours of sleep and schedule frequent breaks.';
    score = 70;
  } else if (totalDailyHours > 6) {
    riskLevel = 'Moderate';
    advice = 'Moderate strain: A 6-9 hour daily schedule is manageable, but requires discipline. Insert a 15-minute walk or exercise block halfway through.';
    score = 40;
  } else {
    score = 15;
  }

  return {
    totalActiveHours: totalDailyHours,
    riskLevel,
    burnoutScore: score,
    advice
  };
}

/**
 * Returns a list of quick, science-backed focus suggestions.
 * @returns {Array} Quick suggestions strings.
 */
export function getQuickSuggestions() {
  return [
    'Drink a full glass of water before starting your next study block.',
    'Move your phone to another room or turn on "Do Not Disturb" mode.',
    'Use the 5-minute rule: commit to studying for just 5 minutes. Usually, you will keep going.',
    'Align your study desk with natural sunlight to improve alertness.',
    'Listen to binaural beats or instrumental video game soundtracks to maintain state-of-flow.'
  ];
}
