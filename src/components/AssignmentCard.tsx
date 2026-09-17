import type { Assignment } from '../types';
import { urgency, pillLabel, pillClass, countdown, fmtDate } from '../utils';

interface Props {
  assignment: Assignment;
  isParentDone: boolean;
  isStudentChecked: boolean;
  studentSubType?: { type: string; note: string };
  parentNote: string;
  isMobile: boolean;
  onToggleDone: () => void;
  onNudge: () => void;
  onNoteChange: (note: string) => void;
  nudgeSent: boolean;
}

export function AssignmentCard({ assignment: a, isParentDone, isStudentChecked, studentSubType, parentNote, isMobile, onToggleDone, onNudge, onNoteChange, nudgeSent }: Props) {
  const u = urgency(a);
  const isMiss = a.status === 'missing';
  const isZeroed = a.status === 'zeroed';

  const cardClasses = [
    'card',
    isZeroed ? 'c-zeroed' : '',
    isMiss ? 'c-missing' : '',
    isStudentChecked && !isParentDone ? 'c-student-done' : '',
    isParentDone ? 'c-parent-done' : '',
    'u-' + u,
  ].filter(Boolean).join(' ');

  const subTypeIcons: Record<string, string> = { paper: '📄', canvas: '🖥️', external: '🔗', both: '📤' };
  const subTypeLabels: Record<string, string> = {
    paper: 'Paper — hand in class',
    canvas: 'Canvas — submit online',
    external: 'External platform',
    both: 'External + linked in Canvas',
  };

  return (
    <div
      className={cardClasses}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: getCardShadow(u, isZeroed, isMiss),
        padding: isMobile ? '10px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '5px' : '9px',
        opacity: isParentDone ? 0.38 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: isMobile ? '0.65rem' : '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '100px' : '150px' }}>
          {a.course}
        </span>
        <span className={`pill ${isParentDone ? 'p-done' : pillClass(u)}`} style={pillStyle(isParentDone, u, isMobile)}>
          {pillLabel(u, isParentDone)}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: isMobile ? '0.88rem' : '1.05rem', lineHeight: 1.35, color: 'var(--ink)', textDecoration: isParentDone ? 'line-through' : 'none' }}>
        {a.title}
      </div>

      {/* Meta */}
      <div style={{ fontSize: isMobile ? '0.75rem' : '0.92rem', color: 'var(--subink)', display: 'flex', flexDirection: 'column', gap: isMobile ? '2px' : '3px' }}>
        <span>{fmtDate(a.due)}</span>
        <span style={{ fontSize: isMobile ? '0.75rem' : '0.95rem', fontWeight: 500, color: getCountdownColor(u) }}>{countdown(a)}</span>
        {isZeroed && (
          <span style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', fontWeight: 600, color: 'var(--fire)' }}>
            Graded: {a.grade || '0'} / {a.points || 0} pts — never submitted
          </span>
        )}
        {!isZeroed && a.grade !== undefined && a.grade !== null && (
          <span style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', fontWeight: 600, color: (a.grade === '0' || a.grade === 0) ? 'var(--fire)' : 'var(--subink)' }}>
            {a.grade} / {a.points || '?'} pts
          </span>
        )}
        {!isZeroed && (a.grade === undefined || a.grade === null) && a.points && (
          <span style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', color: 'var(--muted)' }}>{a.points} pts possible</span>
        )}
        {isStudentChecked && (
          <span style={{ fontSize: isMobile ? '0.72rem' : '0.95rem', color: 'var(--student)', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '10px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', width: 'fit-content' }}>
            ✅ He marked this done
          </span>
        )}
        {studentSubType && studentSubType.type ? (
          <span style={{ fontSize: isMobile ? '0.65rem' : '0.72rem', color: 'var(--subink)', marginTop: '4px', display: 'block', padding: isMobile ? '3px 6px' : '5px 8px', background: 'var(--surface2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {subTypeIcons[studentSubType.type] || '📋'} {subTypeLabels[studentSubType.type] || studentSubType.type}
            {studentSubType.note ? ` · ${studentSubType.note}` : ''}
          </span>
        ) : (
          <span style={{ fontSize: isMobile ? '0.62rem' : '0.68rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
            📋 Submission type not set
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '5px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '4px' : '5px' }}>
          <button
            onClick={onNudge}
            disabled={isParentDone || nudgeSent}
            style={{
              ...nudgeBtnStyle(isMiss, nudgeSent, isMobile),
            }}
          >
            {nudgeSent ? '✓ Sent!' : `📲 ${isMiss ? 'Text' : 'Nudge'}`}
          </button>
          <button
            onClick={onToggleDone}
            style={{
              ...doneBtnStyle(isParentDone, isMobile),
            }}
          >
            {isParentDone ? '✓ Done' : 'Mark Done'}
          </button>
        </div>
        <textarea
          value={parentNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add a note..."
          rows={1}
          style={{
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: isMobile ? '4px 6px' : '6px 8px',
            fontSize: isMobile ? '0.7rem' : '0.78rem',
            fontFamily: 'inherit',
            color: 'var(--ink)',
            background: 'var(--bg)',
            resize: 'none',
            minHeight: isMobile ? '24px' : '32px',
            lineHeight: 1.4,
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>
    </div>
  );
}

function getCardShadow(u: string, isZeroed: boolean, isMiss: boolean): string {
  const leftColors: Record<string, string> = {
    fire: '#e53e3e',
    soon: '#f97316',
    ok: '#ecc94b',
    chill: '#22c55e',
    next: '#22c55e',
  };
  const left = (isZeroed || isMiss || u === 'fire') ? '#e53e3e' : (leftColors[u] || '#e2e6ea');
  return `-4px 0 0 ${left}, 0 1px 4px rgba(0,0,0,0.05)`;
}

function getCountdownColor(u: string): string {
  return { zeroed: 'var(--missing)', missing: 'var(--missing)', fire: 'var(--fire)', soon: 'var(--soon)', ok: 'var(--ok)', chill: 'var(--chill)', next: 'var(--chill)' }[u] || 'var(--subink)';
}

function pillStyle(isDone: boolean, u: string, isMobile: boolean): React.CSSProperties {
  const base = { fontSize: isMobile ? '0.65rem' : '0.95rem', fontWeight: 500, padding: isMobile ? '2px 6px' : '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: isMobile ? '0.04em' : '0.07em' };
  if (isDone) return { ...base, background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' };
  const styles: Record<string, React.CSSProperties> = {
    zeroed: { background: '#fdf0ee', color: 'var(--fire)', border: '1px solid #f5c5bf' },
    missing: { background: '#fff5f5', color: '#c53030', border: '1px solid #fc8181' },
    fire: { background: 'rgba(255,92,92,0.12)', color: 'var(--fire)', border: '1px solid rgba(255,92,92,0.3)' },
    soon: { background: 'rgba(255,144,64,0.12)', color: 'var(--soon)', border: '1px solid rgba(255,144,64,0.3)' },
    ok: { background: 'rgba(236,201,75,0.15)', color: '#b7791f', border: '1px solid rgba(236,201,75,0.4)' },
    chill: { background: 'rgba(62,207,142,0.1)', color: 'var(--chill)', border: '1px solid rgba(62,207,142,0.25)' },
    next: { background: 'rgba(62,207,142,0.1)', color: 'var(--chill)', border: '1px solid rgba(62,207,142,0.25)' },
  };
  return { ...base, ...(styles[u] || {}) };
}

function nudgeBtnStyle(isMiss: boolean, sent: boolean, isMobile: boolean): React.CSSProperties {
  const base = { borderRadius: '6px', padding: isMobile ? '4px 8px' : '5px 8px', fontSize: isMobile ? '0.7rem' : '0.75rem', display: 'flex' as const, alignItems: 'center' as const, gap: '5px', justifyContent: 'center' as const };
  if (sent) return { ...base, background: 'rgba(62,207,142,0.12)', color: 'var(--chill)', border: '1px solid rgba(62,207,142,0.3)', cursor: 'default' };
  return { ...base, background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'inherit', color: 'var(--subink)', cursor: 'pointer', transition: 'all 0.15s' };
}

function doneBtnStyle(isDone: boolean, isMobile: boolean): React.CSSProperties {
  const base = { borderRadius: '6px', padding: isMobile ? '4px 8px' : '5px 10px', fontFamily: 'inherit', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' };
  if (isDone) return { ...base, background: '#eef7f3', color: 'var(--chill)', border: '1px solid #b0d8c8' };
  return { ...base, background: 'none', border: '1px solid var(--border)', color: 'var(--subink)' };
}
