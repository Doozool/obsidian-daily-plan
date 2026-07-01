export interface Session {
  start: string;
  end: string;
  note: string;
}

export interface Task {
  name: string;
  sessions: Session[];
  done: "Y" | "N" | "";
}

export interface DailyPlanData {
  tasks: Task[];
}

export interface DailyPlanSettings {
  // Future: default time format, etc.
}

export const DEFAULT_SETTINGS: DailyPlanSettings = {};
