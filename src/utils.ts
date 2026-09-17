import type { Assignment, Urgency } from './types';

export function urgency(a: Assignment): Urgency {
  if (a.status === 'zeroed') return 'zeroed';
  if (a.status === 'missing') return 'missing';
  if (!a.due) return 'chill';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueLoc = a.due instanceof Date ? a.due : new Date(a.due);
  const dueDay = new Date(dueLoc.getFullYear(), dueLoc.getMonth(), dueLoc.getDate());
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return 'fire';
  if (days <= 1) return 'soon';
  const dow = today.getDay();
  const daysToFriday = dow <= 5 ? 5 - dow : 1;
  if (days <= daysToFriday) return 'ok';
  if (days <= daysToFriday + 7) return 'next';
  return 'chill';
}

export function countdown(a: Assignment): string {
  if (a.status === 'zeroed') return 'Graded as zero — never submitted';
  if (a.status === 'missing') {
    if (!a.due) return 'Officially missing in Canvas';
    const h = Math.abs(Math.floor((a.due.getTime() - new Date().getTime()) / 3600000));
    const overdue = h < 24 ? h + 'h overdue' : Math.floor(h / 24) + 'd overdue';
    return overdue + ' · officially missing';
  }
  if (!a.due) return 'No due date';
  const diff = a.due.getTime() - new Date().getTime();
  if (diff < 0) {
    const h = Math.abs(Math.floor(diff / 3600000));
    return h < 24 ? h + 'h overdue' : Math.floor(h / 24) + 'd overdue';
  }
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Due in under an hour';
  if (h < 24) return 'Due in ' + h + 'h';
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? d + 'd ' + rh + 'h away' : d + ' day' + (d > 1 ? 's' : '') + ' away';
}

export function fmtDate(d: Date | null): string {
  if (!d) return 'No due date';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getDateLabel(a: Assignment): string {
  if (a.status === 'missing') return '⚠️ Missing';
  if (a.status === 'zeroed') return '🔴 Graded Zero';
  if (!a.due) return 'No due date';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueLoc = a.due instanceof Date ? a.due : new Date(a.due);
  const due = new Date(dueLoc.getFullYear(), dueLoc.getMonth(), dueLoc.getDate());
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return '⚠️ Overdue';
  if (diff === 0) return '📅 Today';
  if (diff === 1) return '📅 Tomorrow';
  const dow = today.getDay();
  const daysUntilFriday = dow <= 5 ? 5 - dow : 0;
  if (diff <= daysUntilFriday) return '📅 This Week';
  return '📅 Upcoming';
}

export function pillLabel(u: Urgency, isDone: boolean): string {
  if (isDone) return '✓ Confirmed done';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return {
    zeroed: '🔴 Graded Zero',
    missing: '⚠️ Missing',
    fire: '🔴 Due Today',
    soon: '🟠 Due Tomorrow',
    ok: '🟡 This Week',
    next: '🟢 Next Week',
    chill: '⬜ Later',
  }[u] || '';
}

export function pillClass(u: Urgency): string {
  return {
    zeroed: 'p-zeroed',
    missing: 'p-missing',
    fire: 'p-fire',
    soon: 'p-soon',
    ok: 'p-ok',
    next: 'p-chill',
    chill: 'p-later',
  }[u] || 'p-done';
}

export function esc(s: string | null | undefined): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function daysUntilFriday(today: Date): number {
  const dow = today.getDay();
  return dow <= 5 ? 5 - dow : 0;
}
