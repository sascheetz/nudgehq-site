import type { Assignment } from '../types';
import { urgency } from '../utils';

interface Props {
  assignments: Assignment[];
  parentDone: Record<string, boolean>;
  userIds: string[];
  activeUserId: string | null;
  studentName: string;
  onSwitchChild: (id: string) => void;
  onLoadFromExtension: () => void;
  onLoadAllFromCloud: () => void;
  onLoadHAC: () => void;
  onSendGeneralReminder: () => void;
  onLoadDemo: () => void;
  onOpenSettings: () => void;
}

export function Sidebar(props: Props) {
  const { assignments, parentDone, userIds, activeUserId, studentName } = props;

  const zeroed = assignments.filter(a => a.status === 'zeroed' && !parentDone[a.id]);
  const missing = assignments.filter(a => a.status === 'missing' && !parentDone[a.id]);
  const fire = assignments.filter(a => {
    if (!a.due || a.status !== 'upcoming' || parentDone[a.id]) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = a.due instanceof Date ? a.due : new Date(a.due);
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((dd.getTime() - today.getTime()) / 86400000) === 0;
  });
  const tomorrow = assignments.filter(a => {
    if (!a.due || a.status !== 'upcoming' || parentDone[a.id]) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = a.due instanceof Date ? a.due : new Date(a.due);
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((dd.getTime() - today.getTime()) / 86400000) === 1;
  });
  const thisWeek = assignments.filter(a => {
    if (!a.due || parentDone[a.id]) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = a.due instanceof Date ? a.due : new Date(a.due);
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((dd.getTime() - today.getTime()) / 86400000) <= 7;
  });
  const upcoming = assignments.filter(a => a.status === 'upcoming' && !parentDone[a.id]);

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: '7px', padding: '9px 14px', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', width: '100%',
    letterSpacing: '0.04em', marginBottom: '6px', transition: 'opacity 0.15s, transform 0.1s',
  };

  return (
    <aside style={{
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      padding: '28px 22px 40px', display: 'flex', flexDirection: 'column', gap: '22px',
      height: '100vh', overflowY: 'auto', position: 'sticky', top: 0,
    }}>
      {/* Wordmark */}
      <div style={{ paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontWeight: 300, fontStyle: 'italic', fontSize: '1.9rem', lineHeight: 1 }}>
          Nudge <strong style={{ fontWeight: 600, color: 'var(--accent)', fontStyle: 'normal' }}>HQ</strong>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '5px' }}>
          Lakota Canvas · Parent Dashboard
        </p>
      </div>

      {/* Child switcher */}
      {userIds.length > 1 && (
        <div className="s-section">
          <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Viewing</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {userIds.map(uid => {
              const name = localStorage.getItem('nhq_' + uid + '_name') || (uid === '50904' ? 'Alex' : uid === '50906' ? 'Eleanor' : 'Student ' + uid);
              const isActive = uid === activeUserId;
              return (
                <button
                  key={uid}
                  onClick={() => props.onSwitchChild(uid)}
                  style={{
                    ...btnBase,
                    marginBottom: 0,
                    background: isActive ? 'var(--accent)' : 'var(--surface2)',
                    color: isActive ? '#fff' : 'var(--subink)',
                    border: isActive ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="s-section">
        <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>At a Glance</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
          <StatBox value={zeroed.length} label="Graded Zero" variant="zeroed" />
          <StatBox value={missing.length} label="Missing" variant="missing" />
          <StatBox value={fire.length} label="Due Today" variant="fire" />
          <StatBox value={tomorrow.length} label="Tomorrow" variant="soon" />
          <StatBox value={thisWeek.length} label="This Week" variant="chill" />
          <StatBox value={upcoming.length} label="Upcoming" variant="upcoming" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="s-section">
        <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Quick Actions</div>
        <button onClick={props.onLoadFromExtension} style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}>🔌 Load from Extension</button>
        <button onClick={props.onLoadAllFromCloud} style={{ ...btnBase, background: 'var(--surface2)', color: 'var(--subink)', border: '1px solid var(--border)' }}>☁️ Load All from Cloud</button>
        <button onClick={props.onLoadHAC} style={{ ...btnBase, background: 'var(--surface2)', color: 'var(--subink)', border: '1px solid var(--border)' }}>📊 Load HAC Data</button>
        <button onClick={props.onSendGeneralReminder} style={{ ...btnBase, background: 'var(--surface2)', color: 'var(--subink)', border: '1px solid var(--border)' }}>📲 Send General Reminder</button>
        <button onClick={props.onLoadDemo} style={{ ...btnBase, background: 'var(--surface2)', color: 'var(--subink)', border: '1px solid var(--border)' }}>Try Demo Data</button>
      </div>

      {/* Phone setup */}
      <div className="s-section">
        <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Phone Setup</div>
        <button onClick={() => props.onOpenSettings()} style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}>⚙️ Settings & QR Setup</button>
      </div>
    </aside>
  );
}

function StatBox({ value, label, variant }: { value: number; label: string; variant: string }) {
  const styles: Record<string, { bg: string; border: string; numColor: string; lblColor: string }> = {
    zeroed: { bg: '#e53e3e', border: '#e53e3e', numColor: '#fff', lblColor: 'rgba(255,255,255,0.85)' },
    missing: { bg: '#f97316', border: '#f97316', numColor: '#fff', lblColor: 'rgba(255,255,255,0.85)' },
    fire: { bg: '#fff5f5', border: '#fc8181', numColor: 'var(--fire)', lblColor: 'var(--muted)' },
    soon: { bg: '#fff8f0', border: '#f6ad55', numColor: '#dd6b20', lblColor: 'var(--muted)' },
    chill: { bg: '#fffde7', border: '#ecc94b', numColor: '#b7791f', lblColor: 'var(--muted)' },
    upcoming: { bg: '#f0fff4', border: '#68d391', numColor: '#276749', lblColor: 'var(--muted)' },
  };
  const s = styles[variant] || { bg: 'var(--bg)', border: 'var(--border)', numColor: 'var(--ink)', lblColor: 'var(--muted)' };
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: '8px',
      padding: '10px',
      textAlign: 'center',
    }}>
      <div style={{ fontWeight: 600, fontSize: '1.7rem', lineHeight: 1, color: s.numColor }}>{value || 0}</div>
      <div style={{ fontSize: '0.8rem', color: s.lblColor, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '3px' }}>{label}</div>
    </div>
  );
}
