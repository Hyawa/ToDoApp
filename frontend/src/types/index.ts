export interface Tag {
  id: number;
  name: string;
}

export interface Subtask {
  id: number;
  task: number;
  title: string;
  is_completed: boolean;
  position: number;
}

export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Task {
  id: number;
  title: string;
  description: string;
  is_completed: boolean;
  position: number;
  due_date: string;
  recurrence_type: RecurrenceType;
  tags: Tag[];
  subtasks: Subtask[];
  created_at: string;
  updated_at: string;
}
