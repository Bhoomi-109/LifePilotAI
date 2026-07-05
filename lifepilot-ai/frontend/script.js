/**
 * LifePilot AI - Frontend controller
 * Manages view routing, local state, forms, API calls, and visual rendering.
 */

// Global State
const state = {
  activeView: "landing-view",
  activePanel: "panel-dashboard",
  tasks: [
    { id: "t1", title: "Review calculus limits chapter", priority: "high", status: "pending", deadline: "2026-07-06" },
    { id: "t2", title: "Buy project board materials", priority: "low", status: "completed", deadline: "2026-07-07" },
    { id: "t3", title: "Complete draft chemistry report", priority: "medium", status: "pending", deadline: "2026-07-08" }
  ],
  goals: [
    { id: "g1", title: "Pass Calculus Final Exam", progress: 60, deadline: "2026-07-15", category: "Study" },
    { id: "g2", title: "Improve cardio endurance", progress: 40, deadline: "2026-08-01", category: "Health" }
  ],
  settings: {
    energyPeak: "morning",
    studyPreference: "pomodoro",
    notifications: true,
    sound: false
  },
  aiResults: null
};

// Initial Setup on Document Load
document.addEventListener("DOMContentLoaded", () => {
  initRouting();
  initChecklist();
  initGoals();
  initSettings();
  initPlannerForm();
  initStudyForm();
  updateTopbarDate();
  syncDashboardStats();
  queryMcpStatus();

  // Dark Mode Toggle Listener
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("change", (e) => {
    const theme = e.target.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lifePilotTheme", theme);
  });

  // Restore Theme from localStorage
  const savedTheme = localStorage.getItem("lifePilotTheme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeToggle.checked = (savedTheme === "dark");
  }

  // Dashboard quick triggers
  document.getElementById("btn-dashboard-generate").addEventListener("click", () => {
    navigateToPanel("panel-planner");
  });
});

/**
 * Updates the current date in the header top bar.
 */
function updateTopbarDate() {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const todayStr = new Date().toLocaleDateString("en-US", options);
  document.getElementById("topbar-date").textContent = todayStr;
}

/**
 * Handles view switching (Landing Page vs Main App Dashboard).
 */
function initRouting() {
  const landingView = document.getElementById("landing-view");
  const appView = document.getElementById("app-view");

  const enterApp = () => {
    landingView.style.display = "none";
    appView.style.display = "flex";
    state.activeView = "app-view";
    syncDashboardStats();
    queryMcpStatus();
  };

  const exitApp = () => {
    appView.style.display = "none";
    landingView.style.display = "block";
    state.activeView = "landing-view";
  };

  document.getElementById("btn-enter-app").addEventListener("click", enterApp);
  document.getElementById("btn-quick-launch").addEventListener("click", enterApp);
  document.getElementById("btn-logout").addEventListener("click", exitApp);

  // Sidebar link routing
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPanel = item.getAttribute("data-target");
      navigateToPanel(targetPanel);
    });
  });
}

/**
 * Navigates to a specific panel within the application workspace.
 */
