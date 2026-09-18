import { useState } from 'react';
import { supabase } from '../supabaseClient';

interface Props {
  onAuthed: () => void;
}

export function AuthScreen({ onAuthed }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onAuthed();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthed();
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed';
      if (msg.toLowerCase().includes('email_not_confirmed')) {
        setError('Email not confirmed yet. For a new account, try signing up again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '12px 14px', fontFamily: 'inherit', fontSize: '0.95rem', color: 'var(--ink)',
    outline: 'none', width: '100%',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecf5 100%)', padding: '20px',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px 36px', width: '100%', maxWidth: '380px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontWeight: 300, fontStyle: 'italic', fontSize: '2rem', lineHeight: 1 }}>
            Nudge <strong style={{ fontWeight: 600, color: 'var(--accent)', fontStyle: 'normal' }}>HQ</strong>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '8px' }}>
            Parent Dashboard
          </p>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: '24px', borderBottom: '2px solid var(--border)' }}>
          <button
            onClick={() => setMode('signin')}
            style={{
              flex: 1, padding: '10px', fontFamily: 'inherit', fontSize: '0.92rem', cursor: 'pointer',
              background: 'none', border: 'none', borderBottom: mode === 'signin' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'signin' ? 'var(--ink)' : 'var(--muted)', marginBottom: '-2px', transition: 'all 0.15s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1, padding: '10px', fontFamily: 'inherit', fontSize: '0.92rem', cursor: 'pointer',
              background: 'none', border: 'none', borderBottom: mode === 'signup' ? '2px solid var(--accent)' : '2px solid transparent',
              color: mode === 'signup' ? 'var(--ink)' : 'var(--muted)', marginBottom: '-2px', transition: 'all 0.15s',
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.88rem', color: 'var(--subink)', display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={inputStyle} required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.88rem', color: 'var(--subink)', display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters" style={inputStyle} required minLength={6}
            />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '8px',
              padding: '10px 14px', fontSize: '0.85rem', color: 'var(--fire)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
          {mode === 'signin'
            ? 'First time here? Create an account to get started.'
            : 'Already have an account? Switch to Sign In.'}
        </p>
      </div>
    </div>
  );
}
