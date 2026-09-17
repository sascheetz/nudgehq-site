export type AssignmentStatus = 'zeroed' | 'missing' | 'upcoming';
export type Urgency = 'zeroed' | 'missing' | 'fire' | 'soon' | 'ok' | 'next' | 'chill';

export interface Assignment {
  id: string;
  title: string;
  course: string;
  due: Date | null;
  status: AssignmentStatus;
  points: number | null;
  grade?: string | number | null;
  score?: number | null;
  source?: string;
  postToSis?: boolean;
}

export interface SubType {
  type: string;
  note: string;
}

export interface HACZero {
  course: string;
  assignment: string;
  dateDue: string;
  score: string;
  pct: string;
  isZero: boolean;
  isBlank: boolean;
  canvasStatus: string;
}

export interface CompletedSub {
  title: string;
  course: string;
  due: string | null;
  submitted_at: string;
  score: number | null;
  points: number | null;
}

export type TabKey = 'assignments' | 'hac' | 'completed';