function navigateToPanel(panelId) {
  // Update sidebar active highlights
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach(item => {
    if (item.getAttribute("data-target") === panelId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Switch panels
  const panels = document.querySelectorAll(".app-panel");
  panels.forEach(panel => {
    if (panel.id === panelId) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  state.activePanel = panelId;
  
  // Refresh state visuals depending on target panel
  if (panelId === "panel-dashboard") {
    syncDashboardStats();
  }
}

// Expose routing globally for onclick anchors
window.navigateToPanel = navigateToPanel;

/**
 * Queries the backend for MCP Tools availability and updates status banner.
 */
async function queryMcpStatus() {
  const indicator = document.getElementById("mcp-indicator");
  const label = indicator.querySelector(".status-label");
  const aboutMcpContainer = document.getElementById("mcp-tools-list");

  try {
    const res = await fetch("/api/mcp-status");
    const data = await res.json();

    if (data.success) {
      indicator.className = "status-indicator online";
      label.textContent = `MCP: Connected (${data.toolCount} tools)`;

      // Populate About page lists
      if (aboutMcpContainer) {
        aboutMcpContainer.innerHTML = data.tools.map(tool => `
          <div class="mcp-tool-card">
            <div class="mcp-tool-name">${tool.name}</div>
            <div class="mcp-tool-desc">${tool.description}</div>
          </div>
        `).join("");
      }
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    console.warn("MCP tools query failed:", err.message);
    indicator.className = "status-indicator offline";
    label.textContent = "MCP: Offline Mode";
    if (aboutMcpContainer) {
      aboutMcpContainer.innerHTML = `<div class="empty-state">Unable to contact the MCP Server. Check backend console.</div>`;
    }
  }
}

/**
 * Calculates completions rate and draws progress rings.
 */
function syncDashboardStats() {
  // 1. Task Progress
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === "completed").length;
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  document.getElementById("task-percentage-val").textContent = `${taskRate}%`;
  document.getElementById("task-completed-label").textContent = `${completedTasks} of ${totalTasks} completed`;
  setProgressRing("task-progress-ring", taskRate);

  // 2. Goal Progress
  const totalGoals = state.goals.length;
  const goalRate = totalGoals > 0 ? Math.round(state.goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals) : 0;
  
  document.getElementById("goal-percentage-val").textContent = `${goalRate}%`;
  document.getElementById("goal-completed-label").textContent = `${totalGoals} active targets`;
  setProgressRing("goal-progress-ring", goalRate);

  // 3. Burnout Assessment Sync (if AI plan has executed)
  if (state.aiResults && state.aiResults.burnout) {
    const burnout = state.aiResults.burnout;
    document.getElementById("dashboard-burnout-level").textContent = burnout.level;
    document.getElementById("dashboard-burnout-subtitle").textContent = burnout.alert;
    
    const bar = document.getElementById("dashboard-burnout-bar");
    bar.style.width = `${burnout.score}%`;
    if (burnout.score > 70) {
      bar.style.backgroundColor = "#ef4444"; // red
    } else if (burnout.score > 40) {
      bar.style.backgroundColor = "#f59e0b"; // yellow
    } else {
      bar.style.backgroundColor = "#10b981"; // green
    }
  }

  // 4. Populate Suggestions and Deadlines from Agent outcomes
  populateSuggestionsFeed();
  populateDeadlinesFeed();
  populateTimelinePreview();
}

/**
 * Sets the SVG dashoffset of a circular progress ring.
 */
function setProgressRing(elementId, percent) {
  const ring = document.getElementById(elementId);
  if (!ring) return;
  const radius = ring.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;

  ring.style.strokeDasharray = `${circumference} ${circumference}`;
  const offset = circumference - (percent / 100) * circumference;
  ring.style.strokeDashoffset = offset;
}

/**
 * Populates suggestions feed on the dashboard panel.
 */
function populateSuggestionsFeed() {
  const feed = document.getElementById("dashboard-suggestions-feed");
  if (!feed) return;

  if (state.aiResults && state.aiResults.suggestions && state.aiResults.suggestions.length > 0) {
    feed.innerHTML = state.aiResults.suggestions.map(s => `<li>${s}</li>`).join("");
  } else {
    feed.innerHTML = `
      <li>Configure your subjects and tasks to generate specific focus tactics.</li>
      <li>Drink a full glass of water before starting your next study block.</li>
      <li>Use the 5-minute rule: commit to studying for just 5 minutes. Usually, you will keep going.</li>
    `;
  }
}

/**
 * Populates upcoming deadlines grid.
 */
function populateDeadlinesFeed() {
  const feed = document.getElementById("dashboard-deadlines-feed");
  if (!feed) return;

  const items = [];
  state.tasks.forEach(t => {
    if (t.deadline && t.status !== "completed") {
      items.push({ title: t.title, date: t.deadline, type: "task" });
    }
  });

  state.goals.forEach(g => {
    if (g.deadline) {
      items.push({ title: g.title, date: g.deadline, type: "goal" });
    }
  });

  // Sort deadlines: nearest first
  items.sort((a, b) => a.date.localeCompare(b.date));

  if (items.length > 0) {
    feed.innerHTML = items.slice(0, 3).map(item => `
      <div class="deadline-item">
        <div class="deadline-item-info">
          <h4>${item.title}</h4>
          <span>Due: ${item.date}</span>
        </div>
        <span class="deadline-badge ${item.type}">${item.type.toUpperCase()}</span>
      </div>
    `).join("");
  } else {
    feed.innerHTML = `<div class="empty-state">No upcoming tasks or deadlines logged.</div>`;
  }
}

/**
 * Populates the daily calendar timeline preview on the dashboard.
 */
function populateTimelinePreview() {
  const preview = document.getElementById("dashboard-timeline-preview");
  if (!preview) return;

  if (state.aiResults && state.aiResults.schedule && state.aiResults.schedule.length > 0) {
    preview.innerHTML = state.aiResults.schedule.slice(0, 4).map(item => `
      <div class="timeline-preview-row" style="border-left-color: ${getTimelineColor(item.type)}">
        <div class="timeline-preview-time">${item.start} - ${item.end}</div>
        <div class="timeline-preview-title">${item.title}</div>
      </div>
    `).join("");
  } else {
    preview.innerHTML = `<div class="empty-state">No schedule items planned today. Visit the planner tab.</div>`;
  }
}

function getTimelineColor(type) {
  const map = { study: "#2563eb", work: "#10b981", chore: "#f59e0b", leisure: "#94a3b8" };
  return map[type] || "#2563eb";
}

// ==========================================================================
// 3. PLANNER VIEW CONTROLS
// ==========================================================================
function initPlannerForm() {
  const form = document.getElementById("planner-form");
  const hoursSlider = document.getElementById("planner-hours-input");
  const hoursLabel = document.getElementById("planner-hours-val");

  // Sync hours slider tag
  hoursSlider.addEventListener("input", (e) => {
    hoursLabel.textContent = `${e.target.value} Hours`;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const tasksRaw = document.getElementById("planner-tasks-input").value.split("\n").filter(t => t.trim());
    const goalsRaw = document.getElementById("planner-goals-input").value.split("\n").filter(g => g.trim());
    const deadlineVal = document.getElementById("planner-deadline-input").value;
    const hoursVal = parseInt(hoursSlider.value);

    // Map raw strings to objects
    const tasksObjects = tasksRaw.map((title, idx) => ({
      id: `task-p-${idx}-${Date.now()}`,
      title,
      priority: idx === 0 ? "high" : idx === 1 ? "medium" : "low",
      deadline: deadlineVal || null
    }));

    // Start UI loaders
    const btn = document.getElementById("btn-planner-submit");
    const loader = document.getElementById("planner-loader");
    const btnText = btn.querySelector(".btn-text");

    btn.disabled = true;
    loader.style.display = "inline-block";
    btnText.style.display = "none";

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasksObjects,
          goals: goalsRaw,
          availableStudyHours: hoursVal,
          deadline: deadlineVal || null,
          energyPreference: state.settings.energyPeak,
          subjects: goalsRaw.filter(g => g.toLowerCase().includes("study") || g.toLowerCase().includes("exam"))
        })
      });

      const data = await res.json();

      if (data.success) {
        state.aiResults = data;
        
        // Sync local tasks checklist with AI decomposed tasks
        if (data.tasks && data.tasks.length > 0) {
          state.tasks = data.tasks.map(t => ({
            id: t.id || Math.random().toString(36).substr(2, 9),
            title: t.title,
            priority: t.priority || "medium",
            status: "pending",
            deadline: t.deadline || null
          }));
          renderChecklist();
        }

        renderPlannerResults(data);
        syncDashboardStats();
      } else {
        alert(`Failed to orchestrate plan: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the agent backend.");
    } finally {
      btn.disabled = false;
      loader.style.display = "none";
      btnText.style.display = "inline-block";
    }
  });
}

/**
 * Renders Planner Agent results into the output display.
 */
function renderPlannerResults(data) {
  document.getElementById("planner-empty-state").style.display = "none";
  document.getElementById("planner-results").style.display = "flex";

  // Coordinator Summary
  document.getElementById("planner-coordinator-summary").textContent = data.coordinatorSummary;

  // Timeline list
  const timelineContainer = document.getElementById("planner-timeline-list");
  timelineContainer.innerHTML = data.schedule.map(item => `
    <div class="time-node-item ${item.type || "study"}">
      <div class="time-node-wrapper">
        <div class="time-node-meta">
          <span class="time-node-range">${item.start} - ${item.end}</span>
          <span class="time-node-name">${item.title}</span>
        </div>
        <span class="time-node-label ${item.type || "study"}">${item.type || "study"}</span>
      </div>
    </div>
  `).join("");

  // Eisenhower quadrants
  const qDoFirst = document.getElementById("q-do-first");
  const qSchedule = document.getElementById("q-schedule");
  const qDelegate = document.getElementById("q-delegate");
  const qEliminate = document.getElementById("q-eliminate");

  qDoFirst.innerHTML = "";
  qSchedule.innerHTML = "";
  qDelegate.innerHTML = "";
  qEliminate.innerHTML = "";

  data.tasks.forEach(task => {
    const li = `<li>${task.title}</li>`;
    if (task.quadrant === "Do First") qDoFirst.innerHTML += li;
    else if (task.quadrant === "Schedule") qSchedule.innerHTML += li;
    else if (task.quadrant === "Delegate/Batch") qDelegate.innerHTML += li;
    else qEliminate.innerHTML += li;
  });

  // Empty placeholder warnings
  if (!qDoFirst.innerHTML) qDoFirst.innerHTML = `<li class="text-muted">None</li>`;
  if (!qSchedule.innerHTML) qSchedule.innerHTML = `<li class="text-muted">None</li>`;
  if (!qDelegate.innerHTML) qDelegate.innerHTML = `<li class="text-muted">None</li>`;
  if (!qEliminate.innerHTML) qEliminate.innerHTML = `<li class="text-muted">None</li>`;
}

// ==========================================================================
// 4. STUDY COACH VIEW CONTROLS
// ==========================================================================
function initStudyForm() {
  const container = document.getElementById("subjects-container");
  const btnAdd = document.getElementById("btn-add-subject");
  const form = document.getElementById("study-form");
  const hoursSlider = document.getElementById("study-hours-input");
  const hoursLabel = document.getElementById("study-hours-val");

  // Dynamic hours labels
  hoursSlider.addEventListener("input", (e) => {
    hoursLabel.textContent = `${e.target.value} Hours`;
  });

  // Add subject row
  btnAdd.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "subject-row";
    row.innerHTML = `
      <input type="text" class="subject-name" placeholder="Subject Name" required>
      <select class="subject-difficulty">
        <option value="high">High Difficulty</option>
        <option value="medium" selected>Medium Difficulty</option>
        <option value="low">Low Difficulty</option>
      </select>
      <input type="date" class="subject-exam-date">
      <button type="button" class="btn btn-outline btn-small btn-remove-row">✕</button>
    `;
    
    // Bind remove row logic
    row.querySelector(".btn-remove-row").addEventListener("click", () => {
      row.remove();
    });

    container.appendChild(row);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const subjectRows = document.querySelectorAll(".subject-row");
    const subjects = [];
    const difficulties = {};
    const examDates = {};

    subjectRows.forEach(row => {
      const name = row.querySelector(".subject-name").value.trim();
      const diff = row.querySelector(".subject-difficulty").value;
      const examDate = row.querySelector(".subject-exam-date").value;

      if (name) {
        subjects.push(name);
        difficulties[name] = diff;
        if (examDate) {
          examDates[name] = examDate;
        }
      }
    });

    const hoursVal = parseInt(hoursSlider.value);

    // Loader controls
    const btn = document.getElementById("btn-study-submit");
    const loader = document.getElementById("study-loader");
    const btnText = btn.querySelector(".btn-text");

    btn.disabled = true;
    loader.style.display = "inline-block";
    btnText.style.display = "none";

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects,
          subjectsDifficulty: difficulties,
          examDates,
          availableStudyHours: hoursVal,
          energyPreference: state.settings.energyPeak
        })
      });

      const data = await res.json();

      if (data.success) {
        state.aiResults = data;
        renderStudyResults(data);
        syncDashboardStats();
      } else {
        alert(`Failed to query Study Coach: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the Study Coach API.");
    } finally {
      btn.disabled = false;
      loader.style.display = "none";
      btnText.style.display = "inline-block";
    }
  });
}

/**
 * Renders revision tables, pomodoro steps, and tips.
 */
function renderStudyResults(data) {
  document.getElementById("study-empty-state").style.display = "none";
  document.getElementById("study-results").style.display = "flex";

  const study = data.study || {};
  const timetable = study.studyTimetable || [];

  // Render cards
  const cardsContainer = document.getElementById("study-timetable-cards");
  cardsContainer.innerHTML = timetable.map(item => `
    <div class="study-subject-card">
      <h3>${item.subject}</h3>
      <span class="difficulty-badge ${item.difficulty}">${item.difficulty}</span>
      <div class="study-technique-info">
        <h4>${item.technique}</h4>
        <p>${item.techniqueExplanation}</p>
      </div>
      <ul class="study-topics-list">
        <li style="font-weight: 600;">Time Allocated: ${item.hoursAllocated}h</li>
        ${(item.recommendedTopics || []).map(t => `<li>• ${t}</li>`).join("")}
      </ul>
    </div>
  `).join("");

  // Render revision plan checklist
  const planContainer = document.getElementById("study-revision-plan");
  planContainer.innerHTML = (study.revisionPlan || []).map(step => `
    <li>${step}</li>
  `).join("");

  // Exam Strategy
  document.getElementById("study-exam-strategy").textContent = study.examStrategy || "No exam strategy available.";
}

// ==========================================================================
// 5. GOAL TRACKER VIEW CONTROLS
// ==========================================================================
function initGoals() {
  const form = document.getElementById("goal-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("goal-title").value.trim();
    const deadline = document.getElementById("goal-target-date").value;
    const category = document.getElementById("goal-category").value;

    const newGoal = {
      id: `goal-${Date.now()}`,
      title,
      deadline,
      category,
      progress: 0
    };

    state.goals.push(newGoal);
    form.reset();
    renderGoals();
    syncDashboardStats();
  });

  renderGoals();
}

/**
 * Renders the goal cards list dynamically.
 */
function renderGoals() {
  const container = document.getElementById("active-goals-grid");
  if (!container) return;

  if (state.goals.length === 0) {
    container.innerHTML = `<div class="empty-state">No goals set. Formulate a milestone goal!</div>`;
    return;
  }

  container.innerHTML = state.goals.map(goal => `
    <div class="goal-item-card">
      <div class="goal-item-header">
        <div>
          <h3>${goal.title}</h3>
          <span class="goal-item-meta">${goal.category} | Target: ${goal.deadline}</span>
        </div>
        <button class="btn-delete-goal" onclick="deleteGoal('${goal.id}')">✕</button>
      </div>
      <div class="goal-progress-slider-wrapper">
        <input type="range" min="0" max="100" value="${goal.progress}" onchange="updateGoalProgress('${goal.id}', this.value)">
        <span class="goal-percentage">${goal.progress}%</span>
      </div>
    </div>
  `).join("");
}

function updateGoalProgress(id, value) {
  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    goal.progress = parseInt(value);
    renderGoals();
    syncDashboardStats();
  }
}
window.updateGoalProgress = updateGoalProgress;

