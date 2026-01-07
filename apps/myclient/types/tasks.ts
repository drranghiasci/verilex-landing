export type TaskStatus = 'open' | 'done';

export type CaseTaskRow = {
  id: string;
  firm_id: string;
  case_id: string;
  title: string;
  description: string | null;
  due_date: string;
  due_time?: string | null;
  status: string;
  ribbon_color?: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};
