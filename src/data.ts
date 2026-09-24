import type { Assignment, CompletedSub, HACZero, SubType } from './types';
import { countdown } from './utils';

const SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`;

const syncHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};
const PARENT_ID = '51186';

export interface CloudData {
  assignments: Assignment[];
  studentChecked: Record<string, boolean>;
  studentSubTypes: Record<string, SubType>;
  completedSubs: CompletedSub[];
  syncedAt: string;
  studentName: string;
  courseMap: Record<string, string>;
  userIds: string[];
}

export async function fetchHACZeros(userId: string): Promise<{ zeros: HACZero[]; syncedAt: string }> {
  try {
    const res = await fetch(`${SYNC_URL}?userId=${encodeURIComponent('hac_' + userId)}`, { headers: syncHeaders });
    if (!res.ok) return { zeros: [], syncedAt: '' };
    const json = await res.json();
    if (!json.ok || !json.data) return { zeros: [], syncedAt: '' };
    const zeros: HACZero[] = JSON.parse(json.data.hac_zeros || json.data.zeros_raw || '[]');
    return { zeros, syncedAt: json.synced_at || '' };
  } catch (e) {
    console.warn('HAC cloud load failed:', e);
    return { zeros: [], syncedAt: '' };
  }
}

export async function fetchCloudAssignments(): Promise<CloudData> {
  const targetIds = ['50904', '50906'];
  const headers = syncHeaders;

  const results: { uid: string; json: any }[] = [];
  for (const uid of targetIds) {
    try {
      const res = await fetch(`${SYNC_URL}?userId=${encodeURIComponent(uid)}`, { headers });
      if (!res.ok) { console.warn('Sync GET failed for', uid, res.status); continue; }
      const json = await res.json();
      if (!json.ok) { console.warn('Sync returned not-ok for', uid); continue; }
      results.push({ uid, json });
    } catch (e) {
      console.warn('Cloud load failed for', uid, e);
    }
  }

  if (!results.length) {
    return {
      assignments: [], studentChecked: {}, studentSubTypes: {}, completedSubs: [],
      syncedAt: '', studentName: 'Student',
      courseMap: {}, userIds: targetIds,
    };
  }

  const primary = results[0];
  const d = primary.json.data;

  const upcomingRaw = JSON.parse(d.upcoming_raw || '[]');
  const missingRaw = JSON.parse(d.missing_raw || '[]');
  const zerosRaw = JSON.parse(d.zeros_raw || '[]');
  const courseMap: Record<string, string> = JSON.parse(d.course_map || '{}');
  const submittedIds = new Set<string>(JSON.parse(d.submitted_ids || '[]'));
  const completedSubs: CompletedSub[] = JSON.parse(d.completed_subs || '[]');
  const studentName = d.name || 'Student';
  const syncedAt = primary.json.synced_at || '';

  const parentDone: Record<string, boolean> = JSON.parse(localStorage.getItem('nhq_parent_done') || '{}');
  const now = new Date();
  const academicYearStart = new Date(now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, 7, 1);
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const seen = new Set<string>();
  const assignments: Assignment[] = [];

  zerosRaw.forEach((a: any) => {
    const id = String(a.id);
    if (seen.has(id)) return;
    seen.add(id);
    assignments.push({
      id, title: a.title || 'Untitled', course: a.course || courseMap[String(a.course_id)] || '',
      due: a.due ? new Date(a.due) : null, status: 'zeroed',
      points: a.points || null, grade: a.grade, score: a.score, source: 'api',
    });
  });

  missingRaw.forEach((a: any) => {
    const id = String(a.id);
    if (seen.has(id)) return;
    seen.add(id);
    assignments.push({
      id, title: a.name || a.title || 'Untitled', course: courseMap[String(a.course_id)] || '',
      due: a.due_at ? new Date(a.due_at) : null, status: 'missing',
      points: a.points_possible || null, source: 'api',
    });
  });

  upcomingRaw.forEach((e: any) => {
    const a = e.assignment || e;
    const id = String(a.id || e.id);
    const bareId = id.replace(/^assignment_/, '');
    if (seen.has(id) || submittedIds.has(id) || submittedIds.has(bareId)) return;
    if (a.submission && a.submission.score !== null && a.submission.score !== undefined) return;
    const due = a.due_at ? new Date(a.due_at) : (e.start_at ? new Date(e.start_at) : null);
    if (!due || due < academicYearStart) return;
    const title = a.name || a.title || e.title || '';
    if (!title) return;
    seen.add(id);
    assignments.push({
      id, title, course: e.course || courseMap[String(a.course_id || e.course_id)] || e.context_name || '',
      due, status: 'upcoming', points: a.points_possible || a.points || e.points || null, source: 'api',
    });
  });

  const titleDueSet = new Set<string>();
  let deduped = assignments.filter(a => {
    const key = a.title.trim().toLowerCase() + '|' + (a.due ? a.due.toDateString() : 'nodue');
    if (titleDueSet.has(key)) return false;
    titleDueSet.add(key);
    return true;
  });

  deduped = deduped.filter(a => !parentDone[a.id]);
  deduped = deduped.filter(a => {
    if (a.status === 'missing') {
      if (!a.due) return true;
      const dueDate = a.due instanceof Date ? a.due : new Date(a.due);
      if (dueDate < thirtyAgo) return false;
    }
    return true;
  });

  deduped.sort((a, b) => {
    const order = { zeroed: 0, missing: 1, upcoming: 2 };
    const ao = order[a.status] ?? 2;
    const bo = order[b.status] ?? 2;
    if (ao !== bo) return ao - bo;
    return (a.due || new Date(9e15)).getTime() - (b.due || new Date(9e15)).getTime();
  });

  return {
    assignments: deduped,
    studentChecked: {},
    studentSubTypes: {},
    completedSubs,
    syncedAt,
    studentName,
    courseMap,
    userIds: results.map(r => r.uid),
  };
}

export function getUserIds(): string[] {
  const all = JSON.parse(localStorage.getItem('nhq_user_ids') || '[]');
  return all.filter((id: string) => id !== PARENT_ID);
}

export function getStudentName(userId: string): string {
  return localStorage.getItem('nhq_' + userId + '_name') || 'Student';
}

export function loadFromExtension(userId: string): { assignments: Assignment[]; studentChecked: Record<string, boolean>; studentSubTypes: Record<string, SubType>; syncedAt: string; studentName: string } {
  const prefix = 'nhq_' + userId + '_';
  const parentDone: Record<string, boolean> = JSON.parse(localStorage.getItem('nhq_parent_done') || '{}');

  const syncedAt = localStorage.getItem(prefix + 'synced_at') || '';
  const studentName = localStorage.getItem(prefix + 'name') || 'Student';

  // Try pre-processed assignments first
  const preProcessed = localStorage.getItem(prefix + 'assignments');
  if (preProcessed) {
    let assignments: Assignment[] = JSON.parse(preProcessed).map((a: any) => ({
      ...a,
      due: a.due ? new Date(a.due) : null,
    }));
    assignments = assignments.filter(a => !parentDone[a.id]);
    const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    assignments = assignments.filter(a => {
      if (a.status === 'missing') {
        if (!a.due) return true;
        const d = a.due instanceof Date ? a.due : new Date(a.due);
        if (d < thirtyAgo) return false;
      }
      return true;
    });
    const studentChecked: Record<string, boolean> = JSON.parse(localStorage.getItem(prefix + 'student_checked') || '{}');
    const studentSubTypes: Record<string, SubType> = JSON.parse(localStorage.getItem(prefix + 'student_subtypes') || '{}');
    return { assignments, studentChecked, studentSubTypes, syncedAt, studentName };
  }

  // Fall back to raw data
  const upcomingRaw = JSON.parse(localStorage.getItem(prefix + 'upcoming_raw') || '[]');
  const missingRaw = JSON.parse(localStorage.getItem(prefix + 'missing_raw') || '[]');
  const zerosRaw = JSON.parse(localStorage.getItem(prefix + 'zeros_raw') || '[]');
  const plannerRaw = JSON.parse(localStorage.getItem(prefix + 'planner_raw') || '[]');
  const courseMap: Record<string, string> = JSON.parse(localStorage.getItem(prefix + 'course_map') || '{}');
  const submittedIds = new Set<string>(JSON.parse(localStorage.getItem(prefix + 'submitted_ids') || '[]'));
  const markedDoneIds = new Set<string>(JSON.parse(localStorage.getItem(prefix + 'marked_done_ids') || '[]'));
  const studentChecked: Record<string, boolean> = JSON.parse(localStorage.getItem(prefix + 'student_checked') || '{}');
  const studentSubTypes: Record<string, SubType> = JSON.parse(localStorage.getItem(prefix + 'student_subtypes') || '{}');

  if (!upcomingRaw.length && !missingRaw.length && !zerosRaw.length) {
    return { assignments: [], studentChecked, studentSubTypes, syncedAt, studentName };
  }

  const now = new Date();
  const academicYearStart = new Date(now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1, 7, 1);
  const seen = new Set<string>();
  const assignments: Assignment[] = [];

  // Add graded zeros first
  zerosRaw.forEach((a: any) => {
    const id = String(a.id);
    if (seen.has(id)) return;
    seen.add(id);
    assignments.push({
      id, title: a.title || 'Untitled', course: a.course || courseMap[String(a.course_id)] || '',
      due: a.due ? new Date(a.due) : null, status: 'zeroed',
      points: a.points || null, grade: a.grade, score: a.score, source: 'api',
    });
  });

  missingRaw.forEach((a: any) => {
    const id = String(a.id);
    if (seen.has(id)) return;
    seen.add(id);
    assignments.push({
      id, title: a.name || 'Untitled', course: courseMap[String(a.course_id)] || '',
      due: a.due_at ? new Date(a.due_at) : null, status: 'missing',
      points: a.points_possible || null, source: 'api',
    });
  });

  upcomingRaw.filter((e: any) => e.type === 'Assignment' || e.assignment).forEach((e: any) => {
    const a = e.assignment || e;
    const id = String(a.id || e.id);
    const bareId = id.replace(/^assignment_/, '');
    if (seen.has(id) || submittedIds.has(id) || submittedIds.has(bareId) || markedDoneIds.has(id) || markedDoneIds.has(bareId)) return;
    if (a.submission && a.submission.score !== null && a.submission.score !== undefined) return;
    const due = a.due_at ? new Date(a.due_at) : (e.start_at ? new Date(e.start_at) : null);
    if (!due || due < academicYearStart) return;
    const title = a.name || a.title || e.title || '';
    if (!title) return;
    seen.add(id);
    assignments.push({
      id, title, course: courseMap[String(a.course_id || e.course_id)] || e.context_name || '',
      due, status: 'upcoming', points: a.points_possible || null, source: 'api',
    });
  });

  plannerRaw.filter((p: any) => p.plannable_type === 'assignment' && p.plannable).forEach((p: any) => {
    const id = String(p.plannable_id);
    if (seen.has(id) || submittedIds.has(id) || markedDoneIds.has(id)) return;
    const due = p.plannable.due_at ? new Date(p.plannable.due_at) : null;
    if (!due || due < academicYearStart) return;
    const title = p.plannable.title || p.plannable.name || '';
    if (!title) return;
    seen.add(id);
    assignments.push({
      id, title, course: courseMap[String(p.course_id)] || '',
      due, status: 'upcoming', points: p.plannable.points_possible || null, source: 'api',
    });
  });

  // Dedup by title+date
  const titleDueSet = new Set<string>();
  let deduped = assignments.filter(a => {
    const key = a.title.trim().toLowerCase() + '|' + (a.due ? a.due.toDateString() : 'nodue');
    if (titleDueSet.has(key)) return false;
    titleDueSet.add(key);
    return true;
  });

  deduped = deduped.filter(a => !parentDone[a.id]);

  // Filter missing older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  deduped = deduped.filter(a => {
    if (a.status === 'missing') {
      if (!a.due) return true;
      const dueDate = a.due instanceof Date ? a.due : new Date(a.due);
      if (dueDate < thirtyDaysAgo) return false;
    }
    return true;
  });

  deduped.sort((a, b) => {
    const order = { zeroed: 0, missing: 1, upcoming: 2 };
    const ao = order[a.status] ?? 2;
    const bo = order[b.status] ?? 2;
    if (ao !== bo) return ao - bo;
    return (a.due || new Date(9e15)).getTime() - (b.due || new Date(9e15)).getTime();
  });

  return { assignments: deduped, studentChecked, studentSubTypes, syncedAt, studentName };
}

export function loadHACZeros(): { zeros: HACZero[]; syncedAt: string } {
  const zeros: HACZero[] = JSON.parse(localStorage.getItem('nhq_hac_zeros') || '[]');
  const syncedAt = localStorage.getItem('nhq_hac_synced_at') || '';
  return { zeros, syncedAt };
}

export function loadCompletedSubs(userId: string): CompletedSub[] {
  return JSON.parse(localStorage.getItem('nhq_' + userId + '_completed_subs') || '[]');
}

export function getCourseMap(userId: string): Record<string, string> {
  return JSON.parse(localStorage.getItem('nhq_' + userId + '_course_map') || '{}');
}

export async function loadAllFromCloud(activeUserId: string | null): Promise<void> {
  const targetIds = ['50904', '50906'];
  const successfulIds: string[] = [];
  for (const uid of targetIds) {
    try {
      const res = await fetch(`${SYNC_URL}?userId=${encodeURIComponent(uid)}`, { headers: syncHeaders });
      if (!res.ok) {
        console.warn('Sync GET failed for', uid, res.status);
        continue;
      }
      const json = await res.json();
      if (!json.ok) {
        console.warn('Sync returned not-ok for', uid);
        continue;
      }
      const d = json.data;
      const prefix = 'nhq_' + uid + '_';
      localStorage.setItem(prefix + 'upcoming_raw', d.upcoming_raw || '[]');
      localStorage.setItem(prefix + 'missing_raw', d.missing_raw || '[]');
      localStorage.setItem(prefix + 'zeros_raw', d.zeros_raw || '[]');
      localStorage.setItem(prefix + 'course_map', d.course_map || '{}');
      localStorage.setItem(prefix + 'submitted_ids', d.submitted_ids || '[]');
      localStorage.setItem(prefix + 'completed_subs', d.completed_subs || '[]');
      localStorage.setItem(prefix + 'name', d.name || 'Student');
      localStorage.setItem(prefix + 'synced_at', json.synced_at || '');
      successfulIds.push(uid);
    } catch (e) {
      console.warn('Cloud load failed for', uid, e);
    }
  }
  if (successfulIds.length) {
    localStorage.setItem('nhq_user_ids', JSON.stringify(successfulIds));
  }
}

let _cloudPushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCloudPush(activeUserId: string | null) {
  if (_cloudPushTimer) clearTimeout(_cloudPushTimer);
  _cloudPushTimer = setTimeout(() => pushToCloud(activeUserId), 3000);
}

async function pushToCloud(activeUserId: string | null) {
  const userId = activeUserId || '50904';
  const prefix = 'nhq_' + userId + '_';
  try {
    await fetch(SYNC_URL, {
      method: 'POST',
      headers: syncHeaders,
      body: JSON.stringify({
        userId,
        upcoming_raw: localStorage.getItem(prefix + 'upcoming_raw') || '[]',
        missing_raw: localStorage.getItem(prefix + 'missing_raw') || '[]',
        zeros_raw: localStorage.getItem(prefix + 'zeros_raw') || '[]',
        course_map: localStorage.getItem(prefix + 'course_map') || '{}',
        submitted_ids: localStorage.getItem(prefix + 'submitted_ids') || '[]',
        completed_subs: localStorage.getItem(prefix + 'completed_subs') || '[]',
        synced_at: localStorage.getItem(prefix + 'synced_at') || '',
        name: localStorage.getItem(prefix + 'name') || '',
      }),
    });
  } catch (e) {
    console.warn('Cloud push failed:', e);
  }
}

// Credential persistence
const CRED_FIELDS = ['proxy-url', 'api-token', 'token-expiry', 'student-name', 'sheets-url', 'fb-url', 'fb-key', 'tw-sid', 'tw-token', 'tw-from', 'tw-to'];

export function restoreCredential(id: string): string {
  return localStorage.getItem('nhq_cred_' + id) || '';
}

export function saveCredential(id: string, value: string): void {
  localStorage.setItem('nhq_cred_' + id, value);
}

export function clearAllCredentials(): void {
  CRED_FIELDS.forEach(id => localStorage.removeItem('nhq_cred_' + id));
}

export function readQRParams(): void {
  const p = new URLSearchParams(window.location.search);
  const map: Record<string, string> = {
    proxy: 'nhq_cred_proxy-url',
    token: 'nhq_cred_api-token',
    fbUrl: 'nhq_cred_fb-url',
    fbKey: 'nhq_cred_fb-key',
    twSid: 'nhq_cred_tw-sid',
    twToken: 'nhq_cred_tw-token',
    twFrom: 'nhq_cred_tw-from',
    twTo: 'nhq_cred_tw-to',
    name: 'nhq_cred_student-name',
  };
  let found = false;
  Object.entries(map).forEach(([param, storageKey]) => {
    const val = p.get(param);
    if (val) { localStorage.setItem(storageKey, val); found = true; }
  });
  if (found && window.history.replaceState) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Twilio SMS
export async function twilioSend(sid: string, token: string, from: string, to: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    const d = await res.json();
    if (d.sid) return true;
    return false;
  } catch {
    return false;
  }
}

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function buildMissingMsg(a: Assignment, name: string): string {
  return `${pick([`${name}! Just checking in 💙`, `Hey ${name} —`, `Hi ${name}!`])} ${pick([`Canvas is officially showing "${a.title}" (${a.course}) as missing.`, `It looks like "${a.title}" hasn't been submitted yet.`])}\n\n${pick(["No stress — even a late submission counts! We're here if you need help. ❤️", "You've totally got this. Want us to sit down together on it? ❤️"])}`;
}

export function buildEncMsg(a: Assignment, name: string): string {
  const h = a.due ? (a.due.getTime() - new Date().getTime()) / 3600000 : 999;
  const urgNote = h <= 24 ? '⚠️ This one is due TODAY!' : h <= 48 ? 'Due tomorrow — don\'t forget!' : `Due ${countdown(a)}.`;
  return `${pick([`Hey ${name}! Just a heads up 💙`, `Quick reminder, ${name} 👋`])}\n\n📚 "${a.title}" (${a.course})\n${urgNote}\n\n${pick(["You've got this — one step at a time. ❤️", "We believe in you! ❤️"])}`;
}
