/**
 * Time Tool - MCP Tool Implementation
 * Computes study hour breakdowns, converts time formats, and monitors availability limits.
 */

/**
 * Validates availability limits and splits hours into chunks.
 * @param {number} availableHours - Total study hours available.
 * @param {Array} activities - Planned activities and their durations.
 * @returns {Object} Validation metrics, remaining hours, and warnings.
 */
export function analyzeTimeAvailability(availableHours = 0, activities = []) {
  const parsedAvailable = parseFloat(availableHours) || 0.0;
  const totalPlanned = activities.reduce((sum, act) => sum + (parseFloat(act.duration) || 0.0), 0.0);
  const remaining = parsedAvailable - totalPlanned;
  
  const status = remaining >= 0 ? 'sufficient' : 'overbooked';
  
  let warning = null;
  if (status === 'overbooked') {
    warning = `Overbooked by ${Math.abs(remaining).toFixed(1)} hours! Consider adjusting priorities or extending study hours.`;
  } else if (remaining < 1 && remaining > 0) {
    warning = `Tight schedule: only ${Math.round(remaining * 60)} minutes of buffer left.`;
  }

  return {
    availableHours: parsedAvailable,
    totalPlannedHours: totalPlanned,
    remainingHours: Math.max(0, remaining),
    overageHours: remaining < 0 ? Math.abs(remaining) : 0,
    status,
    warning
  };
}

/**
 * Splits a study session into active intervals and break intervals (Pomodoro-style).
 * @param {number} totalHours - Total session duration in hours.
 * @param {number} sessionBlockMinutes - Study session block length (e.g. 50 mins study).
 * @param {number} breakMinutes - Break length (e.g. 10 mins break).
 * @returns {Array} Structured study blocks.
 */
export function divideSession(totalHours = 1, sessionBlockMinutes = 50, breakMinutes = 10) {
  const totalMinutes = Math.round(parseFloat(totalHours) * 60);
  const blockCycle = sessionBlockMinutes + breakMinutes;
  const cycles = Math.floor(totalMinutes / blockCycle);
  const remainder = totalMinutes % blockCycle;

  const blocks = [];
  let currentOffset = 0;

  const formatOffset = (offsetMinutes) => {
    const h = Math.floor(offsetMinutes / 60);
    const m = offsetMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  for (let i = 0; i < cycles; i++) {
    blocks.push({
      type: 'study',
      label: `Study Block ${i + 1}`,
      durationMinutes: sessionBlockMinutes,
      offset: currentOffset,
      displayTime: formatOffset(currentOffset)
    });
    currentOffset += sessionBlockMinutes;

    blocks.push({
      type: 'break',
      label: `Short Break`,
      durationMinutes: breakMinutes,
      offset: currentOffset,
      displayTime: formatOffset(currentOffset)
    });
    currentOffset += breakMinutes;
  }

  if (remainder > 0) {
    if (remainder > breakMinutes) {
      blocks.push({
        type: 'study',
        label: `Final Study Block`,
        durationMinutes: remainder - breakMinutes,
        offset: currentOffset,
        displayTime: formatOffset(currentOffset)
      });
      currentOffset += (remainder - breakMinutes);

      blocks.push({
        type: 'break',
        label: `Final Break`,
        durationMinutes: breakMinutes,
        offset: currentOffset,
        displayTime: formatOffset(currentOffset)
      });
    } else {
      blocks.push({
        type: 'study',
        label: `Final Study Wrap-up`,
        durationMinutes: remainder,
        offset: currentOffset,
        displayTime: formatOffset(currentOffset)
      });
    }
  }

  return blocks;
}

/**
 * Formats decimal hours into a readable string (e.g., 2.5 -> "2h 30m").
 * @param {number} hours - Hours in decimal.
 * @returns {string} Formatted string.
 */
export function formatHours(hours) {
  const hrs = Math.floor(hours);
  const mins = Math.round((hours - hrs) * 60);
  
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
