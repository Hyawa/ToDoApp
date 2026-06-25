export interface Tag {
  id: number;
  name: string;
}

export interface TaskList {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Subtask {
  id: number;
  task: number;
  title: string;
  is_completed: boolean;
  position: number;
}

export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface Task {
  id: number;
  title: string;
  description: string;
  
  task_list: number | null;
  tags: Tag[];
  subtasks: Subtask[];
  
  is_completed: boolean;
  is_starred: boolean;
  position: number;
  
  start_date: string;
  due_date: string;
  scheduled_time: string | null;
  
  recurrence_type: RecurrenceType;
  repeat_monday: boolean;
  repeat_tuesday: boolean;
  repeat_wednesday: boolean;
  repeat_thursday: boolean;
  repeat_friday: boolean;
  repeat_saturday: boolean;
  repeat_sunday: boolean;
  
  notification_offset: number | null;
  hide_until_due: number | null;
  
  last_occurrence: string | null;
  next_occurrence: string | null;
  
  created_at: string;
  updated_at: string;
}
