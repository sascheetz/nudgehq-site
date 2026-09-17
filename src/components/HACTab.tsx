import type { HACZero } from '../types';

interface Props {
  zeros: HACZero[];
  syncedAt: string;
}

export function HACTab({ zeros, syncedAt }: Props) {
  if (!zeros.length) {
    return (
      <div style={{ color: 'var(--muted)', padding: '20px', textAlign: 'center' }}>
        No HAC data yet. Open HAC Classwork and let Nudge HQ sync, or load from cloud.
      </div>
    );
  }

  const syncStr = syncedAt ? ' · synced ' + new Date(syncedAt).toLocaleTimeString() : '';

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ margin: '0 0 12px', background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ color: '#c53030', fontSize: '0.9rem' }}>📊 HAC Grades — Zeros & Ungraded{syncStr}</strong>
          <span style={{ fontSize: '0.78rem', color: '#9aa5b4' }}>{zeros.length} assignment{zeros.length === 1 ? '' : 's'}</span>
        </div>
        <div className="hac-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '480px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #fc8181' }}>
                <th style={thStyle}>Course</th>
                <th style={thStyle}>Assignment</th>
                <th style={thStyle}>Due</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Pct</th>
                <th style={thStyle}>Canvas</th>
              </tr>
            </thead>
            <tbody>
              {zeros.map((z, i) => {
                const scoreColor = z.isZero ? '#c53030' : z.isBlank ? '#dd6b20' : '#c53030';
                const cs = z.canvasStatus;
                const canvasCell = cs === 'submitted' ? <span style={{ color: '#38a169', fontWeight: 600 }}>✓ Submitted</span> :
                  cs === 'missing' ? <span style={{ color: '#e53e3e', fontWeight: 600 }}>⚠️ Missing</span> :
                  cs === 'upcoming' ? <span style={{ color: '#dd6b20' }}>📅 Not submitted yet</span> :
                  cs === 'not_in_canvas' ? <span style={{ color: '#9aa5b4' }}>📄 Paper only</span> :
                  <span style={{ color: '#9aa5b4' }}>—</span>;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={{ ...tdStyle, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.72rem', color: '#4a5568' }}>{z.course}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: '#1a1d23' }}>{z.assignment}</td>
                    <td style={{ ...tdStyle, color: '#9aa5b4' }}>{z.dateDue || ''}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: scoreColor }}>{z.score}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: scoreColor }}>{z.pct}</td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>{canvasCell}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 6px',
  color: '#4a5568',
  fontWeight: 600,
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
};
