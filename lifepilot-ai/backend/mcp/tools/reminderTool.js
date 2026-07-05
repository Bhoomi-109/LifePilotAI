/**
 * Reminder Tool - MCP Tool Implementation
 * Computes warning triggers and schedules notifications for deadlines and exams.
 */

/**
 * Generates structured reminders for a list of items (tasks/exams).
 * @param {Array} items - Items with deadlines/exam dates.
 * @returns {Array} Structured reminders list with triggers.
 */
export function generateReminders(items = []) {
  const reminders = [];
  const now = new Date();

  for (const item of items) {
    const targetDateStr = item.deadline || item.date || item.examDate;
    if (!targetDateStr) continue;

    const targetDate = new Date(targetDateStr);
    const diffTime = targetDate - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If the event has already passed, skip or set as archive
    if (daysRemaining < 0) continue;

    const priority = (item.priority || 'medium').toLowerCase();
    
    // High priority gets multiple reminders, low priority gets fewer
    const triggers = [];

    if (daysRemaining > 7) {
      triggers.push({
        type: 'weekly_digest',
        timeBefore: '7 days before',
        triggerDate: new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: `Upcoming: "${item.title}" is in 1 week. Prepare early!`
      });
    }

    if (daysRemaining > 3) {
      triggers.push({
        type: 'midterm_warning',
        timeBefore: '3 days before',
        triggerDate: new Date(targetDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: `Reminder: "${item.title}" is in 3 days. Check your progress.`
      });
    }

    if (daysRemaining >= 1) {
      triggers.push({
        type: 'final_warning',
        timeBefore: '1 day before',
        triggerDate: new Date(targetDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: `CRITICAL: "${item.title}" is tomorrow! Final review.`
      });
    }

    if (daysRemaining === 0 || daysRemaining < 1) {
      triggers.push({
        type: 'same_day_alert',
        timeBefore: 'Same day',
        triggerDate: targetDate.toISOString().split('T')[0],
        message: `TODAY: "${item.title}" is scheduled or due today!`
      });
    }

    // Filter triggers to provide relevant alerts based on priority
    let relevantTriggers = triggers;
    if (priority === 'low') {
      // Only get same-day and 1-day reminders
      relevantTriggers = triggers.filter(t => t.type === 'same_day_alert' || t.type === 'final_warning');
    }

    reminders.push({
      itemId: item.id || Math.random().toString(36).substr(2, 9),
      itemTitle: item.title,
      dueDate: targetDateStr,
      priority,
      triggers: relevantTriggers
    });
  }

  return reminders;
}
