import { useState, useMemo } from 'react';
import type { CompletedSub } from '../types';

interface Props {
  subs: CompletedSub[];
}

type SortKey = 'submitted_desc' | 'submitted_asc' | 'due_desc' | 'due_asc' | 'course';
type RangeKey = 'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'month' | 'week';
type StatusKey = 'all' | 'ontime' | 'late' | 'graded';

const QUARTERS: Record<string, [Date, Date]> = {
  q1: [new Date('2026-08-13'), new Date('2026-10-15T23:59:59')],
  q2: [new Date('2026-10-19'), new Date('2026-12-18T23:59:59')],
  q3: [new Date('2027-01-05'), new Date('2027-03-11T23:59:59')],
  q4: [new Date('2027-03-15'), new Date('2027-05-20T23:59:59')],
};

export function CompletedTab({ subs }: Props) {
  const [sort, setSort] = useState<SortKey>('submitted_desc');
  const [range, setRange] = useState<RangeKey>('all');
  const [status, setStatus] = useState<StatusKey>('all');
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const allCourses = useMemo(() => [...new Set(subs.map(s => s.course).filter(Boolean))].sort(), [subs]);

  const filtered = useMemo(() => {
    const now = new Date();
    let result = [...subs];
    if (courseFilter) result = result.filter(s => s.course === courseFilter);
    if (status === 'late') result = result.filter(s => s.due && new Date(s.submitted_at) > new Date(s.due));
    if (status === 'ontime') result = result.filter(s => !s.due || new Date(s.submitted_at) <= new Date(s.due));
    if (status === 'graded') result = result.filter(s => s.score !== null && s.score !== undefined);
    if (QUARTERS[range]) {
      const [qs, qe] = QUARTERS[range];
      result = result.filter(s => { const d = new Date(s.submitted_at); return d >= qs && d <= qe; });
    }
    if (range === 'week') result = result.filter(s => new Date(s.submitted_at) > new Date(now.getTime() - 7 * 86400000));
    if (range === 'month') result = result.filter(s => new Date(s.submitted_at) > new Date(now.getTime() - 30 * 86400000));

    result.sort((a, b) => {
      if (sort === 'submitted_desc') return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      if (sort === 'submitted_asc') return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      if (sort === 'due_desc') return new Date(b.due || 0).getTime() - new Date(a.due || 0).getTime();
      if (sort === 'due_asc') return new Date(a.due || 0).getTime() - new Date(b.due || 0).getTime();
      return (a.course || '').localeCompare(b.course || '');
    });
    return result;
  }, [subs, sort, range, status, courseFilter]);

  const byCourse = useMemo(() => {
    const groups: Record<string, CompletedSub[]> = {};
    const order: string[] = [];
    filtered.forEach(s => {
      const c = s.course || 'Unknown';
      if (!groups[c]) { groups[c] = []; order.push(c); }
      groups[c].push(s);
    });
    return { groups, order };
  }, [filtered]);

  if (!subs.length) {
    return <p style={{ color: 'var(--muted)', padding: '20px' }}>No completed assignments yet. Sync from Canvas first.</p>;
  }

  const selectStyle: React.CSSProperties = {
    padding: '5px 8px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontFamily: 'inherit',
    background: 'var(--bg)',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ paddingTop: '8px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={selectStyle}>
          <option value="submitted_desc">Submitted ↓</option>
          <option value="submitted_asc">Submitted ↑</option>
          <option value="due_desc">Due ↓</option>
          <option value="due_asc">Due ↑</option>
        </select>
        <select value={range} onChange={e => setRange(e.target.value as RangeKey)} style={selectStyle}>
          <option value="all">All time</option>
          <option value="q1">Q1</option>
          <option value="q2">Q2</option>
          <option value="q3">Q3</option>
          <option value="q4">Q4</option>
          <option value="month">Last 30 days</option>
          <option value="week">Last 7 days</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as StatusKey)} style={selectStyle}>
          <option value="all">All status</option>
          <option value="ontime">On time</option>
          <option value="late">Late</option>
          <option value="graded">Graded</option>
        </select>
        <select value={courseFilter || ''} onChange={e => setCourseFilter(e.target.value || null)} style={selectStyle}>
          <option value="">All Courses</option>
          {allCourses.map(c => <option key={c} value={c}>{c.split('-')[0].trim()}</option>)}
        </select>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{filtered.length} assignments</span>
      </div>

      {/* Course groups */}
      {byCourse.order.map((course, ci) => {
        const items = byCourse.groups[course];
        const isExpanded = expanded[ci] || items.length <= 25;
        const shown = isExpanded ? items : items.slice(0, 25);
        const shortName = course.split('-')[0].trim();

        return (
          <div key={ci} style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--subink)', padding: '6px 0', borderBottom: '2px solid var(--border)', marginBottom: '4px' }}>
              {shortName} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({items.length})</span>
            </div>
            <div className="hac-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '480px' }}>
                <thead>
                  <tr>
                    <th style={cthStyle}>Assignment</th>
                    <th style={cthStyle}>Due</th>
                    <th style={cthStyle}>Submitted</th>
                    <th style={{ ...cthStyle, textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((s, si) => {
                    const due = s.due ? new Date(s.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                    const sub = new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                    const score = s.score !== null && s.score !== undefined ? `${s.score} / ${s.points || '?'}` : '—';
                    const late = s.due && new Date(s.submitted_at) > new Date(s.due);
                    return (
                      <tr key={si} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 500 }}>{s.title}</td>
                        <td style={{ padding: '5px 8px', color: 'var(--muted)' }}>{due}</td>
                        <td style={{ padding: '5px 8px', color: late ? '#dd6b20' : '#38a169' }}>{sub}{late ? ' ⚠️' : ''}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isExpanded && (
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <button onClick={() => setExpanded({ ...expanded, [ci]: true })} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 14px', fontSize: '0.78rem', color: 'var(--subink)', cursor: 'pointer' }}>
                  Show all {items.length} assignments
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const cthStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  color: 'var(--muted)',
  fontWeight: 500,
  fontSize: '0.75rem',
};
