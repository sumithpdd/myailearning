/** Machine-readable description of the Notion graph. No personal plan content. */
export const LEARNING_MODEL = {
  summary:
    "Learning Plan is the parent. Learning Agenda holds the sessions. Learning Tasks holds the work. Both children point at the parent through the Learning Item relation. Do not store the agenda or the task list inside Notes.",
  parent: {
    database: "Learning Plan",
    role: "One course, event, book, or other learning item.",
  },
  agenda: {
    database: "Learning Agenda",
    relation: "Learning Item",
    fields: {
      Name: "Session title",
      Start: "When it starts",
      End: "When it ends",
      "Agenda Type": "Session, Workshop, Networking, Travel, Meal, Reflection, or Work buffer",
      Plan: "Intention: Attend Live, Watch Recording, Alternative, Optional, or Skip",
      Attendance: "Outcome: Planned, Attended, Watched, Missed, or Cancelled. Set this after the session.",
      Priority: "Must, High, Medium, or Optional",
      Track: "Subject tags",
      Venue: "Where it happens",
      Speaker: "Who leads it",
      Link: "Session or recording URL",
      Notes: "Preparation notes",
      Takeaways: "What was learned",
      "Follow-up": "What to do next",
    },
  },
  tasks: {
    database: "Learning Tasks",
    relation: "Learning Item",
    fields: {
      Name: "Task title",
      Status: "To Do, In Progress, Done, or Skipped. Set Done or Skipped when it is finished.",
      "Task Type": "Booking, Preparation, Travel, Agenda, Learning, Networking, Follow-up, or Evidence",
      Priority: "Must, High, Medium, or Optional",
      Due: "Date it should be finished",
      Link: "Related URL",
      Notes: "Extra detail",
    },
  },
  api: {
    item: "GET /api/items/{id} includes agenda and tasks for that parent",
    monitor: "GET /api/monitor lists open sessions and open tasks",
    updateAgenda: "PATCH /api/agenda/{id} with attendance, plan, notes, takeaways, or followUp",
    updateTask: "PATCH /api/tasks/{id} with status or notes",
    shape: "GET /api/model",
  },
} as const;
