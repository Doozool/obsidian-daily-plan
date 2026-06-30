export interface Task {
  name: string;
  start: string;
  end: string;
  done: "Y" | "N";
}

export interface DailyPlanData {
  tasks: Task[];
}

export interface DailyPlanSettings {
  // Future: default time format, etc.
}

export const DEFAULT_SETTINGS: DailyPlanSettings = {};