function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id);
  renderGoals();
  syncDashboardStats();
}
window.deleteGoal = deleteGoal;

// ==========================================================================
// 6. TODAY'S TASKS CHECKLIST
// ==========================================================================
function initChecklist() {
  const form = document.getElementById("quick-task-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("quick-task-title").value.trim();
    const priority = document.getElementById("quick-task-priority").value;

    state.tasks.push({
      id: `task-${Date.now()}`,
      title,
      priority,
      status: "pending",
      deadline: new Date().toISOString().split("T")[0]
    });

    form.reset();
    renderChecklist();
    syncDashboardStats();
  });

  // Checklist Filter buttons
  const filterBtns = document.querySelectorAll(".checklist-filters .filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderChecklist(btn.getAttribute("data-filter"));
    });
  });

  renderChecklist();
}

/**
 * Renders checklist list.
 */
function renderChecklist(filter = "all") {
  const container = document.getElementById("checklist-items-container");
  if (!container) return;

  let filtered = [...state.tasks];
  if (filter === "pending") {
    filtered = filtered.filter(t => t.status === "pending");
  } else if (filter === "completed") {
    filtered = filtered.filter(t => t.status === "completed");
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No matching tasks found. Add tasks to start checklist.</div>`;
    return;
  }

  container.innerHTML = filtered.map(task => `
    <li class="checklist-item ${task.status === "completed" ? "completed" : ""}">
      <div class="checklist-item-left">
        <input type="checkbox" ${task.status === "completed" ? "checked" : ""} onchange="toggleTaskStatus('${task.id}')">
        <span class="checklist-item-title">${task.title}</span>
      </div>
      <div class="checklist-item-right">
        <span class="task-prio-tag ${task.priority}">${task.priority}</span>
        <button class="btn-delete-goal" style="position: static;" onclick="deleteTask('${task.id}')">✕</button>
      </div>
    </li>
  `).join("");
}

function toggleTaskStatus(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.status = task.status === "completed" ? "pending" : "completed";
    
    // Determine active filter to keep rendering consistent
    const activeFilter = document.querySelector(".checklist-filters .filter-btn.active").getAttribute("data-filter");
    renderChecklist(activeFilter);
    syncDashboardStats();
  }
}
window.toggleTaskStatus = toggleTaskStatus;

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  const activeFilter = document.querySelector(".checklist-filters .filter-btn.active").getAttribute("data-filter");
  renderChecklist(activeFilter);
  syncDashboardStats();
}
window.deleteTask = deleteTask;

// ==========================================================================
// 7. SETTINGS PAGE CONTROLS
// ==========================================================================
function initSettings() {
  const form = document.getElementById("settings-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const energy = form.querySelector('input[name="energy-peak"]:checked').value;
    const study = document.getElementById("study-preference-select").value;
    const notifs = document.getElementById("check-notifs").checked;
    const sound = document.getElementById("check-sound").checked;

    state.settings = {
      energyPeak: energy,
      studyPreference: study,
      notifications: notifs,
      sound: sound
    };

    alert("Settings saved successfully! AI agents will use these parameters for the next optimization.");
  });
}
