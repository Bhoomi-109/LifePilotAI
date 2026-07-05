/**
 * Task Tool - MCP Tool Implementation
 * Provides utilities to filter, sort, prioritize, and structure task lists.
 */

/**
 * Sorts and ranks tasks based on deadline proximity and priority.
 * Uses an Eisenhower Matrix-style score calculation.
 * @param {Array} tasks - List of task objects.
 * @returns {Array} Categorized and prioritized tasks.
 */
export function prioritizeTasks(tasks = []) {
  const now = new Date();

  return tasks.map(task => {
    let priorityWeight = 2; // Medium
    if (task.priority?.toLowerCase() === 'high') priorityWeight = 3;
    if (task.priority?.toLowerCase() === 'low') priorityWeight = 1;

    let urgencyWeight = 2; // Default moderate urgency
    let daysRemaining = 999;

    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const diffTime = deadlineDate - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 1) {
        urgencyWeight = 4; // Crucial
      } else if (daysRemaining <= 3) {
        urgencyWeight = 3; // High urgency
      } else if (daysRemaining <= 7) {
        urgencyWeight = 2; // Normal
      } else {
        urgencyWeight = 1; // Low urgency
      }
    }

    // Score from 1 to 12
    const score = priorityWeight * urgencyWeight;

    // Categorize using Eisenhower Matrix quadrants
    let quadrant = '';
    let advice = '';
    if (priorityWeight >= 2 && urgencyWeight >= 3) {
      quadrant = 'Do First';
      advice = 'Urgent and important. Complete these tasks immediately.';
    } else if (priorityWeight >= 2 && urgencyWeight < 3) {
      quadrant = 'Schedule';
      advice = 'Important but not urgent. Plan dedicated calendar blocks.';
    } else if (priorityWeight < 2 && urgencyWeight >= 3) {
      quadrant = 'Delegate/Batch';
      advice = 'Urgent but less important. Do quickly or batch them together.';
    } else {
      quadrant = 'Eliminate/Postpone';
      advice = 'Low priority and low urgency. Save for later or drop.';
    }

    return {
      ...task,
      daysRemaining,
      score,
      quadrant,
      advice
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Filters a list of tasks.
 * @param {Array} tasks - List of tasks.
 * @param {Object} filters - Filter fields (priority, status, quadrant).
 * @returns {Array} Filtered task list.
 */
export function filterTasks(tasks = [], filters = {}) {
  let result = [...tasks];

  if (filters.priority) {
    result = result.filter(t => t.priority?.toLowerCase() === filters.priority.toLowerCase());
  }

  if (filters.status) {
    result = result.filter(t => t.status?.toLowerCase() === filters.status.toLowerCase());
  }

  if (filters.quadrant) {
    result = result.filter(t => t.quadrant?.toLowerCase() === filters.quadrant.toLowerCase());
  }

  return result;
}

/**
 * Summarizes a task list.
 * @param {Array} tasks - List of tasks.
 * @returns {Object} Analytical summary of the task list.
 */
export function summarizeTasks(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed' || t.completed).length;
  const highPriority = tasks.filter(t => t.priority?.toLowerCase() === 'high').length;
  const pending = total - completed;
  
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    highPriority,
    completionRate
  };
}
