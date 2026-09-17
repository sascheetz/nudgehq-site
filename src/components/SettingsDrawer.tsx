import { useState, useEffect } from 'react';
import { restoreCredential, saveCredential, clearAllCredentials } from '../data';

interface Props {
  open: boolean;
  onClose: () => void;
  onClearCreds: () => void;
}

export function SettingsDrawer({ open, onClose }: Props) {
  const [twSid, setTwSid] = useState('');
  const [twToken, setTwToken] = useState('');
  const [twFrom, setTwFrom] = useState('');
  const [twTo, setTwTo] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    setTwSid(restoreCredential('tw-sid'));
    setTwToken(restoreCredential('tw-token'));
    setTwFrom(restoreCredential('tw-from'));
    setTwTo(restoreCredential('tw-to'));
    setSheetsUrl(restoreCredential('sheets-url'));
    setStudentName(restoreCredential('student-name'));
  }, [open]);

  const save = (id: string, val: string) => saveCredential(id, val);

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px',
    padding: '8px 11px', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--ink)',
    outline: 'none', width: '100%',
  };

  const labelStyle: React.CSSProperties = { fontSize: '0.92rem', color: 'var(--subink)', marginBottom: '3px' };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26,22,16,0.45)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            width: '320px', maxWidth: '95vw', height: '100vh', overflowY: 'auto',
            padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: '20px',
            animation: 'slideIn 0.25s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontStyle: 'italic', fontSize: '1.3rem', fontWeight: 300 }}>Settings</h2>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontFamily: 'inherit', fontSize: '0.92rem', color: 'var(--subink)', cursor: 'pointer' }}>✕ Close</button>
          </div>

          {/* Canvas Connection */}
          <div>
            <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Canvas Connection</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--subink)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 11px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏫 lakota.instructure.com <span style={{ color: 'var(--chill)', fontSize: '0.9rem' }}>● via extension</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65, marginTop: '8px' }}>
              Data is synced automatically by the Nudge HQ Chrome extension. Open Canvas in Chrome, click the Nudge HQ icon, and click Sync Now.
            </p>
          </div>

          {/* Student Name */}
          <div>
            <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Student Name</div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Name (used in text messages)</label>
              <input type="text" value={studentName} onChange={e => { setStudentName(e.target.value); save('student-name', e.target.value); }} placeholder="Alex" style={inputStyle} />
            </div>
          </div>

          {/* Google Sheets */}
          <div>
            <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Google Sheets Export</div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Apps Script Web App URL</label>
              <input type="url" value={sheetsUrl} onChange={e => { setSheetsUrl(e.target.value); save('sheets-url', e.target.value); }} placeholder="https://script.google.com/macros/s/…/exec" style={inputStyle} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65, marginTop: '3px' }}>
              Set up once — assignments are appended to your Google Sheet on every export.
            </p>
          </div>

          {/* Twilio */}
          <div>
            <div style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: '9px' }}>Twilio SMS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
              <div>
                <label style={labelStyle}>Account SID</label>
                <input type="text" value={twSid} onChange={e => { setTwSid(e.target.value); save('tw-sid', e.target.value); }} placeholder="ACxxxxxxxxxxxxxxxx" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Auth Token</label>
                <input type="password" value={twToken} onChange={e => { setTwToken(e.target.value); save('tw-token', e.target.value); }} placeholder="your auth token" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Your Twilio Number</label>
                <input type="tel" value={twFrom} onChange={e => { setTwFrom(e.target.value); save('tw-from', e.target.value); }} placeholder="+15551234567" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>His Phone Number</label>
                <input type="tel" value={twTo} onChange={e => { setTwTo(e.target.value); save('tw-to', e.target.value); }} placeholder="+15559876543" style={inputStyle} />
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--chill)', marginTop: '8px' }}>
              🔒 All credentials auto-save in your browser.
            </p>
            <button
              onClick={() => { clearAllCredentials(); setTwSid(''); setTwToken(''); setTwFrom(''); setTwTo(''); setSheetsUrl(''); setStudentName(''); }}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', marginTop: '4px' }}
            >
              Clear saved data →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
