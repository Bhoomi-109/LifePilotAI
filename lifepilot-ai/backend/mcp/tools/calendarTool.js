/**
 * Calendar Tool - MCP Tool Implementation
 * Manages calendar events, scheduling, and conflict detection.
 */

/**
 * Checks for overlapping events in a schedule.
 * @param {Array} events - List of existing calendar events.
 * @returns {Array} List of conflicting events.
 */
export function checkConflicts(events = []) {
  const conflicts = [];
  // Sort events by start time
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Check if next event starts before current event ends
    if (next.start < current.end) {
      conflicts.push({
        event1: current,
        event2: next,
        reason: `Overlapping times: ${current.title} (${current.start}-${current.end}) and ${next.title} (${next.start}-${next.end})`
      });
    }
  }

  return conflicts;
}

/**
 * Automatically schedules new events into available free slots.
 * @param {Array} existingEvents - List of current events.
 * @param {Array} newItems - Items that need scheduling (e.g. tasks, study sessions).
 * @param {Object} preferences - User preferences (startHour, endHour).
 * @returns {Object} Optimized schedule and unscheduled items.
 */
export function optimizeSchedule(existingEvents = [], newItems = [], preferences = {}) {
  const startHour = preferences.startHour || 8; // default 08:00
  const endHour = preferences.endHour || 22; // default 22:00
  
  const schedule = [...existingEvents];
  const unscheduled = [];

  // Parse time to decimal for easier calculations
  const timeToDecimal = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
  };

  const decimalToTime = (d) => {
    const h = Math.floor(d);
    const m = Math.round((d - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Sort new items by priority (high first) and duration
  const sortedItems = [...newItems].sort((a, b) => {
    const prioMap = { 'high': 3, 'medium': 2, 'low': 1 };
    const pA = prioMap[a.priority?.toLowerCase()] || 2;
    const pB = prioMap[b.priority?.toLowerCase()] || 2;
    if (pA !== pB) return pB - pA;
    return (b.duration || 1) - (a.duration || 1); // longer first if equal priority
  });

  for (const item of sortedItems) {
    const duration = parseFloat(item.duration) || 1.0;
    let scheduled = false;

    // Scan day from startHour to endHour in 30-min steps
    for (let hour = startHour; hour <= endHour - duration; hour += 0.5) {
      const slotStart = decimalToTime(hour);
      const slotEnd = decimalToTime(hour + duration);

      // Check if slot overlaps with any event in schedule
      const hasConflict = schedule.some(evt => {
        return (slotStart < evt.end && slotEnd > evt.start);
      });

      if (!hasConflict) {
        schedule.push({
          id: item.id || Math.random().toString(36).substr(2, 9),
          title: item.title,
          start: slotStart,
          end: slotEnd,
          type: item.type || 'task',
          priority: item.priority || 'medium',
          status: 'scheduled'
        });
        scheduled = true;
        break;
      }
    }

    if (!scheduled) {
      unscheduled.push(item);
    }
  }

  // Sort final schedule by start time
  schedule.sort((a, b) => a.start.localeCompare(b.start));

  return { schedule, unscheduled };
}

/**
 * Returns available slots for a given day.
 * @param {Array} events - List of existing calendar events.
 * @param {number} startHour - Active start hour.
 * @param {number} endHour - Active end hour.
 * @returns {Array} List of free time slots (start, end).
 */
export function getAvailability(events = [], startHour = 8, endHour = 22) {
  const sorted = [...events]
    .filter(e => e.start && e.end)
    .sort((a, b) => a.start.localeCompare(b.start));
  
  const freeSlots = [];
  let currentStart = startHour;

  const timeToDecimal = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
  };

  const decimalToTime = (d) => {
    const h = Math.floor(d);
    const m = Math.round((d - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  for (const evt of sorted) {
    const evtStart = timeToDecimal(evt.start);
    const evtEnd = timeToDecimal(evt.end);

    if (evtStart > currentStart) {
      // We found a gap
      freeSlots.push({
        start: decimalToTime(currentStart),
        end: decimalToTime(evtStart),
        durationHours: evtStart - currentStart
      });
    }
    
    if (evtEnd > currentStart) {
      currentStart = evtEnd;
    }
  }

  if (currentStart < endHour) {
    freeSlots.push({
      start: decimalToTime(currentStart),
      end: decimalToTime(endHour),
      durationHours: endHour - currentStart
    });
  }

  return freeSlots;
}
